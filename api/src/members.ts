import type { PoolClient } from "pg";
import type { AuthContext } from "./auth.js";
import { getAdminEmails } from "./config.js";
import { pool } from "./db.js";
import { HttpError } from "./http.js";

export type MemberRole = "MEMBER" | "ADMIN" | "CONTRIB_ADMIN";

export interface Member {
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

interface MemberRow {
  id: string;
  firebase_uid: string;
  email: string | null;
  display_name: string | null;
  photo_url: string | null;
  role: MemberRole;
  trust_level: string;
  created_at: Date;
  updated_at: Date;
  last_seen_at: Date | null;
}

export async function upsertMemberFromAuth(
  authContext: AuthContext,
  client: PoolClient | null = null,
): Promise<Member> {
  const db = client ?? pool;
  const desiredRole = isAdminEmail(authContext.email) ? "ADMIN" : "MEMBER";

  const result = await db.query<MemberRow>(
    `INSERT INTO members (
      firebase_uid,
      email,
      display_name,
      photo_url,
      role,
      last_seen_at
    ) VALUES ($1, $2, $3, $4, $5, now())
    ON CONFLICT (firebase_uid) DO UPDATE SET
      email = EXCLUDED.email,
      display_name = EXCLUDED.display_name,
      photo_url = EXCLUDED.photo_url,
      role = CASE
        WHEN $5 = 'ADMIN' THEN 'ADMIN'
        ELSE members.role
      END,
      updated_at = now(),
      last_seen_at = now()
    RETURNING *`,
    [
      authContext.userId,
      authContext.email ?? null,
      authContext.name ?? null,
      authContext.picture ?? null,
      desiredRole,
    ],
  );

  return mapMember(result.rows[0]);
}

export async function listMembersForAdmin(): Promise<Member[]> {
  const result = await pool.query<MemberRow>(
    `SELECT *
    FROM members
    ORDER BY last_seen_at DESC NULLS LAST, created_at DESC
    LIMIT 200`,
  );

  return result.rows.map(mapMember);
}

export function requireAdmin(member: Member): void {
  if (member.role !== "ADMIN") {
    throw new HttpError(403, "Admin role is required.");
  }
}

function isAdminEmail(email: string | undefined): boolean {
  if (!email) {
    return false;
  }

  return getAdminEmails().includes(email.trim().toLowerCase());
}

function mapMember(row: MemberRow): Member {
  return {
    id: row.id,
    firebaseUid: row.firebase_uid,
    email: row.email,
    displayName: row.display_name,
    photoUrl: row.photo_url,
    role: row.role,
    trustLevel: row.trust_level,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    lastSeenAt: row.last_seen_at?.toISOString() ?? null,
  };
}
