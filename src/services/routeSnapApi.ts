import type { LatLngTuple } from "../types";
import { getApiBaseUrl } from "./apiConfig";
import { getCurrentUserIdToken } from "./firebaseAuth";

export interface RouteSnapResult {
  route: LatLngTuple[];
  matchedPoints: number;
  totalPoints: number;
  averageDistanceM: number | null;
  maxDistanceM: number | null;
  confidence: "none" | "low" | "medium" | "high";
  warnings: string[];
  source: {
    kind: "watercourse-reference";
    label: string;
    licence: string;
  };
}

export async function snapRouteToWatercourses(
  route: LatLngTuple[],
  maxDistanceM = 250,
): Promise<RouteSnapResult> {
  const authToken = await getCurrentUserIdToken();

  if (!authToken) {
    throw new Error("Sign in before snapping route traces.");
  }

  const response = await fetch(`${getApiBaseUrl()}/api/routes/snap`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ route, maxDistanceM }),
  });

  if (!response.ok) {
    throw new Error(`Route snap API failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as { snap?: RouteSnapResult };

  if (!result.snap) {
    throw new Error("Route snap API returned no snap result.");
  }

  return result.snap;
}
