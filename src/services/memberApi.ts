import { getApiBaseUrl } from "./apiConfig";
import { getCurrentUserIdToken } from "./firebaseAuth";

export type MemberRole = "MEMBER" | "ADMIN" | "CONTRIB_ADMIN";

export interface MemberProfile {
  id: string;
  firebaseUid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  role: MemberRole;
  trustLevel: string;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
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

async function fetchMemberEndpoint<T>(path: string): Promise<T> {
  const authToken = await getCurrentUserIdToken();

  if (!authToken) {
    throw new Error("Sign in before loading member data.");
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: {
      authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Member API failed with HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}
