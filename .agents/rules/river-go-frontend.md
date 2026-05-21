---
description: Frontend and map UX rules for River Go
---

# River Go Frontend Rules

Read this before changing the River Go frontend, map, layout, styling, interaction model, or visible copy.

## Product Shape

River Go is a utilitarian river intelligence tool, not a marketing site.

The first screen should remain the usable app:

- section list
- river map
- selected section detail
- contribution workflow

Do not replace the app with a landing page unless explicitly asked.

## Map Interaction Principles

- Selecting a section from the left panel should fit the map to that section route.
- Clicking markers should not unexpectedly zoom out or recenter.
- Adding local knowledge should be explicit: enter add mode, then click the map or marker.
- Contribution form surfaces should appear close to the map interaction, not buried at the bottom of a long panel.
- Markers should have clear popups/tooltips.
- Seeded Wye marker positions should remain visually coherent with the route trace during the prototype.

## Styling Principles

- Keep the UI practical, dense enough for planning, and readable.
- Use restrained colour and avoid decorative hero/marketing composition.
- Ensure right-side panels and map overlays are scrollable within the viewport.
- Use icons for tool actions where available.
- Avoid text overlap on mobile and desktop.

## Current Validation

Run:

```bash
npm run build
```

before handoff for frontend code changes.
