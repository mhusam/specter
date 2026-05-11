/**
 * Spec Agent document catalog — 22 documents generated from stakeholder conversations.
 * Each entry defines the doc key, display metadata, and the generation prompt template.
 *
 * These are separate from the existing 31-doc DOC_CATALOG in pool.js.
 * They are stored in spec_versions.docs_snapshot JSONB, not project_doc_states.
 */

const SPEC_DOC_CATALOG = [
  {
    key: '00-index.md',
    title: 'Documentation Index',
    category: 'navigation',
    promptTemplate: (project, reqContext) => `
You are generating the Documentation Index for a software specification package.
Project: ${project.name}
Vision: ${project.vision || 'Not provided'}

${reqContext}

Generate a comprehensive documentation index in markdown. Include:
1. A brief intro paragraph explaining this is the spec package for "${project.name}"
2. A "Quick Start for AI Coders" section: which docs to read first (requirements → api → data model)
3. A table mapping each of the 21 other documents to its purpose and "read when" guidance, organized into 5 layers:
   - Layer 1: Product Understanding (01-project-brief, 02-requirements, 03-user-stories, 04-acceptance-criteria)
   - Layer 2: Architecture (05-system-context, 06-architecture, 07-adr/)
   - Layer 3: Implementation Detail (08-api-contract, 09-data-model, 10-component-design, 11-ui-ux-spec)
   - Layer 4: Quality & Delivery (12-security-spec, 13-testing-strategy, 14-deployment-spec, 15-implementation-tasks, 16-non-functional-requirements, 17-integration-spec, 18-error-handling)
   - Layer 5: Reference (19-glossary, 20-traceability-matrix, CHANGELOG.md, CLAUDE.md)
4. A "Spec Session Origin" section listing session name, phases completed, and requirements count.

Output only the markdown content, no preamble.`,
  },
  {
    key: '01-project-brief.md',
    title: 'Project Brief',
    category: 'product',
    promptTemplate: (project, reqContext) => `
You are generating a Project Brief in Amazon Press Release FAQ format.
Project: ${project.name}
Vision: ${project.vision || 'Not provided'}

${reqContext}

Generate a Project Brief with two main sections:

## Press Release
Write a 3-paragraph fictional press release announcing "${project.name}" is launched. Include:
- Opening line with company and announcement
- What the product does and for whom (based on actors and functional requirements)
- Key differentiator and call to action
- One user quote

## Frequently Asked Questions
Customer FAQs (4-5 questions): Who is it for? What problem does it solve? What can I do that I couldn't before? How do I get started?
Internal FAQs (4-5 questions): What is the single most important thing? How do we measure success? What is out of scope? What are the biggest risks?

## Business Context
A markdown table with: Project Name, Vision, Primary Users, Business Problem, Proposed Solution, Success Metrics, Constraints.

## Scope
In Scope (bullet list), Out of Scope (bullet list), Assumptions (bullet list), Constraints (bullet list).

Base ALL content on the elicited requirements and project context. Be specific, not generic.
Output only the markdown, no preamble.`,
  },
  {
    key: '02-requirements.md',
    title: 'Software Requirements Specification',
    category: 'requirements',
    promptTemplate: (project, reqContext) => `
You are generating a Software Requirements Specification following IEEE 830 and EARS syntax.
Project: ${project.name}
Vision: ${project.vision || 'Not provided'}

${reqContext}

EARS format: [WHILE <precondition>] [WHEN <trigger>] the <system/actor> SHALL <response>

Generate a full SRS with these sections:

# Software Requirements Specification

## 1. Introduction
### 1.1 Purpose, 1.2 Scope (in/out), 1.3 Definitions (reference glossary), 1.4 References, 1.5 Overview

## 2. Overall Description
### 2.1 Product Perspective, 2.2 User Classes and Characteristics (table: role, description, tech level, frequency), 2.3 Operating Environment, 2.4 Design Constraints, 2.5 Assumptions and Dependencies (table)

## 3. Specific Requirements
### 3.1 Functional Requirements
Group requirements by feature area (one subsection per major functional area from elicited requirements).
Each requirement: **REQ-{CAT}-{NNN}** followed by the EARS-format statement.
Write at least 15-20 specific functional requirements derived from the conversation.

### 3.2 Non-Functional Requirements
Performance (REQ-PERF-*), Security (REQ-SEC-*), Reliability (REQ-REL-*), Usability (REQ-UX-*), Scalability (REQ-SCALE-*).

### 3.3 Interface Requirements
User interfaces, software interfaces, communication interfaces.

## 4. Requirements Prioritization
Table: Requirement ID | Priority (Must Have / Should Have / Could Have) | Rationale

Be specific and technical. Every requirement must be traceable to the elicited stakeholder needs.
Output only the markdown, no preamble.`,
  },
  {
    key: '03-user-stories.md',
    title: 'User Stories',
    category: 'requirements',
    promptTemplate: (project, reqContext) => `
You are generating User Stories for ${project.name}.

${reqContext}

Generate user stories organized by Epic. Format each story as:

### US-{NNN}: {Title}
**As a** [role], **I want** [capability], **So that** [benefit].
**Priority:** Must Have | Should Have | Could Have
**Linked Requirements:** REQ-{CAT}-{NNN}
**Acceptance Criteria:** (checklist of 3-5 specific, testable conditions)
**Definition of Done:** (what must be true for this story to be complete)
**Notes:** (edge cases, constraints)

Create at least one epic per major functional area identified in the requirements.
Write at least 10-15 user stories in total.
End with a Story Map table: Epic | Story | Priority | Status.

Base every story on the actual elicited requirements — no generic placeholders.
Output only the markdown, no preamble.`,
  },
  {
    key: '04-acceptance-criteria.md',
    title: 'Acceptance Criteria',
    category: 'requirements',
    promptTemplate: (project, reqContext) => `
You are generating Acceptance Criteria in Gherkin BDD format for ${project.name}.

${reqContext}

For each major feature area, write Gherkin scenarios:

\`\`\`gherkin
Feature: [Feature Name]

  Background:
    Given [common setup for all scenarios in this feature]

  Scenario: [Scenario title — happy path]
    Given [initial state]
    When [user/system action]
    Then [expected outcome]
    And [additional outcome]

  Scenario: [Scenario title — error/edge case]
    Given [state]
    When [action]
    Then [error/alternate outcome]

  Scenario Outline: [Template scenario]
    Given [state with <variable>]
    When [action with <variable>]
    Then [outcome]
    Examples:
    | variable | expected |
    | value1   | result1  |
\`\`\`

Write at least 3-4 scenarios per feature area. Cover: happy paths, error cases, edge cases, validation.
Each scenario must be independently executable and map to a user story.
End with a Scenario Coverage Map table: User Story | Scenarios | Coverage description.

Output only the markdown, no preamble.`,
  },
  {
    key: '05-system-context.md',
    title: 'System Context',
    category: 'architecture',
    promptTemplate: (project, reqContext) => `
You are generating a System Context document (C4 Model Level 1) for ${project.name}.

${reqContext}

Generate:

## System Overview
One paragraph describing what ${project.name} does from an external perspective.

## C4 System Context Diagram
A Mermaid C4Context diagram showing:
- The system as a box
- All human actors (users, admins, etc.) from the elicited requirements
- All external systems (email, payment, auth providers, APIs, etc.)
- Relationships with labels and protocols

\`\`\`mermaid
C4Context
  title System Context — ${project.name}
  Person(...)
  System(...)
  System_Ext(...)
  Rel(...)
\`\`\`

## Actors and Stakeholders
Table: Actor | Description | Interaction
Table for external systems: System | Provider | Purpose | Protocol

## System Boundaries
What this system OWNS (bullet list)
What this system CONSUMES from outside (bullet list)
What is OUTSIDE the boundary (bullet list)

## Context-Level Data Flows
Table: Flow | From | To | Data | Trigger

## Quality Goals at System Level
Table: Quality Attribute | Scenario | Target

Make all diagrams and tables specific to the actual actors and integrations mentioned in requirements.
Output only the markdown, no preamble.`,
  },
  {
    key: '06-architecture.md',
    title: 'Architecture Document',
    category: 'architecture',
    promptTemplate: (project, reqContext) => `
You are generating an Architecture Document following the Arc42 12-section template for ${project.name}.

${reqContext}

Generate all 12 sections:

## 1. Introduction and Goals
Requirements overview (top 5-7), Quality Goals table (priority, goal, scenario), Stakeholders table.

## 2. Constraints
Technical Constraints table, Organizational Constraints table, Conventions list.

## 3. Context and Scope
Reference system-context.md. Brief business context and technical context paragraphs.

## 4. Solution Strategy
Architecture style choice with rationale. Technology Decisions table (decision, choice, rationale). Design Principles list.

## 5. Building Block View — Level 1 (Container Diagram)
\`\`\`mermaid
C4Container
  title Container Diagram — ${project.name}
  [containers and relationships based on elicited requirements]
\`\`\`
Level 2: API Server Component Diagram if applicable.

## 6. Runtime View
At least 2 critical flow sequence diagrams using Mermaid sequenceDiagram. Cover the most important user flows.

## 7. Deployment View
Mermaid graph showing production deployment topology.

## 8. Cross-Cutting Concepts
Auth/session management, error handling strategy, logging, data validation, caching, configuration.

## 9. Architecture Decisions
Table referencing ADRs.

## 10. Quality Requirements
Table: Quality Attribute | Measure | Target | Test Approach.

## 11. Risks and Technical Debt
Risks table (risk, probability, impact, mitigation). Tech debt table.

## 12. Glossary
Reference 19-glossary.md.

Make all architecture decisions specific to the project's requirements. Use real technology names where inferable.
Output only the markdown, no preamble.`,
  },
  {
    key: '07-adr-001-technology-stack.md',
    title: 'ADR-001: Technology Stack',
    category: 'architecture',
    promptTemplate: (project, reqContext) => `
You are generating Architecture Decision Record ADR-001 for ${project.name}.

${reqContext}

Generate an ADR about the primary technology stack choices using the Nygard ADR format:

# ADR-001: Technology Stack Selection

## Status: Accepted

## Context
What technical requirements and constraints drove the technology selection for ${project.name}?
Reference the functional requirements and non-functional requirements.

## Decision
State the chosen technology stack clearly: frontend framework, backend language/framework, database, authentication approach, deployment platform, and any key libraries.

## Rationale
Why these choices? What trade-offs were accepted?

## Consequences
Positive outcomes (bullet list). Negative/accepted drawbacks (bullet list). Risks (bullet list).

## Alternatives Considered
Table: Alternative | Why Rejected

## Confidence Level: High | Medium | Low

## Related Decisions
Reference ADR-002.

Base decisions on the non-functional requirements, constraints, and technical needs revealed in the conversation.
Output only the markdown, no preamble.`,
  },
  {
    key: '07-adr-002-data-storage.md',
    title: 'ADR-002: Data Storage Strategy',
    category: 'architecture',
    promptTemplate: (project, reqContext) => `
You are generating Architecture Decision Record ADR-002 for ${project.name}.

${reqContext}

Generate an ADR about data storage and persistence strategy using the Nygard ADR format:

# ADR-002: Data Storage Strategy

## Status: Accepted

## Context
What data persistence needs does ${project.name} have? What data volumes, access patterns, consistency requirements, and constraints exist?

## Decision
State the chosen database(s), storage approach, and data architecture decisions.

## Rationale
Why this storage approach? How does it serve the data requirements?

## Consequences
Positive outcomes. Negative/accepted drawbacks. Risks.

## Alternatives Considered
Table: Alternative | Why Rejected

## Confidence Level

## Notes
Migration strategy, scaling considerations.

Base all decisions on the data model and requirements elicited.
Output only the markdown, no preamble.`,
  },
  {
    key: '08-api-contract.md',
    title: 'API Contract',
    category: 'backend',
    promptTemplate: (project, reqContext) => `
You are generating an API Contract document (OpenAPI 3.1-compatible markdown) for ${project.name}.

${reqContext}

Generate a complete API contract with:

## Authentication
How authentication works, token format, where to include it, expiry, refresh strategy.

## Error Format
Standard error response JSON schema with code, message, field, requestId.

## Endpoints
Group endpoints by resource/feature area. For EACH endpoint write:
- HTTP method + path in bold
- Purpose description
- Authentication requirement
- Request body (JSON schema in code block if applicable)
- Query/path parameters (table)
- ALL response status codes with example JSON bodies
- Rate limits if applicable

Cover ALL functional areas identified in requirements. Derive specific endpoints from:
- User/actor actions that need backend support
- Data operations (CRUD) for each entity
- Business logic operations (analyze, generate, process, etc.)
- Auth flows

## Rate Limits
Table: Endpoint Group | Limit | Window

## Status Code Reference
Table of all HTTP status codes used and when each is returned.

Write at least 15-25 specific endpoints. Be precise about request/response schemas.
Output only the markdown, no preamble.`,
  },
  {
    key: '09-data-model.md',
    title: 'Data Model',
    category: 'backend',
    promptTemplate: (project, reqContext) => `
You are generating a Data Model document for ${project.name}.

${reqContext}

Generate:

## Entity Relationship Diagram
A Mermaid erDiagram showing ALL entities and their relationships with cardinality notation.
Include all attributes with types and key indicators (PK, FK, UK).

\`\`\`mermaid
erDiagram
  [entities and relationships derived from requirements]
\`\`\`

## Table Specifications
For EACH table/entity, write a section with:
- **Purpose:** one line
- Columns table: Column | Type | Nullable | Default | Constraints | Description
- **Indexes:** list of index definitions
- **Business Rules:** bullet list of rules enforced at DB level or application level
- **Relationships:** describes FKs and their cascade behavior

Derive entities from ALL actors, data objects, and flows mentioned in requirements.
Include at minimum: users/accounts table, and tables for every major domain entity.

## Migration Strategy
Approach, tool, naming convention, rollback strategy.

## Data Retention
Table: Entity | Retention Policy | Reason

## Sensitive Data Classification
Table: Field | Classification | Protection method

Be specific and complete. Every requirement that involves data must have a corresponding schema.
Output only the markdown, no preamble.`,
  },
  {
    key: '10-component-design.md',
    title: 'Component Design',
    category: 'backend',
    promptTemplate: (project, reqContext) => `
You are generating a Component Design document (C4 Model Level 2/3) for ${project.name}.

${reqContext}

Generate:

## System Containers (C4 Level 2)
Describe each container (web app, API server, database, cache, queue, etc.) with:
- Name, technology, and purpose
- Key responsibilities (bullet list)
- Interfaces exposed or consumed

## Backend Components (C4 Level 3)
Break the API server into logical components:

\`\`\`mermaid
C4Component
  title Component Diagram — API/Backend
  Container_Boundary(api, "API Server") {
    Component(routes, ...)
    Component(services, ...)
    Component(repositories, ...)
    Component(middleware, ...)
  }
\`\`\`

For each component:
- Responsibility description
- Key interfaces/methods it provides
- Dependencies on other components

## Frontend Components (if applicable)
Page/screen components derived from ui-ux spec and user stories.
Component hierarchy diagram (Mermaid graph).
For key components: props, state, and responsibilities.

## Inter-Component Communication
How components communicate (REST, events, direct calls, queues).
Data flow between components for key operations.

## Dependency Map
Mermaid graph showing all component dependencies.

Derive all components from the functional requirements and flows. Name components specifically.
Output only the markdown, no preamble.`,
  },
  {
    key: '11-ui-ux-spec.md',
    title: 'UI/UX Specification',
    category: 'frontend',
    promptTemplate: (project, reqContext) => `
You are generating a UI/UX Specification (DESIGN.md standard) for ${project.name}.

${reqContext}

Generate:

## Design System
Brand Colors table (token, hex placeholder, usage).
Typography table (element, font, size, weight, line-height).
Spacing Scale. Component Patterns (buttons, inputs, cards, modals).

## Information Architecture
Mermaid graph showing all routes/pages and navigation relationships.

## Page Specifications
For EACH page/screen identified in requirements and user stories:
### Page: [Name]
- Route, authentication requirement, layout type
- Purpose paragraph
- Page Sections (describe what appears in each area)
- User Interactions table (interaction, trigger, response, error state)
- States table (loading, empty, error, success appearance and trigger)

## User Flows
For the 3-5 most critical user journeys, write a Mermaid flowchart showing the complete path including decision points, error paths, and success states.

## Accessibility Requirements
WCAG standard, keyboard navigation, focus indicators, color contrast, screen reader support.

## Responsive Breakpoints
Table: Breakpoint | Width | Layout description.

Derive all pages and flows from the user stories and functional requirements.
Output only the markdown, no preamble.`,
  },
  {
    key: '12-security-spec.md',
    title: 'Security Specification',
    category: 'security',
    promptTemplate: (project, reqContext) => `
You are generating a Security Specification for ${project.name}.
Standards: OWASP Top 10, NIST SP 800-53.

${reqContext}

Generate:

## Authentication
Method, token format, TTL, storage approach, rotation strategy.
Password Policy (if applicable): requirements, hashing algorithm.
MFA (if applicable): method and flow.

## Authorization
Model (RBAC/ABAC/etc.), Role definitions table (role, description, permissions).
Permission Matrix table (resource × role with ✓/✗/conditional).

## Data Protection
Encryption at Rest: database, file storage, application-level fields.
Encryption in Transit: TLS version, HSTS, certificate approach.
PII Handling table: Data Type | Fields | Handling | Retention.

## OWASP Top 10 Mitigations
Table: # | Vulnerability | Specific mitigation for this project.
Address all 10 with project-specific mitigations.

## API Security
Rate limiting, input validation, output sanitization, CORS policy, security headers (CSP, HSTS, X-Frame-Options, etc.).

## Compliance
Table: Regulation | Applicability | Key Requirements.
Consider: GDPR, CCPA, SOC2, PCI-DSS based on what the project handles.

## Security Testing
Table: Test Type | Tool | Frequency.

Make every security control specific to ${project.name}'s data and user types.
Output only the markdown, no preamble.`,
  },
  {
    key: '13-testing-strategy.md',
    title: 'Testing Strategy',
    category: 'delivery',
    promptTemplate: (project, reqContext) => `
You are generating a Testing Strategy document for ${project.name}.
Standards: IEEE 829, BDD/Gherkin.

${reqContext}

Generate:

## Test Pyramid
ASCII art pyramid showing unit (70%), integration (20%), e2e (10%) split with rationale.

## Coverage Targets
Table: Layer | Target Coverage | Measured By.

## Test Types
For each type (Unit, Integration, E2E, Contract, Performance): what it tests, when it runs, tool, file naming convention, directory.

## Critical Test Scenarios
For the 4-6 most critical user journeys, write full Gherkin Feature files:
\`\`\`gherkin
Feature: [name]
  Background: [setup]
  Scenario: [happy path]
  Scenario: [error case]
  Scenario Outline: [parameterized]
\`\`\`

## Test Data Strategy
Table: Category | Approach (database state, external APIs, time-dependent, file uploads).

## Continuous Testing Pipeline
Table: Stage | Tests Run | Gate (block or alert).

## Test Environment Requirements
Table: Environment | Database | External Services | Purpose.

Make test scenarios specific to ${project.name}'s acceptance criteria.
Output only the markdown, no preamble.`,
  },
  {
    key: '14-deployment-spec.md',
    title: 'Deployment Specification',
    category: 'delivery',
    promptTemplate: (project, reqContext) => `
You are generating a Deployment Specification for ${project.name}.

${reqContext}

Generate:

## Deployment Architecture
Mermaid graph showing production infrastructure topology (load balancer, app servers, database, cache, CDN, etc.).

## Environments
Table and description for each environment: Local Dev | CI | Staging | Production.
Per environment: purpose, configuration differences, access control, data policy.

## Infrastructure Requirements
For each component: compute (CPU, memory), storage, network, scaling policy.

## CI/CD Pipeline
Mermaid flowchart of the pipeline stages: lint → test → build → staging deploy → e2e → prod deploy.
For each stage: what runs, success criteria, failure behavior.

## Environment Variables and Secrets
Table: Variable | Description | Example Value | Environment | Secret?
How secrets are managed (vault, env files, cloud secrets manager).

## Database Migrations
Migration strategy, run order in deployment, rollback procedure, zero-downtime migration approach.

## Health Checks and Monitoring
Health check endpoints and what they verify.
Key metrics to monitor (latency, error rate, queue depth, DB connections).
Alerting thresholds.

## Rollback Procedure
Step-by-step rollback process for failed deployments.
Data migration rollback strategy.

## Deployment Checklist
Pre-deployment, deployment, post-deployment verification steps as checkboxes.

Make all infrastructure choices consistent with the architecture document and non-functional requirements.
Output only the markdown, no preamble.`,
  },
  {
    key: '15-implementation-tasks.md',
    title: 'Implementation Tasks',
    category: 'delivery',
    promptTemplate: (project, reqContext) => `
You are generating an Implementation Tasks document in GitHub Kiro format for ${project.name}.

${reqContext}

Generate discrete, sequenced, independently-completable implementation tasks.

## Task Overview
Table: Phase | Tasks Count | Key deliverable.

## Phase 1: Foundation
For each foundational task (DB schema, server scaffolding, auth, etc.):
### TASK-{NNN}: {Title}
**Description:** What to build
**Acceptance Criteria:** (checklist, 3-5 items — each must be independently verifiable)
**Linked Requirements:** REQ-*
**Linked User Stories:** US-*
**Dependencies:** TASK-* (or "None")
**Files to Create/Modify:** (specific file paths)

## Phase 2: Core Features
Tasks for each major feature area. Same format.

## Phase 3: Quality & Polish
Testing, performance, security hardening, deployment tasks. Same format.

## Task Dependency Graph
\`\`\`mermaid
graph TD
  T001 --> T002
  T001 --> T003
  [etc.]
\`\`\`

## Implementation Notes for AI Coder
Key conventions, testing approach, commit strategy, definition of done.

Write 20-30 specific tasks derived from the actual requirements. Be precise about file paths and acceptance criteria.
Output only the markdown, no preamble.`,
  },
  {
    key: '16-non-functional-requirements.md',
    title: 'Non-Functional Requirements',
    category: 'quality',
    promptTemplate: (project, reqContext) => `
You are generating a Non-Functional Requirements document (ISO 25010) for ${project.name}.

${reqContext}

Generate detailed NFRs for each quality characteristic:

## Performance
Response time targets (P50, P95, P99 latency), throughput (requests/sec, transactions/min), resource limits.
Each as: **REQ-PERF-{NNN}**: specific, measurable statement.

## Scalability
User/data/transaction volume targets. Horizontal vs vertical scaling approach. Breaking points.
Each as: **REQ-SCALE-{NNN}**.

## Reliability and Availability
Uptime SLA, MTTR, MTBF, failover behavior, data durability.
Each as: **REQ-REL-{NNN}**.

## Security (Quality View)
Security posture requirements beyond the security spec (audit logs, session management, data classification).
Each as: **REQ-SEC-{NNN}**.

## Usability
Time-to-first-value, error message quality, accessibility compliance level, supported browsers/devices.
Each as: **REQ-UX-{NNN}**.

## Maintainability
Code coverage targets, documentation requirements, deployment frequency, DORA metrics targets.
Each as: **REQ-MAINT-{NNN}**.

## Compatibility
Browser support matrix, API versioning policy, backwards compatibility guarantees.
Each as: **REQ-COMPAT-{NNN}**.

## NFR Priority Matrix
Table: Requirement ID | Category | Priority | Rationale | Measurement Method | Target Value.

Derive targets from the elicited requirements. Be specific with numbers.
Output only the markdown, no preamble.`,
  },
  {
    key: '17-integration-spec.md',
    title: 'Integration Specification',
    category: 'backend',
    promptTemplate: (project, reqContext) => `
You are generating an Integration Specification for ${project.name}.

${reqContext}

For EACH external system integration identified in the requirements (email, payment, auth, storage, APIs, etc.):

## Integration: [System Name]
**Provider:** [vendor name]
**Purpose:** [what this integration does for the project]
**Protocol:** REST / SMTP / WebSocket / etc.
**Authentication:** [API key, OAuth, etc.]

### Integration Points
Table: Endpoint/Action | When Called | Request | Response | Error Handling

### Data Mapping
Table: Our Field | External Field | Transformation | Notes

### Error Handling
What happens when this integration fails: retry strategy, fallback, user-facing error.

### Configuration
Environment variables required for this integration.

### Webhook/Event Handling (if applicable)
Events received, verification method, processing logic.

---

## Integration Architecture Overview
Mermaid diagram showing all integration touch points.

## Integration Testing Strategy
How each integration is tested (sandbox, mock, contract tests).

## Failure Modes Summary
Table: Integration | Failure Mode | Impact | Mitigation.

Write complete integration specs for every external dependency identified in requirements.
Output only the markdown, no preamble.`,
  },
  {
    key: '18-error-handling.md',
    title: 'Error Handling Strategy',
    category: 'backend',
    promptTemplate: (project, reqContext) => `
You are generating an Error Handling Strategy document for ${project.name}.

${reqContext}

Generate:

## Error Classification
Hierarchy of error types: System errors, Business logic errors, Validation errors, External service errors, Auth errors.
For each type: what causes it, who sees it, how it is handled.

## Error Code Registry
Complete table of ALL application error codes:
| Code | HTTP Status | Message | When It Occurs | User-Facing? |
Cover every functional area and edge case in the requirements.
Example format: INVALID_CREDENTIALS | 401 | "Invalid email or password." | Login with wrong credentials | Yes

## Standard Error Response Format
JSON schema with all fields. Example response bodies for each error category.

## Validation Error Format
How field-level validation errors are returned. Example with multiple field errors.

## Frontend Error Handling
How each error type is displayed to users:
- Toast/notification messages
- Inline form errors
- Full-page error states
- Recovery actions offered to the user

## Backend Error Handling Patterns
- Try/catch placement strategy
- Logging (what, at what level, what NOT to log — no PII)
- Error propagation chain (route → service → repository)
- Unhandled rejection/exception handling

## External Service Error Handling
For each integration: retry strategy, timeout values, circuit breaker approach, fallback behavior.

## Error Flows
Mermaid diagram for 2-3 critical error scenarios showing the full error propagation path from trigger to user.

Derive error codes from ALL functional requirements and user flows.
Output only the markdown, no preamble.`,
  },
  {
    key: '19-glossary.md',
    title: 'Glossary',
    category: 'reference',
    promptTemplate: (project, reqContext) => `
You are generating a Glossary for ${project.name}.

${reqContext}

Generate a comprehensive glossary with:

## Domain Terms
Alphabetically sorted table of ALL domain-specific terms, concepts, and business vocabulary used in the project.
| Term | Definition | Used In |
Include: business concepts, user roles, domain objects, processes, and any jargon.

## Technical Terms
Abbreviations, acronyms, and technical terms used in the specifications.
| Term | Full Name | Definition |

## System-Specific Terms
Terms specific to ${project.name}'s implementation.
| Term | Definition | Example |

Extract ALL terms from the elicited requirements, user stories, and flows. Be thorough — include every term a developer new to this domain would need to understand.
Output only the markdown, no preamble.`,
  },
  {
    key: '20-traceability-matrix.md',
    title: 'Traceability Matrix',
    category: 'reference',
    promptTemplate: (project, reqContext) => `
You are generating a Requirements Traceability Matrix for ${project.name}.

${reqContext}

Generate:

## Forward Traceability: Requirements → Implementation
Table mapping each requirement to its implementation:
| Requirement ID | Title | User Story | Acceptance Criteria | Component | API Endpoint | Test Scenario | Status |

Cover all REQ-* IDs from requirements.md.

## Backward Traceability: Tests → Requirements
Table showing which tests cover which requirements:
| Test Scenario | Feature | Validates Requirements | User Stories Covered |

## Feature Coverage Map
Table: Feature Area | Requirements Count | User Stories | API Endpoints | Test Scenarios | Coverage %

## Risk Coverage
Which requirements have the most complex testing needs and potential gaps.

## Traceability Health
Summary statistics:
- Total requirements
- Requirements with user stories
- Requirements with tests
- Requirements with no test coverage (gap analysis)

Derive all IDs from the actual documents. Use consistent ID format throughout.
Output only the markdown, no preamble.`,
  },
  {
    key: 'CHANGELOG.md',
    title: 'Changelog',
    category: 'versioning',
    promptTemplate: (project, reqContext) => `
You are generating the initial CHANGELOG.md for ${project.name} specification package.
Format: Keep a Changelog (https://keepachangelog.com/en/1.0.0/)
Versioning: SemVerDoc (MAJOR.MINOR.PATCH)

${reqContext}

Generate:

# Changelog
All notable changes to this specification are documented here.
Format based on Keep a Changelog. Versioning: SemVerDoc.

## [Unreleased]
(placeholder for future changes)

## [v1.0.0] — {today's date}

### Added
- Initial specification package generated from stakeholder elicitation session
- List the major functional areas captured as bullet points
- List key architecture decisions made
- List key data model entities defined

### Session Origin
- Spec Agent session: "Initial requirements"
- Requirements captured: [functional count] functional, [nonfunctional count] non-functional

---

*This changelog tracks specification versions, not code versions. Each entry corresponds to a Spec Agent generation session.*

Use today's date. List at least 8-10 "Added" items based on what was captured in the requirements.
Output only the markdown, no preamble.`,
  },
  {
    key: 'CLAUDE.md',
    title: 'AI Coder Context File',
    category: 'ai-context',
    promptTemplate: (project, reqContext) => `
You are generating a CLAUDE.md AI coder context file for ${project.name}.
This file will be read by Claude Code (and other AI coding agents) at the start of every coding session.

Critical rules:
- Keep it UNDER 300 lines
- Be SPECIFIC, not generic
- Include only what an AI coder would get WRONG without this file
- No obvious instructions
- No padding

${reqContext}

Generate a CLAUDE.md with:

# CLAUDE.md
This file provides guidance to Claude Code when working with code in this repository.

## What This Project Is
[1-2 sentences: what ${project.name} does and for whom — be specific]

## Architecture in 30 Seconds
[4-6 bullet points: stack, auth approach, database pattern, key architectural decisions — specific technology names]

## Where Things Are
[Table: What | Where — list actual directory paths for routes, services, DB, components, tests, etc.]

## Critical Constraints
[Numbered list of 4-6 things the AI MUST know — security rules, patterns to follow, things to avoid]

## Key Business Rules
[5-8 domain-specific rules derived from requirements — things that are non-obvious]

## Commands
\`\`\`bash
[actual commands for dev, test, build, migrate]
\`\`\`

## Spec Documents
Full specifications in \`specs/\` directory. Start with: 02-requirements.md → 08-api-contract.md → 09-data-model.md.

Make every line load-bearing. No filler. Maximum information density.
Output only the markdown, no preamble.`,
  },
]

/**
 * Returns context injection string for a given doc based on its category and the session's elicited requirements.
 */
function buildRequirementsContext(session) {
  const summary = session.elicitedSummaryJsonb
  if (!summary) return ''

  const lines = ['The following requirements were elicited and confirmed by the stakeholder:']

  if (summary.functional && summary.functional.length > 0) {
    lines.push('\nFunctional Requirements:')
    summary.functional.forEach(r => lines.push(`  • ${r}`))
  }
  if (summary.nonfunctional && summary.nonfunctional.length > 0) {
    lines.push('\nNon-Functional Requirements:')
    summary.nonfunctional.forEach(r => lines.push(`  • ${r}`))
  }
  if (summary.constraints && summary.constraints.length > 0) {
    lines.push('\nConstraints:')
    summary.constraints.forEach(r => lines.push(`  • ${r}`))
  }
  if (summary.actors && summary.actors.length > 0) {
    lines.push('\nActors & Roles:')
    summary.actors.forEach(r => lines.push(`  • ${r}`))
  }
  if (summary.flows && summary.flows.length > 0) {
    lines.push('\nKey Flows:')
    summary.flows.forEach(r => lines.push(`  • ${r}`))
  }

  return lines.join('\n')
}

module.exports = { SPEC_DOC_CATALOG, buildRequirementsContext }
