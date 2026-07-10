// Force-refresh the per-gauge level distribution stats (quantile grids).
// Normally the ingest job keeps these fresh daily; run this manually after a
// historic backfill so bands pick up the new distribution immediately.
// Run: npm --prefix api run refresh:level-stats   (DATABASE_URL selects the DB)
import { closePool } from "./db.js";
import { refreshObservationLevelStats } from "./observations.js";

refreshObservationLevelStats(true)
  .then((result) => {
    console.log(JSON.stringify(result));
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closePool());
