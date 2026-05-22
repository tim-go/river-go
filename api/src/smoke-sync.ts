import { randomUUID } from "node:crypto";
import { closePool } from "./db.js";
import { pushSyncOperations } from "./sync.js";

const contributionId = randomUUID();
const operationId = randomUUID();

const operation = {
  operationId,
  operationType: "contribution.create",
  entityType: "contribution",
  entityId: contributionId,
  createdAt: new Date().toISOString(),
  baseRevision: null,
  payload: {
    id: contributionId,
    type: "hazard",
    sectionId: "wye-hay-to-hereford",
    geometry: {
      type: "Point",
      coordinates: [-2.7123, 52.0521],
    },
    observedAt: new Date().toISOString(),
    payload: {
      title: "Smoke test hazard",
      detail: "Created by api sync smoke test",
      severity: "low",
    },
    client: {
      deviceId: "smoke-test",
      createdOffline: true,
      appVersion: "0.1.0",
    },
  },
};

try {
  const first = await pushSyncOperations({ operations: [operation] });
  const second = await pushSyncOperations({ operations: [operation] });

  console.log(JSON.stringify({ first, second }, null, 2));

  if (first.accepted.length !== 1 || second.accepted[0]?.status !== "duplicate") {
    throw new Error("Smoke sync did not prove idempotent replay");
  }
} finally {
  await closePool();
}
