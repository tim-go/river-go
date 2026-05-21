---
roadmap_backend_group: Data Providers
roadmap_backend_item: River Level Providers
roadmap_backend_phase: Soon
spec_schema: 4
maturity: Buildable
---

# River Level Providers

**Work state:** Queued
**Last updated:** 2026-05-21
**Scope:** Provider integration model for live river level data, starting with Environment Agency data for Wye gauge candidates.

## Purpose

River Go needs current river level data, but the product should not expose raw provider APIs directly as the core domain model.

Provider data should be normalised into River Go's section/gauge model.

## Product Role

- `Primary user objective:` Understand current river level context for a selected section.
- `Classification:` Core
- `Loop step:` Choose
- `Why this matters:` Gauge readings only become useful when interpreted against sections, craft, and community guidance.

## References

- `/docs/strategy/data-sources-and-gaps.md`
- `/docs/specs/data/river-wye-seed-data.md`
- `/docs/specs/core/river-section-map.md`
- Environment Agency Flood Monitoring API: `https://environment.data.gov.uk/flood-monitoring/doc/reference`

## Requirements

Prototype architecture:

```text
Environment Agency API
        ↓
frontend provider adapter
        ↓
normalised section gauge object
        ↓
map/detail UI
```

Production architecture:

```text
Environment Agency / NRW / SEPA / DfI APIs
        ↓
River Go backend provider adapters
        ↓
database/cache
        ↓
River Go API
        ↓
frontend
```

Client-side live lookup is acceptable only as a temporary prototype step. Long-term, the backend should own ingestion, caching, trend calculation, provider outages, source metadata, and gauge-to-section mapping.

The first provider should be Environment Agency river-level data for England.

The first implementation should:

- fetch station/measure readings for selected Wye gauge candidates
- normalise latest reading into a River Go shape
- expose observed time, value, unit, trend if available, provider, and source URL
- fail gracefully back to seed/demo values
- keep provider-specific details out of UI components where possible

Target frontend shape:

```ts
{
  sectionId: string;
  gauge: {
    provider: "environment-agency";
    providerStationId: string;
    name: string;
    latestValue: number | null;
    unit: string;
    trend: "rising" | "falling" | "steady" | "unknown";
    observedAt: string | null;
    sourceUrl: string;
  };
  interpretation: {
    band: "too-low" | "good" | "high" | "unknown";
    confidence: string;
  };
}
```

## Open Questions

- Which Environment Agency station/measure IDs map to each Wye section?
- Should the prototype fetch direct from the client or use a lightweight local backend before production?
- How should trend be calculated if provider data does not provide it directly?
- How should missing/outage states appear in the UI?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| LEVEL-F1 | Provider abstraction | Data/service | Queued | v0.2 | — | Define normalised provider interface before fetching live data. |
| LEVEL-F2 | Environment Agency client adapter | Data/service | Queued | v0.2 | — | Temporary client-side adapter for prototype. |
| LEVEL-F3 | Wye gauge mapping | Data/service | Queued | v0.2 | — | Map Wye seed sections to EA station/measure IDs. |
| LEVEL-F4 | Gauge display replacement | UI | Queued | v0.2 | — | Replace fixture values with live/latest values where available. |
| LEVEL-F5 | Backend ingestion design | Backend | Queued | MVP | — | Move provider logic server-side before production. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| LEVEL-B1 | decision | Client prototype vs backend first | Resolved | v0.2 | Prototype client-side adapter is acceptable if interface remains backend-shaped. |
| LEVEL-B2 | dependency | Identify EA station IDs | Open | v0.2 | Need real Wye station/measure IDs. |
| LEVEL-B3 | enhancement | Trend calculation | Open | v0.2 | Could compare latest readings if provider trend unavailable. |
| LEVEL-B4 | enhancement | NRW/SEPA/DfI providers | Parked | Europe/UK expansion | Add after EA adapter model is proven. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-21 | Migrated to spec schema v4. |
