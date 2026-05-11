<h1><img src="docs/specter-logo.svg" width="34" height="34" alt="" aria-hidden="true" style="vertical-align: middle;" /> Specter</h1>

<p align="left">
  <a href="https://github.com/mhusam/specter/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT License" /></a>
  <a href="https://github.com/mhusam/specter/stargazers"><img src="https://img.shields.io/github/stars/mhusam/specter?style=social" alt="GitHub stars" /></a>
  <a href="https://github.com/mhusam/specter/commits/main/"><img src="https://img.shields.io/github/last-commit/mhusam/specter" alt="Last commit" /></a>
</p>

**Who it’s for:** Builders who want **structured requirements and spec markdown** on their own machine — handoff to engineers, stakeholders, or **AI coding agents**, without cloud APIs.

| | |
|:---|:---|
| **Stack** | React, Vite, Express, PostgreSQL, [Ollama](https://ollama.ai) (local LLM) |
| **Community** | [Issues](https://github.com/mhusam/specter/issues) · [Discussions](https://github.com/mhusam/specter/discussions) · [Contributing](CONTRIBUTING.md) |
| **Repo visibility** | Maintainer checklist: [docs/GITHUB-DISCOVERY-CHECKLIST.md](docs/GITHUB-DISCOVERY-CHECKLIST.md) (About, topics, social image) |

**Specter** is a free, open-source AI tool that turns vague project ideas into structured, production-ready documentation — entirely on your own machine, with no cloud, no API keys, and no data leaving your hands.

Describe your project in plain language. Specter's AI agent asks the right questions across four guided phases, captures your requirements, then generates a **22-document specification package** and a **31-document technical catalog** — ready to hand to developers, clients, or another AI coding agent.

> **Everything runs locally.** Powered by [Ollama](https://ollama.ai). Your data stays yours.

---

## Screenshots

<p align="center">
  <img src="screenshots/home.png" alt="Specter dashboard — projects home" width="100%" />
</p>

<p align="center">
  <img src="screenshots/new-project-using-ai-assisted.png" alt="New project with AI-assisted questionnaire" width="47%" />
  &nbsp;
  <img src="screenshots/settings.png" alt="Settings — Ollama and model" width="47%" />
</p>

---

## System architecture

These diagrams use [Mermaid](https://mermaid.js.org/). On **github.com**, open this README in the normal repo view: fenced `mermaid` blocks are **rendered as diagrams** (GitHub’s built-in Mermaid viewer), not as plain code. In the Cursor/VS Code editor you may still see a code fence until you open the Markdown preview on a renderer that supports Mermaid. For a longer AI-coder-oriented write-up, see [docs/SPECTER-AI-CODER-FLOW.md](docs/SPECTER-AI-CODER-FLOW.md).

### End-to-end data flow

```mermaid
flowchart TB
  subgraph IN["Inputs"]
    U[User: name, vision, mode]
    OLL[Ollama HTTP on host or Docker host-gateway]
  end

  PG[(PostgreSQL)]

  U -->|creates project| P[(projects row)]
  P --> PG
  P -->|Standard| QFIX[Static questionnaire UI]
  P -->|AI-assisted| QAI[Ollama: generate questions + suggestions + review]
  QFIX --> ANS[projects.answers JSONB]
  QAI --> ANS
  ANS --> PG

  ANS --> SPECUI[Spec tab: new session]
  SPECUI --> SESS[(spec_sessions + spec_messages)]
  SESS --> PG
  SESS -->|SSE chat| OLL
  OLL -->|phase transitions| SESS

  SESS -->|Generate Spec| GEN22[Ollama x22 prompts from SPEC_DOC_CATALOG]
  GEN22 --> VER[(spec_versions.docs_snapshot: 22 md bodies)]
  VER --> PG

  ANS --> DOCSUI[Docs tab: Generate All]
  DOCSUI --> GEN31[Ollama x31 prompts from DOC_CATALOG + doc-prompts]
  GEN31 --> DOCST[(project_doc_states: 31 md bodies)]
  DOCST --> PG

  VER --> EXP[Export ZIP / MD]
  DOCST --> UI[Read in UI + regenerate per doc]
```

### Spec Agent phases

Phases are driven from `app/server/lib/specPromptBuilder.js` and `app/server/routes/specChat.js`.

```mermaid
stateDiagram-v2
  [*] --> discovery
  discovery --> deep_dive: enough roles and capability areas
  deep_dive --> gap_analysis: EARS-style coverage
  gap_analysis --> confirmation: gaps addressed
  confirmation --> completed: user confirms + READY_FOR_GENERATION
  completed --> [*]
```

---

## What It Does

### Spec Agent — AI Requirements Elicitation
Have a structured conversation with an AI agent trained to extract software requirements. The agent moves through four phases automatically:

| Phase | What Happens |
|---|---|
| **Discovery** | Agent learns what you're building, who it's for, and why |
| **Deep Dive** | Agent probes features, edge cases, and technical constraints |
| **Gap Analysis** | Agent identifies missing information and asks follow-up questions |
| **Confirmation** | Agent summarises all requirements for your approval |

When the conversation is complete, one click generates **22 spec documents** as a versioned snapshot.

### Generated Spec Package (22 documents)
| Layer | Documents |
|---|---|
| Product | Project Brief, Requirements, User Stories, Acceptance Criteria |
| Architecture | System Context, Architecture Overview, Architecture Decision Records |
| Implementation | API Contract, Data Model, Component Design, UI/UX Spec |
| Quality & Delivery | Security Spec, Testing Strategy, Deployment Spec, Task Breakdown, NFRs, Integration Spec, Error Handling |
| Reference | Glossary, Traceability Matrix, Changelog, AI Coding Guide |

### Rich Docs Catalog (31 documents)
A separate catalog of technical documents generated from your project answers:

| Category | Documents |
|---|---|
| Architecture | HLD, Tech Stack, Data Architecture, Integration Architecture |
| Business | Business Rules, Features Catalog, User Personas, Success Metrics |
| Design | UI/UX Overview, Pages & Screens, Page Actions, Navigation |
| Flows | Sequence Diagrams, Data Flow, State Machines, Error Flows |
| Backend | API Contract, Service Layer, Data Models, Background Jobs |
| Delivery | Delivery Plan, Testing Strategy, Deployment Architecture, Risk Register, Developer Handoff |
| Security | Security Overview, Auth Strategy, RBAC, Data Security, API Security, Compliance |

### AI-Assisted Questionnaire

The AI mode goes beyond static questions:
- AI generates **10–20 project-specific questions** based on your name and vision — not generic templates
- Each question comes with **AI-recommended answer options** (marked ★) based on what typically fits your project type
- You can accept AI picks, choose your own, or type a custom answer
- After your answers, the AI **reviews them**, identifies gaps, and asks targeted follow-up questions before saving

### AI Build Potential

On the project setup screen, click **Generate Sample** to get an AI-generated preview of what the project could look like:
- Tagline, overview, and key feature list
- Target user description
- Suggested tech approach
- What the first working version would look like

Updates live as you refine your project name and vision.

### Other Features
- **Version control for specs** — semantic versioning (MAJOR.MINOR.PATCH), diff any two versions side-by-side, restore older versions, export as ZIP or Markdown
- **Checkpoint system** — auto-saves requirement snapshots during conversations, full history timeline
- **Multiple sessions** — run parallel elicitation sessions per project, archive, duplicate, or restore any session
- **Project conversations** — chat with the AI about any project for ad-hoc analysis or Q&A
- **Standard questionnaire** — structured project intake form as an alternative to the AI conversation
- **AI project badge** — projects in your list show a ★ AI badge when created with AI-Assisted mode
- **Light / dark mode** — Neo Brutalism design system

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS v4 |
| Backend | Node.js, Express 5 (CommonJS) |
| Database | PostgreSQL 16 via `pg` driver — no ORM |
| LLM | [Ollama](https://ollama.ai) — runs entirely on your machine |
| Streaming | Server-Sent Events (SSE) for live generation progress |

---

## Prerequisites

Before you start, make sure you have:

1. **[Ollama](https://ollama.ai)** installed and running
2. An Ollama model pulled — the default is `gemma3:12b`:
   ```bash
   ollama pull gemma3:12b
   ```
3. Either **Docker + Docker Compose** (easiest) **or** **Node.js 20+** and **PostgreSQL 16**

> **Model choice matters.** Any Ollama-compatible model works. For the best spec quality, use a model with at least 12B parameters. Models with 27B+ parameters produce significantly better structured output.

---

## Quick Start

### Option A — Docker Compose (recommended for most users)

No Node.js or PostgreSQL installation required — Docker handles everything.

```bash
# 1. Clone the repository
git clone https://github.com/mhusam/specter.git
cd specter

# 2. Start all services
docker compose up -d

# 3. Open the app
open http://localhost:5173
```

That's it. Docker starts the frontend, API server, PostgreSQL database, and Adminer all at once.

**First-time startup takes 1-2 minutes** as Docker downloads images and installs dependencies. You can watch progress with:
```bash
docker compose logs -f api
```

Wait until you see: `Database connected. Model: gemma3:12b`

#### Services

| Service | URL | Purpose |
|---|---|---|
| **App** | http://localhost:5173 | Main web interface |
| **API** | http://localhost:4000 | Backend REST + SSE API |
| **Adminer** | http://localhost:8080 | Database management UI |
| **PostgreSQL** | localhost:5432 | Database (internal) |

#### Adminer — Database Browser

Adminer lets you inspect your data, run SQL queries, and browse tables through a web interface — no command line needed.

**How to log in:**
1. Open http://localhost:8080
2. Fill in the form:
   - **System:** `PostgreSQL`
   - **Server:** `postgres`
   - **Username:** `postgres`
   - **Password:** `postgres`
   - **Database:** `specter`
3. Click **Login**

You'll see all tables: `projects`, `project_doc_states`, `spec_sessions`, `spec_versions`, etc.

> Adminer is for development/debugging only. Do not expose it publicly.

#### Stop / restart

```bash
docker compose down          # stop all containers (data is preserved)
docker compose down -v       # stop and delete all data (fresh start)
docker compose restart api   # restart just the API after code changes
```

---

### Option B — Local Development (without Docker)

Use this if you want to run the code directly on your machine for development.

**Requirements:** Node.js 20+, PostgreSQL 16 running locally, pnpm (recommended) or npm

```bash
# 1. Clone the repository
git clone https://github.com/mhusam/specter.git
cd specter/app

# 2. Install dependencies
pnpm install   # or: npm install

# 3. Set up environment
cp .env.example .env
```

Edit `.env` to match your local setup — at minimum set `DATABASE_URL` to point to your PostgreSQL instance.

```bash
# 4. Start the database (optional — skip if you have your own PostgreSQL)
#    Run this from the repository root, not the app/ directory
cd ..
docker compose up -d postgres adminer
cd app

# 5. Start the servers (two separate terminals)
pnpm run dev:server   # Terminal 1 — API on http://localhost:4000
pnpm run dev          # Terminal 2 — Frontend on http://localhost:5173
```

The database schema is created automatically on first startup. No migrations needed.

---

## Configuration

All configuration lives in `app/.env`. Copy `app/.env.example` to get started:

```bash
cp app/.env.example app/.env
```

| Variable | Default | Description |
|---|---|---|
| `API_PORT` | `4000` | Port the Express API listens on |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/specter` | PostgreSQL connection string |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Where Ollama is running |
| `OLLAMA_MODEL` | `gemma3:12b` | Model to use for all AI generation |
| `CONTRACT_OUTPUT_DIR` | `./contracts` | Where legacy file exports are written |
| `VITE_API_BASE_URL` | `http://localhost:4000` | Frontend → backend URL (Vite only reads `VITE_*` vars) |

> When using Docker Compose, these variables are already set in `docker-compose.yml`. You only need `.env` for local development.

### Changing the AI Model

1. Pull your preferred model:
   ```bash
   ollama pull llama3.1:8b        # smaller, faster
   ollama pull gemma3:27b         # better quality
   ollama pull qwen2.5:32b        # excellent for structured output
   ```
2. Open http://localhost:5173 → **Settings** → change **Ollama Model** → **Save**

Or set `OLLAMA_MODEL` in your `.env` / `docker-compose.yml` before starting.

---

## How to Use It

### 1. Create a project

- Open http://localhost:5173 and click **New Project**
- Enter a name and describe your project vision
- Choose a mode:
  - **Standard** — answer a structured questionnaire (faster, good for well-defined projects)
  - **AI-Assisted** — the AI generates custom questions based on your vision (better for exploratory projects)

### 2. Run the Spec Agent

- Open your project and click the **Spec** tab
- Click **New Session** to start a requirements conversation
- Chat with the agent — it guides you through the four phases automatically
- The **sidebar** shows:
  - **Requirements** — live list of captured functional/non-functional requirements, constraints, actors, and flows
  - **Phase Guide** — where you are in the process and what comes next
  - **History** — checkpoint timeline
- When the agent has enough information, it signals readiness. Click **Generate Spec** to create the document package.

### 3. View and manage versions

- Click the **Versions** tab to see all spec snapshots
- Click the eye icon on any version to read its documents
- Click **Compare Versions** to see a side-by-side diff (word counts, status changes)
- Export any version as a **ZIP** (all 22 files) or **Markdown** (single file)
- Click the restore icon to promote an older version to current

### 4. Generate the full docs catalog

- Click the **Docs** tab
- Click **Generate All** — all 31 documents stream in live
- Expand any category and click a document to read it
- Click **Regenerate** on any individual document to refresh it

### 5. Project conversations

- Click the **Chat** tab to talk to the AI about your project
- Ask questions, get analysis, request summaries — the AI has full context of your project answers and analysis

---

## Production Deployment

Use `docker-compose.prod.yml` for a self-hosted production setup. This builds a single optimised image that serves both the API and compiled frontend on one port.

```bash
# Set required environment variables
export POSTGRES_PASSWORD=your_strong_password_here
export OLLAMA_BASE_URL=http://your-ollama-host:11434

# Build and start
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

The app is then available at `http://your-server:4000`.

> **Ollama in production:** Ollama must be accessible from the server. If running on the same machine, use `http://host.docker.internal:11434`. If on a separate machine, use its IP or hostname.

**Security notes for production:**
- Change `POSTGRES_PASSWORD` — never use the default `postgres`
- Put a reverse proxy (nginx, Caddy) in front and add TLS
- Do not expose port 5432 (PostgreSQL) or 8080 (Adminer) publicly
- The Adminer service is not included in `docker-compose.prod.yml`

---

## Running E2E Tests

A smoke-test script checks all major API endpoints:

```bash
# With the stack running (docker compose up -d or local dev servers):
bash scripts/e2e-test.sh

# Against a different host:
API_BASE=http://your-server:4000 bash scripts/e2e-test.sh
```

Expected output: `ALL TESTS PASSED 23/23`

---

## Project Structure

```
specter/
├── docker-compose.yml           # Development stack (all 4 services)
├── docker-compose.prod.yml      # Production build (single optimised image)
├── scripts/
│   └── e2e-test.sh              # API smoke tests
└── app/
    ├── Dockerfile               # Multi-stage production build
    ├── .env.example             # Environment variable template
    ├── server/                  # Node.js / Express 5 backend (CommonJS)
    │   ├── index.js             # Entry point — starts server, runs ensureSchema
    │   ├── app.js               # Express app — mounts routers, serves static in prod
    │   ├── db/
    │   │   ├── pool.js          # pg Pool, DOC_CATALOG (31 docs), ensureSchema (9 tables)
    │   │   ├── docs.js          # Doc state CRUD
    │   │   ├── projects.js      # Project CRUD
    │   │   ├── settings.js      # App settings read/write
    │   │   └── conversations.js # Conversation history
    │   ├── lib/
    │   │   ├── ollama.js        # callOllama + streamOllama (retries, timeouts)
    │   │   ├── sse.js           # initSse / sendSse helpers
    │   │   ├── doc-prompts.js   # 31 document prompt builders
    │   │   └── specDocCatalog.js# 22 spec document definitions + prompt templates
    │   └── routes/              # One file per API group
    │       ├── health.js        # GET /api/health, GET /api/models
    │       ├── settings.js      # GET/PUT /api/settings
    │       ├── projects.js      # Projects CRUD + analyze + export
    │       ├── docs.js          # Docs CRUD + streaming generation
    │       ├── conversations.js # SSE chat stream
    │       ├── ai.js            # AI questionnaire generation
    │       ├── specSessions.js  # Spec sessions CRUD + checkpoint + duplicate
    │       ├── specChat.js      # Spec agent SSE chat
    │       └── specVersions.js  # Spec version management + export + retry
    └── src/                     # React 19 / TypeScript frontend (ESM)
        ├── api.ts               # All fetch calls + SSE readers + shared types
        ├── hooks/               # One hook per concern
        ├── components/
        │   ├── pages/           # ProjectsPage, NewProjectPage, SettingsPage
        │   ├── spec/            # Spec Agent UI (chat, sidebar, versions, diff)
        │   └── ui/              # Shared components (DocCategoryViewer, Toast, etc.)
        └── contexts/            # ThemeContext, ToastContext
```

---

## Troubleshooting

### "Ollama not reachable" in Settings

- Make sure Ollama is running: `ollama serve`
- If using Docker, the compose file uses `host.docker.internal` to reach Ollama on your host. This works on Mac and Windows. On Linux, add `extra_hosts: ["host.docker.internal:host-gateway"]` to the API service in `docker-compose.yml`.
- Check Settings → Ollama Base URL matches where Ollama is actually running

### Generation produces empty or very short documents

- Try a larger model (`gemma3:27b`, `qwen2.5:32b`)
- Make sure your project has detailed answers — the AI uses your inputs as context
- For the Spec Agent, complete more conversation phases before generating

### Port already in use

```bash
# Check what's using the port
lsof -i :5173
lsof -i :4000
lsof -i :5432
```

Change ports in `docker-compose.yml` or `.env` if needed.

### Frontend shows blank page or errors

```bash
# Check both servers are running
curl http://localhost:4000/api/health
curl -I http://localhost:5173
```

If using Docker, check that the frontend container started correctly:
```bash
docker compose logs frontend
```

### Database connection failed

- Make sure PostgreSQL is running: `docker compose ps postgres`
- Check `DATABASE_URL` in your `.env` matches your PostgreSQL setup
- The app runs in "degraded mode" without a DB (settings and projects won't persist)

### Adminer login fails

Use exactly these values when connecting through Docker Compose:
- Server: `postgres` (not `localhost`)
- Username: `postgres`
- Password: `postgres`

`localhost` won't work because Adminer runs inside Docker and needs to reach the `postgres` container by its service name.

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, conventions, and the pull request process.

Maintainers: improve GitHub discoverability (description, topics, Discussions, social preview) using [docs/GITHUB-DISCOVERY-CHECKLIST.md](docs/GITHUB-DISCOVERY-CHECKLIST.md). Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) and [SECURITY.md](SECURITY.md) before participating.

---

## License

[MIT](LICENSE) — free to use, modify, and distribute.
