import { getApiBaseUrl } from "./apiConfig";

export type SectionLevelBand =
  | "low"
  | "normal"
  | "high"
  | "very-high"
  | "unknown";

export interface SectionLevelState {
  sectionId: string;
  band: SectionLevelBand;
  parameter: string;
  unit: string | null;
  value: number | null;
  observedAt: string | null;
  /** Fraction of the gauge's own recent history below the current reading (0..1). */
  percentile: number | null;
  sampleSize: number;
}

export async function fetchSectionLevelStates(): Promise<SectionLevelState[]> {
  const response = await fetch(`${getApiBaseUrl()}/api/sections/level-states`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Level-state API failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as { levelStates?: SectionLevelState[] };
  return result.levelStates ?? [];
}

export interface RiverLevelState {
  riverId: string;
  band: SectionLevelBand;
  parameter: string;
  unit: string | null;
  value: number | null;
  observedAt: string | null;
  percentile: number | null;
  sampleSize: number;
}

export async function fetchRiverLevelStates(): Promise<RiverLevelState[]> {
  const response = await fetch(`${getApiBaseUrl()}/api/rivers/level-states`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`River level-state API failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as {
    riverLevelStates?: RiverLevelState[];
  };
  return result.riverLevelStates ?? [];
}

export interface RiverLevelLine {
  riverId: string;
  band: SectionLevelBand;
  value: number | null;
  unit: string | null;
  lines: [number, number][][];
}

export async function fetchRiverLevelLines(): Promise<RiverLevelLine[]> {
  const response = await fetch(`${getApiBaseUrl()}/api/rivers/level-lines`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`River level-lines API failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as {
    riverLevelLines?: RiverLevelLine[];
  };
  return result.riverLevelLines ?? [];
}

// Honest blue-intensity palette — "how much water" relative to the gauge's own
// history: light (low) → deep navy (very-high). No green=go / red=stop verdict.
// Unknown (no live primary gauge or too little history) renders neutral grey.
export function levelBandColor(band: SectionLevelBand | undefined): string {
  switch (band) {
    case "low":
      return "#3b82f6";
    case "normal":
      return "#14b8a6";
    case "high":
      return "#ffd60a";
    case "very-high":
      return "#f97316";
    default:
      return "#64748b";
  }
}

export const LEVEL_BAND_LABELS: Record<SectionLevelBand, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  "very-high": "Very high",
  unknown: "No data",
};

export interface Station {
  stationId: string;
  name: string;
  provider: string;
  parameter: string;
  lat: number;
  lng: number;
  value: number | null;
  unit: string | null;
  observedAt: string | null;
  band: SectionLevelBand;
  percentile: number | null;
  sampleSize: number;
  paddlerGauge: boolean;
}

export async function fetchStations(): Promise<Station[]> {
  const response = await fetch(`${getApiBaseUrl()}/api/stations`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Stations API failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as { stations?: Station[] };
  return result.stations ?? [];
}
