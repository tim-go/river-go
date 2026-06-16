import { getApiBaseUrl } from "./apiConfig";

export interface RiverPhoto {
  id: string;
  caption: string;
  displayUrl: string | null;
  thumbnailUrl: string | null;
  originalName: string | null;
  author: { displayName: string | null };
}

export async function fetchRiverPhotos(riverId: string): Promise<RiverPhoto[]> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/rivers/${encodeURIComponent(riverId)}/photos`,
  );

  if (!response.ok) {
    throw new Error(`River photos API failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as { photos?: RiverPhoto[] };
  return result.photos ?? [];
}
