---
description: Frontend and map UX rules for River Go
---

# River Go Frontend Rules

Read this before changing the River Go frontend, map, layout, styling, interaction model, or visible copy.

## Product Shape

River Go is a utilitarian river intelligence tool, not a marketing site.

Discovery is river-first: canonical rivers are the primary object, and routes/sections are supporting interpretations of part of a river. The first screen should remain the usable app — a river map with selected-river context and the contribution entry points — not a landing page. Do not replace the app with a landing page unless explicitly asked.

The selected-river card is a scannable overview; per-aspect depth (levels, photos, access, hazards) belongs one layer down — the expanded card or river detail page, not tabs on the overview. See `/docs/specs/discovery/river-first-discovery.md`.

## Map Interaction Principles

- Selecting a river or section should fit/fly the map to it. Clicking markers should not unexpectedly zoom out or recenter.
- Adding local knowledge should be explicit: enter add mode, then click the map or marker. Add mode should show a placement cursor (crosshair), not the default grab cursor.
- Contribution entry points and form surfaces should appear close to the map interaction, not buried at the bottom of a long panel, and are identity-gated (see the contributor on-ramp and `.agents/rules/river-go-backend.md`).
- Markers should have clear popups/tooltips.
- Condition and level indicators are context, never a go/no-go verdict — follow `.agents/rules/river-go-no-advice.md`.

## Styling Principles

- Keep the UI practical, dense enough for planning, and readable.
- Use restrained colour and avoid decorative hero/marketing composition.
- Ensure right-side panels and map overlays are scrollable within the viewport.
- Use icons for tool actions where available.
- Avoid text overlap on mobile and desktop.

## Current Validation

Run the gate before handoff for frontend code changes:

```bash
npm run build && npm test
```

Run `npm --prefix api run test` too if the change touches `api/`.
