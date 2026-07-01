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
  profilePublic: boolean;
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
  profile_public: boolean;
  show_paddles: boolean;
  show_skills: boolean;
  show_photos: boolean;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve a paddler profile by handle or id. The header (name, handle, avatar,
 * bio) is public for any member — it's the same info shown in club rosters — so
 * it is always returned. The opted-in sections (paddles/skills/photos) are only
 * populated when the member has made their profile public. Returns null only
 * when no such member exists. Private columns are never read.
 */
export async function getPublicProfile(
  handleOrId: string,
): Promise<PublicProfile | null> {
  const isUuid = UUID_RE.test(handleOrId);
  const head = await pool.query<MemberHeadRow>(
    `SELECT id, public_name, bio, created_at,
       avatar_image_url, avatar_x, avatar_position, avatar_zoom,
       handle, profile_public, show_paddles, show_skills, show_photos
     FROM members
     WHERE ${isUuid ? "id = $1" : "lower(handle) = lower($1)"}
     LIMIT 1`,
    [handleOrId],
  );
  const row = head.rows[0];
  if (!row) {
    return null;
  }
  // Sections only when the member opted in; the header is always public.
  const showPaddles = row.profile_public && row.show_paddles;
  const showSkills = row.profile_public && row.show_skills;
  const showPhotos = row.profile_public && row.show_photos;

  const paddles: PublicProfilePaddle[] = [];
  if (showPaddles) {
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
  if (showSkills) {
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
  if (showPhotos) {
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
    // Bio is part of the opt-in public profile, so only when public.
    bio: row.profile_public ? row.bio : null,
    avatar: buildMemberAvatar(row),
    memberSince: row.created_at.toISOString(),
    profilePublic: row.profile_public,
    showPaddles,
    showSkills,
    showPhotos,
    paddles,
    skills,
    photos,
  };
}
