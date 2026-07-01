import { pool } from "./db.js";
import { buildMemberAvatar, type MemberAvatar } from "./members.js";
import { listPhotosForMember } from "./photos.js";

export interface PublicProfilePaddle {
  id: string;
  title: string;
  venue: string | null;
  riverId: string | null;
  sectionId: string | null;
  paddledOn: string;
  craftType: string | null;
  levelNote: string | null;
}

export interface PublicProfileSkill {
  id: string;
  category: string;
  name: string;
  detail: string | null;
  attainedOn: string | null;
}

export interface PublicProfilePhoto {
  id: string;
  displayUrl: string | null;
  thumbnailUrl: string | null;
  caption: string;
}

export interface PublicProfile {
  id: string;
  handle: string | null;
  publicName: string;
  bio: string | null;
  avatar: MemberAvatar | null;
  memberSince: string;
  showPaddles: boolean;
  showSkills: boolean;
  showPhotos: boolean;
  paddles: PublicProfilePaddle[];
  skills: PublicProfileSkill[];
  photos: PublicProfilePhoto[];
}

interface MemberHeadRow {
  id: string;
  public_name: string | null;
  bio: string | null;
  created_at: Date;
  avatar_image_url: string | null;
  avatar_x: number | string | null;
  avatar_position: number | string | null;
  avatar_zoom: number | string | null;
  handle: string | null;
  show_paddles: boolean;
  show_skills: boolean;
  show_photos: boolean;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve a public profile by handle or id. Returns null when the member does
 * not exist OR has not made their profile public (neutral — no existence
 * disclosure). Only the sections the member opted into are populated, and each
 * is a public-safe subset selected here (private columns are never read).
 */
export async function getPublicProfile(
  handleOrId: string,
): Promise<PublicProfile | null> {
  const isUuid = UUID_RE.test(handleOrId);
  const head = await pool.query<MemberHeadRow>(
    `SELECT id, public_name, bio, created_at,
       avatar_image_url, avatar_x, avatar_position, avatar_zoom,
       handle, show_paddles, show_skills, show_photos
     FROM members
     WHERE profile_public = true
       AND ${isUuid ? "id = $1" : "lower(handle) = lower($1)"}
     LIMIT 1`,
    [handleOrId],
  );
  const row = head.rows[0];
  if (!row) {
    return null;
  }

  const paddles: PublicProfilePaddle[] = [];
  if (row.show_paddles) {
    const result = await pool.query<{
      id: string;
      title: string;
      venue: string | null;
      river_id: string | null;
      section_id: string | null;
      paddled_on: Date;
      craft_type: string | null;
      level_note: string | null;
    }>(
      `SELECT id, title, venue, river_id, section_id, paddled_on,
         craft_type, level_note
       FROM paddle_logs
       WHERE member_id = $1 AND visibility = 'public'
       ORDER BY paddled_on DESC
       LIMIT 100`,
      [row.id],
    );
    for (const p of result.rows) {
      paddles.push({
        id: p.id,
        title: p.title,
        venue: p.venue,
        riverId: p.river_id,
        sectionId: p.section_id,
        paddledOn: p.paddled_on.toISOString().slice(0, 10),
        craftType: p.craft_type,
        levelNote: p.level_note,
      });
    }
  }

  const skills: PublicProfileSkill[] = [];
  if (row.show_skills) {
    const result = await pool.query<{
      id: string;
      category: string;
      name: string;
      detail: string | null;
      attained_on: Date | null;
    }>(
      `SELECT id, category, name, detail, attained_on
       FROM member_skills
       WHERE member_id = $1
       ORDER BY category ASC, name ASC
       LIMIT 200`,
      [row.id],
    );
    for (const s of result.rows) {
      skills.push({
        id: s.id,
        category: s.category,
        name: s.name,
        detail: s.detail,
        attainedOn: s.attained_on
          ? s.attained_on.toISOString().slice(0, 10)
          : null,
      });
    }
  }

  const photos: PublicProfilePhoto[] = [];
  if (row.show_photos) {
    const memberPhotos = await listPhotosForMember(row.id);
    for (const photo of memberPhotos) {
      photos.push({
        id: photo.id,
        displayUrl: photo.displayUrl,
        thumbnailUrl: photo.thumbnailUrl,
        caption: photo.caption,
      });
    }
  }

  return {
    id: row.id,
    handle: row.handle,
    publicName: row.public_name ?? "RiverLaunch paddler",
    bio: row.bio,
    avatar: buildMemberAvatar(row),
    memberSince: row.created_at.toISOString(),
    showPaddles: row.show_paddles,
    showSkills: row.show_skills,
    showPhotos: row.show_photos,
    paddles,
    skills,
    photos,
  };
}
