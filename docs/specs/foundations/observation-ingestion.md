---
roadmap_backend_group: Data Providers
roadmap_backend_item: Observation Ingestion
roadmap_backend_phase: Soon
spec_schema: 4
maturity: Buildable
---

# Observation Ingestion

**Work state:** Active
**Last updated:** 2026-05-25
**Scope:** Backend ingestion, storage, scheduling, and monitoring for river levels, river flow, rainfall, tidal/sea levels, and future release/forecast observations.

## Purpose

RiverLaunch.app needs a provider-backed observation layer that can show current and historical environmental context for mapped river sections without calling public provider APIs from every browser session.

The layer should be generic enough to support multiple environmental observation types while keeping paddling-specific interpretation separate.

## Product Role

- `Primary user objective:` See current and recent environmental context for a section or gauge point, then understand whether local/community interpretation exists.
- `Classification:` Core
- `Loop step:` Choose / Review
- `Why this matters:` River level, rainfall, flow, tide, and release data are essential context, but the app must cache, attribute, and label provider data safely without becoming a raw hydrology archive.

## References

- `/docs/specs/discovery/river-level-providers.md`
- `/docs/specs/foundations/service-api.md`
- `/docs/specs/foundations/data-and-sync-model.md`
- `/docs/specs/foundations/platform-configuration.md`
- `/docs/specs/foundations/offline-mode.md`
- `/docs/strategy/community-data-strategy.md`
- Environment Agency Flood Monitoring API: `https://environment.data.gov.uk/flood-monitoring/doc/reference`
- Environment Agency Rainfall API: `https://environment.data.gov.uk/flood-monitoring/doc/rainfall`
- Natural Resources Wales API Portal: `https://api-portal.naturalresources.wales/`
- SEPA Time Series API controls: `https://timeseriesdoc.sepa.org.uk/api-documentation/before-you-start/what-controls-there-are-on-access/`

## Requirements

The backend should model provider observations using a common shape:

```text
provider -> station -> measure -> reading time series -> section interpretation
```

Observation types should include:

- `river_level`
- `river_flow`
- `rainfall`
- `tidal_level`
- `sea_level`
- `release`
- `forecast`

The storage model must separate:

- provider station and measure metadata
- observed readings
- latest-reading cache
- section-to-measure relevance
- paddling interpretation such as runnable ranges
- scheduled job run state and monitoring data

The first ingestion providers are Environment Agency river-level data and Natural Resources Wales public station graph data for selected Wye and Tryweryn candidate measures. The model should not be limited to EA/NRW or to river levels.

All provider ingestion must run server-side. Browser clients must read RiverLaunch.app APIs rather than provider APIs directly.

The first scheduled production pattern should be:

```text
Cloud Scheduler
  -> authenticated Cloud Run API endpoint
  -> provider adapters
  -> PostgreSQL/PostGIS
  -> job run log + structured logs + admin status
```

The first implementation may expose guarded manual endpoints before Cloud Scheduler is provisioned:

- `POST /api/jobs/observations/ingest`
- `POST /api/jobs/observations/backfill`
- `GET /api/admin/observations/jobs`

Until Cloud Scheduler is provisioned, the Admin System surface should expose a manual `Refresh river levels` action for admins and contribution moderators. The action should call `POST /api/jobs/observations/ingest`, show recent job status from `GET /api/admin/observations/jobs`, and prevent repeated ingestion more often than every 15 minutes. The cooldown must be enforced server-side as well as reflected in the UI.

The job endpoint must be protected by either:

- a verified admin or contribution moderator Firebase token, or
- a runtime secret header used by the scheduler until OIDC-only job auth is wired.

Provider adapters must:

- batch requests where provider APIs allow it
- use conservative request rates
- handle `429` and `5xx` responses without failing unrelated providers
- upsert readings idempotently by provider, measure, and observed time
- update latest-reading cache only from successfully parsed readings
- record job run status as `success`, `partial`, or `failed`
- store enough provider metadata for attribution and debugging

History policy:

- import broad station/measure metadata where provider terms and volume allow it
- keep latest and short recent history broadly where practical
- keep deeper rolling history for active measures linked to published sections, draft routes, watched sections, recently viewed routes, alerts, or moderator-pinned candidates
- backfill recent history on demand when a new route candidate is created

Ongoing scheduled ingestion and historical backfill are separate job concerns:

- `observations.ingest` is the frequent scheduler job. It should use a small recent window, run cheaply every 15 minutes, and keep RiverLaunch history moving forward.
- `observations.backfill` is an on-demand seeding job. It should fetch the provider's larger available recent window for newly linked/enabled measures, then rely on scheduled ingestion from that point onward.

For Environment Agency measures, the first backfill implementation should fetch a bounded recent window, starting with up to 28 days, and insert readings idempotently. Backfill should be safe to rerun and must not duplicate readings already collected by scheduled ingestion.

The initial route is operator-triggered:

```bash
npm run api:backfill:observations -- --hours=672
npm run platform:backfill:observations:staging -- --hours=672
```

Later, route/measure creation should trigger this same backfill path automatically after a moderator links or enables a measure.

Initial enabled measures should cover:

- Tryweryn at Bala Weir X river level for the active Tryweryn route, marked as downstream/section candidate context until locally validated
- Tryweryn Dam rainfall as rainfall context for the active Tryweryn route
- upper/middle Wye NRW candidates at Glasbury, Hay-on-Wye, and Bredwardine
- lower Wye EA candidates at Old Wye Bridge, Ross-on-Wye, and Lydbrook

Gauge links remain candidate links until community or moderator validation confirms the relationship between a reading and actual paddling conditions on a section.

Provider attribution and freshness must be visible in downstream APIs. Cached readings must never appear as guaranteed live data, and offline/stale readings must show observed and fetched timestamps.

The section observation read API should support user-selectable history windows for the route Levels tab. Initial supported chart windows are 48 hours, 7 days, and 28 days, backed by RiverLaunch-stored readings rather than live browser calls to provider APIs.

## API Shape

Initial job response:

```json
{
  "jobRun": {
    "id": "uuid",
    "status": "success",
    "provider": "environment-agency",
    "measuresAttempted": 1,
    "readingsFetched": 12,
    "readingsInserted": 10,
    "readingsUpdated": 2,
    "errorCount": 0
  }
}
```

Read endpoints:

- `GET /api/sections/:sectionId/observations?hours=48|168|672`
- `GET /api/observation-measures/:measureId/readings?from=...&to=...`

Future read endpoints:

- `GET /api/map-pois/:poiId/observations`

## Data Model

### `observation_stations`

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid primary key` | RiverLaunch station ID. |
| `provider` | `text` | Provider key, for example `environment-agency`, `natural-resources-wales`, or `sepa`. |
| `provider_station_id` | `text` | Provider station identifier. |
| `name` | `text` | Provider station display name when available. |
| `geometry` | `geometry(Point, 4326)` | Station location. |
| `region` | `text` | Optional provider/operational region. |
| `catchment` | `text` | Optional catchment name/id. |
| `source_url` | `text` | Provider/source URL. |
| `metadata` | `jsonb` | Provider-specific metadata. |

### `observation_measures`

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid primary key` | RiverLaunch measure ID. |
| `station_id` | `uuid` | Parent observation station. |
| `provider` | `text` | Provider key. |
| `provider_measure_id` | `text` | Provider measure identifier. |
| `parameter` | `text` | `river_level`, `river_flow`, `rainfall`, `tidal_level`, `sea_level`, `release`, or `forecast`. |
| `unit` | `text` | Normalised display/storage unit. |
| `sampling_interval` | `text` | Provider sampling interval where known. |
| `datum` | `text` | Datum/reference when relevant. |
| `source_url` | `text` | Provider/source URL. |
| `enabled` | `boolean` | Whether scheduler ingestion should include this measure. |
| `metadata` | `jsonb` | Provider-specific metadata. |

### `section_measure_links`

| Column | Type | Purpose |
| --- | --- | --- |
| `section_id` | `text` | River section ID. |
| `measure_id` | `uuid` | Linked observation measure. |
| `relevance` | `text` | `primary`, `secondary`, `upstream`, `downstream`, `rainfall_context`, `tidal_context`, or `release_context`. |
| `confidence` | `text` | `nearby-candidate`, `section-candidate`, `community-confirmed`, or `moderator-verified`. |
| `notes` | `text` | Human rationale for the link. |

### `observation_readings`

| Column | Type | Purpose |
| --- | --- | --- |
| `measure_id` | `uuid` | Observation measure. |
| `observed_at` | `timestamptz` | Provider observation timestamp. |
| `value` | `double precision` | Numeric value. |
| `quality` | `text` | Provider quality/status if known. |
| `fetched_at` | `timestamptz` | When RiverLaunch fetched it. |
| `raw` | `jsonb` | Minimal provider payload for diagnostics. |

### `observation_latest_readings`

| Column | Type | Purpose |
| --- | --- | --- |
| `measure_id` | `uuid primary key` | Observation measure. |
| `observed_at` | `timestamptz` | Latest known provider observation timestamp. |
| `value` | `double precision` | Latest known value. |
| `quality` | `text` | Provider quality/status if known. |
| `fetched_at` | `timestamptz` | When RiverLaunch fetched it. |
| `state` | `text` | `live`, `stale`, `unavailable`, or `error`. |
| `raw` | `jsonb` | Minimal provider payload for diagnostics. |

### `observation_job_runs`

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid primary key` | Job run ID. |
| `job_type` | `text` | `observations.ingest` or `observations.backfill`. |
| `provider` | `text` | Provider or `all`. |
| `status` | `text` | `running`, `success`, `partial`, or `failed`. |
| `started_at` | `timestamptz` | Start time. |
| `finished_at` | `timestamptz` | Finish time. |
| `measures_attempted` | `integer` | Measures attempted. |
| `readings_fetched` | `integer` | Readings parsed from providers. |
| `readings_inserted` | `integer` | New reading rows inserted. |
| `readings_updated` | `integer` | Existing reading rows updated. |
| `error_count` | `integer` | Provider/measure errors. |
| `message` | `text` | Operator-readable summary. |
| `details` | `jsonb` | Provider-level diagnostics. |

## Monitoring And Alerts

Production monitoring should include:

- structured Cloud Run logs per job run and provider
- Admin > System provider status
- alert if no successful ingestion has completed for 60 minutes
- alert if the same provider fails 3 runs in a row
- alert if all latest readings for an active provider are stale
- alert if provider `429` or repeated `5xx` responses occur

## Open Questions

- Should Cloud Scheduler use direct OIDC-only Cloud Run auth, a signed job token, or both during staging?
- How much recent history should be retained for inactive measures?
- Should provider station metadata discovery run as a separate daily job from reading ingestion?
- Which NRW and SEPA API plans/keys should be used for production traffic?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| OBS-F1 | Generic observation schema | Backend/data | Active | MVP | — | Stations, measures, readings, latest cache, section links, and job runs. |
| OBS-F2 | Manual ingestion endpoint | Backend/job | Active | MVP | — | Guarded API endpoint for first EA ingestion run before scheduler automation. |
| OBS-F3 | Environment Agency adapter | Backend/provider | Active | MVP | — | Provider adapter for current/recent EA readings. |
| OBS-F4 | Scheduled ingestion | Platform/ops | Queued | MVP | — | Cloud Scheduler invokes Cloud Run with job auth. |
| OBS-F5 | Job monitoring | Admin/ops | Active | MVP | — | Admin/system status lists recent observation ingestion/backfill runs; alerting around failures and stale data remains queued. |
| OBS-F6 | Observation read APIs | Backend/frontend | Active | MVP | — | Section endpoint exposes linked measures, latest reading, and selectable recent history windows; frontend renders latest, range, calculated trend, and compact line chart. Gauge POI endpoint remains queued. |
| OBS-F7 | Observation backfill | Backend/job | Active | MVP | — | On-demand backfill seeds available provider history for enabled measures and records `observations.backfill` job runs. |
| OBS-F8 | NRW provider | Backend/provider | Active | MVP | — | Initial NRW station graph adapter covers Tryweryn level/rainfall and upper Wye candidates. |
| OBS-F9 | Admin manual refresh | Admin/backend | Active | MVP | — | Admin System can trigger guarded observation ingestion with a 15-minute cooldown and recent job status. |
| OBS-F10 | Rainfall and tide data | Backend/provider | Queued | MVP | — | Use the generic model for non-level observation types. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| OBS-B1 | decision | Job authentication | Active | MVP | Start with admin/token guard; move to scheduler OIDC for production. |
| OBS-B2 | risk | Provider rate limits | Active | MVP | Backend must throttle, cache, and avoid browser fan-out. |
| OBS-B3 | decision | Retention policy | Open | MVP | Decide broad/latest vs deep active-measure retention. |
| OBS-B4 | enhancement | Station discovery | Open | MVP | Import all station/measure metadata so route creation can suggest gauges immediately. |
| OBS-B5 | risk | Safety interpretation | Open | MVP | Raw readings must not imply a route is safe or runnable without local interpretation. |
| OBS-B6 | decision | Backfill window by provider | Active | MVP | EA starts with a bounded 28-day recent-history backfill; provider-specific limits need documenting as adapters are added. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-25 | Created generic observation ingestion spec. |
| 2026-05-25 | Split scheduled observation ingestion from on-demand provider history backfill. |
