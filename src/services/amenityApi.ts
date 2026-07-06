import { getApiBaseUrl } from "./apiConfig";

export interface Amenity {
  id: string;
  // Id in the shared `pois` index (`amenity:<source_id>`) — the shared detail
  // surface and contribution targeting use this, not the uuid `id`.
  poiId: string;
  category: string;
  name: string | null;
  lat: number;
  lng: number;
  // Nearest featured river (canonical_rivers.id); used to scope amenities to a
  // focused river. Null if none in range.
  riverId: string | null;
  // Whether a published photo is attached — drives the marker's photo badge.
  hasPhotos: boolean;
}

export async function fetchAmenities(riverId?: string): Promise<Amenity[]> {
  const query = riverId ? `?riverId=${encodeURIComponent(riverId)}` : "";
  const response = await fetch(`${getApiBaseUrl()}/api/amenities${query}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Amenities API failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as { amenities?: Amenity[] };
  return result.amenities ?? [];
}
