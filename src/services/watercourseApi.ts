import type { LatLngTuple } from "../types";
import { getApiBaseUrl } from "./apiConfig";
import { getCurrentUserIdToken } from "./firebaseAuth";

export interface WatercourseBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface KnownWatercourse {
  id: string;
  name: string | null;
  watercourseType: string;
  form: string | null;
  flowDirection: string | null;
  hints: {
    access: string | null;
    boat: string | null;
    canoe: string | null;
    operator: string | null;
    tidal: string | null;
    intermittent: string | null;
    lock: string | null;
    lockName: string | null;
    tunnel: string | null;
    bridge: string | null;
    towpath: string | null;
    wikidata: string | null;
    wikipedia: string | null;
  };
  routes: LatLngTuple[][];
  source: {
    kind: "watercourse-reference";
    label: string;
    licence: string;
    sourceVersion: string;
    source: "osm_waterway";
  };
}

export interface WatercourseImportStatus {
  source: "osm_waterway";
  sourceVersion: string;
  licence: string;
  featureCount: number;
  namedFeatureCount: number;
  latestUpdatedAt: string | null;
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

export async function searchWatercourses(
  query: string,
  limit = 20,
): Promise<KnownWatercourse[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    source: "osm_waterway",
  });

  const response = await fetch(
    `${getApiBaseUrl()}/api/watercourses/search?${params}`,
  );

  if (!response.ok) {
    throw new Error(`Watercourse search failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as {
    watercourses?: KnownWatercourse[];
  };

  return Array.isArray(result.watercourses) ? result.watercourses : [];
}

export async function fetchWatercourseImportStatus(): Promise<
  WatercourseImportStatus[]
> {
  const authToken = await getCurrentUserIdToken();

  if (!authToken) {
    throw new Error("Sign in before loading seed data status.");
  }

  const response = await fetch(
    `${getApiBaseUrl()}/api/admin/watercourses/status`,
    {
      headers: {
        Accept: "application/json",
        authorization: `Bearer ${authToken}`,
      },
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Watercourse status failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as {
    watercourseImports?: WatercourseImportStatus[];
  };

  return Array.isArray(result.watercourseImports)
    ? result.watercourseImports
    : [];
}
