# Map marker performance — POI/amenity density

Status: **partially implemented** (option 1 shipped); options 2–3 captured as
follow-ups. Related vision: [`map-rework.md`](./map-rework.md) (zoom = level of
detail, clustering, viewport-loaded POIs).

## Problem

The map draws every marker as a Leaflet `divIcon` (an HTML DOM node). The
high-volume sets are large:

| Layer        | Count (national) | Source                        |
| ------------ | ---------------- | ----------------------------- |
| Amenities    | ~6,280           | `/api/amenities` (OSM)        |
| Global POIs  | ~790             | `/api/map-pois`               |
| Stations     | ~50              | `/api/stations`               |

At zoom ≥ 9 the amenity + POI layers previously created a DOM node for **every**
marker regardless of whether it was on screen — up to ~7,000 nodes — and the
whole set was rebuilt inside the main marker effect on every dependency change
(including per-second GPS ticks). That is the mobile lag when "lots of POIs" are
shown. Separately, `fetchAmenities()` downloads the entire 806 KB national set
up front.

Two distinct costs: **render** (DOM node count / rebuild churn) and **payload**
(download + memory).

## Option 1 — viewport culling + decouple ✅ shipped

`RiverMap.tsx`: global POIs and amenities moved into their own `L.layerGroup`
driven by a dedicated effect that redraws on `moveend`/`zoomend`. Each draw:

- clears + rebuilds only markers whose location is inside `map.getBounds().pad(0.25)`;
- is keyed only on the POI data + view state, so GPS ticks no longer rebuild it;
- precomputes `sectionById` / `riverByName` maps once instead of an O(POIs ×
  sections) `.find()` per marker.

Effect: live DOM marker count drops from ~7,000 to "what's on screen" (tens to
low-hundreds). No new dependency, no visual change. Mirrors the river-lines
culling already in `RiverMap.tsx`.

**Known limitation:** a dense city centre at mid-zoom can still render a few
hundred amenity pins at once — visually cluttered and still some render cost.
That is what options 2–3 address.

## Option 2 — marker clustering (follow-up)

Add `leaflet.markercluster` (lazy-loaded so it stays out of the first-paint
bundle). Nearby markers collapse into a count bubble that splits on zoom-in;
clicking a bubble zooms to spread it.

- **Pro:** density stops mattering — only a handful of bubbles render however
  many underlying markers. Best UX + perf for dense areas.
- **Cost:** new (small, mature) dependency; a real visual/interaction change
  (pins → count bubbles); CSS theming to match the design tokens.
- Aligns with the "regional → clusters" level-of-detail idea in `map-rework.md`.

## Option 3 — bounds-fetch amenities (follow-up, separate concern)

Stop downloading all 6,280 amenities up front. Change `fetchAmenities()` to
request the current viewport (`/api/amenities?bbox=…`) and refetch (debounced) on
pan — exactly the pattern the known-watercourses layer already uses
(`fetchWatercoursesForBounds`).

- **Fixes a different problem than 1/2:** download size (806 KB → a per-viewport
  slice) and in-memory object count, not render cost.
- **Cost:** highest — touches both frontend and the API (add a bbox-filtered
  amenities endpoint/param), plus a pan debounce and a data-loading-model change.
- Best done as its own PR.

## Recommended sequencing

1. Option 1 — shipped (dominant, zero-risk win).
2. Option 2 — if dense-city views still feel cluttered/laggy.
3. Option 3 — when the 806 KB amenities payload (first load / mobile data) is
   worth addressing; independent of 1/2.
