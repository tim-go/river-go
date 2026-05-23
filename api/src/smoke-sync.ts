import { randomUUID } from "node:crypto";
import {
  applyModerationDecision,
  listContributionsForMember,
  listContributionsForSection,
  listModerationContributions,
  softDeleteContribution,
} from "./contributions.js";
import { closePool } from "./db.js";
import { upsertMemberFromAuth } from "./members.js";
import { listPhotosForMember, softDeletePhoto } from "./photos.js";
import { pushSyncOperations } from "./sync.js";

const contributionId = randomUUID();
const operationId = randomUUID();
const sectionId = `smoke-section-${randomUUID()}`;
const photoId = randomUUID();

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
      photos: [
        {
          id: photoId,
          caption: "Smoke test photo metadata",
          storagePath: "contribution-photos/smoke/display.jpg",
          displayPath: "contribution-photos/smoke/display.jpg",
          thumbnailPath: "contribution-photos/smoke/thumb.jpg",
          displayUrl: "https://example.test/display.jpg",
          thumbnailUrl: "https://example.test/thumb.jpg",
          width: 1200,
          height: 900,
          thumbnailWidth: 480,
          thumbnailHeight: 360,
          sizeBytes: 250000,
          thumbnailSizeBytes: 42000,
          mimeType: "image/jpeg",
          originalName: "smoke.jpg",
        },
      ],
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
  const memberPhotos = await listPhotosForMember(member.id);
  const deletedPhoto = await softDeletePhoto(photoId, member);
  const contributionsAfterPhotoDelete = await listContributionsForSection(
    sectionId,
    member.id,
  );
  const memberContributions = await listContributionsForMember(member.id);
  const deletedContribution = await softDeleteContribution(contributionId, member);
  const contributionsAfterContributionDelete = await listContributionsForSection(
    sectionId,
    member.id,
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
        memberPhotoCount: memberPhotos.length,
        deletedPhoto,
        contributionsAfterPhotoDelete,
        memberContributionCount: memberContributions.length,
        deletedContribution,
        contributionsAfterContributionDelete,
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

  if (contributions[0]?.photos.length !== 1) {
    throw new Error("Smoke sync did not prove photo metadata readback");
  }

  if (!moderationQueue.some((contribution) => contribution.id === contributionId)) {
    throw new Error("Smoke sync did not prove moderation queue readback");
  }

  if (moderatedContribution.moderationStatus !== "confirmed") {
    throw new Error("Smoke sync did not prove moderation decision update");
  }

  if (moderatedContribution.photos[0]?.moderationStatus !== "visible") {
    throw new Error("Smoke sync did not prove photo moderation state update");
  }

  if (!memberPhotos.some((photo) => photo.id === photoId)) {
    throw new Error("Smoke sync did not prove member photo listing");
  }

  if (deletedPhoto.photoModerationStatus !== "hidden") {
    throw new Error("Smoke sync did not prove owner photo deletion");
  }

  if (contributionsAfterPhotoDelete[0]?.photos.length !== 0) {
    throw new Error("Smoke sync did not prove deleted photo is hidden");
  }

  if (!memberContributions.some((contribution) => contribution.id === contributionId)) {
    throw new Error("Smoke sync did not prove member contribution listing");
  }

  if (deletedContribution.moderationStatus !== "hidden") {
    throw new Error("Smoke sync did not prove owner contribution deletion");
  }

  if (contributionsAfterContributionDelete.some(
    (contribution) => contribution.id === contributionId,
  )) {
    throw new Error("Smoke sync did not prove deleted contribution is hidden");
  }
} finally {
  await closePool();
}
