import type { MemberAvatar } from "../types";

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

/**
 * Fetch a public paddler profile by handle or id. Returns null when the profile
 * is private or the member doesn't exist (the endpoint 404s neutrally — no
 * existence disclosure). Anonymous — no auth required.
 */
export async function fetchPublicProfile(
  handleOrId: string,
): Promise<PublicProfile | null> {
  const response = await fetch(`/api/p/${encodeURIComponent(handleOrId)}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error("Could not load this profile.");
  }
  const body = (await response.json()) as { profile: PublicProfile };
  return body.profile;
}
