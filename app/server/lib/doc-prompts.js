/**
 * Builds a deep, specific LLM prompt for a given doc key and project context.
 * @param {string} docKey
 * @param {object} project
 * @returns {string}
 */
function buildDocPrompt(docKey, project) {
  const ctx = `Project Name: ${project.name}
Depth: ${project.depth}
Vision: ${project.vision || 'N/A'}
Project Answers:
${JSON.stringify(project.answers, null, 2)}
Analysis:
${project.analysis || 'No analysis yet.'}
`

  const baseInstruction = `You are a senior software architect writing a professional contract document. Output valid, well-structured Markdown only — no preamble, no apologies, no meta-commentary. Be exhaustive and specific to this project. Do not use placeholders like "TBD" or "Lorem ipsum". Every section must contain real, actionable content derived from the project context below.

${ctx}
---
`

  const prompts = {
    '01-hld.md': `${baseInstruction}
Generate the **High-Level Design (HLD)** document for this project. Include:

1. **Executive Summary** — 2-3 paragraph overview of the system's purpose and architecture philosophy.
2. **System Architecture Diagram** — A complete Mermaid \`graph TD\` or \`C4Context\` diagram showing all major components, services, databases, and external integrations with labelled edges.
3. **Component Inventory** — A table listing every component (frontend, backend, database, cache, queue, CDN, etc.) with its role, technology, and owner.
4. **Technology Choices Justification** — For each major technology decision, explain WHY it was chosen over alternatives, including trade-offs considered.
5. **Deployment Topology** — A Mermaid diagram and narrative describing how components are deployed (containers, cloud regions, load balancers, DNS, etc.).
6. **Cross-Cutting Concerns** — How logging, monitoring, security, and error handling are handled across the entire system.
7. **Architecture Decision Records (ADRs)** — At least 3 numbered ADRs documenting key decisions made.
`,

    '02-tech-stack.md': `${baseInstruction}
Generate the **Technology Stack** document for this project. Include:

1. **Stack Overview** — A brief narrative of the overall technology philosophy (e.g., opinionated framework, microservices vs monolith, etc.).
2. **Full Technology Table** — A comprehensive Markdown table with columns: Layer | Technology | Version | Purpose | Rationale | Alternatives Considered.
   Layers to cover: Frontend Framework, UI Library, State Management, Build Tool, CSS/Styling, Backend Framework, Runtime, API Style, Authentication Library, Database (primary), Database (secondary/cache), ORM/Query Builder, Job Queue, File Storage, Email Service, Search, Monitoring, Logging, Testing (unit), Testing (integration), Testing (e2e), CI/CD, Container, Orchestration, Cloud Provider.
3. **Version Pinning Strategy** — How dependency versions are managed and updated.
4. **Trade-off Analysis** — A dedicated section for the 3-5 most consequential technology choices, with detailed pros/cons.
5. **Developer Tooling** — IDE recommendations, linting, formatting, and pre-commit hooks.
6. **Third-Party Service Dependencies** — External SaaS services used, their tier/pricing tier impact, and fallback strategies.
`,

    '03-data-architecture.md': `${baseInstruction}
Generate the **Data Architecture** document for this project. Include:

1. **Data Architecture Philosophy** — Overview of the data strategy (OLTP vs OLAP, event sourcing, CQRS, etc.).
2. **Entity Relationship Diagram** — A full Mermaid \`erDiagram\` covering all primary entities, their attributes, and cardinality relationships.
3. **Data Model Inventory** — Each entity listed with: entity name, description, primary key, key fields, and relationships.
4. **Storage Strategy** — Which data goes where (relational DB, NoSQL, blob storage, in-memory cache) and why.
5. **Caching Strategy** — What data is cached, cache keys, TTL values, invalidation strategy, and which caching technology is used.
6. **Data Lifecycle** — How data is created, mutated, archived, and deleted. Retention policies. Soft-delete vs hard-delete decisions.
7. **Data Migration Strategy** — How schema changes are managed (migration tools, zero-downtime migrations, rollback plan).
8. **Backup and Recovery** — Backup frequency, recovery time objective (RTO), recovery point objective (RPO).
`,

    '04-integration-arch.md': `${baseInstruction}
Generate the **Integration Architecture** document for this project. Include:

1. **Integration Overview** — Summary of all external systems and services this project communicates with.
2. **Integration Catalog** — A table of all integrations: Integration Name | Type (REST/GraphQL/Webhook/Event/SDK) | Direction (inbound/outbound/bidirectional) | Auth Method | Rate Limits | Criticality.
3. **Synchronous Integrations** — Detailed description of each REST/GraphQL call: endpoint, payload, response handling, timeout, retry strategy.
4. **Asynchronous Integrations** — Webhooks received and sent: event types, payload schema, signature verification, delivery guarantees.
5. **Event Bus / Message Queue** — If applicable: topics/queues, producers, consumers, message schema, ordering guarantees, dead-letter handling.
6. **Integration Patterns** — Which patterns are used (circuit breaker, saga, outbox, etc.) and where.
7. **Integration Error Handling** — Per integration: what happens on failure, fallback behavior, alerting.
8. **Integration Testing Strategy** — How integrations are tested (contract tests, mocks, sandbox environments).
`,

    '05-business-rules.md': `${baseInstruction}
Generate the **Business Rules** document for this project. Include:

1. **Business Rules Overview** — The domain model and core business concepts driving these rules.
2. **Core Business Rules** — Numbered list (BR-001, BR-002, …) with for each rule: Rule ID, Name, Description, Trigger/Condition, Expected Outcome, Priority (Must/Should/Could), and which system layer enforces it.
3. **Validation Rules** — All input validation rules organized by entity/form, including: field, rule description, error message.
4. **Constraint Rules** — Database-level and application-level constraints (uniqueness, referential integrity, business invariants).
5. **Computed Fields** — Fields derived from other data: formula or algorithm, when recomputed, where stored.
6. **State Transition Rules** — Which state transitions are allowed or forbidden for each entity with a lifecycle.
7. **Authorization Rules** — Which roles can perform which actions on which resources (high level — detailed RBAC is in a separate document).
`,

    '06-features-catalog.md': `${baseInstruction}
Generate the **Features Catalog** document for this project. Include:

1. **Feature Catalog Overview** — How features are organized and prioritized.
2. **Feature Matrix** — A Markdown table with: Feature ID | Feature Name | Category | Priority (P0/P1/P2) | Status | Description.
3. **Detailed Feature Specs** — For EACH feature, a subsection containing:
   - **User Story**: As a [persona], I want to [action] so that [benefit].
   - **Acceptance Criteria**: Numbered checklist (Given/When/Then or bullet format).
   - **Dependencies**: Other features or external services this feature depends on.
   - **Out of Scope**: Explicitly state what is NOT included in this feature.
   - **UI Notes**: Key UI considerations (if applicable).
   - **API Notes**: Key API considerations (if applicable).
4. **Feature Dependency Graph** — A Mermaid \`graph LR\` showing feature dependencies.
5. **MVP Boundary** — Clearly demarcate which features are in MVP vs post-MVP.
`,

    '07-user-personas.md': `${baseInstruction}
Generate the **User Personas** document for this project. Include at least 3-5 distinct personas. For EACH persona, provide:

1. **Persona Name & Avatar Description** — A realistic fictional name and a 1-sentence physical/demographic description.
2. **Role & Title** — Their role in relation to this product.
3. **Demographics** — Age range, location, education, technical proficiency (1-5 scale).
4. **Goals** — 3-5 primary goals when using this product.
5. **Pain Points** — 3-5 frustrations or challenges the product must solve.
6. **Motivations** — What drives their behavior and decision-making.
7. **Key Use Cases** — 3-5 specific scenarios this persona goes through in the product, written as brief narratives.
8. **Quote** — A representative quote in the persona's voice.
9. **Feature Priorities** — Which features matter most to this persona (reference Feature IDs from the catalog).

After all personas, include:
- **Persona Comparison Matrix** — Table comparing all personas across key dimensions.
- **Persona Journey Map** — High-level touchpoints each persona has with the product.
`,

    '08-success-metrics.md': `${baseInstruction}
Generate the **Success Metrics & KPIs** document for this project. Include:

1. **North Star Metric** — The single most important metric that captures the product's core value delivery. Explain why this was chosen.
2. **OKRs** — 2-3 Objectives, each with 3-4 Key Results. Format: Objective → KRs with measurable targets and timeframes.
3. **Feature-Level KPIs** — For each major feature area, 2-4 KPIs with: KPI Name | Definition | Target | Measurement Method | Review Cadence.
4. **Leading vs Lagging Indicators** — A table distinguishing leading indicators (predictive) from lagging indicators (outcome-based).
5. **Business Metrics** — Revenue, retention, acquisition, and activation metrics (as applicable).
6. **Technical Metrics** — Uptime SLA, p50/p95/p99 latency targets, error rate thresholds, deployment frequency.
7. **Measurement Methodology** — How each metric is collected (analytics platform, database queries, APM tools), sampling strategy, and dashboard design.
8. **Anti-metrics** — Metrics to actively avoid optimizing (e.g., raw page views over engaged sessions).
`,

    '09-ui-ux-overview.md': `${baseInstruction}
Generate the **UI/UX Overview** document for this project. Include:

1. **Design Philosophy** — 3-5 guiding design principles for this product (e.g., clarity over cleverness, progressive disclosure, etc.).
2. **Design System** — Name/basis of the design system (custom, Material, Ant Design, etc.) and rationale.
3. **Color Palette** — Primary, secondary, accent, neutral, semantic colors (success/warning/error/info) with hex codes and usage guidelines.
4. **Typography** — Font families (heading, body, mono), scale (h1–h6, body-sm, body-lg, caption), and line-height/spacing rules.
5. **Spacing & Layout System** — Base unit, spacing scale, grid system (columns, gutters, breakpoints for responsive design).
6. **Component Library** — List of all UI components used, grouped by category (layout, form, navigation, data display, feedback, overlay).
7. **Accessibility Standards** — WCAG compliance level (AA/AAA), specific requirements: color contrast ratios, focus management, ARIA usage, keyboard navigation, screen reader support.
8. **Motion & Animation** — Animation principles, duration scales, easing functions, reduced-motion policy.
9. **Dark Mode** — Whether supported, implementation approach, color token strategy.
10. **Responsive Breakpoints** — All breakpoints with behavior descriptions and layout changes.
`,

    '10-pages-screens.md': `${baseInstruction}
Generate the **Pages & Screens Specification** document for this project. For EACH page/screen, provide a dedicated section:

**Section format for each page:**
- **Route** — The URL path (e.g., \`/dashboard\`, \`/projects/:id/edit\`).
- **Purpose** — 1-2 sentences describing what this page accomplishes.
- **Layout Description** — Describe the page layout: header, sidebar, main content area, footer zones.
- **Key UI Elements** — Bulleted list of all significant UI components visible on the page (buttons, tables, forms, charts, cards, etc.) with brief descriptions.
- **Data Displayed** — What data is shown, where it comes from (API endpoint), and how it's formatted.
- **Loading State** — What the page looks like while data is loading (skeleton screens, spinners, etc.).
- **Empty State** — What the page shows when there is no data yet, including empty-state illustration description and CTA.
- **Error State** — What happens when data fails to load or an action fails.
- **User Actions** — List of possible user interactions on this page (reference Page Actions doc).
- **Permissions** — Which roles/user types can access this page.

Cover all pages including: auth pages (login, register, forgot-password, verify-email), main app pages, settings pages, admin pages, error pages (404, 500), and any onboarding flows.
`,

    '11-page-actions.md': `${baseInstruction}
Generate the **Page Actions & Events** document for this project. Organize by page. For EACH page, list every possible user action:

**Action format:**
- **Action ID** — Unique identifier (e.g., \`ACT-LOGIN-001\`).
- **Trigger** — What causes it (button click, form submit, keyboard shortcut, page load, scroll, drag, etc.).
- **Element** — The specific UI element (e.g., "Submit button in login form").
- **Preconditions** — What must be true before this action is available/enabled.
- **Side Effects** — Everything that happens: API calls made, state changes, navigation, analytics events fired, notifications shown.
- **Success Path** — What the user sees/experiences on success.
- **Failure Path** — What the user sees/experiences on failure, and recovery options.
- **Keyboard Shortcut** — If applicable.

Also include a **Global Actions** section for actions that apply across all pages (e.g., log out, toggle dark mode, open global search).

Include an **Analytics Events Catalog** — table of all frontend analytics events: Event Name | Trigger | Properties | Purpose.
`,

    '12-navigation-routing.md': `${baseInstruction}
Generate the **Navigation & Routing** document for this project. Include:

1. **Route Tree** — A hierarchical Markdown representation of ALL routes in the application, including nested routes.
2. **Route Table** — A table with columns: Path | Component/Page | Auth Required | Roles Allowed | Description.
3. **Route Guards** — For each protected route type, describe the guard logic: what is checked, where the user is redirected on failure, how auth tokens are validated.
4. **Navigation Structure** — Describe all navigation elements: primary nav, secondary nav, breadcrumbs, tabs, sidebar. Which routes are in each nav element.
5. **Deep-Link Behavior** — How direct URL access is handled (unauthenticated deep links, redirect after login, preserving scroll/state).
6. **URL Parameter Specification** — For each route with parameters: param name, type, validation, default value, error handling for invalid params.
7. **Query String Parameters** — Documented query params: name, purpose, valid values, persistence behavior (URL vs session storage).
8. **Redirect Rules** — All redirect rules: source → destination, conditions, HTTP status codes (301/302/307).
9. **404 & Error Routing** — How not-found and server error routes are handled, custom error pages.
`,

    '13-sequence-diagrams.md': `${baseInstruction}
Generate the **Sequence Diagrams** document for this project. Create Mermaid \`sequenceDiagram\` diagrams for the 5 most critical user flows. For EACH flow:

1. **Flow Name & Description** — Title and 2-3 sentence overview of what this flow accomplishes.
2. **Actors** — List all participants (User, Browser, Frontend App, API Gateway, Backend Service, Database, Cache, External Service, etc.).
3. **Mermaid Sequence Diagram** — Complete, detailed diagram showing:
   - All HTTP/WebSocket/SSE calls with method and endpoint labels
   - Database queries labeled with the query type
   - Async operations and callbacks
   - Error paths (use \`alt\`/\`else\` blocks)
   - Token/auth validation steps
4. **Flow Notes** — Any important timing, ordering, or consistency constraints.

Flows to cover (adapt to this specific project):
1. User Authentication / Login Flow
2. Primary CRUD Operation (the main entity of this application)
3. Data Generation or Processing Flow (if applicable to this project)
4. Real-time / Streaming Flow (if applicable)
5. Error Recovery / Retry Flow
`,

    '14-data-flow.md': `${baseInstruction}
Generate the **Data Flow Diagrams** document for this project. Include:

1. **Data Flow Overview** — Narrative description of how data flows through the system at a high level.
2. **Level 0 DFD (Context Diagram)** — A Mermaid diagram showing the system as a single process with external entities (users, third-party services) and major data flows.
3. **Level 1 DFD (Main Processes)** — A Mermaid diagram breaking down the system into major processes (e.g., Authentication, Project Management, File Generation, Reporting) with data stores and flows between them.
4. **Critical Path Data Flows** — For each of the top 3-5 critical data paths, a detailed description:
   - Data origin (user input, API response, database read)
   - Transformation steps (validation, business logic, formatting)
   - Data destination (database write, response payload, file output, event emission)
   - Data format at each step (JSON schema, SQL row, etc.)
5. **Data Transformation Catalog** — A table of all significant data transformations: Input Format | Transformation | Output Format | Where It Happens.
6. **Event Streams** — If the system emits events, document each event: name, payload schema, producer, consumers, ordering guarantees.
`,

    '15-state-diagrams.md': `${baseInstruction}
Generate the **State Machines** document for this project. For each major entity or process with a lifecycle, provide:

1. **State Machine Name & Purpose** — Which entity/process this state machine governs.
2. **State Inventory** — Table of all states: State Name | Description | Is Terminal State.
3. **Mermaid State Diagram** — A complete \`stateDiagram-v2\` diagram showing all states, transitions, guard conditions, and actions on transitions.
4. **Transition Table** — A table: From State | Event/Trigger | Guard Condition | To State | Side Effects/Actions.
5. **Invalid Transitions** — Explicitly list which transitions are forbidden and what error is returned.
6. **Concurrency Handling** — How concurrent state transition attempts are handled (optimistic locking, pessimistic locking, event sourcing, etc.).

State machines to document (adapt to this project):
- Project/primary entity lifecycle
- User account lifecycle (pending → active → suspended → deleted)
- File generation / document processing lifecycle
- Any payment or subscription lifecycle (if applicable)
- Background job lifecycle (queued → running → done/failed/retrying)
`,

    '16-error-flows.md': `${baseInstruction}
Generate the **Error & Edge-Case Flows** document for this project. Include:

1. **Error Handling Philosophy** — Overall approach to error handling across layers.
2. **Error Code Catalog** — A comprehensive table: Error Code | HTTP Status | Message | Description | User-Facing Message | Recovery Action.
3. **UI Layer Errors** — For each form/action: validation errors (field-level and form-level), network errors, timeout errors, and how each is displayed to the user.
4. **API Layer Errors** — How the backend categorizes and returns errors: error envelope format (JSON schema), status code mapping, validation error format, authentication/authorization errors.
5. **Service Layer Errors** — Business logic errors, domain exceptions, how they propagate up to the API layer.
6. **Database Layer Errors** — Connection errors, constraint violations, deadlocks, timeout handling, and how they surface to the application.
7. **External Integration Errors** — Per integration: what errors can occur, retry strategy, circuit breaker thresholds, fallback behavior.
8. **Edge Case Inventory** — Table of non-obvious edge cases: Scenario | Expected Behavior | Implementation Notes.
9. **Global Fallback Behaviors** — What happens for completely unexpected errors at each layer.
10. **Error Monitoring & Alerting** — How errors are captured (Sentry, DataDog, etc.), severity levels, on-call alert thresholds.
`,

    '17-api-contract.md': `${baseInstruction}
Generate the **API Contract** document for this project. For EVERY API endpoint, provide a complete specification. Group endpoints by resource. For each endpoint:

**Endpoint format:**
\`\`\`
### [METHOD] /api/path
\`\`\`
- **Description** — What this endpoint does.
- **Authentication** — Required auth (Bearer token, API key, none) and which roles are authorized.
- **Request Headers** — Required and optional headers.
- **Path Parameters** — Name, type, description, validation rules.
- **Query Parameters** — Name, type, required/optional, description, valid values, defaults.
- **Request Body** — Full JSON schema with all fields: name, type, required, validation, description, example value.
- **Response** — For each status code (200/201/204/400/401/403/404/409/422/500): description and full JSON schema.
- **Example Request** — Complete curl command.
- **Example Response** — Full JSON response body.
- **Rate Limiting** — If applicable.
- **Side Effects** — What else happens (emails sent, events emitted, cache invalidated).

Also include:
- **Authentication Flow** — How tokens are obtained and refreshed.
- **Pagination Standard** — How list endpoints handle pagination (cursor, offset, keyset).
- **Filtering & Sorting** — Standard query params for filtering and sorting.
- **API Versioning Strategy** — How breaking changes are handled.
`,

    '18-service-layer.md': `${baseInstruction}
Generate the **Service Layer Design** document for this project. Include:

1. **Service Architecture Overview** — How the service layer is structured (single service, domain services, microservices, etc.).
2. **Service Catalog** — Table of all services: Service Name | Responsibility | Dependencies | Exposes.
3. **Service Interface Definitions** — For each service, define its public interface (function signatures, input types, return types, exceptions thrown).
4. **Business Logic Boundaries** — Clear rules for what belongs in the service layer vs controller vs repository vs domain model.
5. **Service-to-Service Communication** — How services call each other (direct import, dependency injection, event bus), and how circular dependencies are avoided.
6. **Transaction Boundaries** — Which operations require database transactions, how transactions span multiple repository calls, rollback scenarios.
7. **Dependency Injection Pattern** — How services receive their dependencies (constructor injection, function params, DI container).
8. **Service Layer Error Handling** — How domain errors are defined, thrown, and propagated.
9. **Idempotency** — Which service operations must be idempotent and how idempotency is enforced.
`,

    '19-data-models.md': `${baseInstruction}
Generate the **Data Models** document for this project. Include the complete database schema. For EACH table/collection, provide:

**Table format:**
### Table: \`table_name\`
- **Description** — Purpose of this table.
- **Column Definitions** — Full table:
  | Column | Type | Nullable | Default | Constraints | Description |
- **Indexes** — All indexes: name, columns, type (btree/gin/gist), unique, partial condition.
- **Foreign Keys** — Source column → referenced table.column, ON DELETE/UPDATE behavior.
- **Row-Level Security** — If applicable (PostgreSQL RLS policies).
- **Example Data** — 2-3 representative rows as a Markdown table.

Also include:
- **Complete CREATE TABLE Statements** — SQL DDL for all tables, in dependency order.
- **Enum Types** — All custom enum types used.
- **Triggers & Functions** — Any database triggers or stored functions.
- **Full-Text Search Configuration** — If applicable.
- **Query Performance Notes** — Which queries are on the critical path and how they're optimized.
`,

    '20-background-jobs.md': `${baseInstruction}
Generate the **Background Jobs & Queues** document for this project. If this project has no background jobs, still document the infrastructure and readiness for future jobs. Include:

1. **Background Job Architecture** — Technology used (Redis + BullMQ, pg-boss, Sidekiq, etc.), worker process setup, queue infrastructure.
2. **Job Catalog** — Table: Job Name | Queue | Trigger | Frequency/Condition | Priority | Concurrency Limit.
3. **Job Specifications** — For each job:
   - **Purpose** — What problem it solves.
   - **Trigger** — Event-driven, scheduled (cron expression), or manual.
   - **Payload Schema** — Input data the job receives.
   - **Processing Logic** — Step-by-step description of what the job does.
   - **Retry Policy** — Max attempts, backoff strategy (linear/exponential), retry conditions.
   - **Failure Handling** — What happens after all retries exhausted (dead-letter queue, alert, compensating action).
   - **Monitoring** — How job health is monitored, success/failure metrics.
   - **Idempotency** — How duplicate job execution is prevented or made safe.
4. **Scheduled Jobs (Cron)** — All cron jobs with expression, timezone, and overlap handling.
5. **Queue Prioritization** — How job queues are prioritized relative to each other.
6. **Scaling Workers** — How workers scale horizontally, concurrency configuration.
`,

    '21-delivery-plan.md': `${baseInstruction}
Generate the **Delivery Plan** document for this project. Include:

1. **Delivery Philosophy** — Approach to delivery (iterative, milestone-based, continuous, etc.), risk management approach.
2. **Team Capacity Assumptions** — Assumed team size, roles (frontend dev, backend dev, designer, QA, DevOps, PM), velocity assumptions (story points per sprint or ideal engineer-days).
3. **Sprint Plan** — Detailed sprint-by-sprint breakdown (5-8 sprints or equivalent milestones):
   For each sprint:
   - **Sprint Goal** — 1-2 sentence objective.
   - **Duration** — Start/end (relative weeks).
   - **Deliverables** — Specific features/tasks completed, expressed as user stories or feature IDs.
   - **Dependencies** — What must be done before this sprint starts.
   - **Definition of Done** — Criteria for sprint completion.
   - **Risk Flags** — Known risks for this sprint.
4. **Milestones** — Key project milestones: name, target date (relative), success criteria.
5. **Critical Path** — Mermaid \`gantt\` chart showing all sprints, their dependencies, and critical path.
6. **MVP vs Full Release** — Clear boundary between MVP and future phases.
7. **Go-Live Checklist** — Pre-launch checklist covering: security review, performance testing, documentation, monitoring setup, rollback plan, stakeholder sign-off.
`,

    '22-testing-strategy.md': `${baseInstruction}
Generate the **Testing Strategy** document for this project. Include:

1. **Testing Philosophy** — Overall approach (TDD, BDD, risk-based, etc.), the test pyramid for this project.
2. **Coverage Targets** — Line/branch/function coverage targets per layer: Unit tests %, Integration tests %, E2E tests %.
3. **Unit Testing** — Framework (Jest, Vitest, Mocha, etc.), what is unit-tested, mocking strategy, example test structure.
4. **Integration Testing** — What integrations are tested, tools used, test database setup (test containers, in-memory DB), fixture management.
5. **End-to-End Testing** — Framework (Playwright, Cypress), which critical flows are covered, test data management, CI environment setup.
6. **API Testing** — Contract testing approach (Pact.js, OpenAPI validation), tool for API tests, test organization.
7. **Performance Testing** — Load testing approach (k6, Artillery), performance test scenarios, acceptance thresholds.
8. **Security Testing** — SAST tools, dependency scanning, penetration testing approach, OWASP ZAP usage.
9. **Test Data Management** — Seeding strategy, anonymization of production data, fixture libraries.
10. **CI Test Gates** — Which tests run in CI, at which stage (pre-commit, PR, merge, deploy), failure thresholds, flaky test policy.
11. **Test Environment Strategy** — How test environments are provisioned and kept in sync with production configuration.
`,

    '23-deployment-arch.md': `${baseInstruction}
Generate the **Deployment Architecture** document for this project. Include:

1. **Deployment Philosophy** — Approach to deployment (blue-green, canary, rolling, feature flags, etc.).
2. **Infrastructure Overview Diagram** — A Mermaid diagram showing all cloud resources: compute (containers/VMs/serverless), databases, caches, load balancers, CDN, DNS, secrets management, monitoring.
3. **Cloud Provider Recommendation** — Recommended cloud provider(s) with specific services to use and justification.
4. **Container Strategy** — Dockerfile structure, base images, multi-stage builds, image tagging strategy, registry.
5. **Kubernetes / Orchestration** — If using K8s: namespace layout, deployments, services, ingress, resource limits, HPA config. If not K8s, document the orchestration alternative.
6. **Environment Strategy** — All environments (local, dev, staging, prod), what's different in each, environment-specific config management.
7. **CI/CD Pipeline** — Detailed pipeline stages: source → build → test → security scan → artifact push → deploy → smoke test → notification. Tools used at each stage.
8. **Infrastructure as Code** — Which IaC tool (Terraform, Pulumi, CDK), module structure, state management.
9. **Secrets Management** — How secrets are stored, rotated, and injected (Vault, AWS Secrets Manager, Kubernetes Secrets).
10. **Observability Stack** — Logging (structured JSON, log aggregation tool), metrics (Prometheus/Grafana or equivalent), tracing (OpenTelemetry), alerting rules.
11. **Disaster Recovery** — Multi-region strategy, RTO/RPO targets, failover procedure, chaos engineering approach.
`,

    '24-risk-register.md': `${baseInstruction}
Generate the **Risk Register** document for this project. Include:

1. **Risk Management Approach** — How risks are identified, assessed, tracked, and mitigated in this project.
2. **Risk Matrix** — A 5×5 probability vs impact matrix explaining the scoring methodology.
3. **Risk Register Table** — A comprehensive table with: Risk ID | Category | Risk Description | Probability (1-5) | Impact (1-5) | Risk Score | Mitigation Strategy | Contingency Plan | Owner | Status.

   Risks to consider:
   - **Technical Risks**: Technology immaturity, integration complexity, performance bottlenecks, security vulnerabilities, technical debt.
   - **Schedule Risks**: Scope creep, dependency delays, key person risk, underestimated complexity.
   - **Business Risks**: Requirement changes, stakeholder misalignment, competitor moves, regulatory changes.
   - **Operational Risks**: Infrastructure failures, data loss, vendor lock-in, support gaps.
   - **External Risks**: Third-party API deprecation, cost overruns, compliance requirements.

4. **Top 5 Risks Deep Dive** — For the 5 highest-scored risks, a detailed analysis: root cause, early warning indicators, detailed mitigation plan, residual risk after mitigation.
5. **Risk Monitoring Plan** — Frequency of risk review, escalation path, risk owner responsibilities.
`,

    '25-developer-handoff.md': `${baseInstruction}
Generate the **Developer Handoff Guide** document for this project. This document is read by a new developer joining the project on day one. Include:

1. **Project Overview** — 1-page executive summary of what this project is, why it exists, and who uses it.
2. **Local Development Setup** — Complete, copy-paste-ready steps to get the project running locally:
   - Prerequisites (Node version, Docker, etc.)
   - Environment setup (cloning, .env configuration, all required environment variables with descriptions)
   - Database setup (migrations, seed data)
   - Starting all services (commands for each)
   - Verifying the setup works (what to check)
3. **Repository Structure** — Annotated file tree showing what each directory and key file is for.
4. **Architecture Decision Log** — The most important architectural decisions made, why they were made, and what alternatives were rejected.
5. **Coding Conventions** — Naming conventions, file organization, comment style, async/await patterns, error handling patterns, this project follows.
6. **Key Domain Concepts** — Glossary of domain-specific terms a new developer needs to understand.
7. **Development Workflow** — Branch naming, PR process, code review checklist, merge strategy, how to run tests locally.
8. **Known Gotchas & Pitfalls** — At least 5 non-obvious things that trip up new developers on this project.
9. **Debugging Guide** — How to debug the frontend, backend, database, and background jobs locally.
10. **Useful Scripts & Commands** — Reference table of all useful npm/make/CLI commands with descriptions.
11. **Contacts & Resources** — (Template) Who to ask about what, links to design files, project management tool, etc.
`,

    '26-security-overview.md': `${baseInstruction}
Generate the **Security Overview** document for this project. Include:

1. **Security Philosophy** — Overall security posture, security-by-design principles applied.
2. **STRIDE Threat Model** — Apply the STRIDE framework to this specific project. For each threat category (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege), identify:
   - Specific threats relevant to this project
   - Affected components
   - Mitigation controls in place
3. **Attack Surface Analysis** — A table of all external-facing interfaces: Interface | Exposure | Auth Required | Known Risks | Mitigations.
4. **Security Principles Applied** — How each principle is implemented: least privilege, defense in depth, fail secure, separation of duties, zero trust (if applicable).
5. **Security Controls Inventory** — All security controls: Control | Type (preventive/detective/corrective) | Layer | Implementation.
6. **Dependency Security** — Strategy for tracking and patching vulnerable dependencies (Dependabot, Snyk, npm audit).
7. **Security Testing** — Penetration testing plan, SAST/DAST tools, vulnerability disclosure policy.
8. **Incident Response** — High-level incident response playbook: detection → triage → containment → eradication → recovery → post-mortem.
9. **Security Review Checklist** — Pre-launch security checklist specific to this project.
`,

    '27-auth-strategy.md': `${baseInstruction}
Generate the **Authentication Strategy** document for this project. Include:

1. **Authentication Overview** — Chosen authentication mechanism and rationale (JWT, session cookies, OAuth2, OIDC, API keys, etc.).
2. **Authentication Flow Diagram** — A Mermaid sequence diagram of the complete authentication flow from login to API access.
3. **Token Lifecycle** — Access token: format, payload claims (with descriptions), expiry, signing algorithm and key management. Refresh token: storage, rotation policy, expiry, revocation.
4. **Session Management** — If using sessions: session storage (server-side/client-side), session fixation prevention, concurrent session handling.
5. **Password Policy** — Minimum requirements, hashing algorithm (bcrypt/argon2 with cost factor), breach detection, reset flow.
6. **OAuth2 / Social Login** — If applicable: which providers, PKCE flow, token exchange, user account linking strategy.
7. **Multi-Factor Authentication (MFA)** — Whether MFA is supported, which factors (TOTP, SMS, email OTP, WebAuthn), enrollment flow, recovery codes.
8. **Single Sign-On (SSO)** — If applicable: SAML/OIDC integration, IdP configuration, just-in-time provisioning.
9. **API Authentication** — How API clients authenticate (API keys, service accounts, machine-to-machine OAuth2).
10. **Auth Security Controls** — Rate limiting on auth endpoints, account lockout policy, suspicious activity detection, secure cookie flags.
11. **Auth Error Handling** — Error messages that don't leak information, timing attack prevention.
`,

    '28-roles-permissions.md': `${baseInstruction}
Generate the **Roles & Permissions (RBAC/ABAC)** document for this project. Include:

1. **Authorization Model** — RBAC (role-based), ABAC (attribute-based), or hybrid. Justification for the chosen model.
2. **Role Definitions** — For each role: Role Name | Description | How Assigned | Scope (global/organization/resource-level) | Max Number of Users.
3. **Permission Catalog** — All permissions in the system: Permission ID | Resource | Action | Description.
4. **RBAC Matrix** — A table mapping every role to every permission (✓ allowed, ✗ denied, ◑ conditional).
5. **Role Hierarchy** — If roles have inheritance, document the hierarchy with a Mermaid diagram.
6. **ABAC Conditions** — If any permissions are attribute-based (e.g., "owner can edit their own resources"): condition definition, attributes used, evaluation logic.
7. **Role Assignment Rules** — Who can assign which roles, whether roles require approval, how role assignment is audited.
8. **Permission Enforcement** — Where permissions are enforced: API middleware, service layer, database RLS policies, frontend UI hiding.
9. **Permission Escalation Prevention** — How privilege escalation attacks are prevented.
10. **Audit Logging** — What permission changes and access denials are logged, log format, retention.
`,

    '29-data-security.md': `${baseInstruction}
Generate the **Data Security & Encryption** document for this project. Include:

1. **Data Classification** — Classification tiers (Public, Internal, Confidential, Restricted) with examples for this project's data types.
2. **PII Inventory** — Complete table of all Personally Identifiable Information collected: Field | Entity | Purpose | Legal Basis | Retention Period | Encrypted.
3. **Encryption at Rest** — Which database columns/fields are encrypted at the application level (not just disk encryption), encryption algorithm and key size, key management solution (KMS, Vault), rotation policy.
4. **Encryption in Transit** — TLS version requirements, certificate management, HSTS policy, certificate pinning (if mobile).
5. **Data Masking Rules** — Which fields are masked in: logs, API responses for non-owners, analytics events, error messages, customer support views.
6. **Database Security** — Connection security, network isolation (VPC), database user permissions (least privilege), audit logging of DML statements.
7. **Backup Security** — Backup encryption (separate key from data), backup access controls, backup integrity verification.
8. **Data Residency** — Where data is stored geographically, data sovereignty requirements, cross-border transfer mechanisms (SCCs, adequacy decisions).
9. **Secret Management** — How application secrets (DB passwords, API keys) are stored, rotated, and accessed by the application.
10. **Data Breach Response** — Detection, containment, notification timeline (GDPR 72-hour rule), affected party notification process.
`,

    '30-api-security.md': `${baseInstruction}
Generate the **API Security** document for this project. Include:

1. **OWASP API Security Top 10 Checklist** — For each of the 10 OWASP API Security risks, assess whether this project is affected and document the mitigation:
   - API1: Broken Object Level Authorization
   - API2: Broken Authentication
   - API3: Broken Object Property Level Authorization
   - API4: Unrestricted Resource Consumption
   - API5: Broken Function Level Authorization
   - API6: Unrestricted Access to Sensitive Business Flows
   - API7: Server Side Request Forgery
   - API8: Security Misconfiguration
   - API9: Improper Inventory Management
   - API10: Unsafe Consumption of APIs

2. **Rate Limiting Strategy** — Per-endpoint rate limits, global rate limits, rate limit headers returned, rate limit bypass prevention, IP vs user-based limiting.
3. **Input Validation Rules** — Validation approach (schema validation library), rules for strings (max length, allowed characters), numbers (min/max, integer vs float), file uploads (type whitelist, size limit, virus scanning), JSON depth limits.
4. **CORS Policy** — Allowed origins, allowed methods, allowed headers, credentials flag, preflight caching.
5. **API Key Management** — If API keys are used: generation, storage (hashed in DB), scoping, rotation, revocation, key in header vs query param.
6. **Request Signing** — If webhook payloads or sensitive requests are signed: algorithm, header format, timestamp tolerance, replay attack prevention.
7. **SQL Injection Prevention** — Parameterized queries enforcement, ORM usage, raw query review process.
8. **Response Security Headers** — All security headers returned: Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy.
9. **API Monitoring for Security** — Anomaly detection, suspicious pattern alerting, API abuse detection.
`,

    '31-compliance-audit.md': `${baseInstruction}
Generate the **Compliance & Audit Trail** document for this project. Include:

1. **Applicable Compliance Frameworks** — Based on the project type and data handled, identify which frameworks apply and their key requirements for this project:
   - **GDPR** — If serving EU users: lawful basis for processing, data subject rights implementation, DPA requirements, privacy notice.
   - **HIPAA** — If handling health data: PHI definition in context of this project, required safeguards, BAA requirements.
   - **PCI-DSS** — If handling payment data: cardholder data scope, applicable SAQ level, key requirements.
   - **SOC 2** — Trust service criteria relevant to this project: Security, Availability, Confidentiality.
   - **Other** — Any other relevant standards (ISO 27001, CCPA, FERPA, etc.).

2. **Audit Log Design** — Complete specification of the audit log:
   - What events are logged (CRUD on all sensitive entities, auth events, permission changes, config changes, data exports)
   - Log entry schema (JSON): event_id, timestamp, actor_id, actor_role, action, resource_type, resource_id, old_value, new_value, ip_address, user_agent, result
   - Storage: separate audit log table/service, immutability guarantees, retention period
   - Access controls on audit logs

3. **Data Retention Policy** — Table per data type: Data Type | Retention Period | Legal Basis | Deletion Method | Archival Strategy.
4. **Right to Erasure (GDPR Article 17)** — How user deletion is implemented: what data is deleted, what is anonymized and why, cascade behavior, confirmation process, timeline.
5. **Data Subject Rights** — How each right is fulfilled: right of access (data export), right to rectification, right to restriction, right to portability, right to object.
6. **Compliance Monitoring** — Ongoing compliance checks, internal audit frequency, external audit preparation, compliance dashboard.
7. **Privacy by Design** — How privacy principles are embedded in the development process (privacy impact assessments, data minimization in schema design).
`,
  }

  const prompt = prompts[docKey]
  if (!prompt) {
    return `${baseInstruction}
Generate a comprehensive markdown document for: ${docKey}

Based on the project context above, create a thorough, specific, and professional document covering all relevant aspects of this topic for this particular project. Use proper markdown formatting with headers, tables, code blocks, and Mermaid diagrams where appropriate.
`
  }

  return prompt
}

module.exports = { buildDocPrompt }
