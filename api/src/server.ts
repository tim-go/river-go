import { createServer } from "node:http";
import type { IncomingHttpHeaders, ServerResponse } from "node:http";
import {
  getOptionalAuthContext,
  requireAuthContext,
} from "./auth.js";
import { getPort } from "./config.js";
import { isAuthorizedSchedulerOidc } from "./observation-job-auth.js";
import {
  sendBrandedEmailVerification,
  sendBrandedPasswordReset,
} from "./email/auth-emails.js";
import { renderEmailPreview, renderEmailPreviewIndex } from "./email/preview.js";
import {
  getCanonicalRiver,
  isSourceCandidatePoiStatus,
  listCanonicalRivers,
  listSourceCandidatePois,
  updateSourceCandidatePoiStatus,
} from "./canonical-rivers.js";
import {
  applyModerationDecision,
  isModerationDecision,
  isReviewReason,
  listContributionsForMember,
  listContributionsForPoi,
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
  listAllMapPois,
  listMapPoisForRiver,
  listMapPoisForSection,
  reviewMapPoi,
  updateMapPoiVerificationStatus,
} from "./map-pois.js";
import {
  getMemberForAdmin,
  getMemberEmergencyProfile,
  listMembersForAdmin,
  isMemberRole,
  acceptContributorTerms,
  canPublishDirectly,
  isMemberTrustLevel,
  updateMemberProfile,
  requireAdmin,
  requireContributorIdentity,
  requireModerator,
  updateMemberAccessForAdmin,
  upsertMemberEmergencyProfile,
  upsertMemberFromAuth,
} from "./members.js";
import {
  listPhotosForMember,
  listRiverPhotos,
  softDeletePhoto,
} from "./photos.js";
import {
  createPaddleLog,
  deletePaddleLog,
  getPaddleStats,
  listPaddleLogs,
  parsePaddleLogInput,
} from "./paddle-logs.js";
import {
  addGroupMember,
  createGroup,
  getGroupForMember,
  type GroupRole,
  leaveGroup,
  listGroupsForMember,
  parseGroupInput,
  respondToGroupInvite,
  searchInvitableMembers,
} from "./groups.js";
import {
  checkInParticipant,
  createSession,
  getSessionForMember,
  listSessionsForMember,
  parseSessionInput,
  type Rsvp,
  type SessionStatus,
  setSessionIceConsent,
  setSessionRsvp,
  updateSessionStatus,
} from "./group-sessions.js";
import {
  createKitItem,
  deleteKitItem,
  listKitItems,
  parseKitItemInput,
} from "./kit-items.js";
import {
  createMemberSkill,
  deleteMemberSkill,
  listMemberSkills,
  parseMemberSkillInput,
} from "./member-skills.js";
import {
  applyRouteSuggestionDecision,
  createRouteSuggestion,
  isRouteSuggestionDecision,
  listApprovedRouteSuggestions,
  listModerationRouteSuggestions,
  listRouteSuggestionsForMember,
  updateRouteSuggestionForModeration,
} from "./route-suggestions.js";
import {
  applyRouteAdjustmentDecision,
  createRouteAdjustment,
  isRouteAdjustmentDecision,
  listModerationRouteAdjustments,
} from "./route-adjustments.js";
import { listRouteOverrides } from "./route-overrides.js";
import { pushSyncOperations } from "./sync.js";
import {
  lookupCoordinatesForWhat3Words,
  lookupWhat3WordsForCoordinates,
} from "./what3words.js";
import {
  getRecentObservationIngestionJobRun,
  listObservationJobRuns,
  listObservationsForSection,
  listRiverLevelStates,
  listSectionLevelStates,
  runObservationBackfillJob,
  runObservationIngestionJob,
} from "./observations.js";
import {
  listRiverLevelLines,
  listWatercourseImportStatus,
  listWatercoursesForViewport,
  searchWatercoursesByName,
  snapRouteToWatercourses,
  type WatercourseSource,
} from "./watercourses.js";

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

  if (method === "POST" && url.pathname === "/api/auth/email/verification") {
    const authContext = await requireAuthContext(headers);
    const delivery = await sendBrandedEmailVerification({
      firebaseUid: authContext.userId,
    }).catch((error) => {
      console.error("[email] verification send threw:", error);
      return null;
    });
    if (!delivery || delivery.status === "failed") {
      if (delivery) console.error("[email] verification delivery failed:", delivery);
      throw new HttpError(502, "Could not send the verification email.");
    }
    return { status: 200, body: { status: delivery.status } };
  }

  if (method === "POST" && url.pathname === "/api/auth/email/password-reset") {
    // Public endpoint — always return success so it can't be used to discover
    // which email addresses have accounts.
    const email =
      isRecord(body) && typeof body.email === "string" ? body.email : "";
    if (email.trim()) {
      await sendBrandedPasswordReset({ email }).catch((error) => {
        console.error("[email] password-reset send threw:", error);
      });
    }
    return { status: 200, body: { ok: true } };
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

  if (method === "POST" && url.pathname === "/api/me/contributor-terms") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);

    if (
      !isRecord(body) ||
      typeof body.version !== "string" ||
      !body.version.trim()
    ) {
      throw new HttpError(400, "version is required.");
    }

    const updatedMember = await acceptContributorTerms(
      member.id,
      body.version.trim(),
    );
    return { status: 200, body: { member: updatedMember } };
  }

  if (method === "GET" && url.pathname === "/api/me/paddle-logs") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const riverId = url.searchParams.get("riverId");
    const paddleLogs = await listPaddleLogs(member.id, {
      riverId: riverId ?? undefined,
    });
    return { status: 200, body: { paddleLogs } };
  }

  if (method === "POST" && url.pathname === "/api/me/paddle-logs") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const paddleLog = await createPaddleLog(
      member.id,
      parsePaddleLogInput(body),
    );
    return { status: 201, body: { paddleLog } };
  }

  if (method === "GET" && url.pathname === "/api/me/paddle-stats") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const stats = await getPaddleStats(member.id);
    return { status: 200, body: { stats } };
  }

  const paddleLogDeleteMatch = url.pathname.match(
    /^\/api\/me\/paddle-logs\/([^/]+)$/,
  );
  if (method === "DELETE" && paddleLogDeleteMatch) {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    await deletePaddleLog(
      member.id,
      decodeURIComponent(paddleLogDeleteMatch[1]),
    );
    return { status: 200, body: { ok: true } };
  }

  // --- Group Paddle Sessions: groups & membership (GROUP-F1/F2) ---
  if (method === "GET" && url.pathname === "/api/me/groups") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const groups = await listGroupsForMember(member.id);
    return { status: 200, body: { groups } };
  }
  if (method === "POST" && url.pathname === "/api/me/groups") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const group = await createGroup(member.id, parseGroupInput(body));
    return { status: 201, body: { group } };
  }
  if (method === "GET" && url.pathname === "/api/members/search") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const members = await searchInvitableMembers(
      url.searchParams.get("q") ?? "",
      member.id,
    );
    return { status: 200, body: { members } };
  }

  const groupDetailMatch = url.pathname.match(/^\/api\/groups\/([^/]+)$/);
  if (method === "GET" && groupDetailMatch) {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const group = await getGroupForMember(
      member.id,
      decodeURIComponent(groupDetailMatch[1]),
    );
    return { status: 200, body: { group } };
  }

  const groupInviteMatch = url.pathname.match(
    /^\/api\/groups\/([^/]+)\/members$/,
  );
  if (method === "POST" && groupInviteMatch) {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const record = (body ?? {}) as Record<string, unknown>;
    const targetMemberId =
      typeof record.memberId === "string" ? record.memberId : "";
    if (!targetMemberId) {
      throw new HttpError(400, "A member to invite is required.");
    }
    const role =
      typeof record.role === "string" ? (record.role as GroupRole) : "member";
    const groupMember = await addGroupMember(
      member.id,
      decodeURIComponent(groupInviteMatch[1]),
      targetMemberId,
      role,
    );
    return { status: 201, body: { member: groupMember } };
  }

  const groupRespondMatch = url.pathname.match(
    /^\/api\/groups\/([^/]+)\/invite-response$/,
  );
  if (method === "POST" && groupRespondMatch) {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const record = (body ?? {}) as Record<string, unknown>;
    await respondToGroupInvite(
      member.id,
      decodeURIComponent(groupRespondMatch[1]),
      record.accept === true,
    );
    return { status: 200, body: { ok: true } };
  }

  const groupLeaveMatch = url.pathname.match(/^\/api\/groups\/([^/]+)\/leave$/);
  if (method === "POST" && groupLeaveMatch) {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    await leaveGroup(member.id, decodeURIComponent(groupLeaveMatch[1]));
    return { status: 200, body: { ok: true } };
  }

  // --- Group Paddle Sessions: planned sessions & participants (F3/F4/F5/F9) ---
  if (method === "GET" && url.pathname === "/api/me/sessions") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const sessions = await listSessionsForMember(member.id);
    return { status: 200, body: { sessions } };
  }
  if (method === "POST" && url.pathname === "/api/me/sessions") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const session = await createSession(member.id, parseSessionInput(body));
    return { status: 201, body: { session } };
  }

  const sessionDetailMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)$/);
  if (method === "GET" && sessionDetailMatch) {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const session = await getSessionForMember(
      member.id,
      decodeURIComponent(sessionDetailMatch[1]),
    );
    return { status: 200, body: { session } };
  }

  const sessionRsvpMatch = url.pathname.match(
    /^\/api\/sessions\/([^/]+)\/rsvp$/,
  );
  if (method === "POST" && sessionRsvpMatch) {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const record = (body ?? {}) as Record<string, unknown>;
    const rsvp =
      typeof record.rsvp === "string" ? (record.rsvp as Rsvp) : "yes";
    const availabilityNote =
      typeof record.availabilityNote === "string"
        ? record.availabilityNote.trim() || null
        : null;
    await setSessionRsvp(
      member.id,
      decodeURIComponent(sessionRsvpMatch[1]),
      rsvp,
      availabilityNote,
    );
    return { status: 200, body: { ok: true } };
  }

  const sessionCheckInMatch = url.pathname.match(
    /^\/api\/sessions\/([^/]+)\/check-in$/,
  );
  if (method === "POST" && sessionCheckInMatch) {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const record = (body ?? {}) as Record<string, unknown>;
    const targetMemberId =
      typeof record.memberId === "string" && record.memberId
        ? record.memberId
        : member.id;
    await checkInParticipant(
      member.id,
      decodeURIComponent(sessionCheckInMatch[1]),
      targetMemberId,
      record.checkedIn !== false,
    );
    return { status: 200, body: { ok: true } };
  }

  const sessionStatusMatch = url.pathname.match(
    /^\/api\/sessions\/([^/]+)\/status$/,
  );
  if (method === "POST" && sessionStatusMatch) {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const record = (body ?? {}) as Record<string, unknown>;
    const status =
      typeof record.status === "string"
        ? (record.status as SessionStatus)
        : "planned";
    const session = await updateSessionStatus(
      member.id,
      decodeURIComponent(sessionStatusMatch[1]),
      status,
      {
        outcomeNotes:
          typeof record.outcomeNotes === "string"
            ? record.outcomeNotes.trim() || null
            : null,
        outcomeLevelNote:
          typeof record.outcomeLevelNote === "string"
            ? record.outcomeLevelNote.trim() || null
            : null,
      },
    );
    return { status: 200, body: { session } };
  }

  const sessionIceMatch = url.pathname.match(
    /^\/api\/sessions\/([^/]+)\/ice-consent$/,
  );
  if (method === "POST" && sessionIceMatch) {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const record = (body ?? {}) as Record<string, unknown>;
    await setSessionIceConsent(
      member.id,
      decodeURIComponent(sessionIceMatch[1]),
      record.consent === true,
    );
    return { status: 200, body: { ok: true } };
  }

  if (method === "GET" && url.pathname === "/api/me/kit-items") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const kitItems = await listKitItems(member.id);
    return { status: 200, body: { kitItems } };
  }

  if (method === "POST" && url.pathname === "/api/me/kit-items") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const kitItem = await createKitItem(member.id, parseKitItemInput(body));
    return { status: 201, body: { kitItem } };
  }

  const kitItemDeleteMatch = url.pathname.match(
    /^\/api\/me\/kit-items\/([^/]+)$/,
  );
  if (method === "DELETE" && kitItemDeleteMatch) {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    await deleteKitItem(member.id, decodeURIComponent(kitItemDeleteMatch[1]));
    return { status: 200, body: { ok: true } };
  }

  if (method === "GET" && url.pathname === "/api/me/skills") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const skills = await listMemberSkills(member.id);
    return { status: 200, body: { skills } };
  }

  if (method === "POST" && url.pathname === "/api/me/skills") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const skill = await createMemberSkill(
      member.id,
      parseMemberSkillInput(body),
    );
    return { status: 201, body: { skill } };
  }

  const skillDeleteMatch = url.pathname.match(/^\/api\/me\/skills\/([^/]+)$/);
  if (method === "DELETE" && skillDeleteMatch) {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    await deleteMemberSkill(member.id, decodeURIComponent(skillDeleteMatch[1]));
    return { status: 200, body: { ok: true } };
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

  if (method === "GET" && url.pathname === "/api/admin/observations/jobs") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    requireModerator(member);
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
    const jobRuns = await listObservationJobRuns(
      Number.isFinite(limit) ? Math.max(1, Math.min(limit, 100)) : 20,
    );
    return { status: 200, body: { jobRuns } };
  }

  if (method === "GET" && url.pathname === "/api/admin/watercourses/status") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    requireAdmin(member);
    const watercourseImports = await listWatercourseImportStatus();
    return { status: 200, body: { watercourseImports } };
  }

  if (method === "POST" && url.pathname === "/api/jobs/observations/ingest") {
    await requireObservationJobAccess(headers);
    const recentJobRun = await getRecentObservationIngestionJobRun(15);

    if (recentJobRun) {
      throw new HttpError(
        429,
        `Observation ingestion was already started at ${recentJobRun.startedAt}. Try again after 15 minutes.`,
      );
    }

    const jobRun = await runObservationIngestionJob();
    return { status: 200, body: { jobRun } };
  }

  if (method === "POST" && url.pathname === "/api/jobs/observations/backfill") {
    await requireObservationJobAccess(headers);
    const jobRun = await runObservationBackfillJob(readBackfillHours(body));
    return { status: 200, body: { jobRun } };
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

  if (method === "GET" && url.pathname === "/api/me/route-suggestions") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const routeSuggestions = await listRouteSuggestionsForMember(member.id);
    return { status: 200, body: { routeSuggestions } };
  }

  if (method === "GET" && url.pathname === "/api/route-overrides") {
    const routeOverrides = await listRouteOverrides();
    return { status: 200, body: { routeOverrides } };
  }

  if (method === "GET" && url.pathname === "/api/route-suggestions/approved") {
    const routeSuggestions = await listApprovedRouteSuggestions();
    return { status: 200, body: { routeSuggestions } };
  }

  if (method === "GET" && url.pathname === "/api/rivers") {
    const rivers = await listCanonicalRivers();
    return { status: 200, body: { rivers } };
  }

  const riverMapPoisMatch = url.pathname.match(/^\/api\/rivers\/([^/]+)\/map-pois$/);
  if (method === "GET" && riverMapPoisMatch) {
    const authContext = await getOptionalAuthContext(headers);
    const member = authContext ? await upsertMemberFromAuth(authContext) : null;
    const pois = await listMapPoisForRiver(
      decodeURIComponent(riverMapPoisMatch[1]),
      member?.id,
    );
    return { status: 200, body: { pois } };
  }

  const riverPhotosMatch = url.pathname.match(
    /^\/api\/rivers\/([^/]+)\/photos$/,
  );
  if (method === "GET" && riverPhotosMatch) {
    const photos = await listRiverPhotos(
      decodeURIComponent(riverPhotosMatch[1]),
    );
    return { status: 200, body: { photos } };
  }

  if (method === "GET" && url.pathname === "/api/rivers/level-states") {
    const riverLevelStates = await listRiverLevelStates();
    return { status: 200, body: { riverLevelStates } };
  }

  if (method === "GET" && url.pathname === "/api/rivers/level-lines") {
    const riverLevelLines = await listRiverLevelLines();
    return { status: 200, body: { riverLevelLines } };
  }

  if (method === "GET" && url.pathname === "/api/map-pois") {
    const pois = await listAllMapPois();
    return { status: 200, body: { pois } };
  }

  const riverDetailMatch = url.pathname.match(/^\/api\/rivers\/([^/]+)$/);
  if (method === "GET" && riverDetailMatch) {
    const river = await getCanonicalRiver(decodeURIComponent(riverDetailMatch[1]));
    return { status: 200, body: { river } };
  }

  if (method === "POST" && url.pathname === "/api/route-suggestions") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const routeSuggestion = await createRouteSuggestion(body, member);
    return { status: 201, body: { routeSuggestion } };
  }

  if (method === "POST" && url.pathname === "/api/routes/snap") {
    await requireAuthContext(headers);
    const snap = await snapRouteToWatercourses(body);
    return { status: 200, body: { snap } };
  }

  if (method === "GET" && url.pathname === "/api/watercourses") {
    const bbox = readBbox(url.searchParams.get("bbox"));
    const watercourses = await listWatercoursesForViewport({
      ...bbox,
      zoom: readOptionalNumber(url.searchParams.get("zoom")),
      limit: readOptionalNumber(url.searchParams.get("limit")),
      source: readWatercourseSource(url.searchParams.get("source")),
    });
    return { status: 200, body: { watercourses } };
  }

  if (method === "GET" && url.pathname === "/api/watercourses/search") {
    const watercourses = await searchWatercoursesByName({
      query: url.searchParams.get("q"),
      limit: readOptionalNumber(url.searchParams.get("limit")),
      source: readWatercourseSource(url.searchParams.get("source")),
    });
    return { status: 200, body: { watercourses } };
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

  if (method === "GET" && url.pathname === "/api/moderation/source-candidate-pois") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    requireModerator(member);
    const candidates = await listSourceCandidatePois({
      riverId: url.searchParams.get("riverId"),
      status: readSourceCandidatePoiStatus(url.searchParams.get("status")),
      limit: readOptionalNumber(url.searchParams.get("limit")),
    });
    return { status: 200, body: { candidates } };
  }

  if (method === "GET" && url.pathname === "/api/moderation/route-suggestions") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    requireModerator(member);
    const routeSuggestions = await listModerationRouteSuggestions();
    return { status: 200, body: { routeSuggestions } };
  }

  const routeSuggestionUpdateMatch = url.pathname.match(
    /^\/api\/moderation\/route-suggestions\/([^/]+)$/,
  );
  if (method === "PATCH" && routeSuggestionUpdateMatch) {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    requireModerator(member);
    const routeSuggestion = await updateRouteSuggestionForModeration(
      decodeURIComponent(routeSuggestionUpdateMatch[1]),
      body,
    );
    return { status: 200, body: { routeSuggestion } };
  }

  if (method === "GET" && url.pathname === "/api/moderation/route-adjustments") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    requireModerator(member);
    const routeAdjustments = await listModerationRouteAdjustments();
    return { status: 200, body: { routeAdjustments } };
  }

  if (method === "POST" && url.pathname === "/api/moderation/route-adjustments") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    requireModerator(member);
    const routeAdjustment = await createRouteAdjustment(body, member);
    return { status: 201, body: { routeAdjustment } };
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
      isReviewReason(body.reason) ? body.reason : null,
    );
    return { status: 200, body: { contribution } };
  }

  const routeSuggestionDecisionMatch = url.pathname.match(
    /^\/api\/moderation\/route-suggestions\/([^/]+)\/decision$/,
  );
  if (method === "POST" && routeSuggestionDecisionMatch) {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    requireModerator(member);

    if (!isRecord(body) || !isRouteSuggestionDecision(body.decision)) {
      throw new HttpError(400, "decision is required.");
    }

    const routeSuggestion = await applyRouteSuggestionDecision(
      decodeURIComponent(routeSuggestionDecisionMatch[1]),
      body.decision,
    );
    return { status: 200, body: { routeSuggestion } };
  }

  const routeAdjustmentDecisionMatch = url.pathname.match(
    /^\/api\/moderation\/route-adjustments\/([^/]+)\/decision$/,
  );
  if (method === "POST" && routeAdjustmentDecisionMatch) {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    requireModerator(member);

    if (!isRecord(body) || !isRouteAdjustmentDecision(body.decision)) {
      throw new HttpError(400, "decision is required.");
    }

    const routeAdjustment = await applyRouteAdjustmentDecision(
      decodeURIComponent(routeAdjustmentDecisionMatch[1]),
      body.decision,
      member,
    );
    return { status: 200, body: { routeAdjustment } };
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

  const sourceCandidateStatusMatch = url.pathname.match(
    /^\/api\/moderation\/source-candidate-pois\/([^/]+)\/status$/,
  );
  if (method === "POST" && sourceCandidateStatusMatch) {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    requireModerator(member);

    if (!isRecord(body) || !isSourceCandidatePoiStatus(body.status)) {
      throw new HttpError(400, "status is required.");
    }

    const candidate = await updateSourceCandidatePoiStatus(
      decodeURIComponent(sourceCandidateStatusMatch[1]),
      body.status,
      member,
      typeof body.note === "string" ? body.note : null,
    );
    return { status: 200, body: { candidate } };
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

  const mapPoiContributionsMatch = url.pathname.match(
    /^\/api\/map-pois\/([^/]+)\/contributions$/,
  );
  if (method === "GET" && mapPoiContributionsMatch) {
    const authContext = await getOptionalAuthContext(headers);
    const member = authContext ? await upsertMemberFromAuth(authContext) : null;
    const contributions = await listContributionsForPoi(
      decodeURIComponent(mapPoiContributionsMatch[1]),
      member?.id ?? null,
    );
    return { status: 200, body: { contributions } };
  }

  if (method === "GET" && url.pathname === "/api/sections/level-states") {
    const levelStates = await listSectionLevelStates();
    return { status: 200, body: { levelStates } };
  }

  const sectionObservationsMatch = url.pathname.match(
    /^\/api\/sections\/([^/]+)\/observations$/,
  );
  if (method === "GET" && sectionObservationsMatch) {
    const hours = Number.parseInt(url.searchParams.get("hours") ?? "48", 10);
    const measures = await listObservationsForSection(
      decodeURIComponent(sectionObservationsMatch[1]),
      Number.isFinite(hours) ? hours : 48,
    );
    return { status: 200, body: { measures } };
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
    requireContributorIdentity(authContext, member);

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
    requireContributorIdentity(authContext, member);
    const result = await pushSyncOperations(body, {
      firebaseUid: authContext.userId,
      memberId: member.id,
      canPublishDirectly: canPublishDirectly(member),
    });
    return { status: result.failed.length ? 207 : 200, body: result };
  }

  throw new HttpError(404, "Not found");
}

export function createApiServer() {
  return createServer(async (request, response) => {
    try {
      const method = request.method ?? "GET";
      if (
        method === "GET" &&
        (request.url ?? "").startsWith("/api/dev/email-preview")
      ) {
        sendEmailPreview(response, new URL(request.url ?? "/", "http://localhost"));
        return;
      }
      const body = ["PATCH", "POST", "PUT"].includes(method)
        ? await readJsonBody(request)
        : {};
      const result = await route(request.url ?? "/", method, request.headers, body);
      sendJson(response, result);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof Error ? error.message : "Internal server error";
      console.error(
        `[api] ${request.method ?? "?"} ${request.url ?? "?"} -> ${status}: ${message}`,
      );
      sendJson(response, { status, body: { error: message } });
    }
  });
}

// Dev-only: render service email templates with sample data for local preview.
function sendEmailPreview(response: ServerResponse, url: URL): void {
  if (process.env.NODE_ENV === "production") {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const template = url.searchParams.get("template");
  const format = url.searchParams.get("format") === "text" ? "text" : "html";

  if (!template) {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(renderEmailPreviewIndex());
    return;
  }

  const rendered = renderEmailPreview(template, format);
  if (rendered == null) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(`Unknown template: ${template}`);
    return;
  }

  response.writeHead(200, {
    "Content-Type":
      format === "text" ? "text/plain; charset=utf-8" : "text/html; charset=utf-8",
  });
  response.end(rendered);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readBackfillHours(body: unknown): number {
  if (!isRecord(body)) {
    return 672;
  }

  const value = body.hours;
  const parsedHours =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isFinite(parsedHours)) {
    return 672;
  }

  return Math.max(1, Math.min(parsedHours, 672));
}

function readBbox(value: string | null) {
  if (!value) {
    throw new HttpError(400, "bbox is required.");
  }

  const parts = value.split(",").map((part) => Number.parseFloat(part.trim()));

  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    throw new HttpError(400, "bbox must be minLng,minLat,maxLng,maxLat.");
  }

  const [minLng, minLat, maxLng, maxLat] = parts;
  return { minLng, minLat, maxLng, maxLat };
}

function readOptionalNumber(value: string | null): number | null {
  if (value == null || value.trim() === "") {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readWatercourseSource(value: string | null): WatercourseSource | null {
  if (value === "osm_waterway") {
    return value;
  }

  return null;
}

function readSourceCandidatePoiStatus(value: string | null) {
  if (!value || value === "all") {
    return null;
  }

  if (!isSourceCandidatePoiStatus(value)) {
    throw new HttpError(400, "Invalid candidate status.");
  }

  return value;
}

async function requireObservationJobAccess(
  headers: IncomingHttpHeaders,
): Promise<void> {
  // Cloud Scheduler authenticates with a Google-signed OIDC token (verified in
  // observation-job-auth). Otherwise fall back to a logged-in moderator — the
  // Admin "Refresh river levels" control.
  if (await isAuthorizedSchedulerOidc(headers)) {
    return;
  }

  const authContext = await requireAuthContext(headers);
  const member = await upsertMemberFromAuth(authContext);
  requireModerator(member);
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
