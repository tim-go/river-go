import type {
  LatLngTuple,
  MapPoi,
  MapPoiKind,
  MapPoiVerificationStatus,
  SourceConfidence,
  SourceKind,
} from "../types";
import { getApiBaseUrl } from "./apiConfig";
import { getCurrentUserIdToken } from "./firebaseAuth";

interface ApiMapPoi {
  id: string;
  sectionId: string;
  kind: MapPoiKind;
  geometry: { type: string; coordinates: unknown };
  title: string;
  subtitle: string;
  summary: string;
  source: {
    kind: string | null;
    label: string | null;
    confidence: string | null;
    updatedAt: string | null;
    url: string | null;
  };
  verificationStatus: MapPoiVerificationStatus;
  confirmations: number;
  corrections: number;
  viewerReview?: {
    confirmed: boolean;
    suggestedCorrection: boolean;
    correctionNote?: string | null;
  };
  payload: Record<string, unknown>;
  revision: number;
  updatedAt: string;
}

export type MapPoiReviewDecision = "confirm" | "correction";

export interface MapPoiCorrectionReview {
  id: string;
  poi: MapPoi;
  note: string;
  createdAt: string;
  reviewer: {
    id: string | null;
    displayName: string | null;
    email: string | null;
    trustLevel: string | null;
  };
}

interface ApiMapPoiCorrectionReview {
  id: string;
  poi: ApiMapPoi;
  note: string;
  createdAt: string;
  reviewer: MapPoiCorrectionReview["reviewer"];
}

export async function fetchSectionMapPois(sectionId: string): Promise<MapPoi[]> {
  const authToken = await getCurrentUserIdToken();
  const headers: Record<string, string> = {};

  if (authToken) {
    headers.authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(
    `${getApiBaseUrl()}/api/sections/${encodeURIComponent(sectionId)}/map-pois`,
    { headers },
  );

  if (!response.ok) {
    throw new Error(`Map POI API failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as { pois?: ApiMapPoi[] };
  return (result.pois ?? []).reduce<MapPoi[]>((pois, apiPoi) => {
    const poi = mapApiMapPoi(apiPoi);

    if (poi) {
      pois.push(poi);
    }

    return pois;
  }, []);
}

export async function fetchRiverMapPois(riverId: string): Promise<MapPoi[]> {
  const authToken = await getCurrentUserIdToken();
  const headers: Record<string, string> = {};

  if (authToken) {
    headers.authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(
    `${getApiBaseUrl()}/api/rivers/${encodeURIComponent(riverId)}/map-pois`,
    { headers },
  );

  if (!response.ok) {
    throw new Error(`River map POI API failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as { pois?: ApiMapPoi[] };
  return (result.pois ?? []).reduce<MapPoi[]>((pois, apiPoi) => {
    const poi = mapApiMapPoi(apiPoi);

    if (poi) {
      pois.push(poi);
    }

    return pois;
  }, []);
}

export async function reviewMapPoi(
  poiId: string,
  decision: MapPoiReviewDecision,
  action: "add" | "remove" = "add",
  note?: string,
): Promise<MapPoi> {
  const authToken = await getCurrentUserIdToken();

  if (!authToken) {
    throw new Error("Sign in before reviewing map points.");
  }

  const response = await fetch(
    `${getApiBaseUrl()}/api/map-pois/${encodeURIComponent(poiId)}/reviews`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ decision, action, note }),
    },
  );

  if (!response.ok) {
    throw new Error(`Map POI review failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as { poi: ApiMapPoi };
  const poi = mapApiMapPoi(result.poi);

  if (!poi) {
    throw new Error("Map POI review returned an invalid point.");
  }

  return poi;
}

export async function fetchModerationMapPoiReviews(): Promise<
  MapPoiCorrectionReview[]
> {
  const result = await fetchMapPoiEndpoint<{ reviews?: ApiMapPoiCorrectionReview[] }>(
    "/api/moderation/map-poi-reviews",
  );

  return (result.reviews ?? []).reduce<MapPoiCorrectionReview[]>((reviews, item) => {
    const poi = mapApiMapPoi(item.poi);

    if (poi) {
      reviews.push({
        id: item.id,
        poi,
        note: item.note,
        createdAt: item.createdAt,
        reviewer: item.reviewer,
      });
    }

    return reviews;
  }, []);
}

export async function updateMapPoiVerificationStatus(
  poiId: string,
  status: MapPoiVerificationStatus,
): Promise<MapPoi> {
  const result = await fetchMapPoiEndpoint<{ poi: ApiMapPoi }>(
    `/api/moderation/map-pois/${encodeURIComponent(poiId)}/verification`,
    {
      method: "POST",
      body: JSON.stringify({ status }),
    },
  );
  const poi = mapApiMapPoi(result.poi);

  if (!poi) {
    throw new Error("Map POI verification returned an invalid point.");
  }

  return poi;
}

async function fetchMapPoiEndpoint<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const authToken = await getCurrentUserIdToken();

  if (!authToken) {
    throw new Error("Sign in before loading map point moderation data.");
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
    throw new Error(`Map POI API failed with HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

function mapApiMapPoi(poi: ApiMapPoi): MapPoi | null {
  const location = mapPointGeometry(poi.geometry);

  if (!location) {
    return null;
  }

  return {
    id: poi.id,
    sectionId: poi.sectionId,
    kind: poi.kind,
    title: poi.title,
    subtitle: poi.subtitle,
    summary: poi.summary,
    location,
    source:
      poi.source.kind || poi.source.label || poi.source.confidence
        ? {
            kind: normaliseSourceKind(poi.source.kind),
            label: poi.source.label ?? "Backend seed data",
            confidence: normaliseSourceConfidence(poi.source.confidence),
            updatedAt: poi.source.updatedAt ?? poi.updatedAt,
            notes: "Backend-backed map point.",
            url: poi.source.url ?? undefined,
          }
        : undefined,
    verificationStatus: poi.verificationStatus,
    confirmations: poi.confirmations,
    corrections: poi.corrections,
    viewerReview: poi.viewerReview,
    payload: poi.payload ?? {},
    revision: poi.revision,
    updatedAt: poi.updatedAt,
  };
}

function mapPointGeometry(
  geometry: ApiMapPoi["geometry"],
): LatLngTuple | null {
  if (
    geometry.type !== "Point" ||
    !Array.isArray(geometry.coordinates) ||
    geometry.coordinates.length < 2
  ) {
    return null;
  }

  const [lng, lat] = geometry.coordinates;
  return typeof lat === "number" && typeof lng === "number" ? [lat, lng] : null;
}

function normaliseSourceKind(value: string | null): SourceKind {
  return value === "seed" ||
    value === "open-data" ||
    value === "community" ||
    value === "provider" ||
    value === "derived"
    ? value
    : "seed";
}

function normaliseSourceConfidence(value: string | null): SourceConfidence {
  return value === "seed" ||
    value === "low" ||
    value === "medium" ||
    value === "high"
    ? value
    : "low";
}
