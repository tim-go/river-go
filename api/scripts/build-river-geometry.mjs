// Build/refresh canonical_rivers.matched_geometry from OS Open Rivers — a clean,
// authoritative, single-line named GB river network (Ordnance Survey, OGL). Unlike
// OSM watercourses (inconsistent names, rivers double-mapped 60-100m apart), OS
// names each river once and traces it once, so NO spatial dedupe is needed: we
// simply collect the OS links whose name matches the canonical river within its bbox.
//
// Name reconciliation (canonical display_name -> OS watercourse_name):
//   - drop our disambiguators: "River Eden (Cumbria)" -> "River Eden"
//   - try the alt name after " / ": "River Usk / Afon Wysg" -> "Afon Wysg"
//   - prefix/suffix variants: "North Tyne" -> "River North Tyne", "East Lyn" -> "East Lyn River"
//   - explicit Welsh/English aliases for the two that need it (Dyfi/Wye)
//
// Requires the os_open_rivers table (see scripts/import-os-open-rivers.sh).
// Run: node api/scripts/build-river-geometry.mjs   (DATABASE_URL overrides the local default)
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://river_go_admin:river_go@127.0.0.1:5440/river_go",
});

// Idempotent rebuild: clear all prior geometry first, so a river that no longer
// matches (renamed, removed from OS, bbox changed) doesn't keep stale geometry.
await pool.query(
  "UPDATE canonical_rivers SET matched_geometry = NULL WHERE matched_geometry IS NOT NULL",
);

const result = await pool.query(`
  WITH cand AS (
    SELECT cr.id AS river_id, cr.bbox,
      ARRAY_REMOVE(ARRAY[
        lower(regexp_replace(split_part(cr.display_name, ' / ', 1), '\\s*\\(.*\\)$', '')),
        lower(nullif(regexp_replace(split_part(cr.display_name, ' / ', 2), '\\s*\\(.*\\)$', ''), '')),
        'river ' || lower(regexp_replace(regexp_replace(split_part(cr.display_name, ' / ', 1), '\\s*\\(.*\\)$', ''), '^(River|Afon) ', '')),
        lower(regexp_replace(regexp_replace(split_part(cr.display_name, ' / ', 1), '\\s*\\(.*\\)$', ''), '^(River|Afon) ', '')) || ' river',
        lower(regexp_replace(regexp_replace(split_part(cr.display_name, ' / ', 1), '\\s*\\(.*\\)$', ''), '^(River|Afon) ', '')),
        CASE lower(split_part(cr.display_name, ' / ', 1))
          WHEN 'afon dyfi' THEN 'river dovey'
          WHEN 'river wye' THEN 'afon gwy'
          ELSE NULL END
      ], NULL) AS names
    FROM canonical_rivers cr WHERE cr.bbox IS NOT NULL
  ),
  matched AS (
    SELECT c.river_id,
      ST_Multi(ST_CollectionExtract(ST_LineMerge(ST_Collect(o.geometry)), 2)) AS geom
    FROM cand c
    JOIN os_open_rivers o
      ON o.geometry && c.bbox
      AND ST_Intersects(o.geometry, c.bbox)
      AND lower(o.name) = ANY (c.names)
    GROUP BY c.river_id
  )
  UPDATE canonical_rivers cr
  SET matched_geometry = m.geom, updated_at = now()
  FROM matched m
  WHERE cr.id = m.river_id AND m.geom IS NOT NULL AND NOT ST_IsEmpty(m.geom)
`);

console.log(`rivers with matched geometry populated: ${result.rowCount}`);
await pool.end();
