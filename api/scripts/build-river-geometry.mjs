// Build/refresh canonical_rivers.matched_geometry: the OSM watercourse ways whose
// name matches each canonical river, within its bbox, spatially deduped and collected.
//
// OSM names a river inconsistently ("River Dart" vs "Dart") AND routinely maps the
// SAME channel twice in parallel — typically once as waterway=river and once as
// waterway=watercourse, offset 60-100m. So we dedupe: order a river's matched ways
// longest-first, and keep a way only if it adds real new coverage (>50% of it lies
// beyond 110m of the ways already kept). Longest-first (rather than preferring a
// waterway type) picks the better-traced line where the two digitisations diverge.
// Parallel duplicates run within 110m of a kept way → dropped; genuine gap-filling
// stretches reach beyond it → kept.
//
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
  WITH ways AS (
    SELECT cr.id AS river_id,
      row_number() OVER (
        PARTITION BY cr.id
        ORDER BY ST_Length(w.geometry::geography) DESC
      ) AS rn,
      w.geometry AS g
    FROM canonical_rivers cr
    JOIN watercourses w
      ON w.geometry && cr.bbox
      AND ST_Intersects(w.geometry, cr.bbox)
      AND lower(w.name) IN (
        lower(split_part(cr.display_name, ' / ', 1)),
        lower(regexp_replace(split_part(cr.display_name, ' / ', 1), '^(River|Afon|Water of|Allt) ', ''))
      )
    WHERE cr.bbox IS NOT NULL
  ),
  kept AS (
    SELECT w.river_id, w.g
    FROM ways w
    WHERE w.rn = 1
      OR ST_Length(
           ST_Difference(
             w.g,
             ST_Buffer(
               (SELECT ST_Collect(o.g) FROM ways o
                WHERE o.river_id = w.river_id AND o.rn < w.rn)::geography,
               110
             )::geometry
           )::geography
         ) > 0.65 * ST_Length(w.g::geography)
  ),
  agg AS (
    SELECT river_id, ST_Multi(ST_CollectionExtract(ST_Collect(g), 2)) AS geom
    FROM kept GROUP BY river_id
  )
  UPDATE canonical_rivers cr
  SET matched_geometry = agg.geom, updated_at = now()
  FROM agg
  WHERE cr.id = agg.river_id AND agg.geom IS NOT NULL AND NOT ST_IsEmpty(agg.geom)
`);

console.log(`rivers with matched geometry populated: ${result.rowCount}`);
await pool.end();
