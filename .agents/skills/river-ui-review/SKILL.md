---
name: river-ui-review
description: Use for implementing or reviewing River Go frontend/map UI changes. Applies repo-specific visual quality, map interaction, contribution workflow, responsive layout, and spec alignment.
---

# River Go UI Review

Use for significant UI work in the River Go frontend. For product-facing changes, also follow `.agents/rules/river-go-spec-first-development.md` and `.agents/rules/river-go-frontend.md`.

## Read As Needed

- `.agents/rules/river-go-frontend.md`
- `/docs/specs/core/river-section-map.md`
- `/docs/specs/community/community-contributions.md`
- `/docs/specs/release/demo-prototype.md`
- `/docs/strategy/product-brief.md`

## Rules

- Keep the first screen as the usable app: section list, map, selected section detail, and contribution workflow.
- Do not turn the app into a marketing/landing page unless explicitly asked.
- Selecting a section should fit the map to that route.
- Clicking markers should not unexpectedly zoom out or recenter.
- Adding local knowledge should be explicit: enter add mode, then click the map or marker.
- Contribution form surfaces should appear close to the map interaction, not buried at the bottom of a long panel.
- Right-side panels and overlays must be scrollable within the viewport.
- Markers should have clear popups/tooltips.
- Preserve visual density suitable for trip planning.

## Review

Check:

- map behaviour
- marker click feedback
- add mode clarity
- form validation
- responsive layout
- section panel scrolling
- text wrapping
- visual hierarchy
- whether current specs still describe the UI

Use `river-go-testing-gate` or `river-testing-gate` for automated checks.
