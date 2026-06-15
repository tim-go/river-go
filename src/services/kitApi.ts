import type { KitItem } from "../types";
import { getApiBaseUrl } from "./apiConfig";
import { getCurrentUserIdToken } from "./firebaseAuth";

async function authedFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const authToken = await getCurrentUserIdToken();

  if (!authToken) {
    throw new Error("Sign in to manage your kit.");
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
    let message = `Kit API failed with HTTP ${response.status}`;
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

export interface KitItemDraft {
  category: string;
  name: string;
  notes?: string | null;
  purchasedOn?: string | null;
  replaceOn?: string | null;
  serial?: string | null;
}

export async function fetchKitItems(): Promise<KitItem[]> {
  const result = await authedFetch<{ kitItems?: KitItem[] }>(
    "/api/me/kit-items",
  );
  return result.kitItems ?? [];
}

export async function createKitItem(draft: KitItemDraft): Promise<KitItem> {
  const result = await authedFetch<{ kitItem: KitItem }>("/api/me/kit-items", {
    method: "POST",
    body: JSON.stringify(draft),
  });
  return result.kitItem;
}

export async function deleteKitItem(id: string): Promise<void> {
  await authedFetch(`/api/me/kit-items/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
