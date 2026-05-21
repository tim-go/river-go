---
name: river-go-spec-authoring
description: Author or update a River Go spec under docs/specs/. Use when creating a new spec, splitting/merging specs, restructuring an existing spec, or making non-trivial edits to frontmatter, feature rows, backlog rows, maturity, work state, or release facts.
---

# River Go Spec Authoring

This skill is a workflow helper for writing and updating spec documents. It does not replace `.agents/rules/river-go-spec-first-development.md`.

## When To Use

Use this skill when:

- creating a new spec under `/docs/specs`
- updating frontmatter
- adding or renaming feature rows
- adding or changing backlog rows
- changing work state or target
- reconciling implementation findings back into a spec
- reorganising the spec map

## Source Of Truth

- Local specs live in `/docs/specs`.
- Strategy lives in `/docs/strategy`.
- The delivery rollup lives in `/docs/strategy/delivery-plan.md`.

## Authoring Workflow

1. Find the owning spec via `/docs/specs/spec-consolidation-map.md`.
2. Search before creating:

   ```bash
   rg -n "<feature|domain|surface>" docs/specs docs/product docs/strategy
   ```

3. Update the existing spec if it owns the behaviour.
4. Create a new spec only when the feature has a durable independent surface, model, workflow, or provider.
5. Keep design prose current; do not preserve old design inline just for history. Git stores history.
6. Do not stamp `Delivered` outside explicit release-cut tasks.
7. Update `/docs/specs/spec-consolidation-map.md` if you add a new owning spec.
8. Update `/docs/strategy/delivery-plan.md` when the feature state changes at roadmap level.

## Template

```md
---
roadmap_core_feature_group: Group
roadmap_core_feature_item: Spec Title
roadmap_core_feature_phase: Now
spec_schema: 4
maturity: Unassessed
---

# Spec Title

**Work state:** Queued
**Last updated:** YYYY-MM-DD
**Scope:** One sentence describing the boundary of this spec.

## Purpose

## Product Role

- `Primary user objective:`
- `Classification:`
- `Loop step:`
- `Why this matters:`

## References

## Requirements

## Open Questions

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |

## Change Log

| Date | Change |
| --- | --- |
| YYYY-MM-DD | Created. |
```
