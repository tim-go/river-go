import { getApiBaseUrl } from "./apiConfig";
import {
  mapApiContribution,
  type ApiContribution,
} from "./contributionApi";
import { getCurrentUserIdToken } from "./firebaseAuth";
import type { MemberPhoto } from "./photoApi";
import type { Contribution } from "../types";

export type MemberRole = "MEMBER" | "TRUSTED_MEMBER" | "CONTRIB_MODERATOR" | "ADMIN";
export type MemberTrustLevel = "NEW" | "KNOWN" | "TRUSTED";

export interface MemberProfile {
  id: string;
  firebaseUid: string;
  email: string | null;
  displayName: string | null;
  publicName: string | null;
  publicNameStatus: string;
  photoUrl: string | null;
  avatarImageUrl: string | null;
  avatarX: number;
  avatarPosition: number;
  avatarZoom: number;
  profilePublic: boolean;
  handle: string | null;
  bio: string | null;
  showPaddles: boolean;
  showSkills: boolean;
  showPhotos: boolean;
  role: MemberRole;
  trustLevel: MemberTrustLevel;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
  contributorTermsAcceptedAt: string | null;
  contributorTermsVersion: string | null;
}

export interface PublicProfileSettings {
  profilePublic: boolean;
  handle: string | null;
  bio: string | null;
  showPaddles: boolean;
  showSkills: boolean;
  showPhotos: boolean;
}

export interface MemberEmergencyProfile {
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  visibilityDefault: "private";
  updatedAt: string | null;
}

export interface AdminMemberDetail {
  member: MemberProfile;
  stats: {
    contributionCount: number;
    photoCount: number;
  };
  contributions: Contribution[];
  photos: MemberPhoto[];
}

export async function fetchCurrentMember(): Promise<MemberProfile> {
  return fetchMemberEndpoint<{ member: MemberProfile }>("/api/me").then(
    (result) => result.member,
  );
}

export async function updateMyProfile(input: {
  publicName: string;
}): Promise<MemberProfile> {
  return fetchMemberEndpoint<{ member: MemberProfile }>("/api/me/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  }).then((result) => result.member);
}

/** Save (or clear, with imageUrl: null) the member's profile picture + framing. */
export async function updateMyAvatar(input: {
  imageUrl: string | null;
  x?: number;
  position?: number;
  zoom?: number;
}): Promise<MemberProfile> {
  return fetchMemberEndpoint<{ member: MemberProfile }>("/api/me/avatar", {
    method: "PATCH",
    body: JSON.stringify(input),
  }).then((result) => result.member);
}

export async function updateMyPublicProfile(
  input: PublicProfileSettings,
): Promise<MemberProfile> {
  return fetchMemberEndpoint<{ member: MemberProfile }>(
    "/api/me/public-profile",
    { method: "PATCH", body: JSON.stringify(input) },
  ).then((result) => result.member);
}

export async function acceptContributorTerms(
  version: string,
): Promise<MemberProfile> {
  return fetchMemberEndpoint<{ member: MemberProfile }>(
    "/api/me/contributor-terms",
    {
      method: "POST",
      body: JSON.stringify({ version }),
    },
  ).then((result) => result.member);
}

export async function fetchMyEmergencyProfile(): Promise<MemberEmergencyProfile> {
  return fetchMemberEndpoint<{ emergencyProfile: MemberEmergencyProfile }>(
    "/api/me/emergency-profile",
  ).then((result) => result.emergencyProfile);
}

export async function saveMyEmergencyProfile(
  emergencyProfile: Pick<
    MemberEmergencyProfile,
    | "emergencyContactName"
    | "emergencyContactPhone"
    | "emergencyContactRelationship"
  >,
): Promise<MemberEmergencyProfile> {
  return fetchMemberEndpoint<{ emergencyProfile: MemberEmergencyProfile }>(
    "/api/me/emergency-profile",
    {
      method: "PUT",
      body: JSON.stringify(emergencyProfile),
    },
  ).then((result) => result.emergencyProfile);
}

export async function fetchAdminMembers(): Promise<MemberProfile[]> {
  return fetchMemberEndpoint<{ members: MemberProfile[] }>("/api/admin/members").then(
    (result) => result.members,
  );
}

export async function fetchAdminMemberDetail(
  memberId: string,
): Promise<AdminMemberDetail> {
  return fetchMemberEndpoint<{
    member: MemberProfile;
    stats?: AdminMemberDetail["stats"];
    contributions?: ApiContribution[];
    photos?: MemberPhoto[];
  }>(`/api/admin/members/${encodeURIComponent(memberId)}`).then((result) => ({
    member: result.member,
    stats: result.stats ?? {
      contributionCount: result.contributions?.length ?? 0,
      photoCount: result.photos?.length ?? 0,
    },
    contributions: (result.contributions ?? []).map(mapApiContribution),
    photos: result.photos ?? [],
  }));
}

export async function updateAdminMemberAccess(
  memberId: string,
  access: { role: MemberRole; trustLevel: MemberTrustLevel },
): Promise<MemberProfile> {
  return fetchMemberEndpoint<{ member: MemberProfile }>(
    `/api/admin/members/${encodeURIComponent(memberId)}/access`,
    {
      method: "POST",
      body: JSON.stringify(access),
    },
  ).then((result) => result.member);
}

async function fetchMemberEndpoint<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const authToken = await getCurrentUserIdToken();

  if (!authToken) {
    throw new Error("Sign in before loading member data.");
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
    let message = `Member API failed with HTTP ${response.status}`;
    try {
      const errorBody = (await response.json()) as { error?: unknown };
      if (typeof errorBody?.error === "string" && errorBody.error.trim()) {
        message = errorBody.error;
      }
    } catch {
      // Response body was not JSON; keep the generic message.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}
