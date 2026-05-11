# Specter — Application

This directory contains the full-stack application. See the [root README](../README.md) for project overview, feature list, and quick start.

## Commands

Run all commands from this directory (`app/`):

```bash
# Development (run concurrently in separate terminals)
npm run dev            # Vite frontend — http://localhost:5173
npm run dev:server     # Express API  — http://localhost:4000

# Production
npm run build          # Compile frontend → dist/
npm run start:server   # Serve API + compiled frontend
npm run preview        # Preview production build locally
```

## Database

PostgreSQL is managed via Docker Compose (run from the **repository root**):

```bash
# Start database + Adminer UI only
docker compose up -d postgres adminer

# Start the full stack (DB + API + frontend in containers)
docker compose up -d

# Stop everything
docker compose down
```

- PostgreSQL: `localhost:5432`
- Adminer UI: `http://localhost:8080`

The schema is created automatically on first server startup (`server/db/pool.js → ensureSchema`). No migration tool is needed.

## Environment

Copy `.env.example` to `.env` before starting the server:

```bash
cp .env.example .env
```

Requires a running [Ollama](https://ollama.ai) instance with the configured model already pulled:

```bash
ollama pull gemma3:12b
```

## Architecture

See the root [README Architecture section](../README.md#architecture-overview) and the inline comments in:

- `server/db/pool.js` — schema definition and doc catalogs
- `server/lib/doc-prompts.js` — 31 document prompt builders
- `src/api.ts` — all frontend API calls and SSE readers
