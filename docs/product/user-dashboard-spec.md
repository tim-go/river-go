# User Dashboard & River Discovery — Spec

Status: in progress (branch `user-dashboard`)
Date: 2026-06-18

## Goal

We already hold a large amount of river data (62 canonical rivers, grades,
disciplines, regions/nations, linked sections, candidate POIs, live levels per
section). It is currently hard for users to *find* the useful bits. This work
surfaces it through two new first-class pages plus two map/detail tweaks.

Design language follows `docs/demo/surge.html` (landing "live river card") and
`docs/demo/surge-app.html` (the Discover grid). Key principle from the demo:
**stay honest** — when a river has no live gauge, show a "No live gauge" /
"Release" state rather than inventing a number.

## Features

### 1. River favourites (foundation)
- New concept: favourite **canonical rivers** (not sections — sections are
  parked while the river/section model is decided).
- State `favouriteRiverIds: string[]`, persisted to `localStorage`
  (`river-go-favourite-rivers`), toggled by a **star button in the selected-river
  panel header** (`watercourse-panel`, `RiverMap.tsx`).
- Toggling requires sign-in (consistent with existing favourites + the
  "account-only saved" copy). Guests get the sign-in prompt.
- Existing **section** favourites (topbar star, Search → Favourites tab) are left
  untouched.

### 2. User Dashboard (new nav section `dashboard`)
- Shows the signed-in user's favourite **rivers** as a grid of river cards.
- Each card: name, where (region · nation), grade pill, discipline, section
  count; plus **live level** (number + unit + trend + gauge + sparkline) fetched
  per favourite (small N) — honest "No live gauge" when unavailable.
- A small stat strip up top (e.g. favourites count, how many running/live).
- Empty state: signed-out → sign-in CTA; signed-in with none → "Browse rivers"
  CTA into Discover.

### 3. River Discovery (new nav section `discover`)
- A fully-featured, prominent directory of **all** canonical rivers — separated
  out from Search (which keeps point/waterway/coordinate search).
- Reuses the existing filter logic (`filteredSearchRivers`): discipline chips
  (All / Whitewater / Canoe touring), nation chips/select, free-text search.
- Grid of river cards (same component as the dashboard) showing the rich static
  info we already have (grade, discipline, where, section count, candidate POIs,
  summary). Clicking a card selects the river and jumps to the Map.
- **Live levels for the full list are deliberately out of scope for v1** — live
  levels are per-section EA/NRW/SEPA fetches, too heavy to run for all 62 rivers
  on load. Cards link through to the river where levels already load. (Future:
  a bulk `/api/rivers/levels` endpoint to light up the grid.)

### 4. Map token: ignore "Afon" / "River"
- Map river markers show `displayName.charAt(0)` (`RiverMap.tsx:647`), so most
  read "A" (Afon) or "R" (River). Strip leading generic words
  (Afon, River, Nant, Afon-y, etc.) before taking the initial, so "Afon Colwyn"
  → "C", "River Wye" → "W".

### 5. Photos POI filter on River Details
- Today selecting Rapids / Hazards / Access filters the map POIs to that group
  (`hiddenPoiCategories` + `RIVER_TAB_POI_CATEGORIES`, `RiverMap.tsx`).
- Add the same for **Photos**: a tab/filter that shows only POIs that have
  photos (`poi.photos?.length`).

## Shared building block: `RiverCard`
A reusable card component used by both Dashboard and Discover. Props: the
canonical river, an optional level reading (so the dashboard can show live state
and Discover can omit it), an onOpen handler, and favourite state/toggle. Styled
to the Surge "river card" (`.rc`) language with light-theme fallbacks via tokens.

## Implementation order
1. Map token tweak (small, isolated).
2. Photos POI filter (small, follows an existing pattern).
3. River favourites + star in the river panel.
4. `RiverCard` component + Discover page + nav entry.
5. Dashboard page (+ per-favourite level fetch) + nav entry.

Build after each; commit working increments to `user-dashboard`. No PR until
reviewed.

## Open questions / future work
- Bulk river-levels endpoint to show live levels across the Discover grid.
- Should Dashboard become the default landing for signed-in users?
- Server-synced favourites (currently localStorage / per-device).
- Reconcile section favourites vs river favourites once the section model lands.
