// One-shot seed: restore the 62 featured rivers' matched centre-lines from the
// seed pack (api/seed/river-geometry.json) into canonical_rivers.matched_geometry.
// Idempotent (UPDATE keyed on id). Run deliberately — locally for dev, or against
// staging/prod through the Cloud SQL Auth Proxy (see platform seed:river-geometry).
import { closePool, pool } from "./db.js";
import { loadRiverGeometrySeed } from "./seed-river-geometry.js";

(async () => {
  const seed = loadRiverGeometrySeed();
  const client = await pool.connect();
  let updated = 0;
  let missing = 0;
  try {
    for (const entry of seed) {
      const result = await client.query(
        `UPDATE canonical_rivers
         SET matched_geometry = ST_SetSRID(ST_GeomFromWKB(decode($2, 'hex')), 4326),
             updated_at = now()
         WHERE id = $1`,
        [entry.riverId, entry.wkbHex],
      );
      if (result.rowCount && result.rowCount > 0) {
        updated += result.rowCount;
      } else {
        missing += 1;
        console.warn(
          `river-geometry seed: no canonical_rivers row for id="${entry.riverId}"`,
        );
      }
    }
    console.log(
      `Seeded river geometry from the seed pack: ${updated} updated` +
        (missing ? `, ${missing} skipped (river id not present)` : "") +
        `.`,
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
