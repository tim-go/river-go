import type { PoolClient } from "pg";
import { pool } from "./db.js";
import { HttpError } from "./http.js";

export type GroupKind = "club" | "subgroup" | "friends" | "trip";
export type GroupVisibility = "private" | "members" | "public";
export type GroupRole = "owner" | "organiser" | "leader" | "member" | "guest";
export type GroupMemberStatus = "invited" | "active" | "left";
export type GroupDiscipline = "whitewater" | "touring" | "both";

const GROUP_KINDS: GroupKind[] = ["club", "subgroup", "friends", "trip"];
const GROUP_VISIBILITIES: GroupVisibility[] = ["private", "members", "public"];
const GROUP_ROLES: GroupRole[] = [
  "owner",
  "organiser",
  "leader",
  "member",
  "guest",
];
const GROUP_DISCIPLINES: GroupDiscipline[] = ["whitewater", "touring", "both"];
// Roles allowed to manage a group (edit, invite, set roles, run sessions).
const GROUP_MANAGER_ROLES: GroupRole[] = ["owner", "organiser", "leader"];

export interface ApiGroup {
  id: string;
  name: string;
  kind: GroupKind;
  parentGroupId: string | null;
  description: string | null;
  discipline: GroupDiscipline | null;
  visibility: GroupVisibility;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  myRole: GroupRole | null;
  myStatus: GroupMemberStatus | null;
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
  kind: GroupKind;
  parent_group_id: string | null;
  description: string | null;
  discipline: GroupDiscipline | null;
  visibility: GroupVisibility;
  created_by: string;
  created_at: Date;
  updated_at: Date;
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
    kind: row.kind,
    parentGroupId: row.parent_group_id,
    description: row.description,
    discipline: row.discipline,
    visibility: row.visibility,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
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

export async function createGroup(
  memberId: string,
  input: GroupInput,
): Promise<ApiGroup> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query<GroupRow>(
      `INSERT INTO groups (
         name, kind, parent_group_id, description, discipline, visibility,
         created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, kind, parent_group_id, description, discipline,
                 visibility, created_by, created_at, updated_at`,
      [
        input.name,
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
    `SELECT g.id, g.name, g.kind, g.parent_group_id, g.description,
            g.discipline, g.visibility, g.created_by, g.created_at, g.updated_at,
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
    `SELECT g.id, g.name, g.kind, g.parent_group_id, g.description,
            g.discipline, g.visibility, g.created_by, g.created_at, g.updated_at,
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

  const members = await client.query<GroupMemberRow>(
    `SELECT gm.id, gm.member_id, m.public_name, gm.role, gm.status, gm.joined_at
     FROM group_members gm
     JOIN members m ON m.id = gm.member_id
     WHERE gm.group_id = $1 AND gm.status <> 'left'
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

export async function addGroupMember(
  actingMemberId: string,
  groupId: string,
  targetMemberId: string,
  role: GroupRole = "member",
): Promise<ApiGroupMember> {
  if (!GROUP_ROLES.includes(role) || role === "owner") {
    throw new HttpError(400, "Choose a valid role to invite.");
  }
  await requireGroupRole(actingMemberId, groupId, GROUP_MANAGER_ROLES);

  const result = await pool.query<GroupMemberRow>(
    `INSERT INTO group_members (group_id, member_id, role, status)
     VALUES ($1, $2, $3, 'invited')
     ON CONFLICT (group_id, member_id) DO UPDATE
       SET status = CASE WHEN group_members.status = 'left'
                         THEN 'invited' ELSE group_members.status END,
           updated_at = now()
     RETURNING id, member_id, role, status, joined_at`,
    [groupId, targetMemberId, role],
  );
  const inserted = result.rows[0];
  const named = await pool.query<{ public_name: string | null }>(
    `SELECT public_name FROM members WHERE id = $1`,
    [targetMemberId],
  );
  return mapGroupMemberRow({
    ...inserted,
    public_name: named.rows[0]?.public_name ?? null,
  });
}

/** An invited member accepts (status active) or declines (status left). */
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
    [groupId, memberId, accept ? "active" : "left"],
  );
  if (!result.rowCount) {
    throw new HttpError(404, "No pending invite for this group.");
  }
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
}

/** Lightweight member lookup for inviting people to a group. */
export async function searchInvitableMembers(
  query: string,
  excludeMemberId: string,
): Promise<{ id: string; publicName: string }[]> {
  const term = query.trim();
  if (term.length < 2) {
    return [];
  }
  const result = await pool.query<{ id: string; public_name: string | null }>(
    `SELECT id, public_name FROM members
     WHERE id <> $2 AND public_name IS NOT NULL
       AND public_name ILIKE '%' || $1 || '%'
     ORDER BY public_name ASC
     LIMIT 10`,
    [term, excludeMemberId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    publicName: row.public_name ?? "RiverLaunch member",
  }));
}
