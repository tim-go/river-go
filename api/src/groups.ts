import type { PoolClient } from "pg";
import { pool } from "./db.js";
import { HttpError } from "./http.js";
import { sendGroupInviteEmail } from "./email/group-emails.js";

export type GroupKind = "club" | "subgroup" | "friends" | "trip";
export type GroupVisibility = "private" | "members" | "public";
export type GroupRole = "owner" | "organiser" | "leader" | "member";
export type GroupMemberStatus =
  | "invited"
  | "requested"
  | "active"
  | "left"
  | "removed"
  | "declined";
export type GroupDiscipline = "whitewater" | "touring" | "both";
export type GroupAccessMode = "request_to_join" | "invite_only";

const GROUP_KINDS: GroupKind[] = ["club", "subgroup", "friends", "trip"];
const GROUP_VISIBILITIES: GroupVisibility[] = ["private", "members", "public"];
const GROUP_DISCIPLINES: GroupDiscipline[] = ["whitewater", "touring", "both"];
const GROUP_ACCESS_MODES: GroupAccessMode[] = [
  "request_to_join",
  "invite_only",
];
// Membership managers can invite, approve/decline requests, remove members, and
// edit group settings. Only the owner sets roles + transfers ownership. Leaders
// manage sessions (see SESSION_MANAGER_ROLES in group-sessions.ts) but NOT
// membership.
const MEMBERSHIP_MANAGER_ROLES: GroupRole[] = ["owner", "organiser"];
// Roles a member can be promoted/demoted between (owner is set via transfer).
const ASSIGNABLE_ROLES: GroupRole[] = ["organiser", "leader", "member"];

// Handle (GINV-B4): lowercase [a-z0-9-], 3–30 chars, not a reserved word.
const HANDLE_RE = /^[a-z0-9-]{3,30}$/;
const RESERVED_HANDLES = new Set([
  "new",
  "edit",
  "admin",
  "api",
  "join",
  "groups",
  "group",
  "settings",
  "me",
]);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

export interface ApiGroup {
  id: string;
  name: string;
  handle: string | null;
  kind: GroupKind;
  parentGroupId: string | null;
  description: string | null;
  discipline: GroupDiscipline | null;
  visibility: GroupVisibility;
  accessMode: GroupAccessMode;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  coverImageUrl: string | null;
  coverPosition: number;
  coverX: number;
  coverZoom: number;
  memberCount: number;
  myRole: GroupRole | null;
  myStatus: GroupMemberStatus | null;
}

/** A limited public view of a group for non-members (no member list/sessions). */
export interface ApiGroupPublic {
  id: string;
  name: string;
  handle: string | null;
  kind: GroupKind;
  description: string | null;
  discipline: GroupDiscipline | null;
  visibility: GroupVisibility;
  accessMode: GroupAccessMode;
  coverImageUrl: string | null;
  coverPosition: number;
  coverX: number;
  coverZoom: number;
  memberCount: number;
  myStatus: GroupMemberStatus | null;
}

/** A pending join request, shown to membership managers with the requester. */
export interface ApiJoinRequest {
  memberId: string;
  publicName: string;
  requestedAt: string;
}

export interface ApiInvitedMember {
  memberId: string;
  publicName: string;
  invitedAt: string;
}

export interface ApiGroupPending {
  requests: ApiJoinRequest[];
  invites: ApiInvitedMember[];
  invitedCount: number;
}

export interface ApiGroupMember {
  id: string;
  memberId: string;
  publicName: string;
  role: GroupRole;
  status: GroupMemberStatus;
  joinedAt: string;
}

export interface ApiGroupDetail extends ApiGroup {
  members: ApiGroupMember[];
}

export interface GroupInput {
  name: string;
  kind: GroupKind;
  parentGroupId: string | null;
  description: string | null;
  discipline: GroupDiscipline | null;
  visibility: GroupVisibility;
}

interface GroupRow {
  id: string;
  name: string;
  handle: string | null;
  kind: GroupKind;
  parent_group_id: string | null;
  description: string | null;
  discipline: GroupDiscipline | null;
  visibility: GroupVisibility;
  access_mode: GroupAccessMode;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  cover_image_url?: string | null;
  cover_position?: number | string | null;
  cover_x?: number | string | null;
  cover_zoom?: number | string | null;
  member_count?: string | number;
  my_role?: GroupRole | null;
  my_status?: GroupMemberStatus | null;
}

interface GroupMemberRow {
  id: string;
  member_id: string;
  public_name: string | null;
  role: GroupRole;
  status: GroupMemberStatus;
  joined_at: Date;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown): string | null {
  const text = readString(value);
  return text ? text : null;
}

function mapGroupRow(row: GroupRow): ApiGroup {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    kind: row.kind,
    parentGroupId: row.parent_group_id,
    description: row.description,
    discipline: row.discipline,
    visibility: row.visibility,
    accessMode: row.access_mode,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    coverImageUrl: row.cover_image_url ?? null,
    coverPosition: row.cover_position != null ? Number(row.cover_position) : 50,
    coverX: row.cover_x != null ? Number(row.cover_x) : 50,
    coverZoom: row.cover_zoom != null ? Number(row.cover_zoom) : 100,
    memberCount: row.member_count != null ? Number(row.member_count) : 0,
    myRole: row.my_role ?? null,
    myStatus: row.my_status ?? null,
  };
}

function mapGroupMemberRow(row: GroupMemberRow): ApiGroupMember {
  return {
    id: row.id,
    memberId: row.member_id,
    publicName: row.public_name ?? "RiverLaunch member",
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at.toISOString(),
  };
}

/** Append a membership audit row (GINV-F13). Never throws into the caller. */
async function recordMembershipEvent(
  client: PoolClient | typeof pool,
  groupId: string,
  actorMemberId: string | null,
  targetMemberId: string | null,
  action: string,
): Promise<void> {
  await client.query(
    `INSERT INTO group_membership_events
       (group_id, actor_member_id, target_member_id, action)
     VALUES ($1, $2, $3, $4)`,
    [groupId, actorMemberId, targetMemberId, action],
  );
}

/** Validate a group handle (GINV-B4); throws 400 on bad input. */
function normaliseHandle(value: unknown): string {
  const handle = readString(value).toLowerCase();
  if (!HANDLE_RE.test(handle)) {
    throw new HttpError(
      400,
      "Handle must be 3–30 characters: lowercase letters, numbers, or hyphens.",
    );
  }
  if (RESERVED_HANDLES.has(handle)) {
    throw new HttpError(400, "That handle is reserved — choose another.");
  }
  return handle;
}

export function parseGroupInput(body: unknown): GroupInput {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Group details are required.");
  }
  const record = body as Record<string, unknown>;

  const name = readString(record.name);
  if (name.length < 2) {
    throw new HttpError(400, "A group name of at least 2 characters is required.");
  }
  if (name.length > 120) {
    throw new HttpError(400, "Group name is too long.");
  }

  const kind = readString(record.kind) as GroupKind;
  if (!GROUP_KINDS.includes(kind)) {
    throw new HttpError(400, "Choose a valid group type.");
  }

  const visibilityRaw = readString(record.visibility);
  const visibility = (visibilityRaw || "private") as GroupVisibility;
  if (!GROUP_VISIBILITIES.includes(visibility)) {
    throw new HttpError(400, "Choose a valid visibility.");
  }

  const disciplineRaw = readOptionalString(record.discipline);
  const discipline =
    disciplineRaw === null ? null : (disciplineRaw as GroupDiscipline);
  if (discipline !== null && !GROUP_DISCIPLINES.includes(discipline)) {
    throw new HttpError(400, "Choose a valid discipline.");
  }

  return {
    name,
    kind,
    parentGroupId: readOptionalString(record.parentGroupId),
    description: readOptionalString(record.description),
    discipline,
    visibility,
  };
}

/** The member's membership row in a group, or null if they are not a member. */
export async function getGroupMembership(
  memberId: string,
  groupId: string,
  client: PoolClient | typeof pool = pool,
): Promise<{ role: GroupRole; status: GroupMemberStatus } | null> {
  const result = await client.query<{
    role: GroupRole;
    status: GroupMemberStatus;
  }>(
    `SELECT role, status FROM group_members
     WHERE group_id = $1 AND member_id = $2`,
    [groupId, memberId],
  );
  return result.rows[0] ?? null;
}

/** Throws 403 unless the member holds one of the given active roles. */
export async function requireGroupRole(
  memberId: string,
  groupId: string,
  roles: GroupRole[],
  client: PoolClient | typeof pool = pool,
): Promise<void> {
  const membership = await getGroupMembership(memberId, groupId, client);
  if (
    !membership ||
    membership.status !== "active" ||
    !roles.includes(membership.role)
  ) {
    throw new HttpError(403, "You do not have permission to do that.");
  }
}

/** A handle unique against existing groups, derived from a base slug. */
async function uniqueHandle(
  base: string,
  client: PoolClient | typeof pool,
): Promise<string> {
  let candidate = base.length >= 3 ? base : `group-${base}`.slice(0, 30);
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const taken = await client.query(
      `SELECT 1 FROM groups WHERE lower(handle) = $1`,
      [candidate],
    );
    if (!taken.rowCount) {
      return candidate;
    }
    suffix += 1;
    const tag = `-${suffix}`;
    candidate = `${base.slice(0, 30 - tag.length)}${tag}`;
  }
}

export async function createGroup(
  memberId: string,
  input: GroupInput,
): Promise<ApiGroup> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const handle = await uniqueHandle(slugify(input.name) || "group", client);
    const inserted = await client.query<GroupRow>(
      `INSERT INTO groups (
         name, handle, kind, parent_group_id, description, discipline,
         visibility, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, handle, kind, parent_group_id, description,
                 discipline, visibility, access_mode, created_by, created_at,
                 updated_at, cover_image_url, cover_position, cover_x, cover_zoom`,
      [
        input.name,
        handle,
        input.kind,
        input.parentGroupId,
        input.description,
        input.discipline,
        input.visibility,
        memberId,
      ],
    );
    const group = inserted.rows[0];
    await client.query(
      `INSERT INTO group_members (group_id, member_id, role, status)
       VALUES ($1, $2, 'owner', 'active')`,
      [group.id, memberId],
    );
    await recordMembershipEvent(client, group.id, memberId, memberId, "create");
    await client.query("COMMIT");
    return mapGroupRow({
      ...group,
      member_count: 1,
      my_role: "owner",
      my_status: "active",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listGroupsForMember(
  memberId: string,
  client: PoolClient | typeof pool = pool,
): Promise<ApiGroup[]> {
  const result = await client.query<GroupRow>(
    `SELECT g.id, g.name, g.handle, g.kind, g.parent_group_id, g.description,
            g.discipline, g.visibility, g.access_mode, g.created_by,
            g.created_at, g.updated_at, g.cover_image_url, g.cover_position, g.cover_x, g.cover_zoom,
            (SELECT count(*) FROM group_members gm2
               WHERE gm2.group_id = g.id AND gm2.status = 'active')
              AS member_count,
            gm.role AS my_role,
            gm.status AS my_status
     FROM groups g
     JOIN group_members gm ON gm.group_id = g.id AND gm.member_id = $1
     WHERE gm.status IN ('active', 'invited')
     ORDER BY g.updated_at DESC`,
    [memberId],
  );
  return result.rows.map(mapGroupRow);
}

export async function getGroupForMember(
  memberId: string,
  groupId: string,
  client: PoolClient | typeof pool = pool,
): Promise<ApiGroupDetail> {
  const result = await client.query<GroupRow>(
    `SELECT g.id, g.name, g.handle, g.kind, g.parent_group_id, g.description,
            g.discipline, g.visibility, g.access_mode, g.created_by,
            g.created_at, g.updated_at, g.cover_image_url, g.cover_position, g.cover_x, g.cover_zoom,
            (SELECT count(*) FROM group_members gm2
               WHERE gm2.group_id = g.id AND gm2.status = 'active')
              AS member_count,
            gm.role AS my_role,
            gm.status AS my_status
     FROM groups g
     LEFT JOIN group_members gm
       ON gm.group_id = g.id AND gm.member_id = $2
     WHERE g.id = $1`,
    [groupId, memberId],
  );
  const row = result.rows[0];
  if (!row) {
    throw new HttpError(404, "Group not found.");
  }
  // Private/members-only groups are visible only to their members. Public
  // groups can be previewed by anyone signed in.
  const isMember = row.my_status === "active" || row.my_status === "invited";
  if (!isMember && row.visibility !== "public") {
    throw new HttpError(404, "Group not found.");
  }

  // Only active members are listed by identity — pending invites are count-only
  // (GINV-B1) and join requests surface via the manager-only pending endpoint.
  const members = await client.query<GroupMemberRow>(
    `SELECT gm.id, gm.member_id, m.public_name, gm.role, gm.status, gm.joined_at
     FROM group_members gm
     JOIN members m ON m.id = gm.member_id
     WHERE gm.group_id = $1 AND gm.status = 'active'
     ORDER BY
       CASE gm.role
         WHEN 'owner' THEN 0 WHEN 'organiser' THEN 1 WHEN 'leader' THEN 2
         WHEN 'member' THEN 3 ELSE 4 END,
       m.public_name ASC`,
    [groupId],
  );

  return {
    ...mapGroupRow(row),
    members: members.rows.map(mapGroupMemberRow),
  };
}

/**
 * Invite an existing member by exact email (GINV-F2). Membership-manager only.
 * Returns a NEUTRAL result that does not reveal whether the email matched an
 * existing account (GINV-B1) — never echoes the invitee's name/id.
 */
export async function inviteMemberByEmail(
  actingMemberId: string,
  groupId: string,
  email: string,
): Promise<{ ok: true }> {
  await requireGroupRole(actingMemberId, groupId, MEMBERSHIP_MANAGER_ROLES);

  const normalised = email.trim().toLowerCase();
  if (!normalised || !normalised.includes("@")) {
    throw new HttpError(400, "Enter a valid email address.");
  }
  // TODO(GINV-B3): rate-limit invites per actor.
  const found = await pool.query<{ id: string }>(
    `SELECT id FROM members WHERE lower(email) = $1`,
    [normalised],
  );
  const target = found.rows[0];
  if (target && target.id !== actingMemberId) {
    // Upsert an invite. Don't resurrect a sticky `declined` row, and leave an
    // already-active member untouched.
    const upserted = await pool.query<{ status: GroupMemberStatus }>(
      `INSERT INTO group_members (group_id, member_id, role, status)
       VALUES ($1, $2, 'member', 'invited')
       ON CONFLICT (group_id, member_id) DO UPDATE
         SET status = CASE
               WHEN group_members.status IN ('left', 'removed') THEN 'invited'
               ELSE group_members.status END,
             updated_at = now()
       WHERE group_members.status NOT IN ('declined', 'active')
       RETURNING status`,
      [groupId, target.id],
    );
    if (upserted.rowCount) {
      await recordMembershipEvent(
        pool,
        groupId,
        actingMemberId,
        target.id,
        "invite",
      );
      // Best-effort invite email to the (registered) invitee. Fire-and-forget so
      // the neutral response is neither delayed nor affected by delivery, and we
      // never email unregistered addresses (we only get here for a real member).
      const info = await pool.query<{
        name: string;
        handle: string | null;
        inviter: string | null;
      }>(
        `SELECT g.name, g.handle, m.public_name AS inviter
         FROM groups g LEFT JOIN members m ON m.id = $2
         WHERE g.id = $1`,
        [groupId, actingMemberId],
      );
      const details = info.rows[0];
      if (details) {
        void sendGroupInviteEmail({
          toEmail: normalised,
          groupName: details.name,
          groupHandleOrId: details.handle ?? groupId,
          inviterName: details.inviter,
        }).catch(() => {
          /* delivery is best-effort; the invite itself already succeeded */
        });
      }
    }
  }
  // Always the same response, whether or not the email resolved.
  return { ok: true };
}

/** An invited member accepts (→ active) or declines (→ sticky declined). */
export async function respondToGroupInvite(
  memberId: string,
  groupId: string,
  accept: boolean,
): Promise<void> {
  const result = await pool.query(
    `UPDATE group_members
     SET status = $3, joined_at = CASE WHEN $3 = 'active' THEN now()
                                       ELSE joined_at END,
         updated_at = now()
     WHERE group_id = $1 AND member_id = $2 AND status = 'invited'`,
    [groupId, memberId, accept ? "active" : "declined"],
  );
  if (!result.rowCount) {
    throw new HttpError(404, "No pending invite for this group.");
  }
  await recordMembershipEvent(
    pool,
    groupId,
    memberId,
    memberId,
    accept ? "accept" : "decline",
  );
}

/** Request to join a group whose access mode allows it (GINV-F3/F4). */
export async function requestToJoin(
  memberId: string,
  groupId: string,
): Promise<void> {
  const group = await pool.query<{ access_mode: GroupAccessMode }>(
    `SELECT access_mode FROM groups WHERE id = $1`,
    [groupId],
  );
  if (!group.rowCount) {
    throw new HttpError(404, "Group not found.");
  }
  if (group.rows[0].access_mode !== "request_to_join") {
    throw new HttpError(403, "This group is invite only.");
  }
  const existing = await getGroupMembership(memberId, groupId);
  if (existing) {
    if (existing.status === "active") {
      throw new HttpError(400, "You are already a member.");
    }
    if (existing.status === "declined") {
      throw new HttpError(403, "You can't request to join this group.");
    }
    if (existing.status === "requested" || existing.status === "invited") {
      return; // idempotent — already pending
    }
  }
  // TODO(GINV-B3): rate-limit join requests per actor.
  await pool.query(
    `INSERT INTO group_members (group_id, member_id, role, status)
     VALUES ($1, $2, 'member', 'requested')
     ON CONFLICT (group_id, member_id) DO UPDATE
       SET status = 'requested', updated_at = now()
       WHERE group_members.status IN ('left', 'removed')`,
    [groupId, memberId],
  );
  await recordMembershipEvent(pool, groupId, memberId, memberId, "request");
}

/** Membership manager approves (→ active) or declines (→ sticky) a request. */
export async function respondToJoinRequest(
  actingMemberId: string,
  groupId: string,
  targetMemberId: string,
  approve: boolean,
): Promise<void> {
  await requireGroupRole(actingMemberId, groupId, MEMBERSHIP_MANAGER_ROLES);
  const result = await pool.query(
    `UPDATE group_members
     SET status = $3, joined_at = CASE WHEN $3 = 'active' THEN now()
                                       ELSE joined_at END,
         updated_at = now()
     WHERE group_id = $1 AND member_id = $2 AND status = 'requested'`,
    [groupId, targetMemberId, approve ? "active" : "declined"],
  );
  if (!result.rowCount) {
    throw new HttpError(404, "No pending request for this member.");
  }
  await recordMembershipEvent(
    pool,
    groupId,
    actingMemberId,
    targetMemberId,
    approve ? "approve" : "decline-request",
  );
}

/**
 * Cancel a pending invite (manager) or withdraw your own pending request/invite.
 * Returns the row to a non-pending, non-sticky state so it can recur later.
 */
export async function cancelInviteOrWithdraw(
  actingMemberId: string,
  groupId: string,
  targetMemberId: string,
): Promise<void> {
  const self = actingMemberId === targetMemberId;
  if (!self) {
    await requireGroupRole(actingMemberId, groupId, MEMBERSHIP_MANAGER_ROLES);
  }
  const result = await pool.query(
    `UPDATE group_members
     SET status = 'left', updated_at = now()
     WHERE group_id = $1 AND member_id = $2
       AND status IN ('invited', 'requested')`,
    [groupId, targetMemberId],
  );
  if (!result.rowCount) {
    throw new HttpError(404, "No pending invite or request to cancel.");
  }
  await recordMembershipEvent(
    pool,
    groupId,
    actingMemberId,
    targetMemberId,
    self ? "withdraw" : "cancel-invite",
  );
}

/** Remove (kick) a member. Membership-manager only; not the owner, not self. */
export async function removeMember(
  actingMemberId: string,
  groupId: string,
  targetMemberId: string,
): Promise<void> {
  await requireGroupRole(actingMemberId, groupId, MEMBERSHIP_MANAGER_ROLES);
  if (actingMemberId === targetMemberId) {
    throw new HttpError(400, "Use leave to remove yourself.");
  }
  const target = await getGroupMembership(targetMemberId, groupId);
  if (!target || target.status === "left" || target.status === "removed") {
    throw new HttpError(404, "That member is not in this group.");
  }
  if (target.role === "owner") {
    throw new HttpError(400, "The owner can't be removed.");
  }
  await pool.query(
    `UPDATE group_members SET status = 'removed', updated_at = now()
     WHERE group_id = $1 AND member_id = $2`,
    [groupId, targetMemberId],
  );
  await recordMembershipEvent(
    pool,
    groupId,
    actingMemberId,
    targetMemberId,
    "remove",
  );
}

/** Set a member's role (promote/demote). OWNER ONLY (GINV-B7). */
export async function setMemberRole(
  actingMemberId: string,
  groupId: string,
  targetMemberId: string,
  role: GroupRole,
): Promise<void> {
  await requireGroupRole(actingMemberId, groupId, ["owner"]);
  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw new HttpError(400, "Choose a valid role.");
  }
  if (actingMemberId === targetMemberId) {
    throw new HttpError(400, "Transfer ownership to change the owner's role.");
  }
  const target = await getGroupMembership(targetMemberId, groupId);
  if (!target || target.status !== "active") {
    throw new HttpError(404, "That member is not active in this group.");
  }
  if (target.role === "owner") {
    throw new HttpError(400, "Transfer ownership to change the owner's role.");
  }
  await pool.query(
    `UPDATE group_members SET role = $3, updated_at = now()
     WHERE group_id = $1 AND member_id = $2`,
    [groupId, targetMemberId, role],
  );
  await recordMembershipEvent(
    pool,
    groupId,
    actingMemberId,
    targetMemberId,
    `role:${role}`,
  );
}

/** Transfer ownership to another active member. OWNER ONLY (GINV-F9). */
export async function transferOwnership(
  actingMemberId: string,
  groupId: string,
  targetMemberId: string,
): Promise<void> {
  await requireGroupRole(actingMemberId, groupId, ["owner"]);
  if (actingMemberId === targetMemberId) {
    throw new HttpError(400, "You are already the owner.");
  }
  const target = await getGroupMembership(targetMemberId, groupId);
  if (!target || target.status !== "active") {
    throw new HttpError(404, "Choose an active member to transfer ownership to.");
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Demote the current owner first so the one-owner partial index is satisfied.
    await client.query(
      `UPDATE group_members SET role = 'organiser', updated_at = now()
       WHERE group_id = $1 AND member_id = $2`,
      [groupId, actingMemberId],
    );
    await client.query(
      `UPDATE group_members SET role = 'owner', updated_at = now()
       WHERE group_id = $1 AND member_id = $2`,
      [groupId, targetMemberId],
    );
    await recordMembershipEvent(
      client,
      groupId,
      actingMemberId,
      targetMemberId,
      "transfer-ownership",
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Update group settings incl. handle + access mode. Membership-manager only. */
export async function updateGroupSettings(
  actingMemberId: string,
  groupId: string,
  patch: Record<string, unknown>,
): Promise<ApiGroupDetail> {
  await requireGroupRole(actingMemberId, groupId, MEMBERSHIP_MANAGER_ROLES);

  const sets: string[] = [];
  const values: unknown[] = [];
  const add = (column: string, value: unknown) => {
    values.push(value);
    sets.push(`${column} = $${values.length + 1}`);
  };

  if ("name" in patch) {
    const name = readString(patch.name);
    if (name.length < 2 || name.length > 120) {
      throw new HttpError(400, "Enter a group name of 2–120 characters.");
    }
    add("name", name);
  }
  if ("handle" in patch) {
    const handle = normaliseHandle(patch.handle);
    const taken = await pool.query(
      `SELECT 1 FROM groups WHERE lower(handle) = $1 AND id <> $2`,
      [handle, groupId],
    );
    if (taken.rowCount) {
      throw new HttpError(409, "That handle is already taken.");
    }
    add("handle", handle);
  }
  if ("accessMode" in patch) {
    const mode = readString(patch.accessMode) as GroupAccessMode;
    if (!GROUP_ACCESS_MODES.includes(mode)) {
      throw new HttpError(400, "Choose a valid access mode.");
    }
    add("access_mode", mode);
  }
  if ("visibility" in patch) {
    const visibility = readString(patch.visibility) as GroupVisibility;
    if (!GROUP_VISIBILITIES.includes(visibility)) {
      throw new HttpError(400, "Choose a valid visibility.");
    }
    add("visibility", visibility);
  }
  if ("description" in patch) {
    add("description", readOptionalString(patch.description));
  }
  if ("coverImageUrl" in patch) {
    add("cover_image_url", readOptionalString(patch.coverImageUrl));
  }
  if ("coverImagePath" in patch) {
    add("cover_image_path", readOptionalString(patch.coverImagePath));
  }
  if ("coverPosition" in patch) {
    const raw = Number(patch.coverPosition);
    if (!Number.isFinite(raw)) {
      throw new HttpError(400, "Choose a valid cover position.");
    }
    add("cover_position", Math.min(100, Math.max(0, Math.round(raw))));
  }
  if ("coverX" in patch) {
    const raw = Number(patch.coverX);
    if (!Number.isFinite(raw)) {
      throw new HttpError(400, "Choose a valid cover position.");
    }
    add("cover_x", Math.min(100, Math.max(0, Math.round(raw))));
  }
  if ("coverZoom" in patch) {
    const raw = Number(patch.coverZoom);
    if (!Number.isFinite(raw)) {
      throw new HttpError(400, "Choose a valid cover zoom.");
    }
    add("cover_zoom", Math.min(300, Math.max(100, Math.round(raw))));
  }

  if (sets.length) {
    await pool.query(
      `UPDATE groups SET ${sets.join(", ")}, updated_at = now() WHERE id = $1`,
      [groupId, ...values],
    );
    await recordMembershipEvent(
      pool,
      groupId,
      actingMemberId,
      null,
      "settings-change",
    );
  }
  return getGroupForMember(actingMemberId, groupId);
}

/**
 * Resolve a group by id OR handle. Members get the full detail; non-members of a
 * non-public group get a LIMITED public view (no member list, no sessions).
 */
export async function getGroupByIdOrHandle(
  idOrHandle: string,
  // null for a signed-out visitor — they always get the public view.
  viewerMemberId: string | null,
): Promise<
  | { access: "member"; group: ApiGroupDetail }
  | { access: "public"; group: ApiGroupPublic }
> {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrHandle,
    );
  const lookup = await pool.query<{
    id: string;
    my_status: GroupMemberStatus | null;
  }>(
    `SELECT g.id, gm.status AS my_status
     FROM groups g
     LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.member_id = $2
     WHERE ${isUuid ? "g.id = $1" : "lower(g.handle) = lower($1)"}`,
    [idOrHandle, viewerMemberId],
  );
  const found = lookup.rows[0];
  if (!found) {
    throw new HttpError(404, "Group not found.");
  }
  const isMember =
    found.my_status === "active" || found.my_status === "invited";
  if (isMember && viewerMemberId) {
    return {
      access: "member",
      group: await getGroupForMember(viewerMemberId, found.id),
    };
  }
  const publicRow = await pool.query<GroupRow>(
    `SELECT g.id, g.name, g.handle, g.kind, g.parent_group_id, g.description,
            g.discipline, g.visibility, g.access_mode, g.created_by,
            g.created_at, g.updated_at, g.cover_image_url, g.cover_position, g.cover_x, g.cover_zoom,
            (SELECT count(*) FROM group_members gm2
               WHERE gm2.group_id = g.id AND gm2.status = 'active')
              AS member_count
     FROM groups g WHERE g.id = $1`,
    [found.id],
  );
  const row = publicRow.rows[0];
  return {
    access: "public",
    group: {
      id: row.id,
      name: row.name,
      handle: row.handle,
      kind: row.kind,
      description: row.description,
      discipline: row.discipline,
      visibility: row.visibility,
      accessMode: row.access_mode,
      coverImageUrl: row.cover_image_url ?? null,
      coverPosition:
        row.cover_position != null ? Number(row.cover_position) : 50,
      coverX: row.cover_x != null ? Number(row.cover_x) : 50,
      coverZoom: row.cover_zoom != null ? Number(row.cover_zoom) : 100,
      memberCount: row.member_count != null ? Number(row.member_count) : 0,
      myStatus: found.my_status ?? null,
    },
  };
}

/** Manager view of pending invites (count) and join requests (with identity). */
export async function listPending(
  actingMemberId: string,
  groupId: string,
): Promise<ApiGroupPending> {
  await requireGroupRole(actingMemberId, groupId, MEMBERSHIP_MANAGER_ROLES);
  const requests = await pool.query<{
    member_id: string;
    public_name: string | null;
    updated_at: Date;
  }>(
    `SELECT gm.member_id, m.public_name, gm.updated_at
     FROM group_members gm
     JOIN members m ON m.id = gm.member_id
     WHERE gm.group_id = $1 AND gm.status = 'requested'
     ORDER BY gm.updated_at ASC`,
    [groupId],
  );
  const invited = await pool.query<{
    member_id: string;
    public_name: string | null;
    updated_at: Date;
  }>(
    `SELECT gm.member_id, m.public_name, gm.updated_at
     FROM group_members gm
     JOIN members m ON m.id = gm.member_id
     WHERE gm.group_id = $1 AND gm.status = 'invited'
     ORDER BY gm.updated_at ASC`,
    [groupId],
  );
  const invites = invited.rows.map((row) => ({
    memberId: row.member_id,
    publicName: row.public_name ?? "RiverLaunch member",
    invitedAt: row.updated_at.toISOString(),
  }));
  return {
    requests: requests.rows.map((row) => ({
      memberId: row.member_id,
      publicName: row.public_name ?? "RiverLaunch member",
      requestedAt: row.updated_at.toISOString(),
    })),
    invites,
    invitedCount: invites.length,
  };
}

export async function leaveGroup(
  memberId: string,
  groupId: string,
): Promise<void> {
  const membership = await getGroupMembership(memberId, groupId);
  if (!membership || membership.status === "left") {
    throw new HttpError(404, "You are not in this group.");
  }
  if (membership.role === "owner") {
    const owners = await pool.query<{ count: string }>(
      `SELECT count(*) FROM group_members
       WHERE group_id = $1 AND role = 'owner' AND status = 'active'`,
      [groupId],
    );
    if (Number(owners.rows[0]?.count ?? 0) <= 1) {
      throw new HttpError(
        400,
        "Transfer ownership before leaving — you are the only owner.",
      );
    }
  }
  await pool.query(
    `UPDATE group_members SET status = 'left', updated_at = now()
     WHERE group_id = $1 AND member_id = $2`,
    [groupId, memberId],
  );
  await recordMembershipEvent(pool, groupId, memberId, memberId, "leave");
}
