---
description: Local spec-first development rules for River Go
---

# Spec-First Development Rules

Read this before changing durable River Go product, UX, data, release, content, backend, frontend, or operational behaviour.

## Source Of Truth

Specs are local to this repository under `/docs/specs`.

Do not require a separate external spec repository before implementation work in this repo.

## Core Rules

1. **No durable implementation work without a local spec.**
   Every durable code, content, UX, data, release, provider, community, or platform change should correspond to a spec under `/docs/specs`.

2. **Update the local spec first, or in the same branch.**
   If no local spec covers the work, create or update the relevant spec in `/docs/specs` before implementation, unless the user explicitly asks for a spike or investigation.

3. **Keep implementation and spec in the same feedback loop.**
   If implementation reveals the spec is wrong or incomplete, update the local spec rather than silently letting code drift.

4. **Reference the local spec in PRs and handoffs.**
   Final handoffs for durable work should name the relevant `/docs/specs/...` path.

5. **Do not stamp release history during normal work.**
   `Delivered` fields are immutable release history. Do not add, remove, or alter `Delivered` values unless the task is explicitly a release-cut/stamping task.

6. **Keep spec change logs meaningful.**
   Do not add a `Change Log` entry for every small request. Use spec change logs only for significant spec-level changes, such as new specs, feature contract changes, meaningful feature/backlog changes, work-state or maturity changes, release interpretation, or notable architecture/data/product decisions.

## How To Find The Owning Spec

Start at:

- `/docs/specs/README.md`
- `/docs/specs/spec-consolidation-map.md`
- `/docs/strategy/delivery-plan.md`

Then search local specs:

```bash
rg -n "<feature|domain|surface>" docs/specs docs/product docs/strategy
```

Use these top-level spec buckets:

- `/docs/specs/core/`
- `/docs/specs/data/`
- `/docs/specs/community/`
- `/docs/specs/release/`
- `/docs/specs/ops/`

Use root-relative `/docs/...` Markdown links when referencing docs/spec files from prose. Avoid `../..` traversal links in new or edited spec content.

## Work States

Use the local spec's existing vocabulary.

Current River Go specs use:

- Spec schema: `spec_schema: 4`
- Feature status: `Queued`, `Active`, `Review`, `Landed`, `Blocked`, `Parked`
- Backlog status: `Open`, `Triaged`, `Active`, `Resolved`, `Blocked`, `Parked`
- Maturity: `Unassessed`, `Sketch`, `Draft`, `Buildable`, `Implemented`, `Trial`, `Provisional`, `Validated`, `Stability Candidate`, `Stable`, `Rework Needed`
- Phase: `Now`, `Soon`, `Later`, `Parked`

`Target` is planning intent. `Delivered` is release history.

## Reporting

When finishing durable work, report:

- the local spec path used or updated
- any spec/code divergence that remains
- whether the work was a spike rather than spec-backed implementation
