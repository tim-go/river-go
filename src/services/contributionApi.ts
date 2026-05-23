import type {
  Contribution,
  ContributionStatus,
  ContributionType,
  HazardSeverity,
  LatLngTuple,
} from "../types";
import { getApiBaseUrl } from "./apiConfig";
import { getCurrentUserIdToken } from "./firebaseAuth";

interface ApiContribution {
  id: string;
  sectionId: string | null;
  type: ContributionType;
  geometry: { type: string; coordinates: unknown } | null;
  payload: Record<string, unknown>;
  observedAt: string | null;
  createdAt: string;
  moderationStatus: ContributionStatus;
  revision: number;
  contributor: {
    displayName: string | null;
    email: string | null;
  };
}

export async function fetchSectionContributions(
  sectionId: string,
): Promise<Contribution[]> {
  const authToken = await getCurrentUserIdToken();
  const headers: Record<string, string> = {};

  if (authToken) {
    headers.authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(
    `${getApiBaseUrl()}/api/sections/${encodeURIComponent(sectionId)}/contributions`,
    { headers },
  );

  if (!response.ok) {
    throw new Error(`Contribution API failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as { contributions?: ApiContribution[] };
  return (result.contributions ?? []).map(mapApiContribution);
}

function mapApiContribution(contribution: ApiContribution): Contribution {
  const payload = contribution.payload ?? {};
  const dateObserved = contribution.observedAt
    ? contribution.observedAt.slice(0, 10)
    : readString(payload.dateObserved) ?? contribution.createdAt.slice(0, 10);
  const author =
    contribution.contributor.displayName ??
    contribution.contributor.email ??
    "RiffleMap member";

  return {
    id: contribution.id,
    sectionId: contribution.sectionId ?? "",
    type: contribution.type,
    title: readString(payload.title) ?? contribution.type,
    detail: readString(payload.detail) ?? "",
    category: readString(payload.category) ?? contribution.type,
    severity: readSeverity(payload.severity),
    status: contribution.moderationStatus,
    author,
    dateObserved,
    craftType: readString(payload.craftType) ?? undefined,
    confirmations: readNumber(payload.confirmations) ?? 0,
    lastConfirmed:
      contribution.moderationStatus === "confirmed" ? "Backend verified" : undefined,
    createdAt: formatRelativeDate(contribution.createdAt),
    location: mapPointGeometry(contribution.geometry),
    serverRevision: contribution.revision,
  };
}

function mapPointGeometry(
  geometry: ApiContribution["geometry"],
): LatLngTuple | undefined {
  if (
    !geometry ||
    geometry.type !== "Point" ||
    !Array.isArray(geometry.coordinates) ||
    geometry.coordinates.length < 2
  ) {
    return undefined;
  }

  const [lng, lat] = geometry.coordinates;
  return typeof lat === "number" && typeof lng === "number" ? [lat, lng] : undefined;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readSeverity(value: unknown): HazardSeverity | undefined {
  return value === "info" ||
    value === "caution" ||
    value === "significant" ||
    value === "serious"
    ? value
    : undefined;
}

function formatRelativeDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
