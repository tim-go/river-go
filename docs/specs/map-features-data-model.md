# Map features & contributions — data model

Status: **spec / agreed shape** (2026-06-25). Build against this. The migration is
explicitly **staged and non-destructive** because staging holds real photos.

## Decision: three tables, by domain — NOT merged

Map "points" live in three tables, kept separate **by domain, not provenance**:

- **`paddling_features`** *(rename of `map_pois`)* — curated, **safety-critical** paddling
  data (access / hazard / rapid / feature). We assert these; a paddler's safety depends
  on them. Carries `verification_status`.
- **`amenities`** — OSM reference (pub / car park / camp_site / toilets …), shown
  "as-is", bulk-refreshed from OSM.
- **`observation_stations`** — gauges; the head of the time-series pipeline
  (`observation_measures` → `observation_readings` → level state). Not a pin — a *data source*.

**Why not one table:** they differ in **trust** (verified-by-us vs OSM-as-is vs
provider-fed), **lifecycle** (curated vs OSM bulk-refresh vs upsert+readings), and
**taxonomy** (`rapid` and `pub` don't share a category space). Sharing a *shape* doesn't
justify sharing a *table*, and for a safety app the hard boundary between "verified
hazard" and "OSM pin" has real value. The shared *capability* — contributions — is
unified instead (see below).

## Standardised columns

The two **feature** tables share a core vocabulary:

| column | meaning |
|---|---|
| `id` | primary key |
| `source` | provenance (`curated`, `osm`, …) |
| `source_id` | external id (NULL for curated) |
| `category` | type (`access` / `hazard` / `pub` / `car_park` / …) |
| `name` | display name |
| `geometry` | `geometry(Point, 4326)` |
| `metadata` | `jsonb` extras (raw OSM tags, etc.) |
| `created_at`, `updated_at` | timestamps |

Domain extras stay where they belong: `paddling_features` keeps `verification_status`,
`subtitle`, `summary`, `source_url`.

**Renames:**
- **`map_pois` → `paddling_features`**: `kind`→`category`, `title`→`name`,
  `source_kind`/`source_label`/… → `source` + `source_id` (keep `source_url`),
  `payload`→`metadata`.
- **`amenities`**: fold `raw_properties` + `source_metadata` → one `metadata`.
  (`source`/`source_id`/`category`/`name` already match.)

### `observation_stations` — keeps `provider` (deliberate)

The convention would map `provider`→`source`, `provider_station_id`→`source_id`. **But**
`provider`/`provider_*_id` runs through the whole `observation_*` family
(`observation_measures.provider` + `provider_measure_id`, the ingest pipeline,
`section_measure_links`). Renaming `observation_stations` alone makes that family
*internally* inconsistent; renaming the whole family is large, risky churn for a naming
tweak. **Decision: keep `provider` / `provider_station_id` in the observation family** —
it is internally consistent and domain-correct. The feature tables standardise on
`source` / `source_id`; the observation subsystem keeps its own coherent term. *(Revisit
only if the observation pipeline is overhauled.)*

### Open: id type
`map_pois.id` is `text` (meaningful curated ids); `amenities` / `observation_stations`
are `uuid`. Left as-is — `contributions.target_id` is `text`, so it can reference either.
Standardising id types is a separate, non-blocking decision.

## Contributions — point + content + optional target (no `section_id`)

A contribution is **a map point with content, optionally *about* a feature** — not a
child of a section.

```
contributions
  id            uuid
  member_id     uuid
  type          photo | note | hazard | report | feature | access
  geometry      Point          -- its own location
  target_kind   paddling_feature | amenity | station | NULL
  target_id     text           -- the feature it's about, or NULL = standalone
  river_id      text NULL      -- denormalised, for "contributions on river X"
  payload       jsonb
  moderation_status, created_at, updated_at
  -- section_id  REMOVED
contribution_photos  -> unchanged (FK contribution_id)
```

- **target set** → "photos of *this* car park / campsite / gauge".
- **target NULL** → a standalone observation dropped on the map.
- River/section is **derived** (spatial, or via the target / `river_id`), never a stored
  section FK.

This is the mechanism the design thread converged on: **separate tables for separate
domains, one shared contribution target across them.**

## Migration — staged & non-destructive (staging photos must survive)

Order matters; nothing destructive until verified.

1. **Renames (data-safe):** `ALTER TABLE map_pois RENAME TO paddling_features` +
   `RENAME COLUMN` for the field renames. Rows preserved automatically. Update every
   api/frontend reference in the same change.
2. **Contributions — add only:** add `target_kind`, `target_id`, `river_id` (all
   nullable). No drops, no row changes.
3. **Backfill:** set `river_id` from the existing `section_id → river` mapping; existing
   contributions stay as `target_kind = NULL` standalone points (geometry preserved).
4. **Photos safe by construction:** no `contributions` rows deleted; `contribution_photos`
   FK to a stable `id` → zero photos lost.
5. **Cut over reads:** `GET /api/rivers/{id}/photos` and the section-contributions paths
   move to spatial / `river_id` / target-based queries.
6. **Defer the drop:** remove `section_id` in a **later** migration, only after staging
   is verified.
7. **Verify on staging:** run via `migrate-api-db.sh` (Cloud SQL proxy); assert
   `contributions` and `contribution_photos` row counts are **identical before/after
   each step**.

## Out of scope here (tracked separately)
- **Amenities upsert-stable** — change the OSM import from DELETE+reinsert to upsert by
  `(source, source_id)` so contributions survive re-imports. Needed *before* amenity
  contributions go live.
- **Camping (`camp_site`)** import — lands after amenities are upsert-stable + contributable.
