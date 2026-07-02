import type { LatLngTuple } from "../types";
import { getApiBaseUrl } from "./apiConfig";
import { getCurrentUserIdToken } from "./firebaseAuth";

// Canonical community-promoted sections (public reads). "routes" is internal
// vocabulary here to match the backend module; every user-facing surface
// calls these "sections". See docs/development/plan-community-sections.md.
export interface CommunitySection {
  id: string;
  name: string;
  riverName: string | null;
  riverId: string | null;
  grade: string | null;
  summary: string | null;
  accessSummary: string | null;
  conditionsSummary: string | null;
  evidenceStatus: string;
  route: LatLngTuple[];
  distanceKm: number | null;
  sourceRouteSuggestionId: string | null;
  createdAt: string;
  updatedAt: string;
  attribution: {
    submittedBy: string | null;
    promotedBy: string | null;
  };
}

interface ApiRoute {
  id: string;
  name: string;
  riverName: string | null;
  routeType: string;
  riverId: string | null;
  status: string;
  evidenceStatus: string;
  grade: string | null;
  summary: string | null;
  accessSummary: string | null;
  conditionsSummary: string | null;
  route: LatLngTuple[];
  geometrySource: string;
  distanceKm: number | null;
  sourceRouteSuggestionId: string | null;
  createdAt: string;
  updatedAt: string;
  revision: number;
  attribution: {
    submittedBy: string | null;
    promotedBy: string | null;
  };
}

export async function fetchPublicSections(
  riverId?: string,
): Promise<CommunitySection[]> {
  const query = riverId ? `?river=${encodeURIComponent(riverId)}` : "";
  const response = await fetch(`${getApiBaseUrl()}/api/routes${query}`);

  if (!response.ok) {
    throw new Error(`Sections API failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as { routes?: ApiRoute[] };
  return (result.routes ?? []).map(mapApiRoute);
}

export async function promoteRouteSuggestionToSection(
  routeSuggestionId: string,
): Promise<CommunitySection> {
  const authToken = await getCurrentUserIdToken();

  if (!authToken) {
    throw new Error("Sign in before promoting a section.");
  }

  const response = await fetch(
    `${getApiBaseUrl()}/api/moderation/route-suggestions/${encodeURIComponent(
      routeSuggestionId,
    )}/promote`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${authToken}`,
      },
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? `Promote failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as { route: ApiRoute };
  return mapApiRoute(result.route);
}

function mapApiRoute(route: ApiRoute): CommunitySection {
  return {
    id: route.id,
    name: route.name,
    riverName: route.riverName,
    riverId: route.riverId,
    grade: route.grade,
    summary: route.summary,
    accessSummary: route.accessSummary,
    conditionsSummary: route.conditionsSummary,
    evidenceStatus: route.evidenceStatus,
    route: route.route,
    distanceKm: route.distanceKm,
    sourceRouteSuggestionId: route.sourceRouteSuggestionId,
    createdAt: route.createdAt,
    updatedAt: route.updatedAt,
    attribution: route.attribution,
  };
}
