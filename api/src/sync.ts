import type { PoolClient } from "pg";
import {
  mapContributionRow,
  type ApiContribution,
  type ContributionRow,
} from "./contributions.js";
import { pool } from "./db.js";

const contributionTypes = new Set(["hazard", "report", "photo", "feature", "access"]);

export interface SyncPushResult {
  accepted: SyncAcceptedOperation[];
  failed: SyncFailedOperation[];
}

export interface SyncAcceptedOperation {
  operationId: string;
  entityId: string;
  status: "accepted" | "duplicate";
  revision: number;
  contribution?: ApiContribution;
}

export interface SyncFailedOperation {
  operationId: string | null;
  status: "failed";
  error: string;
}

interface SyncOperationInput {
  operationId: string;
  operationType: string;
  entityType: string;
  entityId: string;
  createdAt?: string;
  baseRevision?: number | null;
  actorId?: string | null;
  payload: ContributionCreatePayload;
}

interface SyncActor {
  firebaseUid: string | null;
  memberId: string | null;
}

interface ContributionCreatePayload {
  id: string;
  type: string;
  sectionId?: string | null;
  geometry?: unknown;
  observedAt?: string | null;
  payload?: Record<string, unknown>;
  client?: {
    deviceId?: string;
    createdOffline?: boolean;
    appVersion?: string;
  };
}

export async function pushSyncOperations(
  body: unknown,
  actor: SyncActor = { firebaseUid: null, memberId: null },
): Promise<SyncPushResult> {
  if (!isRecord(body) || !Array.isArray(body.operations)) {
    throw new Error("Body must contain operations array");
  }

  const accepted: SyncAcceptedOperation[] = [];
  const failed: SyncFailedOperation[] = [];

  for (const rawOperation of body.operations) {
    const operation = parseOperation(rawOperation);

    if (!operation.ok) {
      failed.push({
        operationId: operation.operationId,
        status: "failed",
        error: operation.error,
      });
      continue;
    }

    try {
      accepted.push(
        await processOperation(
          {
            ...operation.value,
            actorId: actor.firebaseUid,
          },
          actor,
        ),
      );
    } catch (error) {
      failed.push({
        operationId: operation.value.operationId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown sync error",
      });
    }
  }

  return { accepted, failed };
}

async function processOperation(
  operation: SyncOperationInput,
  actor: SyncActor = { firebaseUid: operation.actorId ?? null, memberId: null },
): Promise<SyncAcceptedOperation> {
  if (operation.operationType !== "contribution.create") {
    throw new Error(`Unsupported operation type: ${operation.operationType}`);
  }

  if (operation.entityType !== "contribution") {
    throw new Error(`Unsupported entity type: ${operation.entityType}`);
  }

  if (operation.payload.id !== operation.entityId) {
    throw new Error("Operation entityId must match contribution payload id");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingOperation = await client.query<{
      result_payload: SyncAcceptedOperation;
    }>(
      "SELECT result_payload FROM sync_operations WHERE operation_id = $1",
      [operation.operationId],
    );

    if (existingOperation.rowCount) {
      await client.query("COMMIT");
      return {
        ...existingOperation.rows[0].result_payload,
        status: "duplicate",
      };
    }

    const result = await insertContribution(client, operation, actor);

    await client.query(
      `INSERT INTO sync_operations (
        operation_id,
        operation_type,
        entity_type,
        entity_id,
        actor_member_id,
        actor_id,
        base_revision,
        payload,
        result_status,
        result_payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::jsonb)`,
      [
        operation.operationId,
        operation.operationType,
        operation.entityType,
        operation.entityId,
        actor.memberId,
        operation.actorId ?? null,
        operation.baseRevision ?? null,
        JSON.stringify(operation),
        "accepted",
        JSON.stringify(result),
      ],
    );

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function insertContribution(
  client: PoolClient,
  operation: SyncOperationInput,
  actor: SyncActor,
): Promise<SyncAcceptedOperation> {
  const contribution = operation.payload;
  const geometryJson = contribution.geometry ? JSON.stringify(contribution.geometry) : null;
  const payload = contribution.payload ?? {};
  const syncSource = contribution.client?.createdOffline ? "offline-pwa" : "online";

  const result = await client.query<ContributionRow>(
    `INSERT INTO contributions (
      id,
      client_id,
      section_id,
      type,
      geometry,
      observed_at,
      created_at,
      member_id,
      created_by,
      moderation_status,
      sync_status,
      sync_source,
      payload
    ) VALUES (
      $1,
      $2,
      $3,
      $4,
      ST_SetSRID(ST_GeomFromGeoJSON($5), 4326),
      $6,
      COALESCE($7::timestamptz, now()),
      $8,
      $9,
      $10,
      'accepted',
      $11,
      $12::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      updated_at = now()
    RETURNING
      id,
      section_id,
      type,
      CASE
        WHEN geometry IS NULL THEN NULL
        ELSE ST_AsGeoJSON(geometry)::json
      END AS geometry,
      payload,
      observed_at,
      created_at,
      updated_at,
      moderation_status,
      sync_status,
      revision,
      member_id,
      NULL::text AS display_name,
      NULL::text AS email,
      NULL::text AS trust_level`,
    [
      contribution.id,
      contribution.client?.deviceId ?? null,
      contribution.sectionId ?? null,
      contribution.type,
      geometryJson,
      contribution.observedAt ?? null,
      operation.createdAt ?? null,
      actor.memberId,
      operation.actorId ?? null,
      initialModerationStatus(contribution.type),
      syncSource,
      JSON.stringify(payload),
    ],
  );

  return {
    operationId: operation.operationId,
    entityId: operation.entityId,
    status: "accepted",
    revision: Number(result.rows[0].revision),
    contribution: mapContributionRow(result.rows[0]),
  };
}

function parseOperation(
  value: unknown,
): { ok: true; value: SyncOperationInput } | { ok: false; operationId: string | null; error: string } {
  if (!isRecord(value)) {
    return { ok: false, operationId: null, error: "Operation must be an object" };
  }

  const operationId = readString(value.operationId);

  if (!operationId) {
    return { ok: false, operationId: null, error: "operationId is required" };
  }

  const operationType = readString(value.operationType);
  const entityType = readString(value.entityType);
  const entityId = readString(value.entityId);

  if (!operationType) {
    return { ok: false, operationId, error: "operationType is required" };
  }

  if (!entityType) {
    return { ok: false, operationId, error: "entityType is required" };
  }

  if (!entityId) {
    return { ok: false, operationId, error: "entityId is required" };
  }

  if (!isRecord(value.payload)) {
    return { ok: false, operationId, error: "payload is required" };
  }

  const payload = parseContributionPayload(value.payload);

  if (!payload.ok) {
    return { ok: false, operationId, error: payload.error };
  }

  return {
    ok: true,
    value: {
      operationId,
      operationType,
      entityType,
      entityId,
      createdAt: readString(value.createdAt) ?? undefined,
      baseRevision: typeof value.baseRevision === "number" ? value.baseRevision : null,
      actorId: readString(value.actorId),
      payload: payload.value,
    },
  };
}

function parseContributionPayload(
  value: Record<string, unknown>,
): { ok: true; value: ContributionCreatePayload } | { ok: false; error: string } {
  const id = readString(value.id);
  const type = readString(value.type);

  if (!id) return { ok: false, error: "payload.id is required" };
  if (!type) return { ok: false, error: "payload.type is required" };
  if (!contributionTypes.has(type)) {
    return { ok: false, error: `Unsupported contribution type: ${type}` };
  }

  return {
    ok: true,
    value: {
      id,
      type,
      sectionId: readString(value.sectionId),
      geometry: value.geometry,
      observedAt: readString(value.observedAt),
      payload: isRecord(value.payload) ? value.payload : {},
      client: isRecord(value.client)
        ? {
            deviceId: readString(value.client.deviceId) ?? undefined,
            createdOffline: value.client.createdOffline === true,
            appVersion: readString(value.client.appVersion) ?? undefined,
          }
        : undefined,
    },
  };
}

function initialModerationStatus(type: string): string {
  if (type === "hazard") return "needs-confirmation";
  if (type === "photo" || type === "access") return "pending";
  return "reported";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
