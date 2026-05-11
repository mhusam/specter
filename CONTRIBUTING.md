# Contributing to Specter

Thank you for taking the time to contribute. This document covers how to set up a development environment, the project's conventions, and the pull request process.

## Development Setup

Follow the **Option B — Local Development** steps in the [README](README.md). You'll need Node.js 20+, PostgreSQL 16, and a local Ollama instance.

```bash
cd app
cp .env.example .env   # fill in your local values
npm install
npm run dev            # frontend — http://localhost:5173
npm run dev:server     # backend  — http://localhost:4000
```

## Project Structure

```
app/
├── server/           # Node.js/Express backend (CommonJS)
│   ├── db/           # Pool, schema management, doc catalog
│   ├── lib/          # Ollama client, SSE helpers, doc prompt builders
│   └── routes/       # One file per route group
└── src/              # React/TypeScript frontend (ESM)
    ├── api.ts        # All fetch calls and SSE readers
    ├── hooks/        # React hooks (one concern per hook)
    ├── components/   # React components organised by feature
    └── contexts/     # Theme and Toast contexts
```

## Conventions

### Backend

- CommonJS (`require`/`module.exports`) throughout `server/`
- One router file per domain (projects, docs, spec sessions, spec versions, conversations, health, settings)
- All Ollama calls go through `server/lib/ollama.js` — do not call Ollama directly from routes
- Streaming endpoints: call `initSse(res)`, emit `sendSse(res, event, data)` events, always call `res.end()` in a `finally` block
- No ORM — use the `pg` Pool from `server/db/pool.js` directly
- Wrap multi-statement operations in `BEGIN` / `COMMIT` / `ROLLBACK` transactions

### Frontend

- TypeScript strict; prefer explicit types over `any`
- All API calls live in `src/api.ts` — no `fetch` calls scattered in components or hooks
- One hook per concern (`useSpecSessions`, `useSpecVersions`, etc.) — hooks should not call each other
- Never hardcode colors directly; always use `theme.*` tokens from `useTheme()`
- Design system: Neo Brutalism — `border-2` components, `border-4` panels, `bg-pink-400 text-black` for active tabs, `bg-yellow-200 text-black` for selected items

### Git

- Branch from `main`, name branches `feature/<short-description>` or `fix/<short-description>`
- Commits follow conventional commits loosely: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Keep PRs focused — one logical change per PR

## Adding a New Spec Document

The 22-document spec package is defined in `server/db/pool.js` (`SPEC_DOC_CATALOG`). To add a document:

1. Add an entry to `SPEC_DOC_CATALOG` with a unique `key`, `category`, and `title`
2. Add a corresponding prompt builder case in `server/lib/spec-prompts.js`
3. Update the `SPEC_CATEGORY_ORDER` and `SPEC_CATEGORY_LABELS` constants in `src/components/pages/ProjectsPage.tsx` if you're adding a new category

## Adding a New Project Doc

The 31-document catalog is defined in `DOC_CATALOG` in `server/db/pool.js`. Add the entry there and a new case in `server/lib/doc-prompts.js`.

## Submitting a Pull Request

1. Fork the repo and create a branch from `main`
2. Make your changes with clear, focused commits
3. Ensure the app runs end-to-end locally (no console errors, no TypeScript errors)
4. Open a PR with a short description of **what** changed and **why**
5. Link any relevant issues

## Reporting Bugs

Open a GitHub Issue with:
- Steps to reproduce
- Expected vs actual behaviour
- Your OS, Node version, Ollama model, and browser

## License

By contributing you agree that your contributions will be licensed under the [MIT License](LICENSE).
