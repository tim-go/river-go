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

The current app is a Vite/React/Leaflet prototype with River Wye seed data and localStorage-backed demo contributions.

## Key Commands

```bash
# Install dependencies
npm install

# Local dev
npm run dev

# Production build/type check
npm run build
```

## Key Files

- `/src/App.tsx`
- `/src/styles.css`
- `/src/types.ts`
- `/src/data/demoData.ts`
- `/src/data/riverWyeSeed.ts`
- `/src/data/wyeRouteTraces.ts`
- `/scripts/generateWyeRouteTraces.mjs`
- `/docs/strategy/delivery-plan.md`
- `/docs/specs/spec-consolidation-map.md`

## Working Conventions

- Do not auto-commit, auto-push, or open PRs unless explicitly asked.
- For durable work, update the owning spec before or alongside implementation.
- Keep the repo tidy. Prefer editing existing specs/files over creating unnecessary new files.
- Use `rg` for searching.
- Use `npm run build` as the current validation gate before handoff for code changes.
- Do not stamp `Delivered` fields unless the user explicitly asks for a release-cut/stamping task.

## Terminal Command Rules

- Use Bash-compatible commands in this workspace.
- Do not open interactive shells unless explicitly asked.
- Prefer separate, readable commands for multi-step workflows.
- Before destructive or publishing actions, check branch/status and wait for the previous command to succeed.
