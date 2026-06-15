import type { MemberSkill } from "../types";
import { getApiBaseUrl } from "./apiConfig";
import { getCurrentUserIdToken } from "./firebaseAuth";

async function authedFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const authToken = await getCurrentUserIdToken();

  if (!authToken) {
    throw new Error("Sign in to manage your skills.");
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    let message = `Skills API failed with HTTP ${response.status}`;
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

export interface MemberSkillDraft {
  category: string;
  name: string;
  detail?: string | null;
  attainedOn?: string | null;
  expiresOn?: string | null;
}

export async function fetchMemberSkills(): Promise<MemberSkill[]> {
  const result = await authedFetch<{ skills?: MemberSkill[] }>(
    "/api/me/skills",
  );
  return result.skills ?? [];
}

export async function createMemberSkill(
  draft: MemberSkillDraft,
): Promise<MemberSkill> {
  const result = await authedFetch<{ skill: MemberSkill }>("/api/me/skills", {
    method: "POST",
    body: JSON.stringify(draft),
  });
  return result.skill;
}

export async function deleteMemberSkill(id: string): Promise<void> {
  await authedFetch(`/api/me/skills/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
