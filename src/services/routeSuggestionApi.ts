import type { LatLngTuple } from "../types";
import { getApiBaseUrl } from "./apiConfig";
import { getCurrentUserIdToken } from "./firebaseAuth";

export type RouteSuggestionStatus =
  | "local-draft"
  | "pending-review"
  | "needs-info"
  | "approved"
  | "rejected"
  | "hidden";

export type RouteSuggestionDecision =
  | "approve"
  | "request-review"
  | "needs-info"
  | "reject"
  | "hide";

export interface RouteSuggestion {
  id: string;
  riverName: string;
  sectionName: string;
  difficulty: string;
  summary: string;
  accessNotes: string;
  evidence: string;
  route: LatLngTuple[];
  status: RouteSuggestionStatus;
  author: string;
  createdAt: string;
  updatedAt?: string;
  revision?: number;
}

interface ApiRouteSuggestion {
  id: string;
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

export async function createRouteSuggestion(
  suggestion: Omit<
    RouteSuggestion,
    "id" | "status" | "author" | "createdAt" | "updatedAt" | "revision"
  >,
): Promise<RouteSuggestion> {
  const result = await fetchRouteSuggestionEndpoint<{
    routeSuggestion: ApiRouteSuggestion;
  }>("/api/route-suggestions", {
    method: "POST",
    body: JSON.stringify(suggestion),
  });

  return mapApiRouteSuggestion(result.routeSuggestion);
}

export async function fetchMyRouteSuggestions(): Promise<RouteSuggestion[]> {
  const result = await fetchRouteSuggestionEndpoint<{
    routeSuggestions?: ApiRouteSuggestion[];
  }>("/api/me/route-suggestions");
  return (result.routeSuggestions ?? []).map(mapApiRouteSuggestion);
}

export async function fetchModerationRouteSuggestions(): Promise<
  RouteSuggestion[]
> {
  const result = await fetchRouteSuggestionEndpoint<{
    routeSuggestions?: ApiRouteSuggestion[];
  }>("/api/moderation/route-suggestions");
  return (result.routeSuggestions ?? []).map(mapApiRouteSuggestion);
}

export async function applyRouteSuggestionDecision(
  routeSuggestionId: string,
  decision: RouteSuggestionDecision,
): Promise<RouteSuggestion> {
  const result = await fetchRouteSuggestionEndpoint<{
    routeSuggestion: ApiRouteSuggestion;
  }>(
    `/api/moderation/route-suggestions/${encodeURIComponent(
      routeSuggestionId,
    )}/decision`,
    {
      method: "POST",
      body: JSON.stringify({ decision }),
    },
  );

  return mapApiRouteSuggestion(result.routeSuggestion);
}

async function fetchRouteSuggestionEndpoint<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const authToken = await getCurrentUserIdToken();

  if (!authToken) {
    throw new Error("Sign in before saving route suggestions.");
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
    throw new Error(`Route suggestion API failed with HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

function mapApiRouteSuggestion(
  suggestion: ApiRouteSuggestion,
): RouteSuggestion {
  return {
    id: suggestion.id,
    riverName: suggestion.riverName,
    sectionName: suggestion.sectionName,
    difficulty: suggestion.difficulty,
    summary: suggestion.summary,
    accessNotes: suggestion.accessNotes,
    evidence: suggestion.evidence,
    route: suggestion.route,
    status: normaliseStatus(suggestion.status),
    author:
      suggestion.contributor.displayName ??
      suggestion.contributor.email ??
      "RiverLaunch.app member",
    createdAt: suggestion.createdAt,
    updatedAt: suggestion.updatedAt,
    revision: suggestion.revision,
  };
}

function normaliseStatus(status: string): RouteSuggestionStatus {
  if (status === "pending_review") return "pending-review";
  if (status === "needs_info") return "needs-info";
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "hidden") return "hidden";
  return "local-draft";
}
