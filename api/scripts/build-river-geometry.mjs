// Build/refresh canonical_rivers.matched_geometry: the OSM watercourse ways whose
// name matches each canonical river, within its bbox, collected at FULL precision.
// OSM names a river inconsistently along its length (some Dart segments are
// "River Dart", others just "Dart") AND sometimes double-maps a stretch in parallel.
// So: take the full-name ways, then add only the stripped-name ("River/Afon/..."
// removed) ways that are NOT a parallel duplicate (within 30m) of a full-name way.
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
  WITH full_match AS (
    SELECT cr.id AS river_id, ST_Collect(w.geometry) AS geom
    FROM canonical_rivers cr
    JOIN watercourses w
      ON w.geometry && cr.bbox
      AND ST_Intersects(w.geometry, cr.bbox)
      AND lower(w.name) = lower(split_part(cr.display_name, ' / ', 1))
    WHERE cr.bbox IS NOT NULL
    GROUP BY cr.id
  ),
  stripped_match AS (
    SELECT cr.id AS river_id, ST_Collect(w.geometry) AS geom
    FROM canonical_rivers cr
    JOIN watercourses w
      ON w.geometry && cr.bbox
      AND ST_Intersects(w.geometry, cr.bbox)
      AND lower(w.name) = lower(regexp_replace(split_part(cr.display_name, ' / ', 1), '^(River|Afon|Water of|Allt) ', ''))
      AND lower(w.name) <> lower(split_part(cr.display_name, ' / ', 1))
    WHERE cr.bbox IS NOT NULL
    GROUP BY cr.id
  ),
  combined AS (
    SELECT
      COALESCE(f.river_id, s.river_id) AS river_id,
      CASE
        WHEN f.geom IS NULL THEN s.geom
        WHEN s.geom IS NULL THEN f.geom
        -- keep all full-name geometry; add stripped-name parts only where they are
        -- NOT a parallel duplicate (within 30m) of a full-name way
        ELSE ST_Collect(
          f.geom,
          ST_Difference(s.geom, ST_Buffer(f.geom::geography, 30)::geometry)
        )
      END AS geom
    FROM full_match f
    FULL OUTER JOIN stripped_match s ON f.river_id = s.river_id
  )
  UPDATE canonical_rivers cr
  SET matched_geometry = ST_Multi(ST_CollectionExtract(c.geom, 2)),
      updated_at = now()
  FROM combined c
  WHERE cr.id = c.river_id
    AND c.geom IS NOT NULL
    AND NOT ST_IsEmpty(c.geom)
`);

console.log(`rivers with matched geometry populated: ${result.rowCount}`);
await pool.end();
