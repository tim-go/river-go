---
description: Testing approach and validation gate for River Go
---

# River Go Testing Rules

Read this before adding tests or changing test setup.

## Philosophy

Testing is deliberately minimal during early development. Test the stable, pure,
high-risk logic — validators, id generation, gate rules, parsing/formatting — not
volatile UI structure.

- Add a regression test for every real logic bug. Favour invariants (for example
  "a generated default name must pass its own validator").
- Do not write component/DOM tests or broad E2E yet; they are brittle while the
  UI churns. Revisit once core flows stabilise.
- Tests on pure functions survive refactors and only fail when behaviour genuinely
  changes, so they do not slow iteration.

## Setup

Vitest runs in both workspaces in a node environment, in-process (no ports, no DOM):

- Frontend: `npm test` (config `vitest.config.ts`, specs `src/**/*.test.ts`).
- API: `npm --prefix api run test` (config `api/vitest.config.ts`; a small plugin
  maps NodeNext `.js` imports to `.ts`).

Keep tested logic in pure modules. `src/lib/format.ts` imports Leaflet (touches
`window` at load), so its helpers are not unit-testable in node without a DOM or a
pure/Leaflet split.

## Validation Gate

For code changes, the gate before handoff, commit, or push is:

```bash
npm run build && npm test && npm --prefix api run test
```
