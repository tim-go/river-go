# Implementation Plan — Map Entity Surfaces (amenities-first)

**Status:** Ready to execute · **Written:** 2026-07-06 · **Branch:** `map-entity-surfaces`
**Owning spec:** `/docs/specs/map-entity-surfaces.md`
**Data foundation:** `/docs/specs/map-features-data-model.md` (the `pois` index, source tables, `river_id`)
**Related:** `/docs/specs/contributions/community-contributions.md`, `/docs/specs/contributions/photo-uploads.md`, `/docs/specs/discovery/nearby-amenities-and-emergency-points.md`

This plan is self-contained: written to be executed by an agent in a fresh session with no prior context. Read the owning spec and this whole document before starting.

## Goal

Make mappable entities share **one surface framework** — *one entity, two surfaces (panel · page), sections selected by per-type capability* — and prove it by making **amenities first-class**: users can add notes/photos to **car parks and campsites**. The framework work must be **net-negative code** (retire divergent paths, don't add parallel ones).

## Locked decisions (do not relitigate)

1. **One entity** = a `pois` row / frontend `SelectedPoi`. No new entity structs.
2. **Two surfaces**: **Panel** (`PoiDetailPanel`) for points; **Page** (`EntityPage`) for containers (rivers). Both compose the **same section components**.
3. **Capabilities drive sections** — a per-`source_entity_type` map decides which sections render. New type = config + at most one new section.
4. **Contributions target the generic `poi_id`** for any `pois` row. Retire the `map_poi_id`-only assumption. `hasPhotos`/photo badges key on `poi_id`.
5. **Amenities-first**: `car_park` + `camp_site` only for contributions; toilets/shops stay plain markers. `camp_site` already exists as a kind — surface, don't add.
6. **Out of scope**: river attribution (separate specs — `map-features-data-model.md` §5, `river-first-discovery.md`); merging amenity/feature source tables; routes-as-points.

## Working agreement

- Single branch `map-entity-surfaces`; commit per phase; **one PR when the owner says ready** (fewer, larger PRs).
- Gate before each commit: `npx tsc -b` · `npm test` · `npm --prefix api run test` · `npm run build`. Add tests with logic changes.
- Migrations (if any) run `DATABASE_URL="postgresql://river_go_admin:river_go@localhost:5440/river_go" npm --prefix api run db:migrate`.
- Don't disturb the running dev services (Vite :6173 / API :8080); use other ports for test servers.

## Phase 0 — De-risk spike (blocking) · MES-B1 validation

**Question to answer before building anything:** can a contribution be created against a **non-paddling-feature** `poi_id` (an amenity) end-to-end with **no schema change**, and can its photo surface?

Steps:
1. Pick a real amenity `pois` row id (`amenity:<source_id>`; `SELECT id FROM pois WHERE source_entity_type='amenity' LIMIT 5`).
2. Exercise the create path in `api/src/sync.ts` (`INSERT INTO contributions`) with `poi_id` set to that amenity id and `map_poi_id` NULL. Confirm it persists and the `sync_contribution_to_location_poi` trigger treats it as targeted (no standalone `contribution:` row).
3. Check what breaks in read/surfacing: `hasPhotos` in `api/src/map-pois.ts` keys on `contributions.map_poi_id` (paddling-feature only) — confirm this is the gap and that switching it to `poi_id` is sufficient.
4. **Output:** a short note in this file (or the spec changelog) — "no schema change needed" OR a scoped migration. Do not proceed to Phase 3 until resolved.

## Phase 1 — Capability + section plumbing · MES-F1

1. Define a capability map keyed by entity type → `{capabilities, sections}` (new module, e.g. `src/lib/entityCapabilities.ts`). Capabilities: `verify`, `contribute`, `photo`, `levels`, `locate`.
2. Refactor `src/components/PoiDetailPanel.tsx` to render its tabs/sections **from the capability map** for the selected entity, preserving current behaviour for existing types (feature/contribution/photo).
3. Collapse the two `SelectedPoi` photo adapters (`contributionToSelectedPoi`, `riverPhotoToSelectedPoi` in `src/appCore.ts`) into one.
4. **Verify:** existing POI/photo/contribution panels look and behave identically (Playwright/manual). Gate. Commit.

## Phase 2 — Amenities & stations get the panel · MES-F2

1. In `src/components/RiverMap.tsx`, route **amenity** (~1123) and **station** (~1205) marker clicks to the shared panel via `mapPoiToSelectedPoi`/an amenity adapter, instead of popup-only `bindPopup`. Capability map yields their sections (amenity: Details·Location·Add note/photo; gauge: Details·Location·Levels).
2. Fold the ~3× duplicated POI marker+click blocks (global / selected-river / section) into **one helper**.
3. **Verify:** clicking a car-park/campsite/gauge opens the panel with the right sections; no regressions to feature POIs. Gate. Commit.

## Phase 3 — Amenity contributions · MES-F3 (+ MES-B1)

1. Apply the Phase-0 outcome: make `hasPhotos`/photo badges key on `poi_id` (`api/src/map-pois.ts`); ensure the add-contribution UI can target an amenity `poi_id`.
2. Enable the **contribute** section (notes + photos) on the amenity panel for `car_park` + `camp_site`.
3. Retire the legacy `map_poi_id`-only path where it blocks generic targeting (keep the column until a later cleanup; behaviour must switch to `poi_id`).
4. **Verify:** add a note + photo to a car park; it persists, appears on the amenity panel, and the photo badge shows. Gate. Commit.

## Phase 4 — River-page tie-in + page unification · MES-F4

1. On `/river/<id>` (`src/components/RiverDetailPage.tsx`), add a **"Parking & camping near this river"** block using amenities' asserted `river_id`.
2. Refactor `RiverDetailPage` onto the shared `EntityPage` base + shared section components (the same ones the panel uses). Behaviour-preserving.
3. **Verify:** river page renders identically but now via the shared base; amenity block populates. Gate. Commit.

## Phase 5 — Optional · MES-F5

Routed `/amenity/<id>` page (shareable/SEO) mirroring `/river/<id>` — **only if demand appears**. Not in the initial delivery.

## Definition of done (initial delivery = Phases 0–4)

- Amenities (car parks + campsites) open the shared panel and accept notes/photos via generic `poi_id`; photos surface via badges.
- Gauges/stations open the shared panel (levels section).
- Net code reduced: one contribution key path, one photo adapter, one marker/click helper, river page on `EntityPage`.
- All gates green; new tests for the capability map and the `poi_id` contribution/photo surfacing.
- River attribution untouched (separate work).
