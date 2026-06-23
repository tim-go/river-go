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

// Honest blue-intensity palette — "how much water" relative to the gauge's own
// history: light (low) → deep navy (very-high). No green=go / red=stop verdict.
// Unknown (no live primary gauge or too little history) renders neutral grey.
export function levelBandColor(band: SectionLevelBand | undefined): string {
  switch (band) {
    case "low":
      return "#22d3ee";
    case "normal":
      return "#3b82f6";
    case "high":
      return "#4f46e5";
    case "very-high":
      return "#312e81";
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
