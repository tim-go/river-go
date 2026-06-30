import type {
  Group,
  GroupAccessMode,
  GroupDetail,
  GroupDiscipline,
  GroupKind,
  GroupPending,
  GroupRole,
  GroupSession,
  GroupView,
  GroupVisibility,
  Rsvp,
  SessionDetail,
  SessionStatus,
} from "../types";
import { getApiBaseUrl } from "./apiConfig";
import { getCurrentUserIdToken } from "./firebaseAuth";

async function authedFetch<T>(
  path: string,
  options: RequestInit = {},
  // Public endpoints (e.g. viewing a group entity page signed-out) send no auth.
  allowAnonymous = false,
): Promise<T> {
  const authToken = await getCurrentUserIdToken();
  if (!authToken && !allowAnonymous) {
    throw new Error("Sign in to use groups.");
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
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

/** Resolve a group by id or handle. Member access returns full detail. */
export async function fetchGroup(idOrHandle: string): Promise<GroupView> {
  const result = await authedFetch<{
    group: GroupView["group"];
    access: GroupView["access"];
  }>(`/api/groups/${encodeURIComponent(idOrHandle)}`, {}, true);
  return { access: result.access, group: result.group } as GroupView;
}

/** Invite an existing member by exact email. Neutral response (GINV-B1). */
export async function inviteByEmail(
  groupId: string,
  email: string,
): Promise<void> {
  await authedFetch(`/api/groups/${encodeURIComponent(groupId)}/invites`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/** Cancel a pending invite (manager) / withdraw your own request. */
export async function cancelInviteOrWithdraw(
  groupId: string,
  memberId: string,
): Promise<void> {
  await authedFetch(
    `/api/groups/${encodeURIComponent(groupId)}/invites/${encodeURIComponent(
      memberId,
    )}`,
    { method: "DELETE" },
  );
}

export async function requestToJoin(groupId: string): Promise<void> {
  await authedFetch(`/api/groups/${encodeURIComponent(groupId)}/requests`, {
    method: "POST",
  });
}

export async function respondToRequest(
  groupId: string,
  memberId: string,
  approve: boolean,
): Promise<void> {
  await authedFetch(
    `/api/groups/${encodeURIComponent(groupId)}/requests/${encodeURIComponent(
      memberId,
    )}`,
    { method: "POST", body: JSON.stringify({ approve }) },
  );
}

export async function fetchPending(groupId: string): Promise<GroupPending> {
  const result = await authedFetch<{ pending: GroupPending }>(
    `/api/groups/${encodeURIComponent(groupId)}/pending`,
  );
  return result.pending;
}

export async function removeMember(
  groupId: string,
  memberId: string,
): Promise<void> {
  await authedFetch(
    `/api/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(
      memberId,
    )}`,
    { method: "DELETE" },
  );
}

export async function setMemberRole(
  groupId: string,
  memberId: string,
  role: GroupRole,
): Promise<void> {
  await authedFetch(
    `/api/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(
      memberId,
    )}`,
    { method: "PATCH", body: JSON.stringify({ role }) },
  );
}

export async function transferOwnership(
  groupId: string,
  memberId: string,
): Promise<void> {
  await authedFetch(
    `/api/groups/${encodeURIComponent(groupId)}/transfer-ownership`,
    { method: "POST", body: JSON.stringify({ memberId }) },
  );
}

export interface GroupSettingsPatch {
  name?: string;
  handle?: string;
  accessMode?: GroupAccessMode;
  visibility?: GroupVisibility;
  description?: string | null;
  coverImageUrl?: string | null;
  coverImagePath?: string | null;
  coverPosition?: number;
  coverZoom?: number;
}

export async function updateGroupSettings(
  groupId: string,
  patch: GroupSettingsPatch,
): Promise<GroupDetail> {
  const result = await authedFetch<{ group: GroupDetail }>(
    `/api/groups/${encodeURIComponent(groupId)}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
  return result.group;
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
