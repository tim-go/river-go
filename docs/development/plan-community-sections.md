# Implementation Plan — Community Sections (canonical `routes`)

**Status:** Ready to execute · **Written:** 2026-07-02
**Owning specs:** `/docs/specs/contributions/route-submissions.md` (workflow),
`/docs/specs/foundations/geospatial-domain-model.md` (entity model),
`/docs/specs/map-features-data-model.md` (§5 layer 3),
`/docs/specs/principles/no-advice-and-liability-language.md` (copy rules).

This plan is self-contained: it is written to be executed by an agent in a fresh
session with no prior context. Read this whole document before starting.

## Goal

Bring river **sections** back as a first-class feature, **community-origin
only**: members draw candidate sections on the map (this flow already exists as
"route suggestions"), moderators approve them, and a new explicit **promote**
step turns an approved suggestion into a canonical section stored in a new
**`routes`** table. Retire the old seeded Wye/Tryweryn section fixtures on the
way — RiverLaunch must never itself declare a stretch of river paddleable.

## Locked decisions (do not relitigate)

1. **Table is named `routes`**, matching the existing internal family
   (`route_suggestions`, `route_adjustments`, `route_overrides`,
   `poi_route_links.route_id`). A section is a row with a section-flavoured
   `route_type`; the word **"segment" is never used**.
2. **"Section" is the only user-facing word.** No UI copy, tab, button, or
   public page may say "Route"; `route` is internal schema/API vocabulary.
3. **Community-origin only. No seeding.** There is no seed script for `routes`
   and there must never be one. The only write path into `routes` is the
   moderator promote action. The Wye/Tryweryn fixtures are deleted, not
   migrated: the catalogue starts empty.
4. **Promotion is an explicit second moderator action** on an *approved*
   suggestion ("Promote to section"), never automatic, with permanent
   attribution (submitting member + promoting moderator + source suggestion).
5. **Liability language:** promoted sections are community knowledge, not
   verified advice. Use candidate/community wording; never "safe", never
   "verified route". Runnability words: `low / good range / high / unknown`.

## Current state (verified 2026-07-02)

- The member drawing flow (map "Suggest route" mode: click points, snap to OSM
  waterways server-side, evidence form) and moderation queue
  (approve / needs-info / reject / hide) are **built and live**. Tables:
  `route_suggestions`, `route_adjustments`, `route_overrides` (all currently
  empty). Endpoints in `api/src/route-suggestions.ts`,
  `route-adjustments.ts`, `route-overrides.ts`, wired in `api/src/server.ts`.
- There is **no canonical section/route entity**. "section_id" appears only as
  free-text ids in link tables, all pointing at retired fixture ids
  (`wye-kerne-symonds-yat`, `tryweryn-dam-centre`, …).
- **Dead frontend seeds** (zero imports — safe to delete):
  `src/data/riverTrywerynSeed.ts`, `src/data/riverWyeSeed.ts`,
  `src/data/trywerynRouteTraces.ts`, `src/data/wyeRouteTraces.ts`.
  **Do NOT delete** `src/data/seedLocationReferences.ts` (imported by
  `src/appCore.ts`) or `src/data/wyeGaugeMappings.ts` (imported by
  `src/services/riverLevels.ts`).
- The app fabricates one placeholder "River overview" section per canonical
  river (`canonicalRiverToOverviewSection`, `src/appCore.ts` ~709) whose
  `route` is a single point. The map's section-polyline renderer
  (`src/components/RiverMap.tsx` ~1416–1494) is functional but starved.
- **Section Favs is neutered on purpose**: `loadFavouriteSectionIds` in
  `src/lib/storage.ts` (~28) always clears and returns `[]`.
- **Live reads still pivot on fixture link rows** — this is the trap. Three
  places join through `route_source = 'section_fixture'`:
  1. `listRiverLevelStates` (`api/src/observations.ts` ~479): river marker
     level colouring joins `canonical_river_section_links` (69 rows) →
     `section_measure_links` (67 rows). Deleting fixture rows without re-keying
     **kills river level colouring**.
  2. `listMapPoisForRiver` (`api/src/map-pois.ts` ~150): river POIs join
     `paddling_features.section_id` → `canonical_river_section_links`.
  3. Contribution river stamping (`api/src/sync.ts` ~255–270): derives
     `river_id` from the linked POI's fixture section, with a
     `canonical-river:<id>` pseudo-section fallback.

## Working conventions

- One branch for the whole batch (suggest `community-sections`); commit per
  phase as you go; push; **do not raise a PR until the user says so**.
- Local dev services are already running — do not disturb them: Vite `:6173`,
  API `:8080` (tsx watch, auto-reloads on save), Postgres `:5440`
  (db `river_go`, user `river_go_app`, password `river_go`). Apply migrations
  with `npm --prefix api run migrate` (uses `DATABASE_URL`; for local:
  `postgresql://river_go_app:river_go@localhost:5440/river_go`).
- Gates after every phase: `npx tsc -b` · `npm test` (frontend Vitest) ·
  `npm --prefix api run test` · `npm run build`.
- Migrations live in `api/migrations/NNN_name.sql` (next number = current max
  + 1); they are applied in order by `api/src/migrate.ts` and recorded in
  `schema_migrations`. Staging auto-deploys from `main` and runs migrations —
  everything must be safe to apply twice-ish (use `IF NOT EXISTS` /
  `ON CONFLICT` where sensible).

---

## Phase 0 — Re-key live reads off the fixture chain

Nothing user-visible changes in this phase; it only makes Phase 1 safe.

1. **Migration `river_measure_links`** (new table + backfill in one file):

   ```sql
   CREATE TABLE IF NOT EXISTS river_measure_links (
     river_id   text NOT NULL,
     measure_id uuid NOT NULL REFERENCES observation_measures(id),
     relevance  text NOT NULL DEFAULT 'primary',
     notes      text,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now(),
     PRIMARY KEY (river_id, measure_id)
   );

   INSERT INTO river_measure_links (river_id, measure_id, relevance, notes)
   SELECT DISTINCT crsl.river_id, sml.measure_id, sml.relevance, sml.notes
   FROM canonical_river_section_links crsl
   JOIN section_measure_links sml ON sml.section_id = crsl.section_id
   WHERE crsl.route_source = 'section_fixture'
   ON CONFLICT DO NOTHING;
   ```

2. **`listRiverLevelStates`** (`api/src/observations.ts`): replace the
   `canonical_river_section_links` → `section_measure_links` join with
   `river_measure_links` directly (`WHERE relevance = 'primary'`). Keep the
   percentile/band logic identical.
3. **`listMapPoisForRiver`** (`api/src/map-pois.ts`): re-key to the asserted
   river on the `pois` index (it already powers the River-focus filter): join
   `pois lp ON lp.source_entity_type = 'paddling_feature' AND
   lp.source_entity_id = p.id` and filter `lp.river_id = $1` instead of the
   `canonical_river_section_links` join. **Parity-check before committing**:
   run both queries per river on the local DB and compare POI id sets; note
   any diff and reconcile (the `pois.river_id` backfill is the source of truth).
4. **`api/src/sync.ts` river stamping**: derive `river_id` from the linked
   POI's `pois.river_id` (lookup by `paddling_features.id` →
   `pois.source_entity_id`), keep the `canonical-river:<id>` pseudo-section
   fallback, and drop both `canonical_river_section_links` subqueries.
5. Check remaining `section_fixture` consumers:
   `grep -rn "section_fixture" api/src src`. `listMapPoisForSection`
   (`map-pois.ts`) and the fixture-filtered lateral join in
   `api/src/contributions.ts` serve section-scoped reads that can only match
   fixture ids — after this phase they simply match nothing; leave the
   endpoints in place (Phase 2 re-points them at real sections) but remove the
   `route_source = 'section_fixture'` filters where a `route_id` equality
   already scopes the query.
6. Also update the seed/dev tooling that writes those link rows:
   `api/src/seed-canonical-river-pilots.ts` creates
   `canonical_river_section_links` + `section_measure_links` fixture rows —
   change it to write `river_measure_links` (river ↔ measure only) and stop
   creating section links. `api/src/observations.ts` may hold the seed data
   arrays (grep `section_measure` there).
7. **Gate + manual check:** river markers on the local map still show level
   colours (compare `/api/rivers/level-states` output before/after — same
   rivers, same bands), and a river's POIs still load when a river is
   selected.

## Phase 1 — Delete the fixtures

1. Delete the four dead files:
   `src/data/riverTrywerynSeed.ts`, `src/data/riverWyeSeed.ts`,
   `src/data/trywerynRouteTraces.ts`, `src/data/wyeRouteTraces.ts`.
   `npx tsc -b` must stay clean (they have no consumers).
2. **Cleanup migration** (fixture link rows only — tables stay):

   ```sql
   DELETE FROM poi_route_links            WHERE route_source = 'section_fixture';
   DELETE FROM canonical_river_section_links WHERE route_source = 'section_fixture';
   DELETE FROM section_measure_links;  -- all rows are fixture-keyed (verified 2026-07-02)
   ```

   Leave `paddling_features.section_id` / `contributions.section_id` column
   values in place — inert strings, dropped in a later deferred migration per
   `/docs/specs/map-features-data-model.md` §8.8.
3. **Route overrides:** the override bridge existed only to publish corrected
   geometry over fixture sections. Verify with
   `grep -rn "routeOverride\|route-overrides" src api/src`; if the frontend
   consumer (`src/services/routeOverrideApi.ts`) only ever applied overrides to
   fixture/`RiverSection` data, remove that service + its call sites and the
   `/api/route-overrides` GET wiring. Keep the `route_overrides` table and
   adjustment→override publishing code path intact for now (dropped in Phase 3)
   unless it is already unreachable — in that case delete the dead code too.
4. **Gate + manual check:** app builds and runs; map, river selection, level
   colours, POIs, photos all unaffected.

## Phase 2 — Canonical `routes` + promotion + display

1. **Migration — `routes` table:**

   ```sql
   CREATE TABLE IF NOT EXISTS routes (
     id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     name          text NOT NULL,
     route_type    text NOT NULL DEFAULT 'whitewater-section',
     river_id      text,               -- canonical_rivers.id; text, no FK (matches pois.river_id)
     status        text NOT NULL DEFAULT 'published',  -- published | hidden | retired
     evidence_status text NOT NULL DEFAULT 'community-reported',
     grade         text,
     summary       text,
     access_summary text,
     conditions_summary text,
     route         geometry(LineString, 4326) NOT NULL,
     geometry_source text NOT NULL DEFAULT 'member-trace',
     distance_km   numeric,
     source_route_suggestion_id uuid REFERENCES route_suggestions(id),
     created_by    uuid REFERENCES members(id),  -- submitting member
     promoted_by   uuid REFERENCES members(id),  -- moderator who promoted
     payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
     created_at    timestamptz NOT NULL DEFAULT now(),
     updated_at    timestamptz NOT NULL DEFAULT now(),
     revision      bigint NOT NULL DEFAULT 1
   );
   CREATE INDEX IF NOT EXISTS routes_river_id_idx ON routes (river_id);
   ```

   No seed script. Add `'promoted'` to whatever status vocabulary
   `route_suggestions` validates (check `api/src/route-suggestions.ts`).
2. **Promotion endpoint:**
   `POST /api/moderation/route-suggestions/:id/promote` (same auth guard as
   the existing decision endpoint — admin/contribution-moderator). Requires
   suggestion status `approved`; inside one transaction: insert the `routes`
   row (copy name → `name`, river name → resolve to `river_id` when it
   matches a canonical river, else null + keep the text in `payload`;
   difficulty → `grade`; summary/access notes; geometry from the suggestion's
   stored route; `created_by` = suggestion member; `promoted_by` = caller;
   `source_route_suggestion_id`), set the suggestion's status to `promoted`,
   return the new route. Promoted suggestions must drop out of
   `GET /api/route-suggestions/approved` (they're superseded by the canonical
   record) but stay visible in moderation with a link to the route.
   API tests: promote happy path; promote non-approved → 409; non-moderator →
   403; promoted suggestion excluded from the approved list.
3. **Public reads:** `GET /api/routes` (optional `?river=<riverId>`),
   `GET /api/routes/:id` — `status = 'published'` only, geometry as GeoJSON
   coordinates, include attribution display names (public name rules — reuse
   the helper in `api/src/public-name.ts`).
4. **Frontend — display:**
   - New service `src/services/routesApi.ts` + a `CommunitySection` shape
     mapped into the existing `RiverSection` type (`src/types.ts` ~203) so the
     map's section-polyline renderer works unchanged: fetch on app load and
     when a river is selected; pass real sections alongside the placeholder
     overview rows into `<RiverMap sections={…}>` (`src/App.tsx` ~1153,
     `appRiverSections`).
   - Section polylines render with the existing level-band styling
     (grey/unknown initially); clicking uses the existing river popup pattern:
     **Details / Snap view / Select**.
   - Section detail panel: name, grade, distance, summary, access notes,
     evidence status, and attribution ("Added by <public name> · community
     section — not verified advice" per the no-advice principles).
   - List sections under the selected river in the river Details panel
     (a "Sections" tab or list block).
   - **Re-enable Section Favs:** restore persistence in
     `loadFavouriteSectionIds` (`src/lib/storage.ts` — mirror the
     favourite-rivers implementation just below it), keyed by `routes.id`.
     The "Section Favs" Discover tab (`src/App.tsx` ~6093) already renders
     favourites; it just needs non-empty data.
   - UI copy audit: every new surface says **Section**; run
     `grep -rn "Route" src --include="*.tsx"` over the new code to confirm no
     user-visible "Route" strings (internal identifiers are fine).
5. **Moderation UI:** on approved route suggestions in the moderation routes
   tab, add a **"Promote to section"** action with a confirm step; after
   promotion show a "Promoted" badge + link that focuses the new section on
   the map.
6. **Gate + manual e2e (Playwright headless, chromium at
   `/home/timgo/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome`,
   dismiss welcome via
   `sessionStorage.setItem('riverlaunch-welcome-dismissed-session','1')`):**
   sign in as the local test member (see the moderator/admin account in
   `api/src` seed helpers or promote `member01` via SQL: `UPDATE members SET
   role='admin' WHERE …` on the local DB only), draw a suggestion, approve it,
   promote it, confirm the section polyline renders, the panel shows
   attribution + non-advice copy, and favouriting persists across reload.

## Phase 3 — Deferred (do NOT build now; record only)

- **"On this stretch" (decided 2026-07-02):** the section panel is a thin view
  over the river, not a second river. Next slice: a derived block listing the
  river's POIs within a corridor of the section line (PostGIS `ST_DWithin` on
  `pois` against `routes.route`), plus the river's relevant gauge reading
  labelled "river level, not section-specific". Sections never own POI data.
- Per-section gauge links (`route_measure_links` keyed by `routes.id`,
  moderator-curated) lighting up per-section level bands.
- Section-selected POIs via `poi_route_links` with `route_source='route'`
  (roles: put-in / take-out / stop / scout).
- Route adjustments applying directly to `routes` (geometry/metadata edits with
  revision bump); then drop `route_overrides` and the deferred
  `section_id` columns.
- Member/club-owned private routes (visibility scopes — see
  `/docs/specs/map-features-data-model.md` §5 layer 3).

## Acceptance summary

- No seeded sections anywhere; `routes` is populated only via promote.
- River level colouring and river POI reads work identically to before
  (re-keyed, fixture-free).
- A member-drawn suggestion can be approved and promoted end-to-end, and the
  resulting section renders, lists under its river, and can be favourited.
- All copy says "Section"; attribution + non-advice wording present.
- All gates green: `npx tsc -b`, frontend Vitest, API tests, `npm run build`.
