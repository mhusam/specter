const { Pool } = require('pg')
const path = require('path')

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/specter'

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4:31b'

const OUTPUT_ROOT = process.env.CONTRACT_OUTPUT_DIR
  ? path.resolve(process.env.CONTRACT_OUTPUT_DIR)
  : path.resolve(process.cwd(), 'contracts')

const DOC_CATALOG = [
  { key: '01-hld.md', category: 'architecture', title: 'High-Level Design' },
  { key: '02-tech-stack.md', category: 'architecture', title: 'Technology Stack' },
  { key: '03-data-architecture.md', category: 'architecture', title: 'Data Architecture' },
  { key: '04-integration-arch.md', category: 'architecture', title: 'Integration Architecture' },
  { key: '05-business-rules.md', category: 'business', title: 'Business Rules' },
  { key: '06-features-catalog.md', category: 'business', title: 'Features Catalog' },
  { key: '07-user-personas.md', category: 'business', title: 'User Personas' },
  { key: '08-success-metrics.md', category: 'business', title: 'Success Metrics & KPIs' },
  { key: '09-ui-ux-overview.md', category: 'design', title: 'UI/UX Overview' },
  { key: '10-pages-screens.md', category: 'design', title: 'Pages & Screens Spec' },
  { key: '11-page-actions.md', category: 'design', title: 'Page Actions & Events' },
  { key: '12-navigation-routing.md', category: 'design', title: 'Navigation & Routing' },
  { key: '13-sequence-diagrams.md', category: 'flows', title: 'Sequence Diagrams' },
  { key: '14-data-flow.md', category: 'flows', title: 'Data Flow Diagrams' },
  { key: '15-state-diagrams.md', category: 'flows', title: 'State Machines' },
  { key: '16-error-flows.md', category: 'flows', title: 'Error & Edge-Case Flows' },
  { key: '17-api-contract.md', category: 'backend', title: 'API Contract' },
  { key: '18-service-layer.md', category: 'backend', title: 'Service Layer Design' },
  { key: '19-data-models.md', category: 'backend', title: 'Data Models' },
  { key: '20-background-jobs.md', category: 'backend', title: 'Background Jobs & Queues' },
  { key: '21-delivery-plan.md', category: 'delivery', title: 'Delivery Plan' },
  { key: '22-testing-strategy.md', category: 'delivery', title: 'Testing Strategy' },
  { key: '23-deployment-arch.md', category: 'delivery', title: 'Deployment Architecture' },
  { key: '24-risk-register.md', category: 'delivery', title: 'Risk Register' },
  { key: '25-developer-handoff.md', category: 'agent', title: 'Developer Handoff Guide' },
  { key: '26-security-overview.md', category: 'security', title: 'Security Overview' },
  { key: '27-auth-strategy.md', category: 'security', title: 'Authentication Strategy' },
  { key: '28-roles-permissions.md', category: 'security', title: 'Roles & Permissions (RBAC/ABAC)' },
  { key: '29-data-security.md', category: 'security', title: 'Data Security & Encryption' },
  { key: '30-api-security.md', category: 'security', title: 'API Security' },
  { key: '31-compliance-audit.md', category: 'security', title: 'Compliance & Audit Trail' },
]
// Keep REQUIRED_DOCS for backward compat with legacy generate-files route
const REQUIRED_DOCS = DOC_CATALOG.map(d => d.key)

const DEFAULT_SETTINGS = {
  designConcept: 'default',
  ollamaBaseUrl: OLLAMA_BASE_URL,
  ollamaModel: OLLAMA_MODEL,
}

// Mutable state object — consumers mutate state.dbReady
const state = { dbReady: false }

const pool = new Pool({ connectionString: DATABASE_URL })

async function ensureSchema(poolInstance) {
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      depth TEXT NOT NULL DEFAULT 'advanced',
      vision TEXT,
      answers JSONB NOT NULL DEFAULT '{}'::jsonb,
      analysis TEXT,
      generated_path TEXT,
      generated_files JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  await poolInstance.query(`
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS custom_questions JSONB DEFAULT NULL;
  `)
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL
    );
  `)
  await poolInstance.query(
    `INSERT INTO app_settings (key, value)
     VALUES ('config', $1::jsonb)
     ON CONFLICT (key) DO NOTHING`,
    [JSON.stringify(DEFAULT_SETTINGS)],
  )
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS project_conversations (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS project_snapshots (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      snapshot_type TEXT NOT NULL,
      analysis TEXT,
      generated_files JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS project_doc_states (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      doc_key TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      content TEXT,
      error_message TEXT,
      generated_at TIMESTAMPTZ,
      UNIQUE(project_id, doc_key)
    );
  `)

  // ── Spec Agent tables ──────────────────────────────────────────────────────

  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS spec_sessions (
      id                     SERIAL PRIMARY KEY,
      project_id             INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name                   TEXT NOT NULL DEFAULT 'New Session',
      status                 TEXT NOT NULL DEFAULT 'active',
      phase                  TEXT NOT NULL DEFAULT 'discovery',
      produced_version_id    INTEGER,
      elicited_summary       TEXT,
      elicited_summary_jsonb JSONB,
      checkpoint_count       INTEGER NOT NULL DEFAULT 0,
      message_count          INTEGER NOT NULL DEFAULT 0,
      created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  await poolInstance.query(`
    CREATE INDEX IF NOT EXISTS idx_spec_sessions_project_id ON spec_sessions(project_id);
  `)
  await poolInstance.query(`
    CREATE INDEX IF NOT EXISTS idx_spec_sessions_status ON spec_sessions(status);
  `)

  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS spec_messages (
      id            SERIAL PRIMARY KEY,
      session_id    INTEGER NOT NULL REFERENCES spec_sessions(id) ON DELETE CASCADE,
      role          TEXT NOT NULL,
      content       TEXT NOT NULL,
      message_type  TEXT NOT NULL DEFAULT 'chat',
      phase_at_send TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  await poolInstance.query(`
    CREATE INDEX IF NOT EXISTS idx_spec_messages_session_id ON spec_messages(session_id);
  `)

  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS spec_versions (
      id                       SERIAL PRIMARY KEY,
      project_id               INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      session_id               INTEGER REFERENCES spec_sessions(id) ON DELETE SET NULL,
      version_major            INTEGER NOT NULL DEFAULT 1,
      version_minor            INTEGER NOT NULL DEFAULT 0,
      version_patch            INTEGER NOT NULL DEFAULT 0,
      version_label            TEXT NOT NULL,
      change_type              TEXT NOT NULL DEFAULT 'initial',
      change_summary           TEXT,
      docs_snapshot            JSONB NOT NULL DEFAULT '{}'::jsonb,
      session_context_snapshot JSONB,
      is_current               BOOLEAN NOT NULL DEFAULT FALSE,
      doc_count_success        INTEGER NOT NULL DEFAULT 0,
      doc_count_error          INTEGER NOT NULL DEFAULT 0,
      created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  await poolInstance.query(`
    CREATE INDEX IF NOT EXISTS idx_spec_versions_project_id ON spec_versions(project_id);
  `)
  await poolInstance.query(`
    CREATE INDEX IF NOT EXISTS idx_spec_versions_is_current ON spec_versions(project_id, is_current);
  `)

  // FK from spec_sessions → spec_versions (added after spec_versions exists)
  await poolInstance.query(`
    ALTER TABLE spec_sessions
      ADD COLUMN IF NOT EXISTS produced_version_id INTEGER REFERENCES spec_versions(id) ON DELETE SET NULL;
  `)

  // Track current spec version on the project
  await poolInstance.query(`
    ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS current_spec_version_id INTEGER REFERENCES spec_versions(id) ON DELETE SET NULL;
  `)
}

module.exports = {
  pool,
  state,
  OUTPUT_ROOT,
  DOC_CATALOG,
  REQUIRED_DOCS,
  DEFAULT_SETTINGS,
  ensureSchema,
}
