// One-off, reproducible backfill of amenities.river_id (§5) for amenities already
// in the DB — for when you have `watercourses` but don't want to re-import from
// OSM. Uses the exact nearest-featured-river match the importer uses, then the
// amenities→pois trigger propagates river_id into pois. Follow with
// `export:amenities-seed` to bake the result into the seed pack.
//
//   npm run backfill:amenity-rivers [-- --buffer-metres 1000]
import { closePool, pool } from "./db.js";

async function main() {
  const bufferArg = process.argv.find((a) => a.startsWith("--buffer-metres"));
  const bufferMetres = (() => {
    const raw = bufferArg?.includes("=")
      ? bufferArg.split("=")[1]
      : process.argv[process.argv.indexOf("--buffer-metres") + 1];
    const n = Number(raw ?? "1000");
    return Number.isFinite(n) && n > 0 ? n : 1000;
  })();
  const degrees = bufferMetres / 50000;

  const client = await pool.connect();
  try {
    // Same "our rivers" set the amenity importer builds: OSM watercourse ways that
    // match a featured canonical river, indexed for fast proximity.
    await client.query(`CREATE TEMP TABLE our_rivers AS
      SELECT cr.id AS river_id, w.geometry
      FROM watercourses w
      JOIN canonical_rivers cr
        ON lower(w.name) IN (
          lower(split_part(cr.display_name, ' / ', 1)),
          lower(regexp_replace(split_part(cr.display_name, ' / ', 1), '^(River|Afon|Water of|Allt) ', ''))
        )
        AND ST_Intersects(w.geometry, cr.bbox)`);
    await client.query(
      "CREATE INDEX our_rivers_gix ON our_rivers USING gist (geometry)",
    );
    await client.query("ANALYZE our_rivers");

    // Nearest featured river per amenity, as a correlated scalar subquery (the
    // UPDATE target can't be referenced from a LATERAL in its own FROM). Degree
    // prefilter via GIST, then precise metres. The UPDATE fires
    // amenities_sync_location_poi → pois.river_id.
    const updated = await client.query(
      `UPDATE amenities a
       SET river_id = (
         SELECT r.river_id
         FROM our_rivers r
         WHERE ST_DWithin(r.geometry, a.geometry, $1)
           AND ST_DWithin(r.geometry::geography, a.geometry::geography, $2)
         ORDER BY ST_Distance(r.geometry::geography, a.geometry::geography)
         LIMIT 1
       ),
       updated_at = now()
       WHERE a.source = 'osm_amenity'`,
      [degrees, bufferMetres],
    );

    const { rows } = await client.query<{ total: string; with_river: string }>(
      "SELECT count(*) AS total, count(river_id) AS with_river FROM amenities WHERE source = 'osm_amenity'",
    );
    console.log(
      `Backfilled river_id on ${updated.rowCount ?? 0} amenities. Now ${rows[0].with_river}/${rows[0].total} have a river (buffer ${bufferMetres}m).`,
    );
  } finally {
    client.release();
  }

  await closePool();
}

main().catch(async (error) => {
  console.error(error);
  await closePool();
  process.exit(1);
});
