import { getWhat3WordsApiKey } from "./config.js";
import { HttpError } from "./http.js";

const WHAT3WORDS_BASE_URL = "https://api.what3words.com/v3";
const REQUEST_TIMEOUT_MS = 4500;

export interface What3WordsLookupResult {
  configured: boolean;
  words: string | null;
  nearestPlace?: string;
  country?: string;
}

export interface What3WordsCoordinateResult {
  configured: boolean;
  coordinates: { lat: number; lng: number } | null;
  words?: string;
  nearestPlace?: string;
  country?: string;
}

export async function lookupWhat3WordsForCoordinates(
  lat: number,
  lng: number,
): Promise<What3WordsLookupResult> {
  validateLatitude(lat);
  validateLongitude(lng);

  const key = getWhat3WordsApiKey();
  if (!key) {
    return { configured: false, words: null };
  }

  const url = new URL(`${WHAT3WORDS_BASE_URL}/convert-to-3wa`);
  url.searchParams.set("coordinates", `${lat},${lng}`);
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  url.searchParams.set("key", key);

  const result = await fetchJson<{
    words?: string;
    nearestPlace?: string;
    country?: string;
  }>(url);

  return {
    configured: true,
    words: readString(result.words),
    nearestPlace: readString(result.nearestPlace) ?? undefined,
    country: readString(result.country) ?? undefined,
  };
}

export async function lookupCoordinatesForWhat3Words(
  words: string,
): Promise<What3WordsCoordinateResult> {
  const safeWords = normalizeWords(words);
  if (!safeWords) {
    throw new HttpError(400, "A what3words address is required.");
  }

  const key = getWhat3WordsApiKey();
  if (!key) {
    return { configured: false, coordinates: null };
  }

  const url = new URL(`${WHAT3WORDS_BASE_URL}/convert-to-coordinates`);
  url.searchParams.set("words", safeWords);
  url.searchParams.set("format", "json");
  url.searchParams.set("key", key);

  const result = await fetchJson<{
    words?: string;
    nearestPlace?: string;
    country?: string;
    coordinates?: { lat?: number; lng?: number };
  }>(url);

  const lat = result.coordinates?.lat;
  const lng = result.coordinates?.lng;

  return {
    configured: true,
    coordinates:
      typeof lat === "number" && typeof lng === "number" ? { lat, lng } : null,
    words: readString(result.words) ?? safeWords,
    nearestPlace: readString(result.nearestPlace) ?? undefined,
    country: readString(result.country) ?? undefined,
  };
}

export async function enrichPayloadWithWhat3Words(
  payload: Record<string, unknown>,
  geometry: unknown,
): Promise<Record<string, unknown>> {
  if (typeof payload.what3wordsAddress === "string") {
    return payload;
  }

  const point = readPointGeometry(geometry);
  if (!point) {
    return payload;
  }

  try {
    const result = await lookupWhat3WordsForCoordinates(point.lat, point.lng);
    if (!result.words) {
      return payload;
    }

    return {
      ...payload,
      what3wordsAddress: result.words,
    };
  } catch {
    return payload;
  }
}

function normalizeWords(value: string) {
  const cleaned = value.trim().replace(/^\/{3}/, "");
  return cleaned.split(".").length === 3 ? cleaned : "";
}

function readPointGeometry(
  geometry: unknown,
): { lat: number; lng: number } | null {
  if (!isRecord(geometry) || geometry.type !== "Point") {
    return null;
  }

  const coordinates = geometry.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const [lng, lat] = coordinates;
  return typeof lat === "number" && typeof lng === "number" ? { lat, lng } : null;
}

async function fetchJson<T>(url: URL): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new HttpError(response.status, "what3words lookup failed.");
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function validateLatitude(value: number) {
  if (!Number.isFinite(value) || value < -90 || value > 90) {
    throw new HttpError(400, "lat must be between -90 and 90.");
  }
}

function validateLongitude(value: number) {
  if (!Number.isFinite(value) || value < -180 || value > 180) {
    throw new HttpError(400, "lng must be between -180 and 180.");
  }
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
