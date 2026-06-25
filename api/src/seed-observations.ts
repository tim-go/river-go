// One-shot seed: upsert the curated observation stations/measures/section-links
// from the seed pack (api/seed/observation-stations.json) into the database.
// Idempotent (ON CONFLICT). Run deliberately — locally for dev, or against
// staging/prod through the Cloud SQL Auth Proxy (see platform seed:observations).
// NOT part of the 30-min ingest job, which only pulls readings for existing measures.
import { closePool, pool } from "./db.js";
import { ensureInitialObservationMeasures } from "./observations.js";

(async () => {
  const client = await pool.connect();
  try {
    await ensureInitialObservationMeasures(client);
    console.log("Seeded observation stations from the seed pack.");
  } finally {
    client.release();
  }
})()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closePool());
