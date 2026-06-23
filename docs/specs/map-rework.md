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
| Click: Info/Detail | marker-click behaviour | **Setting** (More/settings) |
| Sync | push queued edits | **Action cluster** (below) |
| Controls ▸ | mobile expand | **Gone** — the filter bar has its own pills/expander |

Levels/Details/Routes only appear today *because a section is selected*, so they're
already focus-mode controls — in the map-scoped model they live in the river/section
panel you get on tap, not the always-on bar.

**Actions stay on the map, but outside "Filters".** Frequently-used *actions* (Sync,
locate-me, future ones) don't belong in the Filters semantic — putting them there
muddies "what's shown". They sit as a **distinct, adjacent action cluster** in the same
top strip, behind a divider and icon-only: `[ pills ] [ Filters ▾ ] │ [ ⟳ ] [ ⌖ ]`.
Architecturally the cluster is a **sibling slot** the map view passes into the filter
control (`actions` prop), so the control stays purely about filters. If the action set
grows it can collapse to a "⋯" menu.

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

## Phasing — now / next / later
**Now (foundation):**
- River geometry rendering + gauge↔section mapping → **level-coloured river lines** (state,
  grey where no data).
- Bounds-based POI loading + LOD tiers + clustering.
- The **filter surface** (responsive controls) with core paddling toggles + discipline.
- **Rain radar (Met Office)**.

**Next:**
- Measuring-station filters (state / agency / type, paddler-vs-all); rainfall + radar pairing.
- Photos-on-map (thumbnails); public routes layer.
- Amenities (OSM) tier.
- More weather (wind); tides for sea/SUP.
- Presets, legend, search / near-me.

**Later:**
- Trip planning (scrubber, "runnable near me").
- Community live reports → reference data → **runnable overlay**.
- Simplified "hydro" basemap style.
- Vector-tile pipeline at scale.

## Open decisions
- **Controls pattern** (bottom sheet vs top-bar+drawer vs floating) — *next up*.
- Explore-as-default vs an explicit mode toggle.
- Basemap / "hydro" style approach.
- Where trip-planning sits in the order.
