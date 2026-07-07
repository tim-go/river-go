# Map features, the `pois` index & contributions — data model

Status: **spec / agreed shape** (2026-06-26). Supersedes the earlier draft, which
predated discovering the `pois` index and wrongly proposed a separate polymorphic
contribution target. The migration is explicitly **staged and non-destructive** because
staging holds real photos.

Revised **2026-06-27**: every paddling feature/amenity belongs to a **river**, recorded
as a single **asserted `river_id`** on `pois` (same shape as `contributions.river_id`) —
see new §5. Many-to-many was considered and **dropped** as over-modelling for the now slice
(kept as a documented upgrade path). The model is framed as three layers (river anchor ·
POI · grouping/route); contributor- and group-owned **routes with privacy are deferred**
(§5 "Forward view").

Revised **2026-07-02**: layer 3 is scheduled as **community-origin-only sections** (a canonical
`routes` table populated solely by promoting member route suggestions; no seeded sections —
the Wye/Tryweryn fixtures retire). See §5 and `/docs/development/plan-community-sections.md`.

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
- **River is asserted, never section-FK'd.** A contribution is always made *in the context of
  a river* (the UI picks one), so `contributions.river_id` is set from that choice — not from a
  stored `section_id`. The same river link applies to the `pois` row via §5. (Spatial nearest is
  only a *default suggestion* in the UI, never the stored source of truth.)

## 5. POI ↔ river association — asserted, single `river_id`

**The app's core purpose is showing POIs/amenities *in the context of a river*, so the
river link is part of the model, not a render-time guess.** Every paddling feature and
amenity belongs to **one** river, stored as a single `river_id` on `pois` — the same shape
as `contributions.river_id`, so the whole index is uniform.

```
ALTER TABLE pois ADD COLUMN river_id text;   -- plain text, like contributions.river_id
CREATE INDEX pois_river_id_idx ON pois (river_id);
```
(No FK to `canonical_rivers`, matching `contributions.river_id` — keeps seed ordering robust;
validity is a backfill/import concern, not a write-time gate.)

Why **single**, not many-to-many: asserting always happens inside one river's context (§4),
so curated/contributed POIs are single-river *by construction*. The only source of
multiplicity would be a derived amenity whose buffer catches two rivers — a low-stakes
edge case (a confluence pub) where "nearest river" is a fine answer. A single column means
the filter is `WHERE river_id = X` with no join, on every read, forever. (See "Upgrade
path" below — going M:N later is a cheap, non-destructive migration if a real need appears.)

**How `river_id` is populated:**
- **Amenities / stations (reference, ingested):** **nearest matched river.** The amenity
  importer *already* tests each point against featured-river geometry (the `our_rivers` temp
  table, within `--buffer-metres`) — today it discards which river matched (`EXISTS`). Change
  it to capture the **min-distance** river and write it. No new spatial work; we just keep an
  answer we already compute.
- **Paddling features / contributions (asserted):** set from the river the contributor/curator
  **chose** (adding is always within a river context — §4). Spatial nearest is only a UI
  default suggestion, never the stored source of truth. **How that choice is made *correctly*
  at add time** — the selected-river corridor, out-of-corridor reconcile/warn, and the honest
  off-river (`river_id = NULL`) state — is specced in
  [/docs/specs/discovery/river-attribution.md](/docs/specs/discovery/river-attribution.md).

**This is what powers the "River: <name>" focus filter** (the first top-bar pill): scoping the
map to a river is `pois WHERE river_id = X` — uniform across every POI type, no per-source
special-casing.

**Forward view — the three layers (record now, build later).** This river link is layer 1 of a
model we're naming but not fully building yet:

1. **River anchor (now).** Single `river_id` on `pois`, asserted. Every paddling POI is
   river-scoped.
2. **POI (now).** The atomic, location-indexed feature in `pois`; shared across plans, owns its
   own identity. *Not* owned by a section.
3. **Grouping: routes/sections (now scheduled).** "Section" generalises to a first-class
   **route/plan** that *selects* POIs via `poi_route_links` (role = put-in / take-out / stop /
   scout) and can later be owned by a **member or group** with a **visibility** scope. Privacy
   arrives only here — a group's "river day" is a private route bundling public reference POIs +
   the group's own points. *Revised 2026-07-02:* the earlier idea that legacy fixed sections
   "become row-zero of this type" is **dropped** — sections are **community-origin only** (no
   seeded/declared paddleable sections), so the fixtures and their
   `route_source='section_fixture'` link rows are retired instead. Row-zero of this layer is the
   first member-suggested section promoted into the canonical `routes` table — see
   `/docs/development/plan-community-sections.md` and
   `/docs/specs/contributions/route-submissions.md`.

**Upgrade path — many-to-many, only if needed.** If confluence / shared **access points** ("this
get-out is also the Tryweryn put-in") turn out to matter enough that one river is wrong, promote
to a `poi_river_links` join table (`poi_id`, `river_id`, `role`, `source` asserted|derived,
`distance_m`) mirroring `poi_route_links`. The migration is standard and non-destructive: create
the table, backfill one row per existing `pois.river_id`, then drop the column. Not built now.

Decisions locked for the **now** slice: river links are **asserted** (spatial nearest is only a
default), **single** (`river_id`, not M:N), and POIs do **not** carry their own visibility yet
(privacy lands with group routes, layer 3).

## 6. POI lifecycle — adopt on contribution

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

## 7. Amenities lifecycle — UPSERT (decided)

The OSM amenities import becomes **upsert by `(source, source_id)`** (no DELETE+reinsert),
so `amenities.id` is stable and contributions/`pois` links survive refreshes. Each run:
- **Upsert** every amenity seen this import (fires the INSERT/UPDATE → `pois` snapshot sync).
- **Reconcile gone** amenities (in DB, absent from this import) via **prune-with-adopt** (§6).

## 8. Staged, non-destructive migration (staging photos must survive)

Run in order; nothing destructive until verified on staging (`migrate-api-db.sh`, Cloud SQL
proxy), asserting `contributions` + `contribution_photos` counts **identical before/after**.

1. **Renames (data-safe):** `map_pois → paddling_features` + `RENAME COLUMN`s; update the sync
   trigger + `source_entity_type`. Rows preserved; update all api/frontend refs in the same change.
2. **Wire `amenities` + `observation_stations` into `pois`** — add their INSERT/UPDATE sync
   triggers (`'amenity'`/`'station'`), writing the snapshot, keyed on stable source ids.
3. **`pois.river_id` (§5):** add the column; have the amenity importer write the **nearest**
   matched river (reuse the `our_rivers` proximity match it already runs) and backfill existing
   amenities the same way; set the asserted river for paddling features. Read-side: the
   "River: <name>" filter is `WHERE river_id = X`.
4. **Contributions — add only:** add `poi_id`, `river_id` (nullable); backfill `poi_id` from the
   existing `map_poi_id`, `river_id` from `section_id`. Add `WHERE poi_id IS NULL` to the
   contribution→`pois` sync.
5. **Cut over reads:** `GET /api/rivers/{id}/photos` + section-contribution paths move to
   spatial / `river_id` / target-based queries.
6. **Amenities upsert + reconcile** (§7) replaces DELETE+reinsert.
7. **Adopt/prune** rules (§6) live in the reconcile.
8. **Defer drops:** remove `section_id` and `map_poi_id` only in a **later** migration, after
   staging is verified.

## 9. Then (after the model lands)
- **Camping** — add `camp_site` (+ `caravan_site`) to the amenity filter; arrives already
  contributable (upsert-stable + indexed + adoptable). **Done.**

## 10. Reproducible deploy via seed packs (not dev→staging copy)
Reference data is shipped as **committed seed files** that loaders read — discover →
generate the file → seed script imports it. So staging/prod = `migrate` + the seed
scripts, with no re-download/re-discovery and no copying from the dev DB.
- `api/seed/observation-stations.json` → `seed:observations` *(done)*
- `api/seed/river-geometry.json` (62 rivers' matched lines) → `seed:river-geometry`
- `api/seed/amenities.json` (6,280 incl. camping) → `seed:amenities` (upsert → `pois` trigger)

### 10a. `river_id` is **pre-derived into the seed packs** (§5)
The `river_id` link (§5) is **spatial for amenities** — it needs `watercourses` (~850k rows)
+ `canonical_rivers`. `watercourses` is **not** seeded (Backlog), and isn't present locally, so
deriving at seed time is impossible. Therefore `river_id` is **baked into the seed files**, the
same way `river-geometry.json` bakes its matched lines: derive **once, where watercourses exist**,
store the answer, and keep seeding a pure load.

- **Seed format:** each `amenities.json` entry gains `riverId` (the nearest matched
  `canonical_rivers.id`); `map-pois`/paddling-feature seed entries carry their **asserted**
  `riverId` (curated, no spatial step). Loaders validate it (nullable — an amenity with no
  featured river nearby is allowed).
- **Seed path carries it through:** seeding upserts into the source table (`amenities`), whose
  `river_id` column the `→ pois` trigger copies into `pois.river_id`. No watercourses needed at
  seed time.
- **Generation (run once, where watercourses exist — staging, or a one-off local
  `import:osm-waterways`):** the amenity importer captures the **min-distance** river into
  `amenities.river_id` (was a discard-only `EXISTS`), then a committed **export builder** dumps
  `amenities` (incl. `river_id`) → `amenities.json`. Commit the refreshed pack; thereafter no one
  needs watercourses again. *Avoid* a staging-only live spatial backfill in a migration — it makes
  staging ≠ local and re-introduces the watercourses dependency. The seed file is the single
  source of truth.

**Reseed flow (pure loads, no watercourses):**
- *Local:* `db:local:up` → `migrate` (adds `pois.river_id` + `amenities.river_id` + trigger) →
  `api:seed:amenities` (+ `seed:river-geometry`, `seed:observations`, `seed:map-pois`).
- *Staging:* `platform:migrate:staging` → `platform:seed:amenities:staging` (+ the others).

### Backlog
- **`watercourses` seed** — ~850k OSM rows are too big to commit to git, so there's no
  seed file yet. Staging already holds this data, so it's deferred. Future fix: a
  bucket-backed seed (the discovery uploads the export to GCS; the seed script pulls it)
  so the Waterways layer + amenity-proximity refresh stays reproducible without git bloat.
