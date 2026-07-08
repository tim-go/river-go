import type { PoolClient } from "pg";
import type { AuthContext } from "./auth.js";
import { getAdminEmails, isEmailVerificationRequired } from "./config.js";
import { pool } from "./db.js";
import { HttpError } from "./http.js";
import { defaultPublicName, normalisePublicName } from "./public-name.js";

export type MemberRole = "MEMBER" | "TRUSTED_MEMBER" | "CONTRIB_MODERATOR" | "ADMIN";
export type MemberTrustLevel = "NEW" | "KNOWN" | "TRUSTED";

export interface Member {
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
  // Populated only by listMembersForAdmin (0 elsewhere).
  contributionCount: number;
  pendingContributionCount: number;
}

interface MemberRow {
  id: string;
  firebase_uid: string;
  email: string | null;
  display_name: string | null;
  public_name: string | null;
  public_name_status: string;
  photo_url: string | null;
  avatar_image_url: string | null;
  avatar_x: number;
  avatar_position: number;
  avatar_zoom: number;
  profile_public: boolean;
  handle: string | null;
  bio: string | null;
  show_paddles: boolean;
  show_skills: boolean;
  show_photos: boolean;
  role: MemberRole;
  trust_level: MemberTrustLevel;
  created_at: Date;
  updated_at: Date;
  last_seen_at: Date | null;
  contributor_terms_accepted_at: Date | null;
  contributor_terms_version: string | null;
  contribution_count?: string | number;
  pending_contribution_count?: string | number;
}

export interface MemberEmergencyProfile {
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  visibilityDefault: "private";
  updatedAt: string | null;
}

interface MemberEmergencyProfileRow {
  member_id: string;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  visibility_default: "private";
  updated_at: Date;
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
      public_name,
      photo_url,
      role,
      last_seen_at
    ) VALUES ($1, $2, $3, $4, $5, $6, now())
    ON CONFLICT (firebase_uid) DO UPDATE SET
      email = EXCLUDED.email,
      display_name = EXCLUDED.display_name,
      public_name = CASE
        WHEN members.public_name IS NULL OR btrim(members.public_name) = '' THEN EXCLUDED.public_name
        ELSE members.public_name
      END,
      photo_url = EXCLUDED.photo_url,
      role = CASE
        WHEN $6 = 'ADMIN' THEN 'ADMIN'
        ELSE members.role
      END,
      updated_at = now(),
      last_seen_at = now()
    RETURNING *`,
    [
      authContext.userId,
      authContext.email ?? null,
      authContext.name ?? null,
      defaultPublicName(authContext.name),
      authContext.picture ?? null,
      desiredRole,
    ],
  );

  return mapMember(result.rows[0]);
}

export interface AdminStats {
  memberCount: number;
  contributorCount: number;
  totalContributions: number;
  pendingContributions: number;
  contributionsByStatus: Record<string, number>;
}

// Platform summary counts for the admin overview.
export async function listAdminStats(): Promise<AdminStats> {
  const [members, contributors, byStatus] = await Promise.all([
    pool.query<{ count: string }>("SELECT count(*) FROM members"),
    pool.query<{ count: string }>(
      "SELECT count(DISTINCT member_id) FROM contributions WHERE member_id IS NOT NULL",
    ),
    pool.query<{ moderation_status: string; count: string }>(
      "SELECT moderation_status, count(*) FROM contributions GROUP BY moderation_status",
    ),
  ]);
  const contributionsByStatus: Record<string, number> = {};
  let total = 0;
  for (const row of byStatus.rows) {
    const n = Number(row.count);
    contributionsByStatus[row.moderation_status] = n;
    total += n;
  }
  return {
    memberCount: Number(members.rows[0].count),
    contributorCount: Number(contributors.rows[0].count),
    totalContributions: total,
    pendingContributions: contributionsByStatus.pending ?? 0,
    contributionsByStatus,
  };
}

export async function listMembersForAdmin(): Promise<Member[]> {
  const result = await pool.query<MemberRow>(
    `SELECT m.*,
       (SELECT count(*) FROM contributions c WHERE c.member_id = m.id)
         AS contribution_count,
       (SELECT count(*) FROM contributions c
         WHERE c.member_id = m.id AND c.moderation_status = 'pending')
         AS pending_contribution_count
    FROM members m
    ORDER BY m.last_seen_at DESC NULLS LAST, m.created_at DESC
    LIMIT 200`,
  );

  return result.rows.map(mapMember);
}

export async function updateMemberProfile(
  memberId: string,
  publicName: string,
): Promise<Member> {
  const normalisedPublicName = normalisePublicName(publicName);
  const result = await pool.query<MemberRow>(
    `UPDATE members
    SET public_name = $2,
      public_name_status = 'active',
      updated_at = now()
    WHERE id = $1
    RETURNING *`,
    [memberId, normalisedPublicName],
  );

  if (!result.rowCount) {
    throw new HttpError(404, "Member not found.");
  }

  return mapMember(result.rows[0]);
}

export interface AvatarInput {
  /** null clears the picture. */
  imageUrl: string | null;
  x?: number;
  position?: number;
  zoom?: number;
}

/** A member's profile picture as shown to others (rosters, participants). */
export interface MemberAvatar {
  imageUrl: string;
  x: number;
  position: number;
  zoom: number;
}

/** Build the nested avatar from joined member columns; null when no picture. */
export function buildMemberAvatar(row: {
  avatar_image_url: string | null;
  avatar_x: number | string | null;
  avatar_position: number | string | null;
  avatar_zoom: number | string | null;
}): MemberAvatar | null {
  if (!row.avatar_image_url) {
    return null;
  }
  return {
    imageUrl: row.avatar_image_url,
    x: Number(row.avatar_x ?? 50),
    position: Number(row.avatar_position ?? 50),
    zoom: Number(row.avatar_zoom ?? 100),
  };
}

// --- Public profile settings (opt-in) ---

const MEMBER_HANDLE_RE = /^[a-z0-9-]{3,30}$/;
const RESERVED_MEMBER_HANDLES = new Set([
  "new",
  "edit",
  "admin",
  "api",
  "me",
  "settings",
  "profile",
  "p",
  "club",
  "clubs",
  "group",
  "groups",
]);

/** Normalise + validate a member handle; throws 400 on bad input. */
function normaliseMemberHandle(value: string): string {
  const handle = value.trim().toLowerCase();
  if (!MEMBER_HANDLE_RE.test(handle)) {
    throw new HttpError(
      400,
      "Handle must be 3–30 characters: lowercase letters, numbers, or hyphens.",
    );
  }
  if (RESERVED_MEMBER_HANDLES.has(handle)) {
    throw new HttpError(400, "That handle is reserved — choose another.");
  }
  return handle;
}

export interface PublicProfileSettingsInput {
  profilePublic: boolean;
  handle: string | null;
  bio: string | null;
  showPaddles: boolean;
  showSkills: boolean;
  showPhotos: boolean;
}

export async function updateMemberPublicProfileSettings(
  memberId: string,
  input: PublicProfileSettingsInput,
): Promise<Member> {
  const handle = input.handle ? normaliseMemberHandle(input.handle) : null;
  if (handle) {
    const clash = await pool.query(
      `SELECT 1 FROM members WHERE lower(handle) = $1 AND id <> $2`,
      [handle, memberId],
    );
    if (clash.rowCount) {
      throw new HttpError(409, "That handle is taken — choose another.");
    }
  }
  const bio = input.bio?.trim() ? input.bio.trim().slice(0, 280) : null;
  const result = await pool.query<MemberRow>(
    `UPDATE members
    SET profile_public = $2,
      handle = $3,
      bio = $4,
      show_paddles = $5,
      show_skills = $6,
      show_photos = $7,
      updated_at = now()
    WHERE id = $1
    RETURNING *`,
    [
      memberId,
      input.profilePublic,
      handle,
      bio,
      input.showPaddles,
      input.showSkills,
      input.showPhotos,
    ],
  );
  if (!result.rowCount) {
    throw new HttpError(404, "Member not found.");
  }
  return mapMember(result.rows[0]);
}

const clampPercent = (value: number | undefined, fallback: number): number => {
  if (value == null || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
};

const clampZoom = (value: number | undefined): number => {
  if (value == null || Number.isNaN(value)) {
    return 100;
  }
  return Math.max(100, Math.min(300, Math.round(value)));
};

export async function updateMemberAvatar(
  memberId: string,
  input: AvatarInput,
): Promise<Member> {
  // Clearing the picture resets the framing to defaults.
  const cleared = !input.imageUrl;
  const result = await pool.query<MemberRow>(
    `UPDATE members
    SET avatar_image_url = $2,
      avatar_x = $3,
      avatar_position = $4,
      avatar_zoom = $5,
      updated_at = now()
    WHERE id = $1
    RETURNING *`,
    [
      memberId,
      input.imageUrl,
      cleared ? 50 : clampPercent(input.x, 50),
      cleared ? 50 : clampPercent(input.position, 50),
      cleared ? 100 : clampZoom(input.zoom),
    ],
  );

  if (!result.rowCount) {
    throw new HttpError(404, "Member not found.");
  }

  return mapMember(result.rows[0]);
}

export async function acceptContributorTerms(
  memberId: string,
  version: string,
): Promise<Member> {
  const result = await pool.query<MemberRow>(
    `UPDATE members
    SET contributor_terms_accepted_at = now(),
      contributor_terms_version = $2,
      updated_at = now()
    WHERE id = $1
    RETURNING *`,
    [memberId, version],
  );

  if (!result.rowCount) {
    throw new HttpError(404, "Member not found.");
  }

  return mapMember(result.rows[0]);
}

export async function getMemberForAdmin(memberId: string): Promise<Member> {
  const result = await pool.query<MemberRow>(
    `SELECT *
    FROM members
    WHERE id = $1`,
    [memberId],
  );

  if (!result.rowCount) {
    throw new HttpError(404, "Member not found.");
  }

  return mapMember(result.rows[0]);
}

export async function getMemberEmergencyProfile(
  memberId: string,
): Promise<MemberEmergencyProfile> {
  const result = await pool.query<MemberEmergencyProfileRow>(
    `SELECT *
    FROM member_emergency_profiles
    WHERE member_id = $1`,
    [memberId],
  );

  if (!result.rowCount) {
    return emptyEmergencyProfile();
  }

  return mapEmergencyProfile(result.rows[0]);
}

export async function upsertMemberEmergencyProfile(
  memberId: string,
  input: {
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelationship: string;
  },
): Promise<MemberEmergencyProfile> {
  const result = await pool.query<MemberEmergencyProfileRow>(
    `INSERT INTO member_emergency_profiles (
      member_id,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      visibility_default,
      updated_at
    ) VALUES ($1, $2, $3, $4, 'private', now())
    ON CONFLICT (member_id) DO UPDATE SET
      emergency_contact_name = EXCLUDED.emergency_contact_name,
      emergency_contact_phone = EXCLUDED.emergency_contact_phone,
      emergency_contact_relationship = EXCLUDED.emergency_contact_relationship,
      visibility_default = 'private',
      updated_at = now()
    RETURNING *`,
    [
      memberId,
      cleanOptionalText(input.emergencyContactName, 80),
      cleanOptionalText(input.emergencyContactPhone, 40),
      cleanOptionalText(input.emergencyContactRelationship, 60),
    ],
  );

  return mapEmergencyProfile(result.rows[0]);
}

export async function updateMemberAccessForAdmin(
  memberId: string,
  role: MemberRole,
  trustLevel: MemberTrustLevel,
): Promise<Member> {
  const result = await pool.query<MemberRow>(
    `UPDATE members
    SET role = $2,
      trust_level = $3,
      updated_at = now()
    WHERE id = $1
    RETURNING *`,
    [memberId, role, trustLevel],
  );

  if (!result.rowCount) {
    throw new HttpError(404, "Member not found.");
  }

  return mapMember(result.rows[0]);
}

export function requireAdmin(member: Member): void {
  if (member.role !== "ADMIN") {
    throw new HttpError(403, "Admin role is required.");
  }
}

export function requireModerator(member: Member): void {
  if (!canModerate(member)) {
    throw new HttpError(403, "Moderator role is required.");
  }
}

/**
 * Contributions require a known, attributable identity: a verified email, a
 * public contributor name, and accepted contributor terms. Enforced server-side
 * so the gate is never client-only.
 */
export function requireContributorIdentity(
  authContext: AuthContext,
  member: Member,
): void {
  if (isEmailVerificationRequired() && !authContext.emailVerified) {
    throw new HttpError(403, "Verify your email address before contributing.");
  }

  if (!member.publicName || !member.publicName.trim()) {
    throw new HttpError(
      403,
      "Set a public contributor name before contributing.",
    );
  }

  if (!member.contributorTermsAcceptedAt) {
    throw new HttpError(
      403,
      "Accept the contributor terms before contributing.",
    );
  }
}

export function canModerate(member: Member): boolean {
  return member.role === "ADMIN" || member.role === "CONTRIB_MODERATOR";
}

/**
 * Whether a member's contributions publish directly (review-first is the
 * default for everyone else). Trusted members and moderators skip the hold.
 */
export function canPublishDirectly(member: Member): boolean {
  return (
    canModerate(member) ||
    member.role === "TRUSTED_MEMBER" ||
    member.trustLevel === "TRUSTED"
  );
}

export function isMemberRole(value: unknown): value is MemberRole {
  return (
    value === "MEMBER" ||
    value === "TRUSTED_MEMBER" ||
    value === "CONTRIB_MODERATOR" ||
    value === "ADMIN"
  );
}

export function isMemberTrustLevel(value: unknown): value is MemberTrustLevel {
  return value === "NEW" || value === "KNOWN" || value === "TRUSTED";
}

function isAdminEmail(email: string | undefined): boolean {
  if (!email) {
    return false;
  }

  return getAdminEmails().includes(email.trim().toLowerCase());
}

function cleanOptionalText(value: string, maxLength: number) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function mapMember(row: MemberRow): Member {
  return {
    id: row.id,
    firebaseUid: row.firebase_uid,
    email: row.email,
    displayName: row.display_name,
    publicName: row.public_name,
    publicNameStatus: row.public_name_status,
    photoUrl: row.photo_url,
    avatarImageUrl: row.avatar_image_url,
    avatarX: row.avatar_x,
    avatarPosition: row.avatar_position,
    avatarZoom: row.avatar_zoom,
    profilePublic: row.profile_public,
    handle: row.handle,
    bio: row.bio,
    showPaddles: row.show_paddles,
    showSkills: row.show_skills,
    showPhotos: row.show_photos,
    role: row.role,
    trustLevel: row.trust_level,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    lastSeenAt: row.last_seen_at?.toISOString() ?? null,
    contributorTermsAcceptedAt:
      row.contributor_terms_accepted_at?.toISOString() ?? null,
    contributorTermsVersion: row.contributor_terms_version,
    contributionCount: Number(row.contribution_count ?? 0),
    pendingContributionCount: Number(row.pending_contribution_count ?? 0),
  };
}

function emptyEmergencyProfile(): MemberEmergencyProfile {
  return {
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
    visibilityDefault: "private",
    updatedAt: null,
  };
}

function mapEmergencyProfile(
  row: MemberEmergencyProfileRow,
): MemberEmergencyProfile {
  return {
    emergencyContactName: row.emergency_contact_name ?? "",
    emergencyContactPhone: row.emergency_contact_phone ?? "",
    emergencyContactRelationship: row.emergency_contact_relationship ?? "",
    visibilityDefault: row.visibility_default,
    updatedAt: row.updated_at.toISOString(),
  };
}
