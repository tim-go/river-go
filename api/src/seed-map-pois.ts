import { closePool, pool } from "./db.js";
import { upsertMapPoiSeeds } from "./map-pois.js";
import { seedMapPois } from "./seed-map-pois-data.js";

async function seedMapPoisIntoDatabase() {
  const result = await upsertMapPoiSeeds(seedMapPois, pool);
  console.log(JSON.stringify(result, null, 2));
}

seedMapPoisIntoDatabase()
  .then(() => closePool())
  .catch(async (error: unknown) => {
    console.error(error);
    await closePool();
    process.exit(1);
  });
