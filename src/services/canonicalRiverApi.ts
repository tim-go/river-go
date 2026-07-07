import type { LatLngTuple } from "../types";
import { getApiBaseUrl } from "./apiConfig";
import { getCurrentUserIdToken } from "./firebaseAuth";

export type SourceCandidatePoiStatus =
  | "review_needed"
  | "confirmed"
  | "rejected"
  | "merged";

export interface CanonicalRiverSummary {
  id: string;
  canonicalName: string;
  displayName: string;
  country: string;
  region: string;
  riverType: string;
  nation: string | null;
  discipline: string | null;
  grade: string | null;
  run: string | null;
  summary: string;
  centre: LatLngTuple;
  bbox: [number, number, number, number];
  sourceConfidence: string;
  curationStatus: string;
  sectionCount: number;
  candidatePoiCount: number;
  reviewNeededCandidatePoiCount: number;
  updatedAt: string;
}

export interface CanonicalRiverDetail extends CanonicalRiverSummary {
  sectionLinks: Array<{
    sectionId: string;
    routeSource: string;
    relationshipType: string;
    status: string;
    confidence: string;
  }>;
  candidatePoiCountsByType: Record<string, number>;
}

export interface SourceCandidatePoi {
  id: string;
  riverId: string | null;
  riverDisplayName: string | null;
  source: string;
  sourceId: string;
  sourceVersion: string;
  sourceUrl: string;
  licence: string;
  candidateType: string;
  title: string;
  status: SourceCandidatePoiStatus;
  location: LatLngTuple | null;
  rawProperties: Record<string, unknown>;
  sourceMetadata: Record<string, unknown>;
  updatedAt: string;
}

// Add-time river attribution (docs/specs/discovery/river-attribution.md).
export interface NearestRiver {
  id: string;
  displayName: string;
  meters: number;
}
export interface NearestRiversResult {
  nearest: NearestRiver[];
  selected: NearestRiver | null;
}

// Nearest featured rivers to a dropped point, plus the currently-selected
// river's distance (so we can tell if the point is within its corridor).
export async function fetchNearestRivers(
  location: LatLngTuple,
  opts: { riverId?: string | null; limit?: number } = {},
): Promise<NearestRiversResult> {
  const [lat, lng] = location;
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.riverId) params.set("riverId", opts.riverId);
  const response = await fetch(
    `${getApiBaseUrl()}/api/rivers/nearest?${params.toString()}`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) {
    throw new Error(`Nearest-rivers API failed with HTTP ${response.status}`);
  }
  return (await response.json()) as NearestRiversResult;
}

export async function fetchCanonicalRivers(): Promise<CanonicalRiverSummary[]> {
  const response = await fetch(`${getApiBaseUrl()}/api/rivers`);

  if (!response.ok) {
    throw new Error(`River API failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as { rivers?: CanonicalRiverSummary[] };
  return result.rivers ?? [];
}

export async function fetchCanonicalRiver(
  riverId: string,
): Promise<CanonicalRiverDetail> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/rivers/${encodeURIComponent(riverId)}`,
  );

  if (!response.ok) {
    throw new Error(`River detail API failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as { river?: CanonicalRiverDetail };

  if (!result.river) {
    throw new Error("River detail API returned no river.");
  }

  return result.river;
}

export async function fetchSourceCandidatePois(input: {
  riverId?: string;
  status?: SourceCandidatePoiStatus | "all";
  limit?: number;
} = {}): Promise<SourceCandidatePoi[]> {
  const searchParams = new URLSearchParams();

  if (input.riverId) {
    searchParams.set("riverId", input.riverId);
  }

  if (input.status) {
    searchParams.set("status", input.status);
  }

  if (input.limit) {
    searchParams.set("limit", String(input.limit));
  }

  const result = await fetchModerationRiverEndpoint<{
    candidates?: SourceCandidatePoi[];
  }>(
    `/api/moderation/source-candidate-pois${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`,
  );

  return result.candidates ?? [];
}

export async function updateSourceCandidatePoiStatus(
  candidateId: string,
  status: SourceCandidatePoiStatus,
  note?: string,
): Promise<SourceCandidatePoi> {
  const result = await fetchModerationRiverEndpoint<{
    candidate?: SourceCandidatePoi;
  }>(
    `/api/moderation/source-candidate-pois/${encodeURIComponent(
      candidateId,
    )}/status`,
    {
      method: "POST",
      body: JSON.stringify({ status, note }),
    },
  );

  if (!result.candidate) {
    throw new Error("Candidate POI status update returned no candidate.");
  }

  return result.candidate;
}

async function fetchModerationRiverEndpoint<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const authToken = await getCurrentUserIdToken();

  if (!authToken) {
    throw new Error("Sign in before loading source candidate POIs.");
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${authToken}`,
    },
    method: options.method ?? "GET",
  });

  if (!response.ok) {
    throw new Error(`Canonical river API failed with HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}
