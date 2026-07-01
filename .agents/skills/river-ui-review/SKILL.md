---
name: river-ui-review
description: Use for implementing or reviewing River Go frontend/map UI changes. Applies repo-specific visual quality, map interaction, contribution workflow, responsive layout, and spec alignment.
---

# River Go UI Review

Use for significant UI work in the River Go frontend. For product-facing changes, also follow `.agents/rules/river-go-spec-first-development.md` and `.agents/rules/river-go-frontend.md`.

## Read As Needed

- `.agents/rules/river-go-frontend.md`
- `.agents/rules/river-go-no-advice.md`
- `/docs/specs/discovery/river-first-discovery.md`
- `/docs/specs/discovery/river-section-map.md`
- `/docs/specs/contributions/community-contributions.md`
- `/docs/specs/foundations/demo-prototype.md`
- `/docs/strategy/product-brief.md`

## Rules

- Keep the first screen as the usable app (river-first map with selected-river context and contribution entry points), not a marketing/landing page, unless explicitly asked.
- The selected-river card is a scannable overview; per-aspect depth belongs in the expanded card / river detail page, not as tabs on the overview.
- Selecting a river or section should fit/fly the map to it. Clicking markers should not unexpectedly zoom out or recenter.
- Adding local knowledge should be explicit: enter add mode (placement cursor, not grab), then click the map or marker. Contribution is identity-gated.
- Contribution form surfaces should appear close to the map interaction, not buried at the bottom of a long panel.
- Right-side panels and overlays must be scrollable within the viewport.
- Markers should have clear popups/tooltips. Preserve visual density suitable for trip planning.
- Condition and level indicators are context, never a go/no-go verdict (see `.agents/rules/river-go-no-advice.md`).

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

Use `river-go-testing-gate` for automated checks.
