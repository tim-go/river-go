import type { LatLngTuple } from "../types";
import { getApiBaseUrl } from "./apiConfig";

export interface What3WordsAddress {
  configured: boolean;
  words: string | null;
  nearestPlace?: string;
  country?: string;
}

export interface What3WordsCoordinates {
  configured: boolean;
  coordinates: { lat: number; lng: number } | null;
  words?: string;
  nearestPlace?: string;
  country?: string;
}

export function googleMapsDirectionsUrl(location: LatLngTuple) {
  return `https://www.google.com/maps/dir/?api=1&destination=${location[0]},${location[1]}&travelmode=driving`;
}

export function googleMapsSearchUrl(location: LatLngTuple) {
  return `https://www.google.com/maps/search/?api=1&query=${location[0]},${location[1]}`;
}

export async function fetchWhat3WordsAddress(
  location: LatLngTuple,
): Promise<What3WordsAddress> {
  const params = new URLSearchParams({
    lat: String(location[0]),
    lng: String(location[1]),
  });
  const url = `${getApiBaseUrl()}/api/locations/what3words?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`what3words lookup failed with HTTP ${response.status}`);
  }

  return (await response.json()) as What3WordsAddress;
}

export async function fetchCoordinatesForWhat3Words(
  words: string,
): Promise<What3WordsCoordinates> {
  const params = new URLSearchParams({
    words,
  });
  const url = `${getApiBaseUrl()}/api/locations/what3words?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`what3words lookup failed with HTTP ${response.status}`);
  }

  return (await response.json()) as What3WordsCoordinates;
}

export function formatWhat3Words(words: string) {
  return words.startsWith("///") ? words : `///${words}`;
}
