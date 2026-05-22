# River Go Specs

## Purpose

This folder contains the living specs for River Go.

River Go follows the same three-layer model used in the Kinetiq spec-driven-development methodology:

```text
Strategy  - why
Specs     - what
Code      - how, right now
```

Strategy documents live in `/docs/strategy`. Specs live here under `/docs/specs`. Code implements the current version of the specs.

## Operating Rules

- Durable product, UX, data, backend, community, release, or operational changes should have a matching local spec.
- Update the spec before or alongside implementation.
- If implementation reveals the spec is wrong, update the spec rather than letting code become the only source of truth.
- Do not stamp `Delivered` during normal work. `Delivered` is release history and should only be set during an explicit release-cut task.
- Use root-relative links when referencing docs, for example `/docs/specs/core/river-section-map.md`.

## Spec Schema

River Go specs use Kinetiq spec schema v4.

Required frontmatter:

```yaml
---
spec_schema: 4
maturity: Unassessed
---
```

Common optional roadmap fields depend on the roadmap view the spec contributes to:

- feature specs: `roadmap_<surface>_feature_group`, `roadmap_<surface>_feature_item`, `roadmap_<surface>_feature_phase`
- backend specs: `roadmap_backend_group`, `roadmap_backend_item`, `roadmap_backend_phase`
- release specs: `roadmap_release_group`, `roadmap_release_item`, `roadmap_release_phase`
- ops specs: `roadmap_ops_area`, `roadmap_ops_group`, `roadmap_ops_item`, `roadmap_ops_phase`
- future specs: `roadmap_future_group`, `roadmap_future_item`, `roadmap_future_phase`

Immediately below the H1, include:

```md
**Work state:** Queued
**Last updated:** YYYY-MM-DD
**Scope:** One sentence describing the boundary of this spec.
```

## Required Sections

Default specs should use:

- `## Purpose`
- `## Product Role`
- `## References`
- `## Requirements`
- `## Open Questions`
- `## Tracking`
- `## Change Log`

Domain-specific sections may be added where useful.

## Tracking

Use `### Features` and `### Backlog`.

### Features

```markdown
| Key | Feature | Surface | Status | Target | Delivered | Notes |
```

Feature status values:

- `Queued`
- `Active`
- `Review`
- `Landed`
- `Blocked`
- `Parked`

`Target` is planning intent. `Delivered` is immutable release history and should be `—` until an explicit release cut.

### Backlog

```markdown
| Key | Type | Item | Status | Target | Notes |
```

Preferred backlog type values:

- `decision`
- `dependency`
- `risk`
- `bug`
- `cleanup`
- `enhancement`
- `validation`
- `task`
- `migration`
- `question`

Backlog status values:

- `Open`
- `Triaged`
- `Active`
- `Resolved`
- `Blocked`
- `Parked`

## Maturity

Supported maturity values:

- `Unassessed`
- `Sketch`
- `Draft`
- `Buildable`
- `Implemented`
- `Trial`
- `Provisional`
- `Validated`
- `Stability Candidate`
- `Stable`
- `Rework Needed`

## Spec Buckets

- `/docs/specs/core/` - app/product features and shared domain behaviour
- `/docs/specs/data/` - external data providers, seed data, and normalisation
- `/docs/specs/backend/` - backend API, auth, storage, persistence, and server-side integration design
- `/docs/specs/community/` - contribution, trust, moderation, and contributor workflows
- `/docs/specs/release/` - prototype/MVP/release-level delivery specs
- `/docs/specs/ops/` - operational processes when needed

Start with `/docs/specs/spec-consolidation-map.md` when looking for the owning spec.
