import type {
  Group,
  GroupDetail,
  GroupDiscipline,
  GroupKind,
  GroupMember,
  GroupRole,
  GroupSession,
  GroupVisibility,
  InvitableMember,
  Rsvp,
  SessionDetail,
  SessionStatus,
} from "../types";
import { getApiBaseUrl } from "./apiConfig";
import { getCurrentUserIdToken } from "./firebaseAuth";

async function authedFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const authToken = await getCurrentUserIdToken();
  if (!authToken) {
    throw new Error("Sign in to use groups.");
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    let message = `Groups API failed with HTTP ${response.status}`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data?.error) {
        message = data.error;
      }
    } catch {
      // keep the default message
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export interface GroupDraft {
  name: string;
  kind: GroupKind;
  discipline?: GroupDiscipline | null;
  visibility?: GroupVisibility;
  description?: string | null;
}

export interface SessionDraft {
  groupId: string;
  title: string;
  riverId?: string | null;
  sectionId?: string | null;
  venue?: string | null;
  scheduledFor?: string | null;
  meetingPoint?: string | null;
  meetingAt?: string | null;
  notes?: string | null;
}

// --- Groups ---

export async function fetchGroups(): Promise<Group[]> {
  const result = await authedFetch<{ groups?: Group[] }>("/api/me/groups");
  return result.groups ?? [];
}

export async function createGroup(draft: GroupDraft): Promise<Group> {
  const result = await authedFetch<{ group: Group }>("/api/me/groups", {
    method: "POST",
    body: JSON.stringify(draft),
  });
  return result.group;
}

export async function fetchGroup(groupId: string): Promise<GroupDetail> {
  const result = await authedFetch<{ group: GroupDetail }>(
    `/api/groups/${encodeURIComponent(groupId)}`,
  );
  return result.group;
}

export async function inviteGroupMember(
  groupId: string,
  memberId: string,
  role: GroupRole = "member",
): Promise<GroupMember> {
  const result = await authedFetch<{ member: GroupMember }>(
    `/api/groups/${encodeURIComponent(groupId)}/members`,
    { method: "POST", body: JSON.stringify({ memberId, role }) },
  );
  return result.member;
}

export async function respondToGroupInvite(
  groupId: string,
  accept: boolean,
): Promise<void> {
  await authedFetch(
    `/api/groups/${encodeURIComponent(groupId)}/invite-response`,
    { method: "POST", body: JSON.stringify({ accept }) },
  );
}

export async function leaveGroup(groupId: string): Promise<void> {
  await authedFetch(`/api/groups/${encodeURIComponent(groupId)}/leave`, {
    method: "POST",
  });
}

export async function searchMembers(query: string): Promise<InvitableMember[]> {
  if (query.trim().length < 2) {
    return [];
  }
  const result = await authedFetch<{ members?: InvitableMember[] }>(
    `/api/members/search?q=${encodeURIComponent(query.trim())}`,
  );
  return result.members ?? [];
}

// --- Sessions ---

export async function fetchSessions(): Promise<GroupSession[]> {
  const result = await authedFetch<{ sessions?: GroupSession[] }>(
    "/api/me/sessions",
  );
  return result.sessions ?? [];
}

export async function createSession(draft: SessionDraft): Promise<GroupSession> {
  const result = await authedFetch<{ session: GroupSession }>(
    "/api/me/sessions",
    { method: "POST", body: JSON.stringify(draft) },
  );
  return result.session;
}

export async function fetchSession(sessionId: string): Promise<SessionDetail> {
  const result = await authedFetch<{ session: SessionDetail }>(
    `/api/sessions/${encodeURIComponent(sessionId)}`,
  );
  return result.session;
}

export async function setSessionRsvp(
  sessionId: string,
  rsvp: Rsvp,
  availabilityNote?: string | null,
): Promise<void> {
  await authedFetch(`/api/sessions/${encodeURIComponent(sessionId)}/rsvp`, {
    method: "POST",
    body: JSON.stringify({ rsvp, availabilityNote: availabilityNote ?? null }),
  });
}

export async function setSessionCheckIn(
  sessionId: string,
  checkedIn: boolean,
  memberId?: string,
): Promise<void> {
  await authedFetch(`/api/sessions/${encodeURIComponent(sessionId)}/check-in`, {
    method: "POST",
    body: JSON.stringify({ checkedIn, memberId }),
  });
}

export async function setSessionStatus(
  sessionId: string,
  status: SessionStatus,
  outcome?: { outcomeNotes?: string | null; outcomeLevelNote?: string | null },
): Promise<GroupSession> {
  const result = await authedFetch<{ session: GroupSession }>(
    `/api/sessions/${encodeURIComponent(sessionId)}/status`,
    { method: "POST", body: JSON.stringify({ status, ...outcome }) },
  );
  return result.session;
}

export async function setSessionIceConsent(
  sessionId: string,
  consent: boolean,
): Promise<void> {
  await authedFetch(
    `/api/sessions/${encodeURIComponent(sessionId)}/ice-consent`,
    { method: "POST", body: JSON.stringify({ consent }) },
  );
}
