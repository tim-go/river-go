import type { LatLngTuple } from "../types";
import { getApiBaseUrl } from "./apiConfig";

export interface WatercourseBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface KnownWatercourse {
  id: string;
  name: string | null;
  form: string | null;
  flowDirection: string | null;
  routes: LatLngTuple[][];
  source: {
    kind: "watercourse-reference";
    label: string;
    licence: string;
    sourceVersion: string;
    source: "osm_waterway";
  };
}

export async function fetchWatercoursesForBounds(
  bounds: WatercourseBounds,
  zoom: number,
  limit = 500,
): Promise<KnownWatercourse[]> {
  const params = new URLSearchParams({
    bbox: [
      bounds.minLng,
      bounds.minLat,
      bounds.maxLng,
      bounds.maxLat,
    ].join(","),
    zoom: String(zoom),
    limit: String(limit),
    source: "osm_waterway",
  });

  const response = await fetch(`${getApiBaseUrl()}/api/watercourses?${params}`);

  if (!response.ok) {
    throw new Error(`Watercourse API failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as {
    watercourses?: KnownWatercourse[];
  };

  return Array.isArray(result.watercourses) ? result.watercourses : [];
}
