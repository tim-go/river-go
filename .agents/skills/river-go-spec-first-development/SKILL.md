---
name: river-go-spec-first-development
description: Use for River Go implementation, content, design, review, or refactor work that must stay aligned with local docs/specs. The durable policy lives in .agents/rules/river-go-spec-first-development.md.
---

# River Go Spec-First Development

This skill is a workflow helper. The mandatory rule is `.agents/rules/river-go-spec-first-development.md`.

## Use The Local Rule

Read first:

- `.agents/rules/river-go-spec-first-development.md`
- `/docs/specs/README.md`
- `/docs/specs/spec-consolidation-map.md`
- `/docs/strategy/delivery-plan.md`

Specs live in this repository under `/docs/specs`.

## Workflow

1. Identify and read the owning local spec.
2. If the work is not covered, update or create the local spec first unless the user explicitly asked for a spike.
3. Implement against the local spec.
4. Reconcile implementation findings back into the local spec.
5. Run the relevant validation command, currently `npm run build` for app changes.
6. Report the local spec path and any remaining divergence.

## Spec Change Logs

Do not update a spec `Change Log` for every small request.

Use the `Change Log` only for significant spec-level changes, such as:

- creating a new spec
- changing the feature contract or acceptance criteria
- adding or removing a meaningful feature/backlog item
- changing work state, maturity, roadmap phase, or release interpretation
- recording a notable architecture, data, or product decision

For small implementation fixes, copy tweaks, minor UI adjustments, or routine alignment edits, update the relevant requirements/tracking text if needed, but leave the spec `Change Log` alone.

## Search

```bash
rg -n "<feature|domain|surface>" docs/specs docs/product docs/strategy
```
