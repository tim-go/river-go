import { createServer } from "node:http";
import type { IncomingHttpHeaders } from "node:http";
import {
  getOptionalAuthContext,
  requireAuthContext,
} from "./auth.js";
import { getPort } from "./config.js";
import {
  applyModerationDecision,
  isModerationDecision,
  listContributionsForMember,
  listContributionsForSection,
  listModerationContributions,
  softDeleteContribution,
} from "./contributions.js";
import { closePool, pool } from "./db.js";
import { HttpError, readJsonBody, sendJson } from "./http.js";
import {
  isMapPoiVerificationStatus,
  isMapPoiReviewAction,
  isMapPoiReviewDecision,
  listMapPoiCorrectionReviews,
  listMapPoisForSection,
  reviewMapPoi,
  updateMapPoiVerificationStatus,
} from "./map-pois.js";
import {
  getMemberForAdmin,
  getMemberEmergencyProfile,
  listMembersForAdmin,
  isMemberRole,
  isMemberTrustLevel,
  updateMemberProfile,
  requireAdmin,
  requireModerator,
  updateMemberAccessForAdmin,
  upsertMemberEmergencyProfile,
  upsertMemberFromAuth,
} from "./members.js";
import { listPhotosForMember, softDeletePhoto } from "./photos.js";
import { pushSyncOperations } from "./sync.js";
import {
  lookupCoordinatesForWhat3Words,
  lookupWhat3WordsForCoordinates,
} from "./what3words.js";

async function route(
  requestUrl: string,
  method: string,
  headers: IncomingHttpHeaders,
  body: unknown,
): Promise<{ status: number; body: unknown }> {
  const url = new URL(requestUrl, "http://localhost");

  if (method === "GET" && url.pathname === "/api/health") {
    const db = await pool.query("SELECT 1 AS ok");

    return {
      status: 200,
      body: {
        ok: true,
        database: db.rows[0].ok === 1 ? "ok" : "unknown",
      },
    };
  }

  if (method === "GET" && url.pathname === "/api/me") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    return { status: 200, body: { member } };
  }

  if (method === "PATCH" && url.pathname === "/api/me/profile") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);

    if (!isRecord(body) || typeof body.publicName !== "string") {
      throw new HttpError(400, "publicName is required.");
    }

    const updatedMember = await updateMemberProfile(member.id, body.publicName);
    return { status: 200, body: { member: updatedMember } };
  }

  if (method === "GET" && url.pathname === "/api/me/emergency-profile") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const emergencyProfile = await getMemberEmergencyProfile(member.id);
    return { status: 200, body: { emergencyProfile } };
  }

  if (method === "PUT" && url.pathname === "/api/me/emergency-profile") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);

    if (
      !isRecord(body) ||
      typeof body.emergencyContactName !== "string" ||
      typeof body.emergencyContactPhone !== "string" ||
      typeof body.emergencyContactRelationship !== "string"
    ) {
      throw new HttpError(
        400,
        "emergencyContactName, emergencyContactPhone, and emergencyContactRelationship are required.",
      );
    }

    const emergencyProfile = await upsertMemberEmergencyProfile(member.id, {
      emergencyContactName: body.emergencyContactName,
      emergencyContactPhone: body.emergencyContactPhone,
      emergencyContactRelationship: body.emergencyContactRelationship,
    });
    return { status: 200, body: { emergencyProfile } };
  }

  if (method === "GET" && url.pathname === "/api/locations/what3words") {
    const lat = Number.parseFloat(url.searchParams.get("lat") ?? "");
    const lng = Number.parseFloat(url.searchParams.get("lng") ?? "");
    const words = url.searchParams.get("words");

    if (words) {
      return {
        status: 200,
        body: await lookupCoordinatesForWhat3Words(words),
      };
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new HttpError(400, "lat and lng are required.");
    }

    return {
      status: 200,
      body: await lookupWhat3WordsForCoordinates(lat, lng),
    };
  }

  if (method === "GET" && url.pathname === "/api/admin/members") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    requireAdmin(member);
    const members = await listMembersForAdmin();
    return { status: 200, body: { members } };
  }

  const adminMemberDetailMatch = url.pathname.match(
    /^\/api\/admin\/members\/([^/]+)$/,
  );
  if (method === "GET" && adminMemberDetailMatch) {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    requireAdmin(member);
    const targetMemberId = decodeURIComponent(adminMemberDetailMatch[1]);
    const targetMember = await getMemberForAdmin(targetMemberId);
    const contributions = await listContributionsForMember(targetMember.id);
    const photos = await listPhotosForMember(targetMember.id);

    return {
      status: 200,
      body: {
        member: targetMember,
        stats: {
          contributionCount: contributions.length,
          photoCount: photos.length,
        },
        contributions,
        photos,
      },
    };
  }

  if (method === "GET" && url.pathname === "/api/me/photos") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const photos = await listPhotosForMember(member.id);
    return { status: 200, body: { photos } };
  }

  if (method === "GET" && url.pathname === "/api/me/contributions") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const contributions = await listContributionsForMember(member.id);
    return { status: 200, body: { contributions } };
  }

  const contributionDeleteMatch = url.pathname.match(
    /^\/api\/contributions\/([^/]+)$/,
  );
  if (method === "DELETE" && contributionDeleteMatch) {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const contribution = await softDeleteContribution(
      decodeURIComponent(contributionDeleteMatch[1]),
      member,
    );
    return { status: 200, body: { contribution } };
  }

  const photoDeleteMatch = url.pathname.match(/^\/api\/photos\/([^/]+)$/);
  if (method === "DELETE" && photoDeleteMatch) {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const photo = await softDeletePhoto(
      decodeURIComponent(photoDeleteMatch[1]),
      member,
    );
    return { status: 200, body: { photo } };
  }

  const adminMemberAccessMatch = url.pathname.match(
    /^\/api\/admin\/members\/([^/]+)\/access$/,
  );
  if (method === "POST" && adminMemberAccessMatch) {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    requireAdmin(member);

    if (!isRecord(body) || !isMemberRole(body.role) || !isMemberTrustLevel(body.trustLevel)) {
      throw new HttpError(400, "role and trustLevel are required.");
    }

    const updatedMember = await updateMemberAccessForAdmin(
      decodeURIComponent(adminMemberAccessMatch[1]),
      body.role,
      body.trustLevel,
    );
    return { status: 200, body: { member: updatedMember } };
  }

  if (method === "GET" && url.pathname === "/api/moderation/contributions") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    requireModerator(member);
    const contributions = await listModerationContributions();
    return { status: 200, body: { contributions } };
  }

  if (method === "GET" && url.pathname === "/api/moderation/map-poi-reviews") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    requireModerator(member);
    const reviews = await listMapPoiCorrectionReviews();
    return { status: 200, body: { reviews } };
  }

  const moderationDecisionMatch = url.pathname.match(
    /^\/api\/moderation\/contributions\/([^/]+)\/decision$/,
  );
  if (method === "POST" && moderationDecisionMatch) {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    requireModerator(member);

    if (!isRecord(body) || !isModerationDecision(body.decision)) {
      throw new HttpError(400, "decision is required.");
    }

    const contribution = await applyModerationDecision(
      decodeURIComponent(moderationDecisionMatch[1]),
      body.decision,
    );
    return { status: 200, body: { contribution } };
  }

  const mapPoiVerificationMatch = url.pathname.match(
    /^\/api\/moderation\/map-pois\/([^/]+)\/verification$/,
  );
  if (method === "POST" && mapPoiVerificationMatch) {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    requireModerator(member);

    if (!isRecord(body) || !isMapPoiVerificationStatus(body.status)) {
      throw new HttpError(400, "status is required.");
    }

    const poi = await updateMapPoiVerificationStatus(
      decodeURIComponent(mapPoiVerificationMatch[1]),
      body.status,
    );
    return { status: 200, body: { poi } };
  }

  const sectionContributionsMatch = url.pathname.match(
    /^\/api\/sections\/([^/]+)\/contributions$/,
  );
  if (method === "GET" && sectionContributionsMatch) {
    const authContext = await getOptionalAuthContext(headers);
    const member = authContext ? await upsertMemberFromAuth(authContext) : null;
    const contributions = await listContributionsForSection(
      decodeURIComponent(sectionContributionsMatch[1]),
      member?.id ?? null,
    );
    return { status: 200, body: { contributions } };
  }

  const sectionMapPoisMatch = url.pathname.match(
    /^\/api\/sections\/([^/]+)\/map-pois$/,
  );
  if (method === "GET" && sectionMapPoisMatch) {
    const authContext = await getOptionalAuthContext(headers);
    const member = authContext ? await upsertMemberFromAuth(authContext) : null;
    const pois = await listMapPoisForSection(
      decodeURIComponent(sectionMapPoisMatch[1]),
      member?.id,
    );
    return { status: 200, body: { pois } };
  }

  const mapPoiReviewMatch = url.pathname.match(
    /^\/api\/map-pois\/([^/]+)\/reviews$/,
  );
  if (method === "POST" && mapPoiReviewMatch) {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);

    if (!isRecord(body) || !isMapPoiReviewDecision(body.decision)) {
      throw new HttpError(400, "decision is required.");
    }

    const action = isMapPoiReviewAction(body.action) ? body.action : "add";
    const poi = await reviewMapPoi(
      decodeURIComponent(mapPoiReviewMatch[1]),
      member,
      body.decision,
      action,
      typeof body.note === "string" ? body.note : null,
    );
    return { status: 200, body: { poi } };
  }

  if (method === "POST" && url.pathname === "/api/sync/push") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const result = await pushSyncOperations(body, {
      firebaseUid: authContext.userId,
      memberId: member.id,
    });
    return { status: result.failed.length ? 207 : 200, body: result };
  }

  throw new HttpError(404, "Not found");
}

export function createApiServer() {
  return createServer(async (request, response) => {
    try {
      const body = ["PATCH", "POST", "PUT"].includes(request.method ?? "")
        ? await readJsonBody(request)
        : {};
      const result = await route(
        request.url ?? "/",
        request.method ?? "GET",
        request.headers,
        body,
      );
      sendJson(response, result);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof Error ? error.message : "Internal server error";
      sendJson(response, { status, body: { error: message } });
    }
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = getPort();
  const server = createApiServer();

  server.listen(port, () => {
    console.log(`RiverLaunch.app API listening on http://127.0.0.1:${port}`);
  });

  process.on("SIGTERM", () => {
    server.close(() => {
      closePool().finally(() => process.exit(0));
    });
  });
}
