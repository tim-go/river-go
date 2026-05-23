import type { ContributionOutboxRecord } from "../types";
import { getApiBaseUrl } from "./apiConfig";
import type { ContributionOutboxStore } from "./contributionOutbox";

interface SyncPushResponse {
  accepted?: Array<{
    operationId: string;
    entityId: string;
    status: "accepted" | "duplicate";
    revision: number;
  }>;
  failed?: Array<{
    operationId: string | null;
    status: "failed";
    error: string;
  }>;
}

export interface ContributionSyncSummary {
  attempted: number;
  synced: number;
  failed: number;
}

export async function syncContributionOutbox(
  outboxStore: ContributionOutboxStore,
  options: { apiBaseUrl?: string } = {},
): Promise<ContributionSyncSummary> {
  const candidates = (await outboxStore.list()).filter((record) =>
    ["queued", "failed", "syncing"].includes(record.syncStatus),
  );

  if (candidates.length === 0) {
    return { attempted: 0, synced: 0, failed: 0 };
  }

  await Promise.all(
    candidates.map((record) => outboxStore.updateStatus(record.id, "syncing")),
  );

  try {
    const response = await fetch(
      `${options.apiBaseUrl ?? getApiBaseUrl()}/api/sync/push`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          operations: candidates.map((record) => record.operation),
        }),
      },
    );

    if (!response.ok && response.status !== 207) {
      throw new Error(`Sync failed with HTTP ${response.status}`);
    }

    const result = (await response.json()) as SyncPushResponse;
    return applySyncResult(outboxStore, candidates, result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not reach sync API.";

    await Promise.all(
      candidates.map((record) =>
        outboxStore.updateStatus(record.id, "failed", {
          lastSyncError: message,
        }),
      ),
    );

    return { attempted: candidates.length, synced: 0, failed: candidates.length };
  }
}

async function applySyncResult(
  outboxStore: ContributionOutboxStore,
  candidates: ContributionOutboxRecord[],
  result: SyncPushResponse,
): Promise<ContributionSyncSummary> {
  const recordByOperationId = new Map(
    candidates.map((record) => [record.operation.operationId, record] as const),
  );
  let synced = 0;
  let failed = 0;

  for (const accepted of result.accepted ?? []) {
    const record = recordByOperationId.get(accepted.operationId);
    if (!record) continue;

    await outboxStore.updateStatus(record.id, "synced", {
      serverRevision: accepted.revision,
    });
    synced += 1;
  }

  for (const failedOperation of result.failed ?? []) {
    if (!failedOperation.operationId) {
      failed += 1;
      continue;
    }

    const record = recordByOperationId.get(failedOperation.operationId);
    if (!record) continue;

    await outboxStore.updateStatus(record.id, "failed", {
      lastSyncError: failedOperation.error,
    });
    failed += 1;
  }

  const completedOperationIds = new Set([
    ...(result.accepted ?? []).map((operation) => operation.operationId),
    ...(result.failed ?? [])
      .map((operation) => operation.operationId)
      .filter((operationId): operationId is string => Boolean(operationId)),
  ]);

  const missingRecords = candidates.filter(
    (record) => !completedOperationIds.has(record.operation.operationId),
  );

  await Promise.all(
    missingRecords.map((record) =>
      outboxStore.updateStatus(record.id, "failed", {
        lastSyncError: "Sync API did not return a result for this operation.",
      }),
    ),
  );

  failed += missingRecords.length;

  return {
    attempted: candidates.length,
    synced,
    failed,
  };
}
