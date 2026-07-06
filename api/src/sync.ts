import type { PoolClient } from "pg";
import {
  getContributionById,
  type ApiContribution,
  type ContributionRow,
} from "./contributions.js";
import { pool } from "./db.js";
import { enrichPayloadWithWhat3Words } from "./what3words.js";

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
  canPublishDirectly?: boolean;
}

interface ContributionCreatePayload {
  id: string;
  type: string;
  sectionId?: string | null;
  mapPoiId?: string | null;
  // Explicit target in the shared `pois` index (e.g. `amenity:<source_id>`).
  // Wins over the legacy map_poi_id derivation when present.
  poiId?: string | null;
  geometry?: unknown;
  observedAt?: string | null;
  payload?: Record<string, unknown>;
  client?: {
    deviceId?: string;
    createdOffline?: boolean;
    appVersion?: string;
  };
}

interface ContributionPhotoPayload {
  id: string;
  caption?: string;
  storagePath?: string;
  displayPath?: string;
  thumbnailPath?: string;
  displayUrl?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  sizeBytes?: number;
  thumbnailSizeBytes?: number;
  mimeType?: string;
  originalName?: string;
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
  const payload = await enrichPayloadWithWhat3Words(
    contribution.payload ?? {},
    contribution.geometry,
  );
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
      payload,
      map_poi_id,
      visibility,
      poi_id,
      river_id
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
      $12::jsonb,
      $13,
      $14,
      -- Point-scoped contributions carry a namespaced poi_id (surfaced via the
      -- point's photo badge) rather than re-rendering in the section feed. An
      -- explicit poiId (e.g. an amenity) wins; else derive from the legacy
      -- map_poi_id (a paddling feature).
      COALESCE(
        $15,
        CASE WHEN $13 IS NOT NULL THEN 'map_poi:' || $13 ELSE NULL END
      ),
      -- Stamp the owning river at write time from the resolved poi's asserted
      -- river_id on the pois index (any entity type — feature or amenity), else
      -- the canonical-river pseudo-section fallback.
      COALESCE(
        (SELECT lp.river_id
         FROM pois lp
         WHERE lp.id = COALESCE(
           $15,
           CASE WHEN $13 IS NOT NULL THEN 'map_poi:' || $13 ELSE NULL END
         )
         LIMIT 1),
        -- A contribution added straight from a river overview carries the
        -- canonical-river pseudo-section id, whose slug IS the river id.
        CASE
          WHEN $3 LIKE 'canonical-river:%'
            THEN substring($3 FROM length('canonical-river:') + 1)
          ELSE NULL
        END
      )
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
      '[]'::jsonb AS photos,
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
      "pending",
      syncSource,
      JSON.stringify(payload),
      contribution.mapPoiId ?? null,
      actor.canPublishDirectly ? "published" : "removed",
      contribution.poiId ?? null,
    ],
  );

  await insertContributionPhotos(
    client,
    contribution.id,
    contribution.sectionId ?? null,
    actor.memberId,
    parsePhotoPayloads(payload.photos),
  );
  const savedContribution = await getContributionById(contribution.id, client);

  return {
    operationId: operation.operationId,
    entityId: operation.entityId,
    status: "accepted",
    revision: Number(result.rows[0].revision),
    contribution: savedContribution,
  };
}

async function insertContributionPhotos(
  client: PoolClient,
  contributionId: string,
  sectionId: string | null,
  memberId: string | null,
  photos: ContributionPhotoPayload[],
) {
  for (const photo of photos) {
    await client.query(
      `INSERT INTO contribution_photos (
        id,
        contribution_id,
        member_id,
        section_id,
        storage_path,
        display_path,
        thumbnail_path,
        display_url,
        thumbnail_url,
        caption,
        status,
        moderation_status,
        mime_type,
        width,
        height,
        thumbnail_width,
        thumbnail_height,
        size_bytes,
        thumbnail_size_bytes,
        original_name,
        payload
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        'uploaded',
        'pending',
        $11,
        $12,
        $13,
        $14,
        $15,
        $16,
        $17,
        $18,
        $19::jsonb
      )
      ON CONFLICT (id) DO UPDATE SET
        storage_path = EXCLUDED.storage_path,
        display_path = EXCLUDED.display_path,
        thumbnail_path = EXCLUDED.thumbnail_path,
        display_url = EXCLUDED.display_url,
        thumbnail_url = EXCLUDED.thumbnail_url,
        caption = EXCLUDED.caption,
        status = EXCLUDED.status,
        updated_at = now(),
        payload = EXCLUDED.payload`,
      [
        photo.id,
        contributionId,
        memberId,
        sectionId,
        photo.storagePath ?? photo.displayPath ?? null,
        photo.displayPath ?? null,
        photo.thumbnailPath ?? null,
        photo.displayUrl ?? null,
        photo.thumbnailUrl ?? null,
        photo.caption ?? "",
        photo.mimeType ?? null,
        photo.width ?? null,
        photo.height ?? null,
        photo.thumbnailWidth ?? null,
        photo.thumbnailHeight ?? null,
        photo.sizeBytes ?? null,
        photo.thumbnailSizeBytes ?? null,
        photo.originalName ?? null,
        JSON.stringify(photo),
      ],
    );
  }
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
      mapPoiId: readString(value.mapPoiId),
      poiId: readString(value.poiId),
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

function parsePhotoPayloads(value: unknown): ContributionPhotoPayload[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((photo) => ({
      id: readString(photo.id) ?? "",
      caption: readString(photo.caption) ?? undefined,
      storagePath: readString(photo.storagePath) ?? undefined,
      displayPath: readString(photo.displayPath) ?? undefined,
      thumbnailPath: readString(photo.thumbnailPath) ?? undefined,
      displayUrl: readString(photo.displayUrl) ?? undefined,
      thumbnailUrl: readString(photo.thumbnailUrl) ?? undefined,
      width: readFiniteNumber(photo.width),
      height: readFiniteNumber(photo.height),
      thumbnailWidth: readFiniteNumber(photo.thumbnailWidth),
      thumbnailHeight: readFiniteNumber(photo.thumbnailHeight),
      sizeBytes: readFiniteNumber(photo.sizeBytes),
      thumbnailSizeBytes: readFiniteNumber(photo.thumbnailSizeBytes),
      mimeType: readString(photo.mimeType) ?? undefined,
      originalName: readString(photo.originalName) ?? undefined,
    }))
    .filter(
      (photo) =>
        photo.id &&
        (photo.storagePath || photo.displayPath) &&
        photo.thumbnailPath,
    );
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
