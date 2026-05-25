import type { LatLngTuple } from "../types";
import { getApiBaseUrl } from "./apiConfig";

interface ApiRouteOverride {
  routeSource: string;
  routeId: string;
  route: LatLngTuple[];
  metadata?: RouteOverrideMetadata;
  sourceRouteAdjustmentId: string | null;
  appliedAt: string;
  revision: number;
}

export interface RouteOverrideMetadata {
  riverName?: string;
  sectionName?: string;
  summary?: string;
  accessNotes?: string;
  difficulty?: string;
}

export interface RouteOverride {
  routeSource: string;
  routeId: string;
  route: LatLngTuple[];
  metadata?: RouteOverrideMetadata;
  sourceRouteAdjustmentId: string | null;
  appliedAt: string;
  revision: number;
}

export async function fetchRouteOverrides(): Promise<RouteOverride[]> {
  const response = await fetch(`${getApiBaseUrl()}/api/route-overrides`);

  if (!response.ok) {
    throw new Error(`Route override API failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as {
    routeOverrides?: ApiRouteOverride[];
  };

  return (result.routeOverrides ?? []).filter(
    (override) => override.routeSource === "section_fixture" && override.route.length >= 2,
  );
}
