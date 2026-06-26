import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { SeedObservationMeasure } from "./observations.js";

// The curated observation-stations seed pack (external-collected provider metadata +
// our curation). Lives as data in api/seed/, separate from the loader code here.
// Path resolved relative to this module so it works both in dev (api/src/… → api/seed)
// and in the compiled Cloud Run bundle (api/dist/… → ../seed = /app/seed, populated by
// the Dockerfile).
const SEED_PATH = fileURLToPath(
  new URL("../seed/observation-stations.json", import.meta.url),
);

let cached: SeedObservationMeasure[] | null = null;

function requireString(value: unknown, where: string): void {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`observation-stations seed: missing/empty "${where}"`);
  }
}

export function loadObservationStationsSeed(): SeedObservationMeasure[] {
  if (cached) return cached;

  const parsed = JSON.parse(readFileSync(SEED_PATH, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error("observation-stations seed: expected a JSON array");
  }

  parsed.forEach((measure, i) => {
    const at = `measures[${i}]`;
    for (const key of [
      "provider",
      "providerStationId",
      "providerMeasureId",
      "stationName",
      "parameter",
      "unit",
      "sourceUrl",
    ]) {
      requireString(measure?.[key], `${at}.${key}`);
    }
    if (!Array.isArray(measure.sectionLinks)) {
      throw new Error(`observation-stations seed: ${at}.sectionLinks must be an array`);
    }
    measure.sectionLinks.forEach((link: unknown, j: number) => {
      const linkAt = `${at}.sectionLinks[${j}]`;
      for (const key of ["sectionId", "relevance", "confidence"]) {
        requireString((link as Record<string, unknown>)?.[key], `${linkAt}.${key}`);
      }
    });
  });

  cached = parsed as SeedObservationMeasure[];
  return cached;
}
