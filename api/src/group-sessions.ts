import type { PoolClient } from "pg";
import { pool } from "./db.js";
import { HttpError } from "./http.js";
import {
  type GroupRole,
  getGroupMembership,
  requireGroupRole,
} from "./groups.js";
import {
  type CoverageCheck,
  type ParticipantCapabilities,
  computeSessionCoverage,
} from "./session-coverage.js";

export type SessionStatus = "planned" | "active" | "completed" | "cancelled";
export type Rsvp = "invited" | "yes" | "no" | "maybe";

const RSVPS: Rsvp[] = ["invited", "yes", "no", "maybe"];
const SESSION_STATUSES: SessionStatus[] = [
  "planned",
  "active",
  "completed",
  "cancelled",
];
// Roles that can run a session (edit, manage participants, lifecycle).
const SESSION_MANAGER_ROLES: GroupRole[] = ["owner", "organiser", "leader"];

export interface ApiGroupSession {
  id: string;
  groupId: string;
  groupName: string | null;
  title: string;
  riverId: string | null;
  sectionId: string | null;
  venue: string | null;
  scheduledFor: string | null;
  meetingPoint: string | null;
  meetingAt: string | null;
  notes: string | null;
  organiserId: string;
  status: SessionStatus;
  startedAt: string | null;
  endedAt: string | null;
  outcomeNotes: string | null;
  outcomeLevelNote: string | null;
  createdAt: string;
  updatedAt: string;
  participantCount: number;
  myRsvp: Rsvp | null;
  myCheckedIn: boolean;
  myIceConsent: boolean;
}

export interface ApiSessionParticipant {
  id: string;
  memberId: string;
  publicName: string;
  rsvp: Rsvp;
  availabilityNote: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  checkedInBy: string | null;
  iceConsent: boolean;
  ice: {
    name: string | null;
    phone: string | null;
    relationship: string | null;
  } | null;
}

export interface ApiSessionDetail extends ApiGroupSession {
  myGroupRole: GroupRole | null;
  participants: ApiSessionParticipant[];
  advisory: CoverageCheck[];
  iceVisible: boolean;
}

export interface SessionInput {
  groupId: string;
  title: string;
  riverId: string | null;
  sectionId: string | null;
  venue: string | null;
  scheduledFor: string | null;
  meetingPoint: string | null;
  meetingAt: string | null;
  notes: string | null;
}

interface SessionRow {
  id: string;
  group_id: string;
  group_name?: string | null;
  title: string;
  river_id: string | null;
  section_id: string | null;
  venue: string | null;
  scheduled_for: Date | null;
  meeting_point: string | null;
  meeting_at: Date | null;
  notes: string | null;
  organiser_id: string;
  status: SessionStatus;
  started_at: Date | null;
  ended_at: Date | null;
  outcome_notes: string | null;
  outcome_level_note: string | null;
  created_at: Date;
  updated_at: Date;
  participant_count?: string | number;
  my_rsvp?: Rsvp | null;
  my_checked_in_at?: Date | null;
  my_ice_consent?: boolean;
}

interface ParticipantRow {
  id: string;
  member_id: string;
  public_name: string | null;
  rsvp: Rsvp;
  availability_note: string | null;
  checked_in_at: Date | null;
  checked_out_at: Date | null;
  checked_in_by: string | null;
  ice_consent: boolean;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown): string | null {
  const text = readString(value);
  return text ? text : null;
}

function readOptionalTimestamp(value: unknown): string | null {
  const text = readString(value);
  if (!text) {
    return null;
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, "A valid date/time is required.");
  }
  return parsed.toISOString();
}

function isoOrNull(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function mapSessionRow(row: SessionRow): ApiGroupSession {
  return {
    id: row.id,
    groupId: row.group_id,
    groupName: row.group_name ?? null,
    title: row.title,
    riverId: row.river_id,
    sectionId: row.section_id,
    venue: row.venue,
    scheduledFor: isoOrNull(row.scheduled_for),
    meetingPoint: row.meeting_point,
    meetingAt: isoOrNull(row.meeting_at),
    notes: row.notes,
    organiserId: row.organiser_id,
    status: row.status,
    startedAt: isoOrNull(row.started_at),
    endedAt: isoOrNull(row.ended_at),
    outcomeNotes: row.outcome_notes,
    outcomeLevelNote: row.outcome_level_note,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    participantCount:
      row.participant_count != null ? Number(row.participant_count) : 0,
    myRsvp: row.my_rsvp ?? null,
    myCheckedIn: Boolean(row.my_checked_in_at),
    myIceConsent: Boolean(row.my_ice_consent),
  };
}

function mapParticipantRow(row: ParticipantRow): ApiSessionParticipant {
  return {
    id: row.id,
    memberId: row.member_id,
    publicName: row.public_name ?? "RiverLaunch member",
    rsvp: row.rsvp,
    availabilityNote: row.availability_note,
    checkedInAt: isoOrNull(row.checked_in_at),
    checkedOutAt: isoOrNull(row.checked_out_at),
    checkedInBy: row.checked_in_by,
    iceConsent: row.ice_consent,
    ice: null,
  };
}

const SESSION_SELECT = `
  s.id, s.group_id, s.title, s.river_id, s.section_id, s.venue,
  s.scheduled_for, s.meeting_point, s.meeting_at, s.notes, s.organiser_id,
  s.status, s.started_at, s.ended_at, s.outcome_notes, s.outcome_level_note,
  s.created_at, s.updated_at`;

export function parseSessionInput(body: unknown): SessionInput {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Session details are required.");
  }
  const record = body as Record<string, unknown>;

  const groupId = readString(record.groupId);
  if (!groupId) {
    throw new HttpError(400, "A group is required to plan a session.");
  }
  const title = readString(record.title);
  if (title.length < 2) {
    throw new HttpError(400, "A session title is required.");
  }
  if (title.length > 160) {
    throw new HttpError(400, "Session title is too long.");
  }

  return {
    groupId,
    title,
    riverId: readOptionalString(record.riverId),
    sectionId: readOptionalString(record.sectionId),
    venue: readOptionalString(record.venue),
    scheduledFor: readOptionalTimestamp(record.scheduledFor),
    meetingPoint: readOptionalString(record.meetingPoint),
    meetingAt: readOptionalTimestamp(record.meetingAt),
    notes: readOptionalString(record.notes),
  };
}

async function getSessionRow(
  sessionId: string,
  client: PoolClient | typeof pool = pool,
): Promise<SessionRow> {
  const result = await client.query<SessionRow>(
    `SELECT ${SESSION_SELECT} FROM group_sessions s WHERE s.id = $1`,
    [sessionId],
  );
  const row = result.rows[0];
  if (!row) {
    throw new HttpError(404, "Session not found.");
  }
  return row;
}

/** The acting member must be a manager (owner/organiser/leader) of the
 *  session's group. Returns the session row. */
async function requireSessionManager(
  memberId: string,
  sessionId: string,
): Promise<SessionRow> {
  const session = await getSessionRow(sessionId);
  await requireGroupRole(memberId, session.group_id, SESSION_MANAGER_ROLES);
  return session;
}

/** The acting member must be an active member of the session's group. */
async function requireSessionGroupMember(
  memberId: string,
  sessionId: string,
): Promise<SessionRow> {
  const session = await getSessionRow(sessionId);
  const membership = await getGroupMembership(memberId, session.group_id);
  if (!membership || membership.status !== "active") {
    throw new HttpError(403, "Join the group to take part in this session.");
  }
  return session;
}

export async function createSession(
  memberId: string,
  input: SessionInput,
): Promise<ApiGroupSession> {
  await requireGroupRole(memberId, input.groupId, SESSION_MANAGER_ROLES);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query<SessionRow>(
      `INSERT INTO group_sessions (
         group_id, title, river_id, section_id, venue, scheduled_for,
         meeting_point, meeting_at, notes, organiser_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING ${SESSION_SELECT.replaceAll("s.", "")}`,
      [
        input.groupId,
        input.title,
        input.riverId,
        input.sectionId,
        input.venue,
        input.scheduledFor,
        input.meetingPoint,
        input.meetingAt,
        input.notes,
        memberId,
      ],
    );
    const session = inserted.rows[0];
    // The organiser is a participant by default and counts as attending.
    await client.query(
      `INSERT INTO session_participants (session_id, member_id, rsvp)
       VALUES ($1, $2, 'yes')`,
      [session.id, memberId],
    );
    await client.query("COMMIT");
    return mapSessionRow({
      ...session,
      participant_count: 1,
      my_rsvp: "yes",
      my_checked_in_at: null,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listSessionsForMember(
  memberId: string,
  client: PoolClient | typeof pool = pool,
): Promise<ApiGroupSession[]> {
  const result = await client.query<SessionRow>(
    `SELECT ${SESSION_SELECT}, g.name AS group_name,
            (SELECT count(*) FROM session_participants sp2
               WHERE sp2.session_id = s.id) AS participant_count,
            sp.rsvp AS my_rsvp,
            sp.checked_in_at AS my_checked_in_at,
            sp.ice_consent AS my_ice_consent
     FROM group_sessions s
     JOIN groups g ON g.id = s.group_id
     JOIN group_members gm
       ON gm.group_id = s.group_id AND gm.member_id = $1 AND gm.status = 'active'
     LEFT JOIN session_participants sp
       ON sp.session_id = s.id AND sp.member_id = $1
     ORDER BY s.scheduled_for DESC NULLS LAST, s.created_at DESC`,
    [memberId],
  );
  return result.rows.map(mapSessionRow);
}

export async function getSessionForMember(
  memberId: string,
  sessionId: string,
): Promise<ApiSessionDetail> {
  const session = await getSessionRow(sessionId);
  const membership = await getGroupMembership(memberId, session.group_id);
  if (!membership || membership.status === "left") {
    throw new HttpError(404, "Session not found.");
  }

  const enriched = await pool.query<SessionRow>(
    `SELECT ${SESSION_SELECT}, g.name AS group_name,
            (SELECT count(*) FROM session_participants sp2
               WHERE sp2.session_id = s.id) AS participant_count,
            sp.rsvp AS my_rsvp,
            sp.checked_in_at AS my_checked_in_at,
            sp.ice_consent AS my_ice_consent
     FROM group_sessions s
     JOIN groups g ON g.id = s.group_id
     LEFT JOIN session_participants sp
       ON sp.session_id = s.id AND sp.member_id = $2
     WHERE s.id = $1`,
    [sessionId, memberId],
  );

  // Session-scoped ICE reveal (GROUP-F6): an organiser/leader sees the
  // emergency contact of participants who consented, only while the session is
  // live (planned/active). When it completes or cancels, visibility closes.
  const iceVisible =
    SESSION_MANAGER_ROLES.includes(membership.role) &&
    (session.status === "planned" || session.status === "active");

  const participantRows = await pool.query<
    ParticipantRow & {
      emergency_contact_name: string | null;
      emergency_contact_phone: string | null;
      emergency_contact_relationship: string | null;
    }
  >(
    `SELECT sp.id, sp.member_id, m.public_name, sp.rsvp, sp.availability_note,
            sp.checked_in_at, sp.checked_out_at, sp.checked_in_by, sp.ice_consent,
            ${
              iceVisible
                ? "ep.emergency_contact_name, ep.emergency_contact_phone, ep.emergency_contact_relationship"
                : "NULL AS emergency_contact_name, NULL AS emergency_contact_phone, NULL AS emergency_contact_relationship"
            }
     FROM session_participants sp
     JOIN members m ON m.id = sp.member_id
     ${
       iceVisible
         ? "LEFT JOIN member_emergency_profiles ep ON ep.member_id = sp.member_id"
         : ""
     }
     WHERE sp.session_id = $1
     ORDER BY m.public_name ASC`,
    [sessionId],
  );

  const participants = participantRows.rows.map((row) => {
    const mapped = mapParticipantRow(row);
    if (iceVisible && row.ice_consent) {
      mapped.ice = {
        name: row.emergency_contact_name,
        phone: row.emergency_contact_phone,
        relationship: row.emergency_contact_relationship,
      };
    }
    return mapped;
  });

  const advisory = await computeAdvisoryForSession(sessionId);

  return {
    ...mapSessionRow(enriched.rows[0] ?? session),
    myGroupRole: membership.role,
    participants,
    advisory,
    iceVisible,
  };
}

/** Aggregate kit/skills advisory coverage across a session's prospective
 *  participants (those who have not declined). Counts only — no individual
 *  detail is exposed. */
async function computeAdvisoryForSession(
  sessionId: string,
): Promise<CoverageCheck[]> {
  const result = await pool.query<{
    member_id: string;
    text: string;
    kind: "kit" | "skill";
  }>(
    `SELECT sp.member_id, lower(k.category || ' ' || k.name) AS text,
            'kit' AS kind
       FROM session_participants sp
       JOIN kit_items k ON k.member_id = sp.member_id
       WHERE sp.session_id = $1 AND sp.rsvp <> 'no'
     UNION ALL
     SELECT sp.member_id, lower(s.category || ' ' || s.name) AS text,
            'skill' AS kind
       FROM session_participants sp
       JOIN member_skills s ON s.member_id = sp.member_id
       WHERE sp.session_id = $1 AND sp.rsvp <> 'no'`,
    [sessionId],
  );

  const byMember = new Map<string, ParticipantCapabilities>();
  for (const row of result.rows) {
    let entry = byMember.get(row.member_id);
    if (!entry) {
      entry = { memberId: row.member_id, kit: [], skills: [] };
      byMember.set(row.member_id, entry);
    }
    if (row.kind === "kit") {
      entry.kit.push(row.text);
    } else {
      entry.skills.push(row.text);
    }
  }
  return computeSessionCoverage([...byMember.values()]);
}

/** A group member RSVPs to a session (joining as a participant). */
export async function setSessionRsvp(
  memberId: string,
  sessionId: string,
  rsvp: Rsvp,
  availabilityNote: string | null,
): Promise<void> {
  if (!RSVPS.includes(rsvp)) {
    throw new HttpError(400, "Choose a valid RSVP.");
  }
  await requireSessionGroupMember(memberId, sessionId);
  await pool.query(
    `INSERT INTO session_participants
       (session_id, member_id, rsvp, availability_note)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (session_id, member_id) DO UPDATE
       SET rsvp = EXCLUDED.rsvp,
           availability_note = EXCLUDED.availability_note,
           updated_at = now()`,
    [sessionId, memberId, rsvp, availabilityNote],
  );
}

/** Check a participant in. Self check-in, or organiser-manual for another
 *  participant who has no phone/signal/battery. */
export async function checkInParticipant(
  actingMemberId: string,
  sessionId: string,
  targetMemberId: string,
  checkedIn: boolean,
): Promise<void> {
  if (actingMemberId !== targetMemberId) {
    await requireSessionManager(actingMemberId, sessionId);
  } else {
    await requireSessionGroupMember(actingMemberId, sessionId);
  }
  const result = await pool.query(
    checkedIn
      ? `UPDATE session_participants
         SET checked_in_at = now(), checked_out_at = NULL,
             checked_in_by = $3, updated_at = now()
         WHERE session_id = $1 AND member_id = $2`
      : `UPDATE session_participants
         SET checked_out_at = now(), updated_at = now()
         WHERE session_id = $1 AND member_id = $2`,
    checkedIn
      ? [sessionId, targetMemberId, actingMemberId]
      : [sessionId, targetMemberId],
  );
  if (!result.rowCount) {
    throw new HttpError(404, "That participant has not joined this session.");
  }
}

export async function updateSessionStatus(
  memberId: string,
  sessionId: string,
  status: SessionStatus,
  outcome?: { outcomeNotes: string | null; outcomeLevelNote: string | null },
): Promise<ApiGroupSession> {
  if (!SESSION_STATUSES.includes(status)) {
    throw new HttpError(400, "Choose a valid session status.");
  }
  await requireSessionManager(memberId, sessionId);
  const startedClause = status === "active" ? ", started_at = now()" : "";
  const endedClause =
    status === "completed" || status === "cancelled"
      ? ", ended_at = now()"
      : "";
  const result = await pool.query<SessionRow>(
    `UPDATE group_sessions
     SET status = $2,
         outcome_notes = COALESCE($3, outcome_notes),
         outcome_level_note = COALESCE($4, outcome_level_note),
         revision = revision + 1,
         updated_at = now()${startedClause}${endedClause}
     WHERE id = $1
     RETURNING ${SESSION_SELECT.replaceAll("s.", "")}`,
    [sessionId, status, outcome?.outcomeNotes ?? null, outcome?.outcomeLevelNote ?? null],
  );
  return mapSessionRow(result.rows[0]);
}

/** A participant sets their own session-scoped ICE consent (GROUP-F6).
 *  Explicit, revocable, auditable — the contact data itself is not copied. */
export async function setSessionIceConsent(
  memberId: string,
  sessionId: string,
  consent: boolean,
): Promise<void> {
  await requireSessionGroupMember(memberId, sessionId);
  const result = await pool.query(
    `UPDATE session_participants
     SET ice_consent = $3,
         ice_consent_at = CASE WHEN $3 THEN now() ELSE ice_consent_at END,
         ice_revoked_at = CASE WHEN $3 THEN NULL ELSE now() END,
         updated_at = now()
     WHERE session_id = $1 AND member_id = $2`,
    [sessionId, memberId, consent],
  );
  if (!result.rowCount) {
    throw new HttpError(404, "RSVP to this session before sharing ICE.");
  }
}
