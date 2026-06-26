import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// The river-geometry seed pack: the 62 featured rivers' matched centre-lines
// (the product). Lives as data in api/seed/river-geometry.json, separate from
// the loader/runner code. Path resolved relative to this module so it works
// both in dev (api/src/… → api/seed) and in the compiled bundle (api/dist/… →
// ../seed). The pack is read from the repo at deploy time (like the observation
// seed); it is NOT copied into the container image.
const SEED_PATH = fileURLToPath(
  new URL("../seed/river-geometry.json", import.meta.url),
);

export interface RiverGeometrySeedEntry {
  riverId: string;
  wkbHex: string;
}

let cached: RiverGeometrySeedEntry[] | null = null;

function requireString(value: unknown, where: string): void {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`river-geometry seed: missing/empty "${where}"`);
  }
}

function requireHex(value: unknown, where: string): void {
  requireString(value, where);
  if (!/^[0-9a-fA-F]+$/.test(value as string)) {
    throw new Error(`river-geometry seed: "${where}" must be hex`);
  }
}

export function loadRiverGeometrySeed(): RiverGeometrySeedEntry[] {
  if (cached) return cached;

  const parsed = JSON.parse(readFileSync(SEED_PATH, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error("river-geometry seed: expected a JSON array");
  }

  parsed.forEach((entry, i) => {
    const at = `entries[${i}]`;
    requireString(entry?.riverId, `${at}.riverId`);
    requireHex(entry?.wkbHex, `${at}.wkbHex`);
  });

  cached = parsed as RiverGeometrySeedEntry[];
  return cached;
}
