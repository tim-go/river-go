import { closePool } from "./db.js";
import { runObservationBackfillJob } from "./observations.js";

const hours = parseHours(process.argv.slice(2));

runObservationBackfillJob(hours)
  .then((jobRun) => {
    console.log(JSON.stringify(jobRun, null, 2));
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closePool());

function parseHours(args: string[]): number {
  const hoursArg =
    args.find((arg) => arg.startsWith("--hours="))?.slice("--hours=".length) ??
    args[0];
  const parsedHours = Number.parseInt(hoursArg ?? "672", 10);

  if (!Number.isFinite(parsedHours)) {
    return 672;
  }

  return Math.max(1, Math.min(parsedHours, 672));
}
