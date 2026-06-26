import type { Member } from "./members.js";
import { canModerate } from "./members.js";
import { pool } from "./db.js";
import { HttpError } from "./http.js";

export interface ApiMemberPhoto {
  id: string;
  contributionId: string;
  sectionId: string | null;
  contributionType: string;
  contributionTitle: string;
  contributionDetail: string;
  contributionModerationStatus: string;
  photoModerationStatus: string;
  caption: string;
  displayUrl: string | null;
  thumbnailUrl: string | null;
  displayPath: string | null;
  thumbnailPath: string | null;
  originalName: string | null;
  createdAt: string;
  author: {
    id: string | null;
    displayName: string | null;
    email: string | null;
  };
}

interface PhotoRow {
  id: string;
  contribution_id: string;
  section_id: string | null;
  contribution_type: string;
  contribution_title: string | null;
  contribution_detail: string | null;
  contribution_moderation_status: string;
  photo_moderation_status: string;
  caption: string | null;
  display_url: string | null;
  thumbnail_url: string | null;
  display_path: string | null;
  thumbnail_path: string | null;
  original_name: string | null;
  created_at: Date;
  member_id: string | null;
  display_name: string | null;
  email: string | null;
}

export async function listPhotosForMember(memberId: string): Promise<ApiMemberPhoto[]> {
  const result = await pool.query<PhotoRow>(
    `${photoSelectSql()}
    WHERE p.member_id = $1
      AND p.moderation_status NOT IN ('hidden', 'rejected')
      AND c.moderation_status NOT IN ('hidden', 'rejected')
    ORDER BY p.created_at DESC
    LIMIT 200`,
    [memberId],
  );

  return result.rows.map(mapPhotoRow);
}

// River-wide photo gallery (RIVERDISC-B7): roll up published contribution photos
// across the river's sections.
export async function listRiverPhotos(
  riverId: string,
): Promise<ApiMemberPhoto[]> {
  const result = await pool.query<PhotoRow>(
    `${photoSelectSql()}
    WHERE c.river_id = $1
      AND c.visibility = 'published'
      AND p.moderation_status NOT IN ('hidden', 'rejected')
    ORDER BY p.created_at DESC
    LIMIT 100`,
    [riverId],
  );

  return result.rows.map(mapPhotoRow);
}

export async function softDeletePhoto(
  photoId: string,
  actor: Member,
): Promise<ApiMemberPhoto> {
  const existing = await pool.query<PhotoRow>(
    `${photoSelectSql()}
    WHERE p.id = $1`,
    [photoId],
  );

  if (!existing.rowCount) {
    throw new HttpError(404, "Photo not found.");
  }

  const photo = existing.rows[0];

  if (photo.member_id !== actor.id && !canModerate(actor)) {
    throw new HttpError(403, "Only the photo owner or a moderator can delete it.");
  }

  await pool.query(
    `UPDATE contribution_photos
    SET moderation_status = 'hidden',
      updated_at = now()
    WHERE id = $1`,
    [photoId],
  );

  const visiblePhotos = await pool.query<{ count: string }>(
    `SELECT count(*) AS count
    FROM contribution_photos
    WHERE contribution_id = $1
      AND moderation_status NOT IN ('hidden', 'rejected')`,
    [photo.contribution_id],
  );

  const hasVisiblePhotos = Number(visiblePhotos.rows[0]?.count ?? 0) > 0;

  if (photo.contribution_type === "photo" && !hasVisiblePhotos) {
    await pool.query(
      `UPDATE contributions
      SET moderation_status = 'hidden',
        updated_at = now(),
        revision = revision + 1
      WHERE id = $1`,
      [photo.contribution_id],
    );
  }

  return {
    ...mapPhotoRow(photo),
    photoModerationStatus: "hidden",
    contributionModerationStatus:
      photo.contribution_type === "photo" && !hasVisiblePhotos
        ? "hidden"
        : photo.contribution_moderation_status,
  };
}

function photoSelectSql() {
  return `SELECT
    p.id,
    p.contribution_id,
    p.section_id,
    c.type AS contribution_type,
    c.payload->>'title' AS contribution_title,
    c.payload->>'detail' AS contribution_detail,
    c.moderation_status AS contribution_moderation_status,
    p.moderation_status AS photo_moderation_status,
    p.caption,
    p.display_url,
    p.thumbnail_url,
    p.display_path,
    p.thumbnail_path,
    p.original_name,
    p.created_at,
    p.member_id,
    COALESCE(m.public_name, m.display_name) AS display_name,
    m.email
  FROM contribution_photos p
  JOIN contributions c ON c.id = p.contribution_id
  LEFT JOIN members m ON m.id = p.member_id`;
}

function mapPhotoRow(row: PhotoRow): ApiMemberPhoto {
  return {
    id: row.id,
    contributionId: row.contribution_id,
    sectionId: row.section_id,
    contributionType: row.contribution_type,
    contributionTitle: row.contribution_title ?? row.contribution_type,
    contributionDetail: row.contribution_detail ?? "",
    contributionModerationStatus: row.contribution_moderation_status,
    photoModerationStatus: row.photo_moderation_status,
    caption: row.caption ?? "",
    displayUrl: row.display_url,
    thumbnailUrl: row.thumbnail_url,
    displayPath: row.display_path,
    thumbnailPath: row.thumbnail_path,
    originalName: row.original_name,
    createdAt: row.created_at.toISOString(),
    author: {
      id: row.member_id,
      displayName: row.display_name,
      email: row.email,
    },
  };
}
