import { closePool } from "./db.js";
import { runObservationIngestionJob } from "./observations.js";

runObservationIngestionJob()
  .then((jobRun) => {
    console.log(JSON.stringify(jobRun, null, 2));
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closePool());
