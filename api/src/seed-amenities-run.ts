// One-shot seed: upsert the 6280 riverside OSM amenities from the seed pack
// (api/seed/amenities.json) into the amenities table. Idempotent (ON CONFLICT on
// (source, source_id)); the upsert fires the amenities_sync_location_poi trigger,
// which populates/refreshes the pois rows. NO DELETE — adopted/contributed rows
// are never disturbed. Run deliberately — locally for dev, or against
// staging/prod through the Cloud SQL Auth Proxy (see platform seed:amenities).
import type { PoolClient } from "pg";
import { closePool, pool } from "./db.js";
import { type AmenitySeedEntry, loadAmenitiesSeed } from "./seed-amenities.js";

const BATCH_SIZE = 500;

async function upsertBatch(
  client: PoolClient,
  records: AmenitySeedEntry[],
): Promise<number> {
  if (!records.length) return 0;
  const result = await client.query(
    `WITH input AS (
       SELECT * FROM jsonb_to_recordset($1::jsonb) AS record(
         "sourceId" text,
         category text,
         name text,
         "wkbHex" text,
         "rawProperties" jsonb,
         "sourceMetadata" jsonb
       )
     )
     INSERT INTO amenities (source, source_id, category, name, geometry, raw_properties, source_metadata)
     SELECT 'osm_amenity', i."sourceId", i.category, i.name,
       ST_SetSRID(ST_GeomFromWKB(decode(i."wkbHex", 'hex')), 4326),
       i."rawProperties", i."sourceMetadata"
     FROM input i
     ON CONFLICT (source, source_id) DO UPDATE SET
       category = EXCLUDED.category,
       name = EXCLUDED.name,
       geometry = EXCLUDED.geometry,
       raw_properties = EXCLUDED.raw_properties,
       source_metadata = EXCLUDED.source_metadata,
       updated_at = now()`,
    [JSON.stringify(records)],
  );
  return result.rowCount ?? 0;
}

(async () => {
  const seed = loadAmenitiesSeed();
  const client = await pool.connect();
  let upserted = 0;
  try {
    for (let i = 0; i < seed.length; i += BATCH_SIZE) {
      upserted += await upsertBatch(client, seed.slice(i, i + BATCH_SIZE));
    }
    console.log(
      `Seeded ${upserted} riverside amenities from the seed pack (pois synced via trigger).`,
    );
  } finally {
    client.release();
  }
})()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closePool());
