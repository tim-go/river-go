import { getApiBaseUrl } from "./apiConfig";
import type { LatLngTuple } from "../types";

export interface RiverPhoto {
  id: string;
  contributionId: string;
  caption: string;
  displayUrl: string | null;
  thumbnailUrl: string | null;
  originalName: string | null;
  // POI link + location: the map draws standalone photos (no mapPoiId) as pins;
  // POI-linked ones are represented by the POI's camera badge instead.
  mapPoiId: string | null;
  location: LatLngTuple | null;
  author: { displayName: string | null };
}

interface ApiRiverPhoto {
  id: string;
  contributionId: string;
  caption: string;
  displayUrl: string | null;
  thumbnailUrl: string | null;
  originalName: string | null;
  mapPoiId: string | null;
  geometry: { type: string; coordinates: [number, number] } | null;
  author: { displayName: string | null };
}

export async function fetchRiverPhotos(riverId: string): Promise<RiverPhoto[]> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/rivers/${encodeURIComponent(riverId)}/photos`,
  );

  if (!response.ok) {
    throw new Error(`River photos API failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as { photos?: ApiRiverPhoto[] };
  return (result.photos ?? []).map((photo) => ({
    id: photo.id,
    contributionId: photo.contributionId,
    caption: photo.caption,
    displayUrl: photo.displayUrl,
    thumbnailUrl: photo.thumbnailUrl,
    originalName: photo.originalName,
    mapPoiId: photo.mapPoiId,
    location: photo.geometry
      ? [photo.geometry.coordinates[1], photo.geometry.coordinates[0]]
      : null,
    author: photo.author,
  }));
}
