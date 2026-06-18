---
roadmap_ops_area: Data
roadmap_ops_group: Seeding
roadmap_ops_item: Seed Data Operations
roadmap_ops_phase: Now
spec_schema: 4
maturity: Draft
---

# Seed Data Operations

**Work state:** Active
**Last updated:** 2026-06-05
**Scope:** Operational instructions for importing, refreshing, validating, and scheduling RiverLaunch.app seed, reference, canonical-river, and source-derived candidate datasets.

## Purpose

Seed data operations make RiverLaunch.app useful before the community dataset is complete, while keeping imported public data clearly separate from community-owned knowledge.

This spec is both the operator runbook and the durable instruction set for when to run seed jobs. It should be updated whenever a new required seed source, script, cadence, or validation step is introduced.

## Product Role

- `Primary user objective:` See enough routes, waterways, levels, and map context to use the app before community coverage is mature.
- `Classification:` Ops / Data
- `Loop step:` Operate / Seed / Validate
- `Why this matters:` Seed data starts the product, but stale or unsafe imports can mislead users unless the source, cadence, and confidence boundaries are explicit.

## References

- `/docs/specs/discovery/public-source-seeding.md`
- `/docs/specs/discovery/canonical-river-database.md`
- `/docs/specs/foundations/observation-ingestion.md`
- `/docs/specs/discovery/river-level-providers.md`
- `/docs/specs/foundations/geospatial-domain-model.md`
- `/docs/strategy/public-seed-source-register.md`
- `/docs/product/canonical-river-source-spike-2026-06-05.md`
- `/platform/README.md`
- `/api/README.md`

## Principles

Seed and refresh jobs must follow these rules:

- Import public/reference data into the correct source-owned tables or fields.
- Never overwrite member-created routes, POIs, photos, confirmations, corrections, or moderation history during a seed refresh.
- Treat OS Open Rivers, OS Open Names, WFD, catchment, and Main River datasets as source-owned records for canonical river bootstrap/enrichment, not community-verified paddling records.
- Treat OSM waterways as visual watercourse geometry for snap preview and known-rivers overlays, not as paddleable route evidence.
- Treat OSM waterway feature tags as candidate POI prompts until reviewed.
- Treat monitoring station data as observations and context, not as a guarantee that a route is safe or runnable.
- Run staging first, validate the app experience, then repeat against production.
- Use stable `source-version` values that identify the source and date, for example `geofabrik-great-britain-2026-05-26`.
- Prefer repeatable file-based imports for large datasets. Do not use live Overpass queries for country-wide imports.
- Keep source attribution, licence, source URL, checked date, and confidence metadata visible in the data model where supported.

## Required Seed Sources

| Dataset | Purpose | Current Source | Storage Target | Refresh Cadence | Notes |
| --- | --- | --- | --- | --- | --- |
| OSM waterways | Snap-to-river assist and known-rivers overlay | Geofabrik `.osm.pbf` extracts filtered with Osmium | `watercourses` | Monthly, and before major route-creation pilots | Visual reference only; not route suitability. |
| Pilot OSM waterways | Fast local/pilot bbox testing | Overpass bbox query | `watercourses` | As needed | Use only for small regions and development. |
| Pilot canonical rivers | First RiverLaunch river identities | Curated pilot seed plus OSM/WFD context | `canonical_rivers`, section links, source links | When pilot catalogue changes | First implementation path; does not depend on OS Open Rivers. |
| OS Open Rivers | Canonical GB river/watercourse bootstrap | OS Data Hub GeoPackage/Shapefile/GML | Source-owned river/watercourse tables plus canonical river links | Six-monthly after April/October once enabled | Optional later enrichment; direct download endpoint returned HTTP 500 during the 2026-06-05 spike. |
| OS Open Names | Alternate-name/search enrichment | OS Data Hub CSV/GeoPackage/GML | Source-owned name records and river name links | Quarterly after January/April/July/October once enabled | Optional later enrichment for Welsh/Scots/Gaelic alternatives and search context. |
| WFD river/canal waterbodies | Official waterbody IDs and river basin context | EA/NRW/SEPA/DAERA public spatial datasets | Source-owned official waterbody links | On source release changes | Environmental context, not paddling guidance. |
| Statutory/Main River datasets | Official status overlay | EA/devolved-equivalent public spatial datasets | Source-owned status links | On source release changes | Status/context only; sampled EA data lacked river names. |
| OSM feature candidates | Candidate rapids, weirs, waterfalls, dams, sluices, locks, access hints, and whitewater tags | Geofabrik/Overpass tags | Candidate POI/source-review tables | Monthly once implemented | Review-needed; never overwrite community-confirmed POIs. |
| Observation stations and readings | Current levels, history, rainfall, flow, tide/sea context | Agency/provider adapters | `observation_*` tables | Readings every 15-60 minutes; history backfill when a measure is added | Exact cadence depends on provider limits and value. |
| what3words addresses | Stable display metadata for POIs | what3words API | Contribution JSON payload | One-off backfill; then create-time enrichment | Avoid repeated view-time lookups. |
| App seed POIs/routes | Demo/pilot content and curated examples | Repo fixtures or approved imports | Route/contribution tables | Only when fixture/catalogue changes | Must not replace community edits without a migration plan. |

## OSM Waterway Import

Use the country-wide path for normal staging/prod seeding.

Prerequisites:

- `osmium-tool` installed locally.
- Fresh `gcloud auth login` when targeting staging/prod Cloud SQL.
- `platform/.config/river-go-runtime.json` contains the target database URLs.
- Database migrations have been run for the target environment.

OSM waterway seeding has three separate stages:

1. download the Geofabrik `.osm.pbf` extract
2. prepare a filtered waterway GeoJSONSeq file
3. ingest the prepared file into the database

Download a Great Britain extract:

```bash
npm run osm:download-extract -- great-britain /tmp/riverlaunch-osm
```

Prepare the waterway file from the downloaded extract. The script filters OSM
waterway ways, exports line geometry only, includes OSM way IDs, and writes
GeoJSON text-sequence data, which is valid Osmium output and is accepted by the
importer:

```bash
npm run osm:prepare-waterways -- great-britain /tmp/riverlaunch-osm
```

Import locally:

```bash
npm run api:import:osm-waterways -- \
  --file /tmp/riverlaunch-osm/great-britain-waterways.geojsonseq \
  --format geojsonseq \
  --source-version geofabrik-great-britain-YYYY-MM-DD \
  --truncate-source
```

Import to staging:

```bash
npm run platform:import:osm-waterways:staging -- \
  --file /tmp/riverlaunch-osm/great-britain-waterways.geojsonseq \
  --format geojsonseq \
  --source-version geofabrik-great-britain-YYYY-MM-DD \
  --truncate-source
```

Import to production only after staging validation:

```bash
npm run platform:import:osm-waterways:prod -- \
  --file /tmp/riverlaunch-osm/great-britain-waterways.geojsonseq \
  --format geojsonseq \
  --source-version geofabrik-great-britain-YYYY-MM-DD \
  --truncate-source
```

Use `--truncate-source` for a full replacement of the OSM-derived watercourse layer. This must only affect source-owned OSM watercourse records, not community routes or POIs.

For a small pilot bbox:

```bash
npm run api:import:osm-waterways -- \
  --bbox 52.90,-3.70,52.98,-3.55 \
  --source-version overpass-tryweryn-YYYY-MM-DD
```

Use pilot bbox imports for local testing only. Do not use live Overpass for Great Britain or other country-wide imports.

## Canonical River Source Imports

Pilot canonical river source imports should proceed without OS Open Rivers.

Run the repeatable source-inspection spike:

```bash
npm run data:spike:canonical-rivers
```

This writes `/docs/product/canonical-river-source-spike-2026-06-05.md` and does not write to the application database.

Seed the pilot canonical rivers locally:

```bash
npm run data:seed:canonical-river-pilots
```

### Reseed rivers on staging

The river seed has no `platform:*:staging` wrapper, and
`scripts/run-api-runtime-command.mjs` only injects `DATABASE_URL` — it does **not**
start a proxy. Staging exposes only `migrationsUrl` (the `github_ci` user, which
owns the schema and can therefore seed); there is no `adminUrl`. So reseeding means:
start one Cloud SQL Auth Proxy on **5441**, then run seed → promote → ingest through
it with `RIVER_GO_DATABASE_URL_KEY=migrationsUrl`.

Prerequisites: staging migrations applied (`npm run platform:migrate:staging`) and
the river-go gcloud config active (an account with `cloudsql.client` on
`river-go-staging`).

```bash
# 1. Start the Cloud SQL Auth Proxy on :5441 (leave running in its own terminal)
cloud-sql-proxy --gcloud-auth --address 127.0.0.1 --port 5441 \
  river-go-staging:europe-west2:river-go-db-staging

# 2. In another terminal — seed → promote → levels (all via migrationsUrl → :5441)
export RIVER_GO_DATABASE_URL_KEY=migrationsUrl
node scripts/run-api-runtime-command.mjs staging \
  npm --prefix api run seed:canonical-river-pilots -- --catalogue paddling --allow-partial-candidates
node scripts/run-api-runtime-command.mjs staging \
  npm --prefix api run repromote:pilot-candidates --
node scripts/run-api-runtime-command.mjs staging \
  npm --prefix api run ingest:observations --
# then stop the proxy (Ctrl-C)
```

The seed **upserts** (`ON CONFLICT … DO UPDATE` on river id, section links, source
features, and candidate POIs), so reseeding updates in place — it never duplicates
and is safe to re-run. `--catalogue` picks the set: `paddling` (curated
whitewater/canoe rivers), `all` (paddling + the 5 pilots), or `pilots` (just the 5).
`repromote:pilot-candidates` opens sections to their live level, and
`ingest:observations` pulls current EA/NRW/SEPA readings (add
`backfill:observations -- --hours=672` for ~28 days of chart history — see
[Observation Data](#observation-data)). Don't run a `platform:*:staging` script
while this manual proxy is holding 5441.

Production is the same flow against `river-go-prod:europe-west2:river-go-db-prod` on
**5442**, after staging validation. A dedicated
`platform:seed:canonical-river-pilots:staging` wrapper would let this drop the
manual proxy step.

Use dry-run mode to fetch OSM candidate counts without writing to the database:

```bash
npm run data:seed:canonical-river-pilots -- --dry-run
```

If a public OSM candidate fetch times out during a full batch, seed the canonical rivers with successful candidate imports and retry failed rivers individually:

```bash
npm run data:seed:canonical-river-pilots -- --allow-partial-candidates
npm run data:seed:canonical-river-pilots -- --river afon-tryweryn
npm run data:seed:canonical-river-pilots -- --river river-tay-grandtully
```

The 2026-06-05 local seed created 5 canonical rivers, 12 section links, 116 source features/source links, and 116 review-needed OSM candidate POIs.

The first non-OS implementation pass should:

1. Create candidate canonical `rivers` records for Wye, Dee/Llangollen, Tryweryn, Dart, and Tay/Grandtully.
2. Link canonical rivers to existing RiverLaunch section/catalogue IDs.
3. Import OSM source candidate features for the approved candidate tag set into source-owned rows.
4. Create review-needed candidate POI rows from the OSM source features.
5. Keep official WFD/Main River source links as later enrichment unless a pilot river needs that context immediately.
6. Expose import run, source version, record count, and validation status in Admin before any production-wide refresh.
7. Retry OS Open Rivers separately later and link it to existing canonical rivers if useful.
8. Confirm the Admin moderation candidate queue loads and source candidates can be marked without exposing them as public map POIs.

Do not use OS/OpenData/WFD records to infer route suitability, access, grade, or current paddling conditions.

## OSM Candidate POI Import

The current OSM waterway importer stores waterway line features only. It misses many useful OSM node/way features such as rapids, weirs, waterfalls, dams, sluice gates, lock gates, and whitewater tags.

The first candidate POI importer should:

1. Read OSM node and way features for the approved candidate tag set.
2. Store source-derived candidate records separately from confirmed RiverLaunch POIs.
3. Preserve OSM source id, version/source date, raw tags, licence, and geometry.
4. Start every imported item in a `review-needed` or equivalent state.
5. Show clear caveats in moderation/admin surfaces before any public display.
6. Never overwrite community-confirmed POIs during refresh; instead flag possible matches for merge/review.

## Observation Data

Observation data has two jobs:

- `backfill`: seed recent history for newly enabled stations/measures.
- `ingest`: keep current readings fresh after history exists.

Run local backfill:

```bash
npm run api:backfill:observations -- --hours=672
```

Run staging backfill:

```bash
npm run platform:backfill:observations:staging -- --hours=672
```

Run local ingestion:

```bash
npm run api:ingest:observations
```

Hosted ingestion should become a scheduled Cloud Scheduler call to the guarded Cloud Run job endpoint. Until that scheduler is provisioned, admins can trigger refreshes through the guarded admin job action, with rate limiting so it cannot be run repeatedly by mistake.

Recommended cadence:

- live level/flow/rainfall readings: every 15-60 minutes, depending on provider limits and observed update frequency
- new station history backfill: once when the measure is added
- provider metadata refresh: monthly or when adding a new route/region

## what3words Backfill

New POIs should store what3words metadata at creation time. Use the backfill only for older rows or imported fixtures missing a stored address.

Dry run:

```bash
npm run platform:backfill:w3w:staging -- --dry-run
```

Apply:

```bash
npm run platform:backfill:w3w:staging
```

Run production only after a staging dry run and staging apply behave as expected.

## Validation

After any seed refresh:

1. Run or confirm the relevant database migration for the target environment.
2. Run the seed command on staging first.
3. Deploy the API if the code path changed.
4. Deploy the web app if UI behaviour depends on the new dataset.
5. Open the map and enable the known-rivers overlay.
6. Test route snap on the pilot river and at least one non-pilot river.
7. Confirm route details, POIs, photos, and community moderation still display existing staging data.
8. Check API logs for import, query, or timeout errors.
9. In Admin -> System, refresh status and confirm the waterway seed source version, feature count, named count, licence, and latest update time match the expected import.
10. Confirm source-derived candidate POIs remain review-needed and do not overwrite community-confirmed POIs.

For OSM watercourse refreshes, specifically check that:

- the known-rivers overlay is visible at useful zoom levels
- snapping follows the visible OSM basemap watercourse closely enough for user preview
- route suggestions still store a rough user intent trace, not an unverified paddling route

## Recovery

If a full OSM refresh is visibly wrong, rerun the importer with the previous known-good GeoJSONSeq file and previous `source-version`.

If an observation backfill imports bad readings, disable the affected measure/provider before further scheduled ingestion and repair or remove the affected readings with a targeted migration or support script.

If a seed operation would require changing community-owned records, stop and create an explicit migration plan first.

## Open Questions

- Should production OSM imports be manually approved after staging screenshots, or can they be operator-run after the staging checklist passes?
- What is the first production cadence for observation ingestion before Cloud Scheduler is provisioned?
- Should seed source run history be exposed in Admin beyond the current system job rows?
- Should canonical river imports and OSM candidate POI imports share a generic source-run table?
- What validation checklist should promote OS Open Rivers from pilot sample to GB-wide canonical river bootstrap?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| SEEDOPS-F1 | Seed data runbook | Ops/data | Active | MVP | — | Defines required datasets, commands, cadence, validation, and recovery. |
| SEEDOPS-F2 | OSM waterway refresh procedure | Ops/data | Active | MVP | — | Uses Geofabrik/Osmium/GeoJSONSeq and staging-first validation. |
| SEEDOPS-F3 | Observation refresh procedure | Ops/data | Active | MVP | — | Separates history backfill from recurring ingestion. |
| SEEDOPS-F4 | Canonical river source import runbook | Ops/data | Active | MVP | — | Defines the pilot-first OSM/WFD-compatible source import sequence before national canonical generation; OS is optional later enrichment. |
| SEEDOPS-F5 | OSM candidate POI import runbook | Ops/data/moderation | Active | MVP | — | Defines how source-derived OSM feature tags become review-needed candidate POIs without overwriting community data. |
| SEEDOPS-F6 | Repeatable canonical source spike command | Ops/data/tooling | Active | MVP | — | `npm run data:spike:canonical-rivers` probes public source metadata, official feature samples, OS downloads, and OSM pilot tags into a docs report. |
| SEEDOPS-F7 | Pilot canonical river seed command | Ops/data/tooling | Active | MVP | — | `npm run data:seed:canonical-river-pilots` seeds curated pilot rivers and review-needed OSM candidate POIs; local run seeded 5 rivers and 116 candidates. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| SEEDOPS-B1 | task | Add Cloud Scheduler provisioning for observation ingestion | Open | MVP | Replace manual/admin-triggered refresh with monitored scheduled ingestion. |
| SEEDOPS-B2 | task | Record seed run history in Admin | Active | MVP | Admin System now exposes OSM waterway source version and row counts; full runtime/success/failure history remains open. |
| SEEDOPS-B3 | validation | Define production promotion checklist for OSM refreshes | Open | MVP | Decide whether screenshots/manual approval are required before prod. |
| SEEDOPS-B4 | validation | OS Open Rivers file access | Parked | Later | Repeatable report still saw HTTP 500 for OS Open Rivers download probes; retry with OS credentials/project later, but do not block pilot canonical imports. |
| SEEDOPS-B5 | decision | Candidate POI review workflow | Open | MVP | Decide moderation states, public visibility, and merge handling for source-derived OSM features. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-26 | Created seed data operations runbook. |
| 2026-06-05 | Added canonical river source import and OSM candidate POI import operational direction from public-source spike. |
| 2026-06-05 | Added repeatable canonical source spike command and report path. |
| 2026-06-05 | Changed first canonical import path to proceed without OS Open Rivers. |
| 2026-06-05 | Added pilot canonical river seed command. |
| 2026-06-05 | Recorded local pilot seed result and retry pattern for flaky OSM candidate fetches. |
