---
roadmap_core_feature_group: Core Map
roadmap_core_feature_item: River Attribution on Add
roadmap_core_feature_phase: Now
spec_schema: 4
maturity: Sketch
---

# River Attribution on Add — corridor, confirm, off-river

**Work state:** Agreed shape (2026-07-07) — **critical; to build next**
**Last updated:** 2026-07-07
**Scope:** How a newly-added point/contribution gets the *right* river at add time — the selected-river **corridor**, out-of-corridor **reconcile/warn**, and the honest **off-river** state. The *data* model (a single asserted `river_id` on `pois`/`contributions`) already exists in [/docs/specs/map-features-data-model.md](/docs/specs/map-features-data-model.md) §5; **this spec is the add-time UX and attribution-correctness layer on top of it.**

## Purpose

River-first discovery is only as good as its **attribution** — every point must belong to the *correct* river (or honestly to none). Today attribution is keyed off the **selected river** (UI state), not the point's **place**, which allows two failures:

- **Misattribution (the dangerous one):** select River A, pan the map to River B, drop a point near B → it silently attaches to **A**. A wrong attribution invisibly pollutes River A's data and is far worse than no attribution.
- **Unbounded off-river adds:** a point can be placed anywhere (out at sea, nowhere near a river) with **no guardrail and no signposting** — the user can't tell they've misattributed or gone off-river.

**Verified in code (2026-07-07):** the add flow has **no corridor/range gate**. Attribution is context-based (selected river, or the *nearest POI within the selected river*), never geographic. `NEAREST_POI_ATTACH_METERS = 1000` only decides whether to *link* to the nearest POI — it does **not** block or warn.

## Product Role

- `Primary user objective:` A contributor's point lands on the **right** river (or honestly nowhere), with minimal friction.
- `Classification:` Core map / contribution correctness (foundational data integrity).
- `Loop step:` Contribute.
- `Why this matters:` Silent misattribution is the one error worse than a missing contribution — it degrades trust in a river's data with no signal. This is the backbone of the river-first thesis.

## The model — *geometry proposes, the human confirms, selection is a hint*

1. **Guided add is gated on a selected river.** Entering add mode draws that river's **corridor** — a buffer around its line geometry (OS Open Rivers, already rendered on the map).
2. **Inside the corridor → attributed to the selected river** (confirmed).
3. **Outside the corridor → never silently attribute to the selected river.** Reconcile by geometry:
   - inside **another** river's corridor → propose that river (*"This is on River B, not River A — attach to B?"*);
   - inside no corridor → offer an **off-river (unattached)** point.
   - **Soft boundary:** warn/offer, **don't hard-block**; the user can explicitly override (e.g. a car park that genuinely serves River A from just outside the buffer).
4. **The resolved target is always shown and changeable** in the add form: *"Adding to: River X ▾"* (change / set none).
5. **Off-river points are an honest, allowed state** — `river_id = NULL`. They render on the open map (not scoped to any river), are signposted as "not on a listed river", and double as a **coverage pipeline** for rivers we don't cover yet.
6. **Segments/sections are strictly river-scoped** (no off-river segments). POIs may be off-river.
7. **Corridor width varies by entity type:** on-water features tight (~200–300 m); amenities (car parks, campsites) wider, since they legitimately sit back from the water. Ties to the capability model in [/docs/specs/map-entity-surfaces.md](/docs/specs/map-entity-surfaces.md).

## Attribution resolution (the algorithm)

On placement, resolve the river from the point's **location**:

```
resolveRiverForPoint(location, selectedRiverId):
  if selectedRiverId and within corridor(selectedRiver) of location → { river: selectedRiverId, confidence: "confirmed" }
  else nearest = nearest river whose corridor contains location
       if nearest → { river: nearest, confidence: "proposed" }   // prompt to switch
       else → { river: null, confidence: "off-river" }            // prompt to confirm off-river
```

- The selected river is only a **default/tiebreak** when the point is plausibly on it (matches §5: "spatial nearest is only a default").
- **Recommended implementation:** an authoritative backend endpoint `GET /api/rivers/nearest?lat=&lng=&maxMeters=` using PostGIS `ST_Distance`/`ST_DWithin` against `canonical_rivers.matched_geometry` (returns the nearest river(s) + distance). The map draws the corridor client-side from the already-loaded river line. (A fully client-side point-to-line resolution is possible since river lines are loaded, but the backend is authoritative and avoids shipping all geometry precisely.)

## Off-river handling & the misattribution safety net

- **Off-river rendering:** off-river POIs get a distinct, subtle marker treatment + a "not on a listed river" label on their panel. A deliberate *"Add a point (not on a listed river)"* entry exists for the intentional case (and rivers we don't yet cover).
- **Moderation flag (backend):** surface contributions whose point is **far from its attributed river's line** for review, with one-click **re-attribution** (change river). Cheap — `pois.river_id` + river geometry already exist. Catches misattributions that slip past the add-time confirmation.

## Data & non-goals

- **No schema change.** Uses the existing single asserted `pois.river_id` / `contributions.river_id` (§5). `river_id = NULL` already represents off-river.
- **Non-goals:** M:N river links (deferred — §5 "Forward view"); auto-attribution without human confirmation; changing the single-asserted-`river_id` model.

## Delivery (phased)

1. **ATTR-B1 — nearest-river resolver.** `GET /api/rivers/nearest` (PostGIS) + a shared `resolveRiverForPoint` returning `{ river, confidence }` and the corridor distance. *Foundational — do first.*
2. **ATTR-F1 — corridor rendering.** In add mode, draw the selected river's corridor (buffer) on the map so the user sees the river's extent.
3. **ATTR-F2 — resolve + confirm UI.** The add form shows the resolved target (*Adding to: River X ▾*) with change/none; warns on out-of-corridor placement and reconciles per the algorithm. Replaces the current stale-selection / nearest-POI-within-selected-river attribution.
4. **ATTR-F3 — off-river state.** Allow + signpost off-river points (distinct marker, "not on a listed river" label, deliberate off-river add entry).
5. **ATTR-B2 — moderation re-attribution.** Flag far-from-river contributions; one-click re-attribute in the moderation queue.
6. **ATTR-F4 — per-type corridor width** (on-water tight, amenities wider).

## Tracking

| ID | Type | Item | Status | Phase | Notes |
|---|---|---|---|---|---|
| ATTR-B1 | backend | Nearest-river resolver (`/api/rivers/nearest`, PostGIS) + `resolveRiverForPoint` | Queued | Now | Foundational; authoritative geometry. |
| ATTR-F1 | feature | Selected-river corridor drawn in add mode | Queued | Now | Buffer around the river line. |
| ATTR-F2 | feature | Resolve + confirm target on add (change/none, out-of-corridor warn) | Queued | Now | Replaces stale-selection attribution. |
| ATTR-F3 | feature | Off-river points: allowed, signposted, deliberate entry | Queued | Now | `river_id = NULL`; distinct marker + label. |
| ATTR-B2 | backend | Moderation flag + one-click re-attribution (far-from-river) | Queued | Soon | Safety net for slipped misattributions. |
| ATTR-F4 | feature | Per-entity-type corridor width | Parked | Later | On-water tight, amenities wider. |

## References

- [/docs/specs/map-features-data-model.md](/docs/specs/map-features-data-model.md) — §5 the single asserted `river_id` (the data this sits on); §4 contributions.
- [/docs/specs/contributions/community-contributions.md](/docs/specs/contributions/community-contributions.md) — the add-mode flow this refines.
- [/docs/specs/discovery/river-first-discovery.md](/docs/specs/discovery/river-first-discovery.md) — selected-river model.
- [/docs/specs/discovery/river-section-map.md](/docs/specs/discovery/river-section-map.md) — map + river line geometry.
- [/docs/specs/map-entity-surfaces.md](/docs/specs/map-entity-surfaces.md) — capability model (per-type corridor width).

## Changelog

| Date | Change |
|---|---|
| 2026-07-07 | Initial spec — corridor / geometry-proposes-human-confirms / off-river model, agreed in discussion; elevated to critical, build next. Data model already in map-features-data-model §5; this is the add-time UX layer. |
