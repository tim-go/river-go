// Regenerate the amenities seed pack (api/seed/amenities.json) from the live
// `amenities` table, including the pre-derived `river_id` (§5, §10a). Run this
// ONCE in an environment that has `watercourses` — i.e. after `import:osm-amenities`
// (or `import:osm-waterways` + a re-import) has populated `amenities.river_id` —
// then commit the refreshed pack. Seeding (local/staging) is then a pure load with
// no watercourses dependency.
//
//   npm run export:amenities-seed
//
// Mirrors the seed-amenities loader's shape exactly, so the round-trip
// export → loadAmenitiesSeed → seed-amenities-run is lossless.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { closePool, pool } from "./db.js";
import type { AmenitySeedEntry } from "./seed-amenities.js";

const SEED_PATH = fileURLToPath(
  new URL("../seed/amenities.json", import.meta.url),
);

(async () => {
  const client = await pool.connect();
  try {
    // Stable ordering (by source_id) so regenerations produce minimal diffs.
    const { rows } = await client.query<{
      sourceId: string;
      category: string;
      name: string | null;
      wkbHex: string;
      riverId: string | null;
      rawProperties: Record<string, unknown>;
      sourceMetadata: Record<string, unknown>;
    }>(
      `SELECT
         source_id AS "sourceId",
         category,
         name,
         encode(ST_AsBinary(geometry), 'hex') AS "wkbHex",
         river_id AS "riverId",
         raw_properties AS "rawProperties",
         source_metadata AS "sourceMetadata"
       FROM amenities
       WHERE source = 'osm_amenity'
       ORDER BY source_id`,
    );

    const entries: AmenitySeedEntry[] = rows.map((row) => ({
      sourceId: row.sourceId,
      category: row.category,
      name: row.name,
      wkbHex: row.wkbHex,
      riverId: row.riverId,
      rawProperties: row.rawProperties,
      sourceMetadata: row.sourceMetadata,
    }));

    writeFileSync(SEED_PATH, `${JSON.stringify(entries, null, 2)}\n`, "utf8");

    const withRiver = entries.filter((entry) => entry.riverId).length;
    console.log(
      `Wrote ${entries.length} amenities to ${SEED_PATH} (${withRiver} with a river_id, ${
        entries.length - withRiver
      } without).`,
    );
    if (withRiver === 0) {
      console.warn(
        "WARNING: no amenity has a river_id — did the importer run with watercourses present?",
      );
    }
  } finally {
    client.release();
  }
})()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closePool());
