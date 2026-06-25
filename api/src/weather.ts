import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Met Office DataHub "Map Images" — precipitation rate, served per saved order.
const MET_OFFICE_BASE = "https://data.hub.api.metoffice.gov.uk/map-images/1.0.0";
const RAIN_ORDER = process.env.METOFFICE_RAIN_ORDER || "o081200335114";
const RAIN_FILE_ID = "total_precipitation_rate_ts0_+00"; // ts0 = current frame
const CACHE_TTL_MS = 10 * 60 * 1000;

// The equirectangular "UK model extent" region the precipitation PNG covers
// (lat 45→63, lng −25→15). Leaflet overlay bounds derive from this.
export const RAIN_BOUNDS = {
  south: 45,
  west: -25,
  north: 63,
  east: 15,
} as const;

export interface RainFrame {
  bytes: Buffer;
  contentType: string;
  fetchedAt: number;
}

let apiKeyCache: string | null | undefined;

// Key is a single-line JWT — from env in prod, or the git-ignored repo file in
// dev. Never logged or returned to clients.
function readApiKey(): string | null {
  if (apiKeyCache !== undefined) return apiKeyCache;

  const fromEnv = process.env.METOFFICE_API_KEY;
  if (fromEnv && fromEnv.trim()) {
    apiKeyCache = fromEnv.trim();
    return apiKeyCache;
  }

  const candidates = [
    resolve(process.cwd(), ".config/metoffice_api_key"),
    resolve(process.cwd(), "../.config/metoffice_api_key"),
  ];
  for (const path of candidates) {
    try {
      const value = readFileSync(path, "utf8").trim();
      if (value) {
        apiKeyCache = value;
        return apiKeyCache;
      }
    } catch {
      // try the next candidate
    }
  }

  apiKeyCache = null;
  return null;
}

let cachedFrame: RainFrame | null = null;
let inflight: Promise<RainFrame | null> | null = null;

async function downloadRainFrame(): Promise<RainFrame | null> {
  const apiKey = readApiKey();
  if (!apiKey) {
    return null;
  }

  const fileId = RAIN_FILE_ID.replace(/\+/g, "%2B");
  const url = `${MET_OFFICE_BASE}/orders/${RAIN_ORDER}/latest/${fileId}/data`;
  try {
    const response = await fetch(url, {
      headers: { apikey: apiKey, Accept: "image/png" },
    });
    if (!response.ok) {
      console.error(`[weather] Met Office rain frame failed: HTTP ${response.status}`);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return {
      bytes: Buffer.from(arrayBuffer),
      contentType: response.headers.get("content-type") ?? "image/png",
      fetchedAt: Date.now(),
    };
  } catch (error) {
    console.error("[weather] Met Office rain frame threw:", error);
    return null;
  }
}

// Latest cached precipitation PNG (re-fetched at most every CACHE_TTL_MS, so we
// stay far under the free 1,000/day cap and the browser never holds the key).
export async function fetchLatestRainFrame(): Promise<RainFrame | null> {
  if (cachedFrame && Date.now() - cachedFrame.fetchedAt < CACHE_TTL_MS) {
    return cachedFrame;
  }
  if (inflight) {
    return inflight;
  }
  inflight = downloadRainFrame()
    .then((frame) => {
      if (frame) cachedFrame = frame;
      return frame ?? cachedFrame;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
