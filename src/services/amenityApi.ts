import { getApiBaseUrl } from "./apiConfig";

export interface Amenity {
  id: string;
  category: string;
  name: string | null;
  lat: number;
  lng: number;
  // Nearest featured river (canonical_rivers.id); used to scope amenities to a
  // focused river. Null if none in range.
  riverId: string | null;
}

export async function fetchAmenities(): Promise<Amenity[]> {
  const response = await fetch(`${getApiBaseUrl()}/api/amenities`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Amenities API failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as { amenities?: Amenity[] };
  return result.amenities ?? [];
}
