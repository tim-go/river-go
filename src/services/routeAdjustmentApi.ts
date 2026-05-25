import type { LatLngTuple } from "../types";
import { getApiBaseUrl } from "./apiConfig";
import { getCurrentUserIdToken } from "./firebaseAuth";
import type { RouteSuggestionDecision } from "./routeSuggestionApi";

export type RouteAdjustmentTargetType = "section" | "route_suggestion";

export type RouteAdjustmentStatus =
  | "pending-review"
  | "needs-info"
  | "approved"
  | "rejected"
  | "hidden";

export type RouteAdjustmentDecision = RouteSuggestionDecision;

export interface RouteAdjustment {
  id: string;
  targetType: RouteAdjustmentTargetType;
  targetId: string;
  riverName: string;
  sectionName: string;
  difficulty: string;
  summary: string;
  accessNotes: string;
  evidence: string;
  route: LatLngTuple[];
  status: RouteAdjustmentStatus;
  author: string;
  createdAt: string;
  updatedAt?: string;
  revision?: number;
}

interface ApiRouteAdjustment {
  id: string;
  targetType: RouteAdjustmentTargetType;
  targetId: string;
  riverName: string;
  sectionName: string;
  difficulty: string;
  summary: string;
  accessNotes: string;
  evidence: string;
  route: LatLngTuple[];
  status: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  contributor: {
    id: string | null;
    displayName: string | null;
    email: string | null;
    trustLevel: string | null;
  };
}

export async function createRouteAdjustment(
  adjustment: Omit<
    RouteAdjustment,
    "id" | "status" | "author" | "createdAt" | "updatedAt" | "revision"
  >,
): Promise<RouteAdjustment> {
  const result = await fetchRouteAdjustmentEndpoint<{
    routeAdjustment: ApiRouteAdjustment;
  }>("/api/moderation/route-adjustments", {
    method: "POST",
    body: JSON.stringify(adjustment),
  });

  return mapApiRouteAdjustment(result.routeAdjustment);
}

export async function fetchModerationRouteAdjustments(): Promise<
  RouteAdjustment[]
> {
  const result = await fetchRouteAdjustmentEndpoint<{
    routeAdjustments?: ApiRouteAdjustment[];
  }>("/api/moderation/route-adjustments");
  return (result.routeAdjustments ?? []).map(mapApiRouteAdjustment);
}

export async function applyRouteAdjustmentDecision(
  routeAdjustmentId: string,
  decision: RouteAdjustmentDecision,
): Promise<RouteAdjustment> {
  const result = await fetchRouteAdjustmentEndpoint<{
    routeAdjustment: ApiRouteAdjustment;
  }>(
    `/api/moderation/route-adjustments/${encodeURIComponent(
      routeAdjustmentId,
    )}/decision`,
    {
      method: "POST",
      body: JSON.stringify({ decision }),
    },
  );

  return mapApiRouteAdjustment(result.routeAdjustment);
}

async function fetchRouteAdjustmentEndpoint<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const authToken = await getCurrentUserIdToken();

  if (!authToken) {
    throw new Error("Sign in before managing route adjustments.");
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${authToken}`,
    },
    method: options.method ?? "GET",
  });

  if (!response.ok) {
    throw new Error(`Route adjustment API failed with HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

function mapApiRouteAdjustment(adjustment: ApiRouteAdjustment): RouteAdjustment {
  return {
    id: adjustment.id,
    targetType: adjustment.targetType,
    targetId: adjustment.targetId,
    riverName: adjustment.riverName,
    sectionName: adjustment.sectionName,
    difficulty: adjustment.difficulty,
    summary: adjustment.summary,
    accessNotes: adjustment.accessNotes,
    evidence: adjustment.evidence,
    route: adjustment.route,
    status: normaliseStatus(adjustment.status),
    author:
      adjustment.contributor.displayName ??
      adjustment.contributor.email ??
      "RiverLaunch.app moderator",
    createdAt: adjustment.createdAt,
    updatedAt: adjustment.updatedAt,
    revision: adjustment.revision,
  };
}

function normaliseStatus(status: string): RouteAdjustmentStatus {
  if (status === "pending_review") return "pending-review";
  if (status === "needs_info") return "needs-info";
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  return "hidden";
}
