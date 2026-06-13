---
spec_schema: 4
maturity: Sketch
---

# Nearby Amenities And Emergency Points

**Work state:** Queued
**Last updated:** 2026-06-13
**Scope:** Later-phase amenity and safety POIs near paddleable rivers — toilets/facilities and emergency points (defibrillators, hospitals, payphones) — with proximity filtering and source/freshness labelling.

## Purpose

Joe's feedback (10 June 2026) raised two related amenity ideas:

- "Is there a way to list toilets? Perhaps even within a certain distance from paddleable rivers to avoid the congestion of all the London ones."
- "Emergency points too? Payphones, defibs (I know they're listed somewhere online), hospitals etc."

These are practical, paddler-relevant map points that fit the POI emphasis of the river-first pivot. This spec parks them until the canonical river model, candidate-POI extraction, and river-first discovery are solid, so that amenity and safety points are added as a clearly sourced layer rather than rushed onto safety-relevant surfaces.

The key product nuance in Joe's note is relevance: a naive "all toilets" or "all defibs" layer is noise (the "London congestion" problem). These POIs are only useful when filtered to what is near paddleable water and the places paddlers actually start, finish, scout, or portage.

## Product Role

- `Primary user objective:` Find practical facilities (toilets) and safety/emergency points (defibrillators, hospitals, payphones) relevant to a planned or current paddle.
- `Classification:` Future expansion (amenity + safety POI layer)
- `Loop step:` Plan / Paddle / Recover
- `Why this matters:` Useful logistics and reassurance for paddlers, but emergency data is safety-critical — stale or wrong points are worse than none, so freshness, sourcing, and disclaimers matter more here than for general POIs.

## References

- `/docs/specs/discovery/canonical-river-database.md` — candidate POI extraction from OSM and public sources.
- `/docs/specs/discovery/public-source-seeding.md` — licence/permission classification for any imported source.
- `/docs/specs/contributions/community-contributions.md` — existing access categories already include toilet/facility and emergency exit.
- `/docs/specs/foundations/geospatial-domain-model.md` — POIs are location-owned, not route-owned.
- `/docs/specs/discovery/river-first-discovery.md` — river-led discovery and selected-river context.
- `/docs/specs/foundations/seed-data-operations.md` — seed import, refresh cadence, and what3words backfill.

## Requirements

### Toilets And Facilities

- Support a toilet/facility POI type that can be listed on the map and in selected-river context.
- Filter by proximity to paddleable rivers and to access points (put-in, take-out, parking, portage), not by raw geography, so dense urban areas do not flood the list.
- Allow structured notes where available, for example public/paid, accessibility, opening hours, and distance from the nearest access point.

### Emergency Points

- Support emergency POI types: defibrillator (AED), hospital / A&E, and payphone, with room for others (e.g. lifebuoy/throwline stations, ranger or lock-keeper contacts).
- Treat emergency points as safety-critical: each must carry a source, a last-checked/last-updated date, and a confidence label, and must never be presented as a guaranteed or verified emergency service.
- Surface emergency points in a way that complements, not replaces, calling 999/112 — include clear language steering users to emergency services first.
- Consider pairing emergency context with precise-location sharing (e.g. what3words / live location) so a paddler can give responders an exact position.

### Proximity And Relevance

- Define "paddleable river" and a distance threshold that keeps the amenity/emergency lists relevant to paddling rather than general-purpose.
- Relevance filtering should reuse the canonical river and access-point geometry rather than a separate location model.

### Sourcing

- Any imported amenity/emergency data must go through the public-source-seeding classification (open data, reference, permission-needed, do-not-copy) with attribution.
- Candidate amenity/emergency POIs from OSM tags (e.g. `amenity=toilets`, `emergency=defibrillator`, `amenity=hospital`, payphone tags) should be treated as source-derived candidates for review, not confirmed points, consistent with the canonical-river candidate-POI workflow.

## Open Questions

- What distance threshold and definition of "paddleable" keeps these lists relevant without hiding genuinely useful nearby points?
- Which sources are licensed and usable per type — OSM for toilets/payphones, a national defibrillator dataset (Joe notes defibs are "listed somewhere online"), and NHS/official data for hospitals/A&E? Each needs a licence check before import.
- How is safety-critical freshness maintained for emergency points, and what staleness handling applies when a defibrillator or payphone may no longer exist?
- Should emergency points integrate with what3words / live-location sharing for 999 calls?
- Are these primarily seeded/curated POIs, community-confirmable POIs, or both?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| AMEN-F1 | Toilets/facilities layer | Map/river detail | Queued | Later | — | Filtered to near paddleable rivers and access points; avoid urban flooding. |
| AMEN-F2 | Emergency points layer | Map/river detail | Queued | Later | — | Defibrillators, hospitals/A&E, payphones; safety-critical sourcing and freshness. |
| AMEN-F3 | Proximity/relevance filtering | Map/data | Queued | Later | — | Reuse canonical river and access-point geometry; define distance threshold. |
| AMEN-F4 | Source + freshness labelling | Map/river detail | Queued | Later | — | Source, last-checked date, and confidence on every amenity/emergency POI. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| AMEN-B1 | risk | Stale emergency data | Open | Later | A removed defib or payphone shown as available is a safety hazard; needs freshness and disclaimers. |
| AMEN-B2 | decision | Data sources and licensing | Open | Later | OSM amenity/emergency tags, national defib dataset, NHS hospital data — each needs a licence/permission check. |
| AMEN-B3 | decision | Proximity model | Open | Later | Define "paddleable river" and distance threshold for relevance filtering. |
| AMEN-B4 | risk | Emergency liability | Open | Later | Must not present the app as a substitute for calling 999/112 or for verified emergency provision. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-06-13 | Created future amenity and emergency-points spec from Joe feedback (toilets near paddleable rivers; emergency points — payphones, defibrillators, hospitals). |
