# Map rework — filters, layers & presentation

Status: **concept / spec** (brainstorm captured 2026-06-23). Nothing here is a final
decision; this is the shared picture to implement against.

## Vision
Move RiverLaunch's map from a **single-river context** to a **map-first, filterable
surface** — MarineTraffic, adapted for paddling. The map is the home; paddling data,
amenities, weather and live levels all live on it, filtered by type and layer, loaded by
viewport, with detail revealed by zoom.

## Principles
1. **Map-scoped, not river-scoped.** POIs become location-indexed entities queried by
   map bounds — not children of a selected river. Picking a river/section becomes an
   on-tap *focus* mode, never a gate.
2. **Two modes coexist.** *Explore* (global, default) + *Focus* (tap a river or marker →
   today's river/section panel with levels). Nothing we've built is lost.
3. **Zoom = level of detail (LOD).** National → aggregate signal (level-coloured rivers,
   regional summaries); regional → clusters + line layers; local → individual POIs,
   photos, gauges, amenities. One mechanism governs clustering, levels and photos.
   *(Macro view = low fidelity; zoom for more. No showing 5,000 weirs at national zoom.)*
4. **Two data tiers, split by domain (not provenance):**
   - **Paddling** — on-the-river, curated/community-verified: river geometry, sections,
     access / put-in / take-out, hazards, rapids/features, gauges & levels, photos, routes.
   - **Amenities** — off-the-river, reference, shown "as-is" (OpenStreetMap): toilets,
     pubs, shops, car parks.
5. **Honesty.** Show **level *state*** (data we have), never a **runnable *verdict***
   (judgment we don't). Grey where there's no gauge. A future "runnable" overlay slots in
   as a *separate, clearly-labelled* layer once we have reference ranges.

## Headline feature — rivers coloured by live level
- Colour the **river line, per section**, by its primary gauge's **state relative to that
  gauge's own history** (below / at / above normal; low → high).
- **Reaches with no gauge stay neutral/grey** — never imply.
- **Palette avoids green=go / red=stop** (that reads as a verdict). Use a water/intensity
  scale or a below-normal ↔ above-normal diverging scale.
- **Trend (rising/falling ↑↓)** on gauges, optionally a subtle pulse on the line —
  paddlers care about trend more than the absolute number.
- Foundations: **river geometry** (we already have the OSM waterways pipeline —
  `osm:prepare-waterways` / `import:osm-waterways`) + **gauge↔section mapping** (we have
  ~44 paddler gauges associated with sections).

## Layers & filters
### Paddling
- River geometry (level-coloured), sections, access points, hazards, rapids/features.
- **Photos** — toggleable; render **thumbnails on the map** when zoomed in / toggled.
- **Public routes** — user route points already snap to the river; show public ones as
  polylines (a route ≈ a runnable section).
- **Discipline filter** — whitewater · canoe/touring · sea/surf · SUP — plus **grade**
  (WW I–V). Already have a discipline classification + `river-discipline-filter`.

### Measuring stations (a layer in its own right)
- **Paddler gauges** (curated, default) vs **all stations** (reference, ~thousands →
  needs LOD/clustering).
- Filter by **state** (up / down / above-normal / rising / falling — *"show what's up"*),
  **agency** (EA / NRW / SEPA), **measurement type** (level / flow / **rainfall**).
- **Rainfall stations + rain radar = upstream leading indicator** — "about to come up",
  not just "is up". Effectively free once both are on the map; powers trip-planning later.

### Amenities (OpenStreetMap, off-river)
- Toilets, pubs, shops, car parks. "Near rivers" spatial filter (within N of a waterway).
- Light "from OpenStreetMap" note — never trusted on our authority.

### Weather (discipline-aware)
- **Rain radar (Met Office) — must-have, first**; animated past + forecast.
- Easy controls to add **wind, cloud, temp, tides**. Wind + tides surface for sea/SUP.
- Toggleable raster overlays with opacity.

## Filter semantics — filters vs display toggles
The controls hold two *kinds* of thing, with opposite empty-state behaviour:
- **Filters** (e.g. **Discipline**) *narrow* the paddling data. Empty = **all** (no
  constraint). Within a category → OR; across categories → compose. Discipline scopes
  the rivers/sections + their POIs; it leaves amenities and weather alone.
- **Display toggles** (Layers · POIs · Stations · Amenities · Weather) *show/hide*.
  Empty = **none** (opt-in). The app ships with sensible defaults on (e.g. Rivers +
  gauges) so first-run isn't blank; "clear all" then honestly means nothing shown.

Discipline **stays in the control** (for reach) but is **presented as a filter** — a
funnel icon on its pills and its own "Filter — narrows what's shown" section, set
apart from the "Show on map" toggles. The opposite empty-state semantics are exactly
why the two are visually separated.

## Controls / UX — the key open decision
- **Map stays full-bleed; controls must not eat the screen.** Screen-real-estate
  management is the priority.
- **Mobile: minimal but not *too* minimal** (MarineTraffic mobile is too sparse). The
  active filters should stay visible; full control one gesture away. Progressive disclosure.
- A **responsive filter surface** (candidates being decided separately — peekable bottom
  sheet on mobile / docked panel on desktop / extend the current top-bar + drawer).
- Needs: a **legend** for the level palette, visible **active-filter** state, and saved
  **presets** ("my setup").

## Map top bar → filter control, focus panel & actions
The current *map controls* bar (not the app section nav — Map/Discover/Dashboard/
Profile/More is untouched) mixes three jobs; the rework separates them.

Today's controls and where they go:

| Control | Type | New home |
| --- | --- | --- |
| Rivers, Waterways, Routes | layer toggles | **Filter control** (Layers / display toggles) |
| Levels, Details | open the section panel | **Focus mode** (on tapping a river/section) |
| Click: Info/Detail | marker-click behaviour | **Floating action** (toggle) |
| Sync | push queued edits | **Floating action** (contextual) |
| Controls ▸ | mobile expand | **Gone** — the filter bar has its own pills/expander |

Levels/Details/Routes only appear today *because a section is selected*, so they're
already focus-mode controls — in the map-scoped model they live in the river/section
panel you get on tap, not the always-on bar.

**Actions float on the map, outside "Filters".** Frequently-used *actions* (locate-me,
"show me", info-click mode, sync…) are "do something", not "what's shown" — so they live
in a **floating cluster** of round buttons (bottom-right), spatially separate from the
filter bar. Costs no top-strip space and matches where map apps put action buttons.

```
[ pills ]            [ Filters ▾ ]      ← top: what's shown
                                  [⌖]
              MAP                 [👁]   ← floating: do something
                                  [⟳]   (⟳ only when pending)
```

Notes: **info-click moves here** (a toggle), not into settings — it's flipped often
enough to deserve reach. **Sync is contextual** — it surfaces only when there are
pending edits (an attention dot), so it isn't a permanent fixture. Component:
`MapActions` / `MapActionButton`, a sibling of the filter control. The cluster can grow
vertically or collapse to a "⋯" if it gets long.

## Architecture notes (for later, not committing yet)
- **Bounds API** — "POIs / stations / routes in viewport" spatial query, debounced on
  map move. This is the biggest shift from per-river loading.
- **Clustering** — supercluster for dense types.
- **Vector tiles** — likely endgame for national scale (pre-generated, client-styled);
  makes LOD, clustering and coloured rivers natural. Keep in the back pocket.
- **Curated vs reference pipelines** — paddling = our DB; amenities / all-stations =
  external (OSM / agency), cached.
- **Time dimension** — levels (history/trend) + weather (radar past/forecast) share a
  time axis → enables a future scrubber without re-architecting.

## Trip planning (roadmap — coming, not decided)
Time scrubber (levels + rain), **"runnable near me, now"** synthesis, near-me / search.
Don't decide scope yet — but keep the bounds API, LOD and time axis ready so it isn't a
rewrite later.

## Status & backlog (living)

**Done**
- **Control = "Layers"** (renamed from "Filters"): pills + expander, category colours,
  filter-vs-toggle, "+N" overflow, 2-row wrap; top-bar migration → Layers control + floating
  actions + section toolbar; dead CSS/code tidied.
- **Honest level state** (percentile-vs-own-90-day-history) for sections + rivers.
- **River geometry — the finale, from OS Open Rivers.** Source = **OS Open Rivers**
  (Ordnance Survey, OGL) — a clean, authoritative, single-line named GB network, loaded
  into `os_open_rivers` (`import:os-open-rivers`). `build:river-geometry` collects the OS
  links by name within each river's bbox into `canonical_rivers.matched_geometry`; the
  endpoint reads + simplifies on read (~11m). **62/62 rivers**, all clean single traces,
  coloured by live band, tooltips, discipline-filtered. Seed network retired.
  - *Why not OSM:* OSM names rivers inconsistently and double-maps them (two centrelines
    60-100m apart), so no dedupe heuristic got every river right — OS names/traces each once.
- **River markers** coloured by level (51/62).
- **Discipline filter** (Whitewater/Touring) wired into the live control.
- **POI layer** (Access/Hazards/Features, zoom-gated).
- **Stations layer** (paddler-gauges / all-stations, band-coloured) + **station-coordinate
  backfill** (EA flood-monitoring + SEPA KiWIS = lat/long; NRW = OS grid → ST_Transform) → 52/55.
- **Rain layer** (Met Office DataHub Map Images, cached server-side proxy) + **timebar**
  (7-day forecast, 89 frames, play/pause, "now" tick).
- **Amenities** — repeatable OSM pipeline (osmium extract + ≤1km proximity filter vs our
  rivers) + layer (Pubs/Car parks/Toilets/Cafés/Shops, zoom-gated).

**Remaining layers**
- **Public routes** (renderer exists; needs a toggle + an approved-routes fetch; 0 locally → staging).
- **Photos** (locate the photos table + per-photo coords; sparse locally).
- *More weather (wind/cloud/temp/tides) — **on hold**.*

**Follow-ups / debt**
- **Clustering / LOD** (supercluster) for POIs + stations + amenities.
- **Full station network** ingestion (EA ~5k + NRW + SEPA) so "All stations" is genuinely all
  — today it's only the ~55 curated paddler gauges; needs clustering.
- **Zoom-based geometry** serving (finer at high zoom) — cheap now that geometry is precomputed.
- **Run on staging:** migrations + `import:os-open-rivers` + `build:river-geometry` +
  `import:osm-amenities` + the station
  backfill; ensure `route_overrides` populated there.
- Trend arrows; section tools → river panel; mobile polish; presets; search/near-me; seed access
  POIs; section-toolbar `top:56px` 2-row edge case; pin letter contrast on the "low" band.

**Honest-data future**
- Community live reports → reference ranges → a separate **runnable** overlay; "runnable near me, now".

## Implementation notes (key decisions)
- **Level state** = percentile of the latest reading vs that gauge's own 90-day history
  (low/normal/high/very-high; grey = no live gauge / too little history). Never a "runnable" verdict.
- **Palette** = vibrant blue → teal → **bright-yellow (high)** → orange; grey = no data.
- **River geometry comes from OS Open Rivers** (not OSM), precomputed into
  `canonical_rivers.matched_geometry`; re-run `import:os-open-rivers` then
  `build:river-geometry` to refresh; stored geometry is hand-correctable.
- **Rain = Met Office DataHub Map Images** (free tier, 1,000/day). Order `o081200335114`,
  UK-model-extent, Total precipitation rate, hourly→3-hourly→6-hourly to 168h. Proxied + cached
  server-side (`/api/weather/rain.png?ts=N`, `/api/weather/rain/frames`); **JWT key in the
  git-ignored `.config/metoffice_api_key`**, never sent to the client. Equirectangular bounds
  `[[45,-25],[63,15]]`.
- **Amenities** = a *repeatable* OSM import (osmium extract → ≤1km proximity filter vs our
  rivers' matched ways), NOT a one-off seed. Re-run to refresh.

## Data pipeline & re-seeding (runbook)

Every map data layer is built by a **repeatable, idempotent** step. To (re-)seed from a
fresh database, in order:

1. **Schema** — `npm run api:migrate` (creates all tables incl. `os_open_rivers` (027),
   `amenities` (025), the `canonical_rivers.matched_geometry` column (026)).
2. **River centre-lines** — `npm run seed:rivers` (= `import:os-open-rivers` then
   `build:river-geometry`):
   - `import:os-open-rivers` downloads the **OS Open Rivers** GB GeoPackage (OGL, no key)
     and loads named links into `os_open_rivers` (**TRUNCATE + reload**).
   - `build:river-geometry` **clears then rebuilds** `canonical_rivers.matched_geometry`
     from `os_open_rivers` by name match (idempotent — re-running converges). 62/62 rivers.
3. **Waterways layer + amenities** (OSM, heavy ~2GB — only when refreshing OSM):
   `osm:download-extract` → `osm:prepare-waterways` → `api:import:osm-waterways` (→
   `watercourses`, ~850k); then `osm:prepare-amenities` → `api:import:osm-amenities`.
4. **Station coords** — `node api/scripts/backfill-station-geometry.mjs` (EA/SEPA/NRW).
5. **Rain** — live server proxy, nothing to seed (key in `.config/metoffice_api_key`).

**Sources → tables:** OS Open Rivers → `os_open_rivers` → `canonical_rivers.matched_geometry`
(the headline lines); OSM → `watercourses` (Waterways layer + amenities proximity only —
no longer the river-line source) and `amenities`; EA/SEPA/NRW → `observation_stations`.

**Purge / staleness:** all imports are TRUNCATE+reload and `build:river-geometry` clears
first, so re-running any step is safe and converges. There is **no stale river data to
purge** — the old OSM-derived `matched_geometry` was overwritten by the OS build; OSM
`watercourses` is deliberately retained for the Waterways layer + amenities.

## Open decisions
- **Controls pattern** (bottom sheet vs top-bar+drawer vs floating) — *next up*.
- Explore-as-default vs an explicit mode toggle.
- Basemap / "hydro" style approach.
- Where trip-planning sits in the order.
