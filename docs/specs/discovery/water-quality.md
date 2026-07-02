---
roadmap_backend_group: Data Providers
roadmap_backend_item: Water Quality Providers
roadmap_backend_phase: Soon
spec_schema: 4
maturity: Draft
---

# Water Quality

**Work state:** Queued
**Last updated:** 2026-07-02
**Scope:** Provider integration and discovery surface for near-real-time sewage-spill status and bathing-water classifications, attached to the put-ins, take-outs, and river reaches paddlers use, presented as risk context and never as a clean/dirty verdict.

## Purpose

Water quality is now one of the highest-salience concerns for UK paddlers (see `/docs/strategy/market-review-2026-07.md` and `/docs/strategy/community-data-strategy.md` §Water Quality Is Official-Data Context). Paddle UK attributes part of the 2024 participation dip to water-quality concern; sewage-spill volume and paddler illness reports are high and widely reported.

The relevant data is free and open via official providers, so this is trusted-provider context of the same kind the product already uses for levels and warnings — not a community-contribution type. The differentiation is not the data itself (Surfers Against Sewage and the Rivers Trust already publish it for surf/swim/bathing spots) but **tying spill status and classifications to the specific put-ins, take-outs, and reaches paddlers actually use**, alongside levels and access.

Strategically this is a cold-start lever: it is useful on day one without community seeding, refreshes constantly, and is national in coverage, so it can make first use compelling before the contribution flywheel turns.

## Product Role

- `Primary user objective:` Understand whether the water at a chosen put-in or reach has recent sewage-discharge activity, before travelling or getting in.
- `Classification:` Core
- `Loop step:` Choose
- `Why this matters:` Pollution risk is a real, time-sensitive input to the paddle/no-paddle decision, and no paddling app currently surfaces it against paddler-relevant locations. It must be framed as risk indication, not a safety guarantee.

## References

- `/docs/strategy/market-review-2026-07.md`
- `/docs/strategy/community-data-strategy.md` — §Water Quality Is Official-Data Context
- `/docs/specs/principles/no-advice-and-liability-language.md` — governs all wording here
- `/docs/specs/foundations/observation-ingestion.md` — shared server-side ingestion pattern
- `/docs/specs/discovery/river-level-providers.md` — sibling provider model
- `/docs/specs/discovery/river-section-map.md` — map/POI surfaces this appears on
- `/docs/specs/discovery/nearby-amenities-and-emergency-points.md` — sibling proximity-linked discovery layer
- `/docs/specs/foundations/service-api.md`
- National Storm Overflow Hub (Water UK / "Stream"): `https://www.streamwaterdata.co.uk/pages/the-national-storm-overflow-hub`
- The Rivers Trust Sewage Map: `https://theriverstrust.org/sewage-map`
- Environment Agency bathing water quality (Swimfo): `https://environment.data.gov.uk/bwq/profiles/`

## Requirements

### Providers and data types

The first providers should be UK official/open sources, ingested server-side. Browser clients must read RiverLaunch.app APIs, not provider APIs directly (same rule as `observation-ingestion`).

- **National Storm Overflow Hub** — near-real-time storm-overflow discharge status (start/stop events, currently-active state), published within roughly one hour, open with a public API. This is the primary near-real-time signal.
- **Environment Agency bathing-water classifications (Swimfo)** — annual categorical ratings (`Excellent` / `Good` / `Sufficient` / `Poor`) for designated bathing waters, including newly designated river bathing sites. Slow-changing context, not real-time.
- **The Rivers Trust sewage map** — supporting/reference layer and provenance; used for corroboration and attribution rather than as a distinct live feed where it overlaps the Storm Overflow Hub.

The model must not assume a single provider or a single data shape. Spill data is **event/interval-based**; bathing classifications are **categorical and annual**. Neither fits the numeric `observation_readings` time-series in `observation-ingestion`, so water quality uses its own storage (below) while sharing that spec's ingestion, scheduling, attribution, and monitoring patterns.

### Linking to paddler locations

- Storm overflows have point locations; the app links the **nearest relevant overflow(s)** to a put-in/take-out POI and to a river reach/section, with a stored proximity and a confidence/relevance label (candidate vs moderator-verified), mirroring `section_measure_links`.
- Bathing-water sites link to the reach/POI they cover.
- Links start as **distance-based candidates** and are confirmed by moderators or trusted contributors; an overflow being physically near a put-in does not prove it is the relevant discharge for that stretch.

### Discovery surface

- A **water-quality indicator** appears on the river card / selected-river context and on relevant put-in/take-out POIs: recent spill activity summary (e.g. "discharge reported in the last 48h" with count and last-known time), plus bathing classification where the location is a designated bathing water.
- An optional **water-quality map layer** shows nearby overflow points and their recent-activity state, consistent with the existing layer-filter model in `river-section-map`.
- Every indicator carries **source, observed/updated time, and freshness state**. Stale or unavailable provider data must be labelled, never shown as current.

### No-advice framing (mandatory)

Governed by `/docs/specs/principles/no-advice-and-liability-language.md`:

- Present spill activity as **risk indication with source and timestamp**, never as a clean/dirty verdict, "safe to paddle", or "water is clean".
- Storm-overflow monitoring shows discharge **presence/absence and duration**, not measured pathogen levels; sensors can fault or be offline. State this limitation on the surface.
- Use wording such as "recent discharge reported", "no discharge reported in the last 48h (monitoring may be incomplete)", "classification: Good (annual bathing rating)". Avoid "safe", "clean", "no risk", "fine to paddle".
- Absence of a reported spill is not evidence of clean water; the copy must not imply it is.

### Relationship to community data

Water quality is official-data context. Members may additionally submit **observed pollution reports** (visible sewage, foam, dead fish, smell, or illness after paddling) as a typed contribution under `community-contributions`, which **supplements but never overrides** the official signal and is displayed with the same freshness/source treatment as other contributions.

### Server-side ingestion, offline, and safety

- Ingestion, caching, scheduling, provider-outage handling, and attribution follow `observation-ingestion` (Cloud Scheduler → guarded Cloud Run endpoint → PostGIS → API), with a conservative refresh cadence appropriate to near-real-time spill data.
- Cached/offline water-quality state must be labelled as not current, with observed and fetched timestamps.
- Provider `429`/`5xx` responses must not fail unrelated providers or observation ingestion.

### Target read shape

```ts
{
  locationId: string;            // POI or section id
  spillStatus: {
    provider: "national-storm-overflow-hub";
    nearestOverflowId: string;
    distanceMeters: number;
    state: "discharging" | "recent" | "none-reported" | "offline" | "unknown";
    lastDischargeStart: string | null;
    lastDischargeEnd: string | null;
    windowHours: number;         // window the summary was computed over
    observedAt: string | null;
    fetchedAt: string | null;
    sourceUrl: string;
  } | null;
  bathingWater: {
    provider: "environment-agency";
    siteId: string;
    classification: "excellent" | "good" | "sufficient" | "poor" | "unclassified";
    classifiedYear: number;
    sourceUrl: string;
  } | null;
}
```

## Data Model

Proposed tables (shared ingestion/monitoring with `observation-ingestion`, distinct storage for event/categorical shapes):

### `water_quality_sites`

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid primary key` | RiverLaunch site/asset ID. |
| `provider` | `text` | `national-storm-overflow-hub`, `environment-agency`, or `rivers-trust`. |
| `provider_asset_id` | `text` | Provider overflow/bathing-site identifier. |
| `asset_type` | `text` | `storm_overflow` or `bathing_water`. |
| `name` | `text` | Provider display name when available. |
| `geometry` | `geometry(Point, 4326)` | Asset location. |
| `operator` | `text` | Water company / operator where known (overflows). |
| `source_url` | `text` | Provider/source URL. |
| `metadata` | `jsonb` | Provider-specific metadata. |

### `water_quality_events`

| Column | Type | Purpose |
| --- | --- | --- |
| `site_id` | `uuid` | Parent `water_quality_sites` (storm overflow). |
| `event_type` | `text` | `discharge_start`, `discharge_stop`, or `status_snapshot`. |
| `started_at` | `timestamptz` | Discharge start where known. |
| `ended_at` | `timestamptz` | Discharge end where known (null if ongoing). |
| `observed_at` | `timestamptz` | Provider observation timestamp. |
| `fetched_at` | `timestamptz` | When RiverLaunch fetched it. |
| `raw` | `jsonb` | Minimal provider payload for diagnostics. |

### `water_quality_classifications`

| Column | Type | Purpose |
| --- | --- | --- |
| `site_id` | `uuid` | Parent `water_quality_sites` (bathing water). |
| `classification` | `text` | `excellent`, `good`, `sufficient`, `poor`, or `unclassified`. |
| `classified_year` | `integer` | Year the classification applies to. |
| `source_url` | `text` | Provider/source URL. |

### `location_water_quality_links`

| Column | Type | Purpose |
| --- | --- | --- |
| `location_id` | `text` | POI or section ID. |
| `site_id` | `uuid` | Linked `water_quality_sites` asset. |
| `relevance` | `text` | `nearest`, `upstream`, `reach`, or `covers`. |
| `distance_meters` | `double precision` | Distance from the paddler location to the asset. |
| `confidence` | `text` | `distance-candidate`, `community-confirmed`, or `moderator-verified`. |
| `notes` | `text` | Human rationale for the link. |

## Open Questions

- What is the appropriate near-real-time refresh cadence for the Storm Overflow Hub, and what summary window (24h / 48h / 72h) is most useful for paddlers?
- Should spill relevance be strictly distance-based, or catchment/upstream-aware (an upstream discharge can affect a downstream reach)?
- How should "monitoring offline / sensor fault" states be distinguished from "no discharge" in the UI without implying either safety or alarm?
- Should water quality be a default-on discovery indicator or an opt-in layer at launch?
- Do the Rivers Trust and Storm Overflow Hub licences require specific attribution wording on-surface?
- Should observed-pollution community reports feed a combined indicator, or remain a separate contribution display?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| WQ-F1 | Water-quality data model | Backend/data | Queued | MVP | — | Sites, events, classifications, and location links; distinct from numeric observation readings. |
| WQ-F2 | Storm Overflow Hub adapter | Backend/provider | Queued | MVP | — | Ingest near-real-time discharge status/events via the public API, server-side. |
| WQ-F3 | Bathing-water classification adapter | Backend/provider | Queued | MVP | — | Ingest EA annual bathing classifications for designated sites. |
| WQ-F4 | Location linking (proximity → confirmed) | Backend/data | Queued | MVP | — | Distance-based candidate links to POIs/reaches, confirmable by moderators/trusted contributors. |
| WQ-F5 | Water-quality read API | Backend/frontend | Queued | MVP | — | Per-location spill summary + bathing classification with source/freshness. |
| WQ-F6 | River-card / POI indicator | UI | Queued | MVP | — | No-advice indicator: recent-discharge summary + classification with timestamps. |
| WQ-F7 | Water-quality map layer | UI | Queued | Later | — | Optional layer showing nearby overflow points and recent-activity state. |
| WQ-F8 | Offline/stale labelling | UI/data | Queued | MVP | — | Cached water-quality state labelled as not current. |
| WQ-F9 | Observed-pollution community report | Contributions | Queued | Later | — | Typed community report that supplements, never overrides, official signal (owned by community-contributions). |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| WQ-B1 | decision | Default-on indicator vs opt-in layer | Open | MVP | Affects prominence and no-advice risk. |
| WQ-B2 | decision | Distance-only vs catchment/upstream-aware relevance | Open | MVP | Upstream discharges affect downstream reaches. |
| WQ-B3 | dependency | Confirm Storm Overflow Hub API access, rate limits, and attribution terms | Open | MVP | Public API confirmed live Nov 2024; verify usage terms. |
| WQ-B4 | dependency | EA bathing-water dataset access and refresh cadence | Open | MVP | Annual classifications; new river bathing sites being designated. |
| WQ-B5 | risk | No-advice framing of spill absence | Open | MVP | Absence of reported spill must not imply clean/safe water. |
| WQ-B6 | risk | Sensor fault / monitoring-offline states | Open | MVP | Must be distinguishable from "no discharge". |
| WQ-B7 | enhancement | Watch/alert on water quality for a saved location | Open | Later | Aligns with future level alerts; keep no-advice framing. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-07-02 | Created from the July 2026 market review, elevating water quality from a "later opportunity" to a Tier-1 discovery layer. |
