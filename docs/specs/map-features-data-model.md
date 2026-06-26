# Map features, the `pois` index & contributions — data model

Status: **spec / agreed shape** (2026-06-26). Supersedes the earlier draft, which
predated discovering the `pois` index and wrongly proposed a separate polymorphic
contribution target. The migration is explicitly **staged and non-destructive** because
staging holds real photos.

## 1. The real shape: domain source tables + one shared index

The codebase already has **`pois`** — a **trigger-maintained, polymorphic location index**
(`source_entity_type` + `source_entity_id`, UNIQUE together; it stores a snapshot of each
place and links to the owning source row). The map renders *through* it. This is the
"separate tables + unified capability" conclusion, already built — we just extend it.

**Three source tables, kept separate by domain** (different trust / lifecycle / taxonomy):

| source table | domain | `source_entity_type` | lifecycle |
|---|---|---|---|
| `paddling_features` *(rename of `map_pois`)* | curated, safety-critical | `'paddling_feature'` | curated/owned |
| `amenities` | OSM reference | `'amenity'` | **upsert** by `(source, source_id)` |
| `observation_stations` | gauges (+ readings) | `'station'` | upsert by `(provider, station_id)` |

Today only `'map_poi'` is wired into `pois`; **`amenities` and `observation_stations`
bypass it** — the core fix is to wire them in. Family membership lives in
`source_entity_type`, **not** in table-name prefixes (no `pois_*`).

## 2. Naming standardisation

Standard columns on the **feature** source tables:
`id` · `source` · `source_id` · `category` · `name` · `geometry` · `metadata` (jsonb) ·
`created_at` · `updated_at` (+ domain extras: `paddling_features` keeps `verification_status`,
`subtitle`, `summary`, `source_url`).

- **`map_pois` → `paddling_features`**: `kind`→`category`, `title`→`name`,
  `source_kind`/`source_label`/… → `source`+`source_id` (keep `source_url`), `payload`→`metadata`.
  Update the sync trigger + the `'map_poi'` → `'paddling_feature'` type value.
- **`amenities`**: fold `raw_properties` + `source_metadata` → one `metadata`.
- **`observation_stations`**: **keeps `provider` / `provider_station_id`** — they run through
  the whole `observation_*` family; renaming is large churn for a naming tweak. (Revisit only
  if that pipeline is overhauled.)
- *Open:* `map_pois.id` is `text`, the others `uuid`; left as-is (`pois.id` /
  `contributions.poi_id` are `text`, so either is referenceable).

## 3. `pois` — the durable owned spine

- **`pois` OWNS the snapshot** (`poi_type`, `category`, `title`, `geometry`, `summary`); the
  source table **enriches** it while alive. Identity therefore survives source deletion.
- **Keyed on the stable source identity** (`source_entity_id` = `paddling_features.id`, the
  amenity's OSM `source_id`, the station's `(provider, station_id)`) — **never** a volatile uuid.
- **Synced by triggers on INSERT/UPDATE only** (upsert by `source_entity_type` +
  `source_entity_id`). **No delete-cascade** from a source table into `pois`.
- **Identity = `category`** (the owned snapshot). **Click → detail panel chosen by
  `category`**, filled with the row's attached contributions.

## 4. Contributions — target the index, or stand alone (Model A)

A contribution is **a point + content, optionally *about* a place** — not a child of a section.

```
contributions
  id, member_id, type (photo|note|hazard|report|…), geometry (own point),
  poi_id    text NULL  -- the pois row it enriches, or NULL = standalone
  river_id  text NULL  -- denormalised, for "contributions on river X"
  payload, moderation_status, created_at, updated_at
  -- section_id, map_poi_id  REMOVED (map_poi_id generalised to poi_id)
contribution_photos -> unchanged (FK contribution_id)
```

- **`poi_id` set → enrichment.** Photos/reviews **about** that campsite/feature. **No own
  marker** — the place keeps its identity; the contributions are its content.
- **`poi_id` NULL → standalone observation,** which **is** its own `pois` row / marker.
- **Sync change:** `contributions_sync_location_poi` gains `WHERE poi_id IS NULL` — only
  *standalone* contributions become their own `pois` rows (else targeted ones double-pin a place).
- River/section is **derived** (`river_id` or spatial), never a stored section FK.

## 5. POI lifecycle — adopt on contribution

> A `pois` row with contributions is **never hard-deleted**. The `pois` index owns the
> display snapshot; the source enriches it while alive.

When a source feature disappears (e.g. an OSM campsite drops out on refresh):
- **Prune-with-adopt:** delete its `pois` row **only if it has no contributions**; otherwise
  flip `status` → `'adopted'`, keep the snapshot + the (now-dangling) stable source id.
- **Re-attach:** if the feature returns with the same source id, the upsert **re-links** by
  key — OSM-backed again, contributions intact. Delete-and-return is lossless.
- **Display:** adopted rows render their normal panel + a "community-maintained · no longer in
  OpenStreetMap" note.

Specific work this implies (small, lives inside the amenity-into-`pois` step):
1. **Prune-with-adopt** query in the amenity reconcile (delete-unless-contributed → else adopt).
2. **No source→`pois` delete-cascade** (a rule we uphold; deletion is the reconcile's job).
3. **Audit the existing `map_pois` sync trigger** — ensure it doesn't hard-delete a contributed
   `pois` row today; apply the same spare-contributed rule.
4. **Status** — reuse `pois.status` (add `'adopted'`); no schema change.
5. **Display note** for `status='adopted'`.

## 6. Amenities lifecycle — UPSERT (decided)

The OSM amenities import becomes **upsert by `(source, source_id)`** (no DELETE+reinsert),
so `amenities.id` is stable and contributions/`pois` links survive refreshes. Each run:
- **Upsert** every amenity seen this import (fires the INSERT/UPDATE → `pois` snapshot sync).
- **Reconcile gone** amenities (in DB, absent from this import) via **prune-with-adopt** (§5).

## 7. Staged, non-destructive migration (staging photos must survive)

Run in order; nothing destructive until verified on staging (`migrate-api-db.sh`, Cloud SQL
proxy), asserting `contributions` + `contribution_photos` counts **identical before/after**.

1. **Renames (data-safe):** `map_pois → paddling_features` + `RENAME COLUMN`s; update the sync
   trigger + `source_entity_type`. Rows preserved; update all api/frontend refs in the same change.
2. **Wire `amenities` + `observation_stations` into `pois`** — add their INSERT/UPDATE sync
   triggers (`'amenity'`/`'station'`), writing the snapshot, keyed on stable source ids.
3. **Contributions — add only:** add `poi_id`, `river_id` (nullable); backfill `poi_id` from the
   existing `map_poi_id`, `river_id` from `section_id`. Add `WHERE poi_id IS NULL` to the
   contribution→`pois` sync.
4. **Cut over reads:** `GET /api/rivers/{id}/photos` + section-contribution paths move to
   spatial / `river_id` / target-based queries.
5. **Amenities upsert + reconcile** (§6) replaces DELETE+reinsert.
6. **Adopt/prune** rules (§5) live in the reconcile.
7. **Defer drops:** remove `section_id` and `map_poi_id` only in a **later** migration, after
   staging is verified.

## 8. Then (after the model lands)
- **Camping** — add `camp_site` (+ `caravan_site`) to the amenity filter; arrives already
  contributable (upsert-stable + indexed + adoptable).
