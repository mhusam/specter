# Specter

Local-first AI assistant that turns project ideas into structured specs and a **22-document specification package** plus a **31-document technical catalog** — powered by [Ollama](https://ollama.ai). No cloud, no API keys; data stays on your machine.

## Screenshots

| Dashboard | New project (AI-assisted) | Settings |
|:---:|:---:|:---:|
| ![Home — projects dashboard](screenshots/home.png) | ![New project with AI-assisted questionnaire](screenshots/new-project-using-ai-assisted.png) | ![App settings — Ollama and model](screenshots/settings.png) |

## Highlights

- **Spec agent** — four-phase requirements chat (Discovery → Deep Dive → Gap analysis → Confirmation), then one-click spec generation with versioning, diffs, and export
- **Docs catalog** — generate and refresh 31 technical docs from your project context
- **AI-assisted intake** — custom questions and suggested answers from your vision; optional standard questionnaire
- **PostgreSQL + React (Vite)** — Docker Compose stack for a fast local setup

## Stack

React 19 · TypeScript · Vite · Tailwind v4 · Express 5 · PostgreSQL 16 · Ollama (SSE streaming)

## Prerequisites

1. [Ollama](https://ollama.ai) running, e.g. `ollama pull gemma3:12b` (larger models improve output quality)
2. **Either** Docker **or** Node 20+ and PostgreSQL 16

## Quick start (Docker)

```bash
git clone https://github.com/mhusam/specter.git
cd specter
docker compose up -d
```

Open **http://localhost:5173** — first start may take 1–2 minutes. API: **http://localhost:4000** · Adminer: **http://localhost:8080** (`postgres` / `postgres` / DB `specter`, server host `postgres`).

```bash
docker compose down          # stop (data kept)
docker compose down -v       # reset DB
```

## Local dev (no full stack)

```bash
cd specter/app && pnpm install && cp .env.example .env
# edit DATABASE_URL, then:
pnpm run dev:server   # :4000
pnpm run dev          # :5173
```

See `app/.env.example` for `OLLAMA_*`, `DATABASE_URL`, and `VITE_API_BASE_URL`. Change the model in **Settings** in the UI or via `OLLAMA_MODEL`.

## Production

```bash
export POSTGRES_PASSWORD=…
export OLLAMA_BASE_URL=http://your-ollama:11434
docker compose -f docker-compose.prod.yml build && docker compose -f docker-compose.prod.yml up -d
```

Serve behind TLS; do not expose Postgres or Adminer publicly.

## More

- [CONTRIBUTING.md](CONTRIBUTING.md) — dev setup, conventions, PRs  
- Smoke tests: `bash scripts/e2e-test.sh` (expects `ALL TESTS PASSED 23/23`)

## License

[MIT](LICENSE)
