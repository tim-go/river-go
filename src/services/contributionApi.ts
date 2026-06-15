import type {
  Contribution,
  ContributionPhoto,
  ContributionStatus,
  ContributionType,
  HazardSeverity,
  LatLngTuple,
} from "../types";
import { getApiBaseUrl } from "./apiConfig";
import { getCurrentUserIdToken } from "./firebaseAuth";

export interface ApiContribution {
  id: string;
  sectionId: string | null;
  type: ContributionType;
  geometry: { type: string; coordinates: unknown } | null;
  payload: Record<string, unknown>;
  photos?: ApiContributionPhoto[];
  observedAt: string | null;
  createdAt: string;
  moderationStatus: ContributionStatus;
  visibility: "published" | "removed";
  revision: number;
  contributor: {
    id: string | null;
    displayName: string | null;
    email: string | null;
    trustLevel: string | null;
  };
}

interface ApiContributionPhoto {
  id: string;
  caption: string;
  storagePath: string | null;
  displayPath: string | null;
  thumbnailPath: string | null;
  displayUrl: string | null;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  thumbnailWidth: number | null;
  thumbnailHeight: number | null;
  sizeBytes: number | null;
  thumbnailSizeBytes: number | null;
  mimeType: string | null;
  originalName: string | null;
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

export async function fetchMapPoiContributions(
  mapPoiId: string,
): Promise<Contribution[]> {
  const authToken = await getCurrentUserIdToken();
  const headers: Record<string, string> = {};

  if (authToken) {
    headers.authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(
    `${getApiBaseUrl()}/api/map-pois/${encodeURIComponent(mapPoiId)}/contributions`,
    { headers },
  );

  if (!response.ok) {
    throw new Error(`Contribution API failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as { contributions?: ApiContribution[] };
  return (result.contributions ?? []).map(mapApiContribution);
}

export async function fetchModerationContributions(): Promise<Contribution[]> {
  const result = await fetchContributionEndpoint<{ contributions?: ApiContribution[] }>(
    "/api/moderation/contributions",
  );
  return (result.contributions ?? []).map(mapApiContribution);
}

export async function fetchMyContributions(): Promise<Contribution[]> {
  const result = await fetchContributionEndpoint<{ contributions?: ApiContribution[] }>(
    "/api/me/contributions",
  );
  return (result.contributions ?? []).map(mapApiContribution);
}

export async function deleteContribution(
  contributionId: string,
): Promise<Contribution> {
  const result = await fetchContributionEndpoint<{ contribution: ApiContribution }>(
    `/api/contributions/${encodeURIComponent(contributionId)}`,
    { method: "DELETE" },
  );
  return mapApiContribution(result.contribution);
}

// The moderator UI picks one value; the service maps it to the backend's
// two-dimension decision (approve -> publish; a reason -> remove with that reason).
export type ModerationDecision =
  | "approve"
  | "spam"
  | "inaccurate"
  | "duplicate"
  | "inappropriate";

export async function applyContributionModerationDecision(
  contributionId: string,
  action: ModerationDecision,
): Promise<Contribution> {
  const decision = action === "approve" ? "approve" : "remove";
  const reason = action === "approve" ? undefined : action;
  const result = await fetchContributionEndpoint<{ contribution: ApiContribution }>(
    `/api/moderation/contributions/${encodeURIComponent(contributionId)}/decision`,
    {
      method: "POST",
      body: JSON.stringify({ decision, reason }),
    },
  );
  return mapApiContribution(result.contribution);
}

export function mapApiContribution(contribution: ApiContribution): Contribution {
  const payload = contribution.payload ?? {};
  const dateObserved = contribution.observedAt
    ? contribution.observedAt.slice(0, 10)
    : readString(payload.dateObserved) ?? contribution.createdAt.slice(0, 10);
  const author =
    contribution.contributor.displayName ??
    contribution.contributor.email ??
    "RiverLaunch.app member";

  return {
    id: contribution.id,
    sectionId: contribution.sectionId ?? "",
    type: contribution.type,
    title: readString(payload.title) ?? contribution.type,
    detail: readString(payload.detail) ?? "",
    category: readString(payload.category) ?? contribution.type,
    severity: readSeverity(payload.severity),
    status: contribution.moderationStatus,
    visibility: contribution.visibility,
    author,
    dateObserved,
    craftType: readString(payload.craftType) ?? undefined,
    confirmations: readNumber(payload.confirmations) ?? 0,
    lastConfirmed: undefined,
    createdAt: formatRelativeDate(contribution.createdAt),
    location: mapPointGeometry(contribution.geometry),
    what3words: readString(payload.what3wordsAddress) ?? undefined,
    serverRevision: contribution.revision,
    photos: mapApiContributionPhotos(contribution.photos),
  };
}

function mapApiContributionPhotos(
  photos: ApiContributionPhoto[] | undefined,
): ContributionPhoto[] {
  return (photos ?? [])
    .map((photo) => ({
      id: photo.id,
      caption: photo.caption,
      storagePath: photo.storagePath ?? photo.displayPath ?? "",
      displayPath: photo.displayPath ?? photo.storagePath ?? "",
      thumbnailPath: photo.thumbnailPath ?? "",
      displayUrl: photo.displayUrl ?? "",
      thumbnailUrl: photo.thumbnailUrl ?? photo.displayUrl ?? "",
      width: photo.width ?? 0,
      height: photo.height ?? 0,
      thumbnailWidth: photo.thumbnailWidth ?? 0,
      thumbnailHeight: photo.thumbnailHeight ?? 0,
      sizeBytes: photo.sizeBytes ?? 0,
      thumbnailSizeBytes: photo.thumbnailSizeBytes ?? 0,
      mimeType: photo.mimeType ?? "image/jpeg",
      originalName: photo.originalName ?? undefined,
    }))
    .filter((photo) => photo.id && photo.displayUrl);
}

async function fetchContributionEndpoint<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const authToken = await getCurrentUserIdToken();

  if (!authToken) {
    throw new Error("Sign in before loading moderation data.");
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
    throw new Error(`Contribution API failed with HTTP ${response.status}`);
  }

  return (await response.json()) as T;
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
