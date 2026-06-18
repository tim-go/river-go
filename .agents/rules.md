---
description: River Go project rules, commands, and conventions
---

# Shared Repo Rules

Read these first:

1. `AGENTS.md`
2. Relevant focused rules in `.agents/rules/`
3. `/docs/specs/README.md`
4. `/docs/specs/spec-consolidation-map.md` when choosing the owning spec
5. `/docs/strategy/delivery-plan.md` for current feature state

## Focused Rule Files

Read focused rules before editing the relevant area:

- River Go implementation, content, design, review, refactor, release, data, or platform work: `.agents/rules/river-go-spec-first-development.md`
- Frontend, UI, map layout, styling, copy, or component work: `.agents/rules/river-go-frontend.md`
- Backend / API work (`api/`, PostGIS, migrations, auth, contribution sync): `.agents/rules/river-go-backend.md`
- Tests or test setup: `.agents/rules/river-go-testing.md`
- Any user-facing copy or condition indicator (the no-advice invariant): `.agents/rules/river-go-no-advice.md`

Focused rules are mandatory when their trigger applies. Skills provide workflow help, but rules are the durable standards.

## Spec-Driven Development

Follow `.agents/rules/river-go-spec-first-development.md`.

Specs are local to this repository under `/docs/specs`.

Strategy documents live under `/docs/strategy`.

## Architecture Principle

Prefer simple architecture. Choose the fewest moving parts that cleanly satisfy the current product requirement, preserve ownership boundaries, and leave a clear path to extend later.

Do not introduce backend services, databases, queues, or provider abstractions until they solve a concrete current problem or a clearly understood near-term risk.

## Current Status

Current durable planning and delivery state live in:

- `/docs/strategy/delivery-plan.md`
- `/docs/specs/`

The app is a Vite/React 19/Leaflet frontend plus a standalone Cloud Run + PostGIS API (`api/`). Discovery is river-first (canonical rivers are the primary object); contributions are identity-gated and sync to the API. `App.tsx` has been decomposed across `src/components`, `src/lib`, `src/services`, and `src/discovery`.

## Key Commands

```bash
# Install dependencies
npm install

# Local dev (frontend; dev:lan binds :6173 and is LAN-exposed)
npm run dev:lan
npm run api:dev        # local API on :8080 (needs the local DB on :5440)

# Validation gate for code changes
npm run build && npm test && npm --prefix api run test

# API-only checks
npm --prefix api run build
npm --prefix api run test
```

## Key Files

Frontend:

- `/src/App.tsx` — app shell and orchestration
- `/src/components/` — extracted UI (e.g. `RiverMap.tsx`, `ContributorOnramp.tsx`)
- `/src/discovery/` — river-first discovery context
- `/src/lib/` — pure helpers (`format.ts`, `uuid.ts`, `contributorGate.ts`, ...)
- `/src/services/` — API and Firebase clients
- `/src/styles.css`, `/src/types.ts`

Backend:

- `/api/src/server.ts` — HTTP routing
- `/api/src/` — members, contributions, auth, sync, public-name
- `/api/migrations/` — numbered SQL migrations

Docs:

- `/docs/strategy/delivery-plan.md`
- `/docs/specs/spec-consolidation-map.md`

## Working Conventions

- Do not auto-commit, auto-push, or open PRs unless explicitly asked.
- For durable work, update the owning spec before or alongside implementation.
- Keep the repo tidy. Prefer editing existing specs/files over creating unnecessary new files.
- Use `rg` for searching.
- Validation gate for code changes before handoff: `npm run build && npm test && npm --prefix api run test` (API-only changes: `npm --prefix api run build && npm --prefix api run test`). See `.agents/rules/river-go-testing.md`.
- Do not stamp `Delivered` fields unless the user explicitly asks for a release-cut/stamping task.

## Terminal Command Rules

- Use Bash-compatible commands in this workspace.
- Do not open interactive shells unless explicitly asked.
- Prefer separate, readable commands for multi-step workflows.
- Before destructive or publishing actions, check branch/status and wait for the previous command to succeed.
