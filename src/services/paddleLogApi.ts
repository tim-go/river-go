import type { PaddleLog, PaddleStats } from "../types";
import { getApiBaseUrl } from "./apiConfig";
import { getCurrentUserIdToken } from "./firebaseAuth";

async function authedFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const authToken = await getCurrentUserIdToken();

  if (!authToken) {
    throw new Error("Sign in to use your paddle history.");
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
    let message = `Paddle history API failed with HTTP ${response.status}`;
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

export interface PaddleLogDraft {
  riverId?: string | null;
  title: string;
  paddledOn: string;
  levelNote?: string | null;
  craftType?: string | null;
  companions?: string | null;
  notes?: string | null;
}

export async function fetchPaddleLogs(riverId?: string): Promise<PaddleLog[]> {
  const query = riverId ? `?riverId=${encodeURIComponent(riverId)}` : "";
  const result = await authedFetch<{ paddleLogs?: PaddleLog[] }>(
    `/api/me/paddle-logs${query}`,
  );
  return result.paddleLogs ?? [];
}

export async function fetchPaddleStats(): Promise<PaddleStats> {
  const result = await authedFetch<{ stats: PaddleStats }>(
    "/api/me/paddle-stats",
  );
  return result.stats;
}

export async function createPaddleLog(
  draft: PaddleLogDraft,
): Promise<PaddleLog> {
  const result = await authedFetch<{ paddleLog: PaddleLog }>(
    "/api/me/paddle-logs",
    { method: "POST", body: JSON.stringify(draft) },
  );
  return result.paddleLog;
}

export async function updatePaddleLog(
  id: string,
  draft: PaddleLogDraft,
): Promise<PaddleLog> {
  const result = await authedFetch<{ paddleLog: PaddleLog }>(
    `/api/me/paddle-logs/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(draft) },
  );
  return result.paddleLog;
}

export async function deletePaddleLog(id: string): Promise<void> {
  await authedFetch(`/api/me/paddle-logs/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
