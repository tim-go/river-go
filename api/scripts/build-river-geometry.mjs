// Build/refresh canonical_rivers.matched_geometry: the OSM watercourse ways whose
// name matches each canonical river, within its bbox, collected at FULL precision.
// Run AFTER the watercourse import (part of the repeatable OSM pipeline):
//   node api/scripts/build-river-geometry.mjs   (DATABASE_URL overrides the local default)
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://river_go_admin:river_go@127.0.0.1:5440/river_go",
});

const result = await pool.query(`
  WITH river_geom AS (
    SELECT cr.id AS river_id,
      ST_Multi(ST_CollectionExtract(ST_Collect(w.geometry), 2)) AS geom
    FROM canonical_rivers cr
    JOIN watercourses w
      ON w.geometry && cr.bbox
      AND ST_Intersects(w.geometry, cr.bbox)
      -- OSM names rivers inconsistently along their length (e.g. some Dart segments
      -- are "River Dart", others just "Dart"), so match the full name OR the name
      -- with a leading "River/Afon/Water of/Allt" stripped. Exact equality (not LIKE)
      -- keeps tributaries like "East Dart River" out.
      AND lower(w.name) IN (
        lower(split_part(cr.display_name, ' / ', 1)),
        lower(regexp_replace(split_part(cr.display_name, ' / ', 1), '^(River|Afon|Water of|Allt) ', ''))
      )
    WHERE cr.bbox IS NOT NULL
    GROUP BY cr.id
  )
  UPDATE canonical_rivers cr
  SET matched_geometry = rg.geom, updated_at = now()
  FROM river_geom rg
  WHERE cr.id = rg.river_id
    AND rg.geom IS NOT NULL
    AND NOT ST_IsEmpty(rg.geom)
`);

console.log(`rivers with matched geometry populated: ${result.rowCount}`);
await pool.end();
