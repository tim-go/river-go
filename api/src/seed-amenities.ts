import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// The amenities seed pack: the 6280 riverside OSM amenities (incl. camping),
// with the river-proximity filter already baked in. Lives as data in
// api/seed/amenities.json, separate from the loader/runner code. Path resolved
// relative to this module so it works both in dev (api/src/… → api/seed) and in
// the compiled bundle (api/dist/… → ../seed). The pack is read from the repo at
// deploy time (like the observation seed); it is NOT copied into the image.
const SEED_PATH = fileURLToPath(
  new URL("../seed/amenities.json", import.meta.url),
);

export interface AmenitySeedEntry {
  sourceId: string;
  category: string;
  name: string | null;
  wkbHex: string;
  rawProperties: Record<string, unknown>;
  sourceMetadata: Record<string, unknown>;
}

let cached: AmenitySeedEntry[] | null = null;

function requireString(value: unknown, where: string): void {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`amenities seed: missing/empty "${where}"`);
  }
}

function requireHex(value: unknown, where: string): void {
  requireString(value, where);
  if (!/^[0-9a-fA-F]+$/.test(value as string)) {
    throw new Error(`amenities seed: "${where}" must be hex`);
  }
}

function requireObject(value: unknown, where: string): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`amenities seed: "${where}" must be an object`);
  }
}

export function loadAmenitiesSeed(): AmenitySeedEntry[] {
  if (cached) return cached;

  const parsed = JSON.parse(readFileSync(SEED_PATH, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error("amenities seed: expected a JSON array");
  }

  parsed.forEach((entry, i) => {
    const at = `entries[${i}]`;
    requireString(entry?.sourceId, `${at}.sourceId`);
    requireString(entry?.category, `${at}.category`);
    requireHex(entry?.wkbHex, `${at}.wkbHex`);
    requireObject(entry?.rawProperties, `${at}.rawProperties`);
    requireObject(entry?.sourceMetadata, `${at}.sourceMetadata`);
    if (entry?.name !== null && typeof entry?.name !== "string") {
      throw new Error(`amenities seed: "${at}.name" must be a string or null`);
    }
  });

  cached = parsed as AmenitySeedEntry[];
  return cached;
}
