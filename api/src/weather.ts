import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Met Office DataHub "Map Images" — precipitation rate, served per saved order.
const MET_OFFICE_BASE = "https://data.hub.api.metoffice.gov.uk/map-images/1.0.0";
const RAIN_ORDER = process.env.METOFFICE_RAIN_ORDER || "o081200335114";
const FRAME_TTL_MS = 15 * 60 * 1000;
const LIST_TTL_MS = 10 * 60 * 1000;
const MAX_CACHED_FRAMES = 60;

// The equirectangular "UK model extent" region the precipitation PNG covers
// (lat 45→63, lng −25→15). Leaflet overlay bounds derive from this.
export const RAIN_BOUNDS = {
  south: 45,
  west: -25,
  north: 63,
  east: 15,
} as const;

export const RAIN_BOUNDS_TUPLE: [[number, number], [number, number]] = [
  [RAIN_BOUNDS.south, RAIN_BOUNDS.west],
  [RAIN_BOUNDS.north, RAIN_BOUNDS.east],
];

export interface RainFrame {
  bytes: Buffer;
  contentType: string;
  fetchedAt: number;
}

export interface RainFrameInfo {
  ts: number;
  validTime: string;
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

// ---- per-timestep PNG cache ---------------------------------------------
const frameCache = new Map<number, RainFrame>();
const frameInflight = new Map<number, Promise<RainFrame | null>>();

async function downloadRainFrame(ts: number): Promise<RainFrame | null> {
  const apiKey = readApiKey();
  if (!apiKey) {
    return null;
  }

  // fileId e.g. total_precipitation_rate_ts0_+00 (latest run); + must be %2B.
  const fileId = `total_precipitation_rate_ts${ts}_%2B00`;
  const url = `${MET_OFFICE_BASE}/orders/${RAIN_ORDER}/latest/${fileId}/data`;
  try {
    const response = await fetch(url, {
      headers: { apikey: apiKey, Accept: "image/png" },
    });
    if (!response.ok) {
      console.error(`[weather] rain frame ts${ts} failed: HTTP ${response.status}`);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return {
      bytes: Buffer.from(arrayBuffer),
      contentType: response.headers.get("content-type") ?? "image/png",
      fetchedAt: Date.now(),
    };
  } catch (error) {
    console.error(`[weather] rain frame ts${ts} threw:`, error);
    return null;
  }
}

// Cached precipitation PNG for a timestep (re-fetched at most every FRAME_TTL_MS,
// so we stay far under the free 1,000/day cap and the browser never holds the key).
export async function fetchRainFrame(ts: number): Promise<RainFrame | null> {
  const cached = frameCache.get(ts);
  if (cached && Date.now() - cached.fetchedAt < FRAME_TTL_MS) {
    return cached;
  }
  const existing = frameInflight.get(ts);
  if (existing) {
    return existing;
  }
  const promise = downloadRainFrame(ts)
    .then((frame) => {
      if (frame) {
        frameCache.set(ts, frame);
        if (frameCache.size > MAX_CACHED_FRAMES) {
          let oldestTs: number | null = null;
          let oldestAt = Infinity;
          for (const [key, value] of frameCache) {
            if (value.fetchedAt < oldestAt) {
              oldestAt = value.fetchedAt;
              oldestTs = key;
            }
          }
          if (oldestTs !== null) frameCache.delete(oldestTs);
        }
      }
      return frame ?? frameCache.get(ts) ?? null;
    })
    .finally(() => {
      frameInflight.delete(ts);
    });
  frameInflight.set(ts, promise);
  return promise;
}

export function fetchLatestRainFrame(): Promise<RainFrame | null> {
  return fetchRainFrame(0);
}

// ---- forecast frame list (for the timebar) ------------------------------
let framesCache: { at: number; frames: RainFrameInfo[] } | null = null;
let framesInflight: Promise<RainFrameInfo[]> | null = null;

async function downloadRainFrames(): Promise<RainFrameInfo[]> {
  const apiKey = readApiKey();
  if (!apiKey) {
    return [];
  }

  const url = `${MET_OFFICE_BASE}/orders/${RAIN_ORDER}/latest?detail=MINIMAL`;
  try {
    const response = await fetch(url, {
      headers: { apikey: apiKey, Accept: "application/json" },
    });
    if (!response.ok) {
      console.error(`[weather] rain frames list failed: HTTP ${response.status}`);
      return [];
    }
    const data = (await response.json()) as {
      orderDetails?: { files?: Array<{ fileId: string; runDateTime: string }> };
    };
    const files = data.orderDetails?.files ?? [];
    const frames: RainFrameInfo[] = [];
    const seen = new Set<number>();
    for (const file of files) {
      // latest run only — those end in _+00
      const match = /^total_precipitation_rate_ts(\d+)_\+00$/.exec(file.fileId);
      if (!match) continue;
      const ts = Number(match[1]);
      if (seen.has(ts)) continue;
      seen.add(ts);
      const runMs = new Date(file.runDateTime).getTime();
      if (!Number.isFinite(runMs)) continue;
      frames.push({
        ts,
        validTime: new Date(runMs + ts * 3_600_000).toISOString(),
      });
    }
    frames.sort((a, b) => a.ts - b.ts);
    return frames;
  } catch (error) {
    console.error("[weather] rain frames list threw:", error);
    return [];
  }
}

export async function listRainFrames(): Promise<RainFrameInfo[]> {
  if (framesCache && Date.now() - framesCache.at < LIST_TTL_MS) {
    return framesCache.frames;
  }
  if (framesInflight) {
    return framesInflight;
  }
  framesInflight = downloadRainFrames()
    .then((frames) => {
      if (frames.length) framesCache = { at: Date.now(), frames };
      return frames.length ? frames : (framesCache?.frames ?? []);
    })
    .finally(() => {
      framesInflight = null;
    });
  return framesInflight;
}
