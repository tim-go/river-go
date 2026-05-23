import { randomUUID } from "node:crypto";
import {
  applyModerationDecision,
  listContributionsForSection,
  listModerationContributions,
} from "./contributions.js";
import { closePool } from "./db.js";
import { upsertMemberFromAuth } from "./members.js";
import { pushSyncOperations } from "./sync.js";

const contributionId = randomUUID();
const operationId = randomUUID();
const sectionId = `smoke-section-${randomUUID()}`;

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
    sectionId,
    geometry: {
      type: "Point",
      coordinates: [-2.7123, 52.0521],
    },
    observedAt: new Date().toISOString(),
    payload: {
      title: "Smoke test hazard",
      detail: "Created by api sync smoke test",
      severity: "caution",
    },
    client: {
      deviceId: "smoke-test",
      createdOffline: true,
      appVersion: "0.1.0",
    },
  },
};

try {
  const member = await upsertMemberFromAuth({
    userId: `smoke-${randomUUID()}`,
    email: "smoke@example.test",
    name: "Smoke Test Member",
  });
  const actor = { firebaseUid: member.firebaseUid, memberId: member.id };
  const first = await pushSyncOperations({ operations: [operation] }, actor);
  const second = await pushSyncOperations({ operations: [operation] }, actor);
  const contributions = await listContributionsForSection(sectionId, member.id);
  const moderationQueue = await listModerationContributions();
  const moderatedContribution = await applyModerationDecision(
    contributionId,
    "confirm",
  );

  console.log(
    JSON.stringify(
      {
        first,
        second,
        contributions,
        moderationQueueCount: moderationQueue.length,
        smokeContributionInModerationQueue: moderationQueue.some(
          (contribution) => contribution.id === contributionId,
        ),
        moderatedContribution,
      },
      null,
      2,
    ),
  );

  if (first.accepted.length !== 1 || second.accepted[0]?.status !== "duplicate") {
    throw new Error("Smoke sync did not prove idempotent replay");
  }

  if (contributions[0]?.id !== contributionId) {
    throw new Error("Smoke sync did not prove section contribution readback");
  }

  if (contributions[0]?.contributor.id !== member.id) {
    throw new Error("Smoke sync did not prove authenticated member linkage");
  }

  if (!moderationQueue.some((contribution) => contribution.id === contributionId)) {
    throw new Error("Smoke sync did not prove moderation queue readback");
  }

  if (moderatedContribution.moderationStatus !== "confirmed") {
    throw new Error("Smoke sync did not prove moderation decision update");
  }
} finally {
  await closePool();
}
