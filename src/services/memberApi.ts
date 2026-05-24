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
  photoUrl: string | null;
  role: MemberRole;
  trustLevel: MemberTrustLevel;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
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
    throw new Error(`Member API failed with HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}
