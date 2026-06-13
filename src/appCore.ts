import L from "leaflet";
import {
  AlertTriangle,
  Camera,
  MapPin,
  MapPinned,
  MessageSquare,
} from "lucide-react";
import { getSeedPoiWhat3Words } from "./data/seedLocationReferences";
import { distanceKmBetween, routeDistanceKm } from "./lib/format";
import { contributionStatusLabel } from "./lib/contributionLabels";
import { googleMapsDirectionsUrl } from "./services/locationReferences";
import type {
  Contribution,
  ContributionOutboxRecord,
  ContributionSyncStatus,
  ContributionType,
  LatLngTuple,
  LiveLocationSnapshot,
  MapPoi,
  RiverSection,
  SelectedPoi,
} from "./types";
import type {
  CanonicalRiverSummary,
  SourceCandidatePoiStatus,
} from "./services/canonicalRiverApi";
import type { KnownWatercourse } from "./services/watercourseApi";
import type { MemberRole, MemberTrustLevel } from "./services/memberApi";
import type { ModerationDecision } from "./services/contributionApi";
import type { ObservationParameter } from "./services/observationApi";
import type {
  RouteAdjustment,
  RouteAdjustmentDecision,
} from "./services/routeAdjustmentApi";
import type { RouteSuggestionDecision } from "./services/routeSuggestionApi";

export const SYNC_BANNER_DISMISS_MS = 60 * 60 * 1000;
export const SEARCH_FOCUS_ZOOM = 15;
export const LIVE_LOCATION_FOCUS_ZOOM = 16;
export const POI_FOCUS_ZOOM = 17;
export const MOBILE_DETAIL_PANEL_QUERY = "(max-width: 720px)";
export const NEARBY_POI_MAX_KM = 5;
export const ROUTE_POINT_DEDUPE_METRES = 3;
export const ROUTE_SNAP_MAX_AVERAGE_DISTANCE_KM = 1.5;
export const COMPACT_MAP_CONTROLS_QUERY = "(max-width: 430px)";
export const ROUTE_IMPACT_CORRIDOR_METRES = 120;
export const ROUTE_IMPACT_ENDPOINT_WARNING_METRES = 350;
export const KNOWN_RIVER_FALLBACK_COLOUR = "#b42318";
export const SELECTED_WATERCOURSE_FALLBACK_COLOUR = "#0f766e";
export const WATERCOURSE_CONTEXT_CORRIDOR_METRES = 250;

export type RouteDetailsTab =
  | "details"
  | "levels"
  | "access"
  | "hazards"
  | "updates"
  | "photos";

export type ObservationRangeHours = 48 | 168 | 672;

export const bandLabels = {
  "too-low": "Too low",
  good: "Good",
  high: "High",
  unknown: "Unknown",
};

export const observationParameterLabels: Record<ObservationParameter, string> = {
  river_level: "River level",
  river_flow: "River flow",
  rainfall: "Rainfall",
  tidal_level: "Tidal level",
  sea_level: "Sea level",
  release: "Release",
  forecast: "Forecast",
};

export const observationRangeOptions: Array<{
  hours: ObservationRangeHours;
  label: string;
  rangeLabel: string;
  chartLabel: string;
}> = [
  { hours: 48, label: "48h", rangeLabel: "48h range", chartLabel: "Last 48 hours" },
  { hours: 168, label: "7d", rangeLabel: "7 day range", chartLabel: "Last 7 days" },
  { hours: 672, label: "28d", rangeLabel: "28 day range", chartLabel: "Last 28 days" },
];

export const routeDetailsTabs: Array<{ id: RouteDetailsTab; label: string }> = [
  { id: "details", label: "Details" },
  { id: "levels", label: "Levels" },
  { id: "access", label: "Access" },
  { id: "hazards", label: "Hazards" },
  { id: "updates", label: "Updates" },
  { id: "photos", label: "Photos" },
];


export const contributionOptions: Array<{
  type: ContributionType;
  label: string;
  icon: typeof AlertTriangle;
  titlePlaceholder: string;
  detailPlaceholder: string;
  locationRequired: boolean;
}> = [
  {
    type: "report",
    label: "Condition",
    icon: MessageSquare,
    titlePlaceholder: "Good level for open canoes",
    detailPlaceholder: "What did you paddle, when, and how did the level feel?",
    locationRequired: false,
  },
  {
    type: "hazard",
    label: "Hazard",
    icon: AlertTriangle,
    titlePlaceholder: "Fallen tree below bridge",
    detailPlaceholder: "Describe the hazard, line, level, and when you saw it.",
    locationRequired: true,
  },
  {
    type: "access",
    label: "Access",
    icon: MapPinned,
    titlePlaceholder: "Take-out gate locked",
    detailPlaceholder: "Describe the access point, parking, fees, or restriction.",
    locationRequired: true,
  },
  {
    type: "photo",
    label: "Photo",
    icon: Camera,
    titlePlaceholder: "Photo of launch steps",
    detailPlaceholder: "Describe what the photo shows and where it was taken.",
    locationRequired: true,
  },
  {
    type: "feature",
    label: "Feature",
    icon: MapPin,
    titlePlaceholder: "Useful lunch beach",
    detailPlaceholder: "Describe the feature and when it is useful.",
    locationRequired: true,
  },
];

export const categoryOptions: Record<ContributionType, string[]> = {
  report: ["level", "recent paddle", "crowding", "weather", "other"],
  hazard: [
    "weir",
    "strainer",
    "bridge",
    "shallow water",
    "navigation conflict",
    "other",
  ],
  access: ["put-in", "take-out", "parking", "portage", "restriction", "other"],
  photo: [
    "access photo",
    "hazard photo",
    "river view",
    "level reference",
    "other",
  ],
  feature: [
    "general feature",
    "rapid",
    "wave",
    "eddy",
    "landing",
    "facility",
    "bridge",
    "rest stop",
    "navigation",
    "other",
  ],
};

export type AdminPage = "index" | "members" | "member-detail" | "moderation" | "system";
export type RouteCreateMode = "idle" | "tracing" | "form";
export type RouteDraftTarget =
  | { type: "new" }
  | { type: "section"; id: string; label: string }
  | { type: "route_suggestion"; id: string; label: string }
  | { type: "route_suggestion_edit"; id: string; label: string };
export type RouteSnapCandidate = {
  id: string;
  label: string;
  route: LatLngTuple[];
};
export type SearchMode = "name" | "waterways" | "point" | "favourites";
export type ProfileMode =
  | "account"
  | "public"
  | "emergency"
  | "sync"
  | "activity"
  | "photos";

export const memberRoleOptions: MemberRole[] = [
  "MEMBER",
  "TRUSTED_MEMBER",
  "CONTRIB_MODERATOR",
  "ADMIN",
];
export const memberTrustOptions: MemberTrustLevel[] = ["NEW", "KNOWN", "TRUSTED"];



export const routeSuggestionActions: Array<{
  decision: RouteSuggestionDecision;
  label: string;
}> = [
  { decision: "request-review", label: "Back to review" },
  { decision: "approve", label: "Approve candidate" },
  { decision: "needs-info", label: "Needs more info" },
  { decision: "reject", label: "Reject" },
  { decision: "hide", label: "Hide" },
];

export const routeAdjustmentActions: Array<{
  decision: RouteAdjustmentDecision;
  label: string;
}> = [
  { decision: "request-review", label: "Back to review" },
  { decision: "approve", label: "Approve edit" },
  { decision: "needs-info", label: "Needs more info" },
  { decision: "reject", label: "Reject" },
  { decision: "hide", label: "Hide" },
];

export const sourceCandidateStatusActions: Array<{
  status: SourceCandidatePoiStatus;
  label: string;
}> = [
  { status: "confirmed", label: "Confirm candidate" },
  { status: "rejected", label: "Reject" },
  { status: "merged", label: "Mark merged" },
  { status: "review_needed", label: "Back to review" },
];

export type MemberRoleFilter = "all" | MemberRole;
export type MemberTrustFilter = "all" | MemberTrustLevel;
export type ModerationTab =
  | "route-edits"
  | "route-suggestions"
  | "contributions"
  | "corrections"
  | "source-candidates";
export type ModerationDraftDecision = ModerationDecision | "";
export type RouteModerationDraftDecision = RouteSuggestionDecision | "";
export type RouteAdjustmentDraftDecision = RouteAdjustmentDecision | "";
export type SourceCandidateDraftStatus = SourceCandidatePoiStatus | "";
export type PendingPhotoDelete = { id: string; title: string };
export type PendingPointDelete = { id: string; title: string };
export type LiveLocationStatus =
  | "idle"
  | "locating"
  | "watching"
  | "denied"
  | "unavailable"
  | "error";
export type NearbyPoiResult = {
  id: string;
  kind: "access" | "hazard" | "feature" | "gauge" | "contribution";
  title: string;
  subtitle: string;
  section: RiverSection;
  location: LatLngTuple;
  distanceKm: number;
};
export type RouteImpactPoi = {
  id: string;
  title: string;
  kind: "access" | "hazard" | "feature" | "gauge" | "contribution";
  beforeDistanceM: number;
  afterDistanceM: number;
};
export type RouteAdjustmentImpact = {
  currentDistanceKm: number | null;
  proposedDistanceKm: number;
  distanceDeltaKm: number | null;
  pointsChecked: number;
  movedOutside: RouteImpactPoi[];
  newlyNear: RouteImpactPoi[];
  endpointWarnings: string[];
};
export type LocationSearchResult = {
  label: string;
  location: LatLngTuple;
  nearestPlace?: string;
  country?: string;
  focusSection?: RiverSection;
  pois: NearbyPoiResult[];
};
export type WatercourseContextPoi = {
  id: string;
  kind: NearbyPoiResult["kind"];
  title: string;
  subtitle: string;
  section: RiverSection;
  location: LatLngTuple;
  distanceM: number;
};
export type WatercourseContextSection = {
  section: RiverSection;
  distanceM: number;
};


export type MapFocusPlacement =
  | "center"
  | "mobile-top-half"
  | "mobile-top-half-or-center";
export type MapPoiDisplayCategory =
  | "rapid"
  | "whitewater"
  | "structure"
  | "access"
  | "navigation"
  | "utility"
  | "hazard"
  | "gauge"
  | "feature";
export interface MapCameraSnapshot {
  centre: LatLngTuple;
  zoom: number;
}

export interface MapPoiDisplayMeta {
  category: MapPoiDisplayCategory;
  label: string;
  markerKind: string;
  markerLabel: string;
  grade?: string;
}

export interface OpenPoiDetailsOptions {
  focusMap?: boolean;
  focusPlacement?: MapFocusPlacement;
}


export function syncActionLabel({
  queuedOutboxCount,
  isSyncingOutbox,
}: {
  queuedOutboxCount: number;
  isSyncingOutbox: boolean;
}) {
  if (isSyncingOutbox) {
    return "Syncing local changes";
  }

  if (queuedOutboxCount > 0) {
    return `${queuedOutboxCount} local change${
      queuedOutboxCount === 1 ? "" : "s"
    } waiting to sync`;
  }

  return "All local changes synced";
}




export function optionForType(type: ContributionType) {
  return contributionOptions.find((option) => option.type === type)!;
}




export function getObservationRangeOption(hours: ObservationRangeHours) {
  return (
    observationRangeOptions.find((option) => option.hours === hours) ??
    observationRangeOptions[0]
  );
}


export function focusMapOnDetailLocation(
  map: L.Map,
  location: LatLngTuple,
  placement: MapFocusPlacement,
) {
  const zoom = Math.max(map.getZoom(), POI_FOCUS_ZOOM);
  map.invalidateSize();

  const shouldUseMobileTopHalf =
    (placement === "mobile-top-half" ||
      placement === "mobile-top-half-or-center") &&
    typeof window !== "undefined" &&
    window.matchMedia(MOBILE_DETAIL_PANEL_QUERY).matches;

  if (shouldUseMobileTopHalf) {
    const size = map.getSize();
    const point = map.project(L.latLng(location), zoom);
    const centrePoint = point.add([0, size.y * 0.25]);
    map.setView(map.unproject(centrePoint, zoom), zoom, { animate: false });
    return;
  }

  if (placement === "mobile-top-half") {
    return;
  }

  map.setView(location, zoom, { animate: false });
}

export function watercourseCentre(watercourse: KnownWatercourse): LatLngTuple | null {
  const firstRoute = watercourse.routes.find((route) => route.length > 0);

  if (!firstRoute?.length) {
    return null;
  }

  return firstRoute[Math.floor(firstRoute.length / 2)];
}

export function routeImpactPoiLabel(kind: RouteImpactPoi["kind"]) {
  if (kind === "access") return "Access";
  if (kind === "hazard") return "Hazard";
  if (kind === "feature") return "Feature";
  if (kind === "gauge") return "Gauge";
  if (kind === "contribution") return "Community point";
  return "Point";
}

export function projectPointForDistance(origin: LatLngTuple, point: LatLngTuple) {
  const earthRadiusM = 6371000;
  const originLatRadians = (origin[0] * Math.PI) / 180;

  return {
    x:
      ((point[1] - origin[1]) * Math.PI) /
      180 *
      earthRadiusM *
      Math.cos(originLatRadians),
    y: (((point[0] - origin[0]) * Math.PI) / 180) * earthRadiusM,
  };
}

export function distanceMetersToSegment(
  point: LatLngTuple,
  start: LatLngTuple,
  end: LatLngTuple,
) {
  const projectedPoint = projectPointForDistance(point, point);
  const projectedStart = projectPointForDistance(point, start);
  const projectedEnd = projectPointForDistance(point, end);
  const dx = projectedEnd.x - projectedStart.x;
  const dy = projectedEnd.y - projectedStart.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(
      projectedPoint.x - projectedStart.x,
      projectedPoint.y - projectedStart.y,
    );
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((projectedPoint.x - projectedStart.x) * dx +
        (projectedPoint.y - projectedStart.y) * dy) /
        lengthSquared,
    ),
  );
  const closestX = projectedStart.x + t * dx;
  const closestY = projectedStart.y + t * dy;

  return Math.hypot(projectedPoint.x - closestX, projectedPoint.y - closestY);
}

export function distanceMetersToRoute(point: LatLngTuple, route: LatLngTuple[]) {
  if (route.length === 0) {
    return Infinity;
  }

  if (route.length === 1) {
    return distanceKmBetween(point, route[0]) * 1000;
  }

  let best = Infinity;

  for (let index = 1; index < route.length; index += 1) {
    best = Math.min(
      best,
      distanceMetersToSegment(point, route[index - 1], route[index]),
    );
  }

  return best;
}

export function collectRouteImpactPoints(
  section: RiverSection,
  contributions: Contribution[],
) {
  const points: Array<{
    id: string;
    title: string;
    kind: RouteImpactPoi["kind"];
    location: LatLngTuple;
  }> = [
    ...section.accessPoints.map((point) => ({
      id: point.id,
      title: point.name,
      kind: "access" as const,
      location: point.location,
    })),
    ...section.hazards.map((point) => ({
      id: point.id,
      title: point.title,
      kind: "hazard" as const,
      location: point.location,
    })),
    ...section.features.map((point) => ({
      id: point.id,
      title: point.title,
      kind: "feature" as const,
      location: point.location,
    })),
    {
      id: section.gauge.id,
      title: section.gauge.name,
      kind: "gauge" as const,
      location: section.gauge.location,
    },
  ];

  contributions.forEach((contribution) => {
    if (
      contribution.sectionId !== section.id ||
      !contribution.location ||
      contribution.status === "hidden" ||
      contribution.status === "rejected"
    ) {
      return;
    }

    points.push({
      id: contribution.id,
      title: contribution.title,
      kind: "contribution",
      location: contribution.location,
    });
  });

  return points;
}

export function calculateRouteAdjustmentImpact(
  adjustment: RouteAdjustment,
  sections: RiverSection[],
  contributions: Contribution[],
): RouteAdjustmentImpact {
  const section = sections.find((item) => item.id === adjustment.targetId) ?? null;
  const currentRoute = section?.route ?? [];
  const proposedRoute = adjustment.route;
  const currentDistanceKm = currentRoute.length >= 2 ? routeDistanceKm(currentRoute) : null;
  const proposedDistanceKm = routeDistanceKm(proposedRoute);
  const points = section ? collectRouteImpactPoints(section, contributions) : [];
  const movedOutside: RouteImpactPoi[] = [];
  const newlyNear: RouteImpactPoi[] = [];

  points.forEach((point) => {
    const beforeDistanceM = distanceMetersToRoute(point.location, currentRoute);
    const afterDistanceM = distanceMetersToRoute(point.location, proposedRoute);
    const impactPoint = {
      id: point.id,
      title: point.title,
      kind: point.kind,
      beforeDistanceM,
      afterDistanceM,
    };

    if (
      beforeDistanceM <= ROUTE_IMPACT_CORRIDOR_METRES &&
      afterDistanceM > ROUTE_IMPACT_CORRIDOR_METRES
    ) {
      movedOutside.push(impactPoint);
      return;
    }

    if (
      beforeDistanceM > ROUTE_IMPACT_CORRIDOR_METRES &&
      afterDistanceM <= ROUTE_IMPACT_CORRIDOR_METRES
    ) {
      newlyNear.push(impactPoint);
    }
  });

  const endpointWarnings: string[] = [];
  const startAccess = section?.accessPoints.find((point) => point.type === "put-in");
  const finishAccess = section?.accessPoints.find(
    (point) => point.type === "take-out",
  );
  const proposedStart = proposedRoute[0];
  const proposedFinish = proposedRoute[proposedRoute.length - 1];

  if (
    startAccess &&
    proposedStart &&
    distanceKmBetween(startAccess.location, proposedStart) * 1000 >
      ROUTE_IMPACT_ENDPOINT_WARNING_METRES
  ) {
    endpointWarnings.push("Put-in is no longer close to the proposed start.");
  }

  if (
    finishAccess &&
    proposedFinish &&
    distanceKmBetween(finishAccess.location, proposedFinish) * 1000 >
      ROUTE_IMPACT_ENDPOINT_WARNING_METRES
  ) {
    endpointWarnings.push("Take-out is no longer close to the proposed finish.");
  }

  return {
    currentDistanceKm,
    proposedDistanceKm,
    distanceDeltaKm:
      currentDistanceKm == null ? null : proposedDistanceKm - currentDistanceKm,
    pointsChecked: points.length,
    movedOutside: movedOutside.sort(
      (left, right) => right.afterDistanceM - left.afterDistanceM,
    ),
    newlyNear: newlyNear.sort(
      (left, right) => left.afterDistanceM - right.afterDistanceM,
    ),
    endpointWarnings,
  };
}

export function canonicalRiverOverviewSectionId(riverId: string) {
  return `canonical-river:${riverId}`;
}

export const emptyCanonicalOverviewSection: RiverSection = {
  id: "canonical-river:loading",
  riverName: "Rivers",
  sectionName: "Loading river records",
  summary: "Canonical river records are loading from the backend.",
  centre: [54.5, -3],
  route: [[54.5, -3]],
  distanceKm: 0,
  estimatedTime: "Not set",
  difficulty: "Not assessed",
  suitability: [],
  levelBand: "unknown",
  levelLabel: "No level linked",
  runnableGuidance:
    "River records are source context only until sections, levels, and POIs are reviewed.",
  accessSummary: "No reviewed access information is linked yet.",
  gauge: {
    id: "no-linked-gauge",
    name: "No linked gauge",
    location: [54.5, -3],
    value: "No reading",
    trend: "steady",
    observedAt: "Not recorded",
  },
  accessPoints: [],
  hazards: [],
  features: [],
  photos: [],
  reports: [],
  source: {
    kind: "derived",
    label: "Canonical river overview",
    confidence: "low",
    updatedAt: new Date().toISOString().slice(0, 10),
    notes:
      "Temporary frontend overview row derived from the backend canonical river API.",
  },
};

export function canonicalRiverToOverviewSection(river: CanonicalRiverSummary): RiverSection {
  return {
    ...emptyCanonicalOverviewSection,
    id: canonicalRiverOverviewSectionId(river.id),
    riverName: river.displayName,
    sectionName: "River overview",
    summary: river.summary,
    centre: river.centre,
    route: [river.centre],
    difficulty: "River record",
    levelLabel: "No section level linked",
    runnableGuidance:
      "Canonical river record only. Review linked sections, source candidates, and local evidence before treating this as paddling information.",
    accessSummary: "No reviewed access information is linked to this river overview yet.",
    gauge: {
      ...emptyCanonicalOverviewSection.gauge,
      location: river.centre,
    },
    source: {
      kind: "derived",
      label: "Canonical river API",
      confidence: "low",
      updatedAt: river.updatedAt.slice(0, 10),
      notes: `${river.curationStatus}; ${river.sourceConfidence}.`,
    },
  };
}

export function isCanonicalOverviewSection(section: RiverSection) {
  return section.id.startsWith("canonical-river:");
}

export function isCandidateSection(section: RiverSection) {
  return section.id.startsWith("candidate-route:");
}

export function candidateRouteSuggestionId(section: RiverSection) {
  return isCandidateSection(section)
    ? section.id.replace("candidate-route:", "")
    : null;
}

export function isDuplicateRoutePoint(
  previous: LatLngTuple | undefined,
  next: LatLngTuple,
) {
  return (
    previous !== undefined &&
    distanceKmBetween(previous, next) * 1000 <= ROUTE_POINT_DEDUPE_METRES
  );
}

export function nearestRoutePointIndex(route: LatLngTuple[], target: LatLngTuple) {
  return route.reduce(
    (best, point, index) => {
      const pointDistanceKm = distanceKmBetween(point, target);
      return pointDistanceKm < best.distanceKm
        ? { index, distanceKm: pointDistanceKm }
        : best;
    },
    { index: 0, distanceKm: Infinity },
  );
}

export function routeSegmentBetween(
  route: LatLngTuple[],
  startIndex: number,
  endIndex: number,
) {
  if (startIndex <= endIndex) {
    return route.slice(startIndex, endIndex + 1);
  }

  return route.slice(endIndex, startIndex + 1).reverse();
}

export function snapRoughTraceToKnownRoute(
  roughTrace: LatLngTuple[],
  candidates: RouteSnapCandidate[],
) {
  if (roughTrace.length < 2) {
    return null;
  }

  let best:
    | {
        candidate: RouteSnapCandidate;
        snappedTrace: LatLngTuple[];
        averageDistanceKm: number;
      }
    | null = null;

  for (const candidate of candidates) {
    if (candidate.route.length < 2) {
      continue;
    }

    const start = nearestRoutePointIndex(candidate.route, roughTrace[0]);
    const end = nearestRoutePointIndex(
      candidate.route,
      roughTrace[roughTrace.length - 1],
    );
    const snappedTrace = routeSegmentBetween(
      candidate.route,
      start.index,
      end.index,
    );

    if (snappedTrace.length < 2) {
      continue;
    }

    const totalDistanceKm = roughTrace.reduce(
      (total, point) =>
        total + nearestRoutePointIndex(candidate.route, point).distanceKm,
      0,
    );
    const averageDistanceKm = totalDistanceKm / roughTrace.length;

    if (!best || averageDistanceKm < best.averageDistanceKm) {
      best = { candidate, snappedTrace, averageDistanceKm };
    }
  }

  if (
    !best ||
    best.averageDistanceKm > ROUTE_SNAP_MAX_AVERAGE_DISTANCE_KM
  ) {
    return null;
  }

  return best;
}

export function nearestSectionsForLocation(
  location: LatLngTuple,
  sections: RiverSection[],
) {
  return sections
    .map((section) => ({
      section,
      distanceKm: distanceKmBetween(location, section.centre),
      location: section.centre,
    }))
    .sort((left, right) => left.distanceKm - right.distanceKm);
}

export function nearbyPoisForLocation(
  location: LatLngTuple,
  contributions: Contribution[],
  sections: RiverSection[],
) {
  const seedPois = sections.flatMap((section): NearbyPoiResult[] => [
    ...section.accessPoints.map((accessPoint) => ({
      id: accessPoint.id,
      kind: "access" as const,
      title: accessPoint.name,
      subtitle: `${section.riverName} · ${section.sectionName}`,
      section,
      location: accessPoint.location,
      distanceKm: distanceKmBetween(location, accessPoint.location),
    })),
    ...section.hazards.map((hazard) => ({
      id: hazard.id,
      kind: "hazard" as const,
      title: hazard.title,
      subtitle: `${hazard.type} · ${section.sectionName}`,
      section,
      location: hazard.location,
      distanceKm: distanceKmBetween(location, hazard.location),
    })),
    ...section.features.map((feature) => ({
      id: feature.id,
      kind: "feature" as const,
      title: feature.title,
      subtitle: `${feature.type} · ${section.sectionName}`,
      section,
      location: feature.location,
      distanceKm: distanceKmBetween(location, feature.location),
    })),
    {
      id: section.gauge.id,
      kind: "gauge" as const,
      title: section.gauge.name,
      subtitle: `Gauge · ${section.sectionName}`,
      section,
      location: section.gauge.location,
      distanceKm: distanceKmBetween(location, section.gauge.location),
    },
  ]);

  const contributionPois = contributions.flatMap((contribution): NearbyPoiResult[] => {
    if (
      !contribution.location ||
      contribution.status === "hidden" ||
      contribution.status === "rejected"
    ) {
      return [];
    }

    const section = sections.find((item) => item.id === contribution.sectionId);

    if (!section) {
      return [];
    }

    return [
      {
        id: contribution.id,
        kind: "contribution",
        title: contribution.title,
        subtitle: `Community ${contribution.type} · ${section.sectionName}`,
        section,
        location: contribution.location,
        distanceKm: distanceKmBetween(location, contribution.location),
      },
    ];
  });

  return [...seedPois, ...contributionPois]
    .filter((poi) => poi.distanceKm <= NEARBY_POI_MAX_KM)
    .sort((left, right) => left.distanceKm - right.distanceKm)
    .slice(0, 8);
}

export function distanceMetersToRoutes(point: LatLngTuple, routes: LatLngTuple[][]) {
  return routes.reduce(
    (best, route) => Math.min(best, distanceMetersToRoute(point, route)),
    Infinity,
  );
}

export function distanceMetersBetweenRoutes(
  route: LatLngTuple[],
  targetRoutes: LatLngTuple[][],
) {
  if (!route.length || !targetRoutes.length) {
    return Infinity;
  }

  const stride = Math.max(1, Math.floor(route.length / 30));
  let best = Infinity;

  for (let index = 0; index < route.length; index += stride) {
    best = Math.min(best, distanceMetersToRoutes(route[index], targetRoutes));
  }

  best = Math.min(best, distanceMetersToRoutes(route[route.length - 1], targetRoutes));

  return best;
}

export function watercourseRouteDistanceKm(watercourse: KnownWatercourse) {
  return watercourse.routes.reduce(
    (total, route) => total + routeDistanceKm(route),
    0,
  );
}

export function collectWatercourseContextPois(
  watercourse: KnownWatercourse,
  mapPois: MapPoi[],
  contributions: Contribution[],
  sections: RiverSection[],
) {
  const sectionsById = new Map(sections.map((section) => [section.id, section]));
  const poisById = new Map(
    sections
      .flatMap(fallbackMapPoisForSection)
      .map((poi) => [poi.id, poi] as const),
  );
  mapPois.forEach((poi) => {
    poisById.set(poi.id, poi);
  });
  const seedPois: WatercourseContextPoi[] = [...poisById.values()].flatMap((poi) => {
    const section = sectionsById.get(poi.sectionId);

    if (!section) {
      return [];
    }

    const distanceM = distanceMetersToRoutes(poi.location, watercourse.routes);

    if (distanceM > WATERCOURSE_CONTEXT_CORRIDOR_METRES) {
      return [];
    }

    return [
      {
        id: poi.id,
        kind: poi.kind,
        title: poi.title,
        subtitle: poi.subtitle,
        section,
        location: poi.location,
        distanceM,
      },
    ];
  });
  const contributionPois: WatercourseContextPoi[] = contributions.flatMap((contribution) => {
    if (
      !contribution.location ||
      contribution.status === "hidden" ||
      contribution.status === "rejected"
    ) {
      return [];
    }

    const section = sectionsById.get(contribution.sectionId);

    if (!section) {
      return [];
    }

    const distanceM = distanceMetersToRoutes(contribution.location, watercourse.routes);

    if (distanceM > WATERCOURSE_CONTEXT_CORRIDOR_METRES) {
      return [];
    }

    return [
      {
        id: contribution.id,
        kind: "contribution",
        title: contribution.title,
        subtitle: `Community ${contribution.type} · ${section.sectionName}`,
        section,
        location: contribution.location,
        distanceM,
      },
    ];
  });

  return [...seedPois, ...contributionPois]
    .sort((left, right) => left.distanceM - right.distanceM)
    .slice(0, 8);
}

export function collectWatercourseContextSections(
  watercourse: KnownWatercourse,
  sections: RiverSection[],
) {
  return sections
    .map(
      (section): WatercourseContextSection => ({
        section,
        distanceM: distanceMetersBetweenRoutes(section.route, watercourse.routes),
      }),
    )
    .filter((item) => item.distanceM <= WATERCOURSE_CONTEXT_CORRIDOR_METRES)
    .sort((left, right) => left.distanceM - right.distanceM)
    .slice(0, 5);
}

export function watercourseTypeLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function watercourseHintRows(watercourse: KnownWatercourse) {
  const hints = watercourse.hints;
  return [
    ["Access", hints.access],
    ["Canoe", hints.canoe],
    ["Boat", hints.boat],
    ["Tidal", hints.tidal],
    ["Intermittent", hints.intermittent],
    ["Operator", hints.operator],
    ["Lock", hints.lockName ?? hints.lock],
    ["Tunnel", hints.tunnel],
    ["Bridge", hints.bridge],
    ["Towpath", hints.towpath],
  ].filter((row): row is [string, string] => Boolean(row[1]));
}

export function formatDistanceKm(distanceKm: number) {
  return distanceKm < 1
    ? `${Math.round(distanceKm * 1000)} m`
    : `${distanceKm.toFixed(1)} km`;
}

export function formatDistanceMetres(distanceMetres: number) {
  if (!Number.isFinite(distanceMetres)) {
    return "unknown";
  }

  return distanceMetres < 1000
    ? `${Math.round(distanceMetres)} m`
    : `${(distanceMetres / 1000).toFixed(1)} km`;
}

export function formatSignedDistanceKm(distanceKm: number | null) {
  if (distanceKm == null) {
    return "Unknown";
  }

  const prefix = distanceKm > 0 ? "+" : "";
  return `${prefix}${distanceKm.toFixed(1)} km`;
}

export function liveLocationStatusLabel(status: LiveLocationStatus) {
  const labels: Record<LiveLocationStatus, string> = {
    idle: "Off",
    locating: "Locating",
    watching: "On",
    denied: "Permission denied",
    unavailable: "Unavailable",
    error: "Error",
  };

  return labels[status];
}

export function liveLocationUpdatedLabel(location: LiveLocationSnapshot | null) {
  if (!location) {
    return "No location fix yet.";
  }

  return `Updated ${new Date(location.updatedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function navigationUrl(location: LatLngTuple) {
  return googleMapsDirectionsUrl(location);
}

export function fallbackMapPoisForSection(section: RiverSection): MapPoi[] {
  if (isCanonicalOverviewSection(section)) {
    return [];
  }

  const source = section.source;
  const sourceFor = (itemSource = source) => itemSource;

  return [
    {
      id: `${section.id}:${section.gauge.id}`,
      sectionId: section.id,
      kind: "gauge",
      title: section.gauge.name,
      subtitle: "Gauge",
      summary: `${section.gauge.value}. Trend: ${section.gauge.trend}. Observed ${section.gauge.observedAt}.`,
      location: section.gauge.location,
      source: sourceFor(section.gauge.source),
      verificationStatus: "needs-confirmation",
      confirmations: 0,
      corrections: 0,
      viewerReview: {
        confirmed: false,
        suggestedCorrection: false,
        correctionNote: null,
      },
      payload: {
        value: section.gauge.value,
        trend: section.gauge.trend,
        observedAt: section.gauge.observedAt,
        what3wordsAddress: getSeedPoiWhat3Words(section.id, section.gauge.id),
      },
    },
    ...section.accessPoints.map((accessPoint): MapPoi => ({
      id: `${section.id}:${accessPoint.id}`,
      sectionId: section.id,
      kind: "access",
      title: accessPoint.name,
      subtitle: `Access · ${accessPoint.type}`,
      summary: accessPoint.notes,
      location: accessPoint.location,
      source: sourceFor(accessPoint.source),
      verificationStatus: "needs-confirmation",
      confirmations: 0,
      corrections: 0,
      viewerReview: {
        confirmed: false,
        suggestedCorrection: false,
        correctionNote: null,
      },
      payload: {
        accessType: accessPoint.type,
        what3wordsAddress: getSeedPoiWhat3Words(section.id, accessPoint.id),
      },
    })),
    ...section.hazards.map((hazard): MapPoi => ({
      id: `${section.id}:${hazard.id}`,
      sectionId: section.id,
      kind: "hazard",
      title: hazard.title,
      subtitle: `${hazard.type} · ${hazard.severity}`,
      summary: hazard.description,
      location: hazard.location,
      source: sourceFor(hazard.source),
      verificationStatus:
        hazard.status === "resolved" ? "resolved" : "needs-confirmation",
      confirmations: 0,
      corrections: 0,
      viewerReview: {
        confirmed: false,
        suggestedCorrection: false,
        correctionNote: null,
      },
      payload: {
        hazardType: hazard.type,
        severity: hazard.severity,
        sourceStatus: hazard.status,
        lastConfirmed: hazard.lastConfirmed,
        what3wordsAddress: getSeedPoiWhat3Words(section.id, hazard.id),
      },
    })),
    ...section.features.map((feature): MapPoi => ({
      id: `${section.id}:${feature.id}`,
      sectionId: section.id,
      kind: "feature",
      title: feature.title,
      subtitle: feature.type,
      summary: feature.description,
      location: feature.location,
      source: sourceFor(feature.source),
      verificationStatus: "needs-confirmation",
      confirmations: 0,
      corrections: 0,
      viewerReview: {
        confirmed: false,
        suggestedCorrection: false,
        correctionNote: null,
      },
      payload: {
        featureType: feature.type,
        what3wordsAddress: getSeedPoiWhat3Words(section.id, feature.id),
      },
    })),
  ];
}

export function readPayloadString(
  payload: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function readPayloadRecord(
  payload: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const value = payload[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readRecordString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function sourceCandidateWaterwayValue(candidateType?: string) {
  return candidateType?.startsWith("waterway=")
    ? candidateType.slice("waterway=".length)
    : undefined;
}

export function mapPoiDisplayMeta(poi: MapPoi): MapPoiDisplayMeta {
  const rawProperties = readPayloadRecord(poi.payload, "rawProperties");
  const candidateType = readPayloadString(poi.payload, "candidateType");
  const waterway =
    sourceCandidateWaterwayValue(candidateType) ??
    readRecordString(rawProperties, "waterway");
  const grade =
    readRecordString(rawProperties, "rapids") ??
    readRecordString(rawProperties, "whitewater:section_grade");

  if (
    candidateType === "rapids" ||
    waterway === "rapids" ||
    readRecordString(rawProperties, "rapids")
  ) {
    return {
      category: "rapid",
      label: grade ? `Rapid grade ${grade}` : "Rapid",
      markerKind: "rapid",
      markerLabel: grade ?? "R",
      grade,
    };
  }

  if (
    candidateType === "whitewater-section" ||
    readRecordString(rawProperties, "whitewater:section_grade") ||
    readRecordString(rawProperties, "whitewater:section_name")
  ) {
    return {
      category: "whitewater",
      label: grade ? `Whitewater grade ${grade}` : "Whitewater",
      markerKind: "whitewater",
      markerLabel: grade ?? "W",
      grade,
    };
  }

  if (
    waterway === "weir" ||
    waterway === "dam" ||
    waterway === "waterfall" ||
    waterway === "sluice_gate" ||
    waterway === "lock_gate" ||
    waterway === "lock"
  ) {
    return {
      category: "structure",
      label: waterway.replace(/_/g, " "),
      markerKind: "structure",
      markerLabel: "S",
    };
  }

  if (waterway === "turning_point") {
    return {
      category: "navigation",
      label: "Navigation",
      markerKind: "navigation",
      markerLabel: "N",
    };
  }

  if (waterway === "sanitary_dump_station") {
    return {
      category: "utility",
      label: "Utility",
      markerKind: "utility",
      markerLabel: "U",
    };
  }

  if (poi.kind === "access") {
    return {
      category: "access",
      label: "Access",
      markerKind: "access",
      markerLabel: readPayloadString(poi.payload, "accessType") === "put-in"
        ? "I"
        : "O",
    };
  }

  if (poi.kind === "hazard") {
    return {
      category: "hazard",
      label: "Hazard",
      markerKind: "hazard",
      markerLabel: "!",
    };
  }

  if (poi.kind === "gauge") {
    return {
      category: "gauge",
      label: "Gauge",
      markerKind: "gauge",
      markerLabel: "~",
    };
  }

  return {
    category: "feature",
    label: "Feature",
    markerKind: "feature",
    markerLabel: "*",
  };
}

export const mapPoiCategoryLabels: Record<MapPoiDisplayCategory, string> = {
  rapid: "Rapids",
  whitewater: "Whitewater",
  structure: "Structures",
  access: "Access",
  navigation: "Navigation",
  utility: "Utility",
  hazard: "Hazards",
  gauge: "Gauges",
  feature: "Features",
};

export function mapPoiToSelectedPoi(poi: MapPoi, section: RiverSection): SelectedPoi {
  const displayMeta = mapPoiDisplayMeta(poi);
  return {
    id: poi.id,
    kind: poi.kind,
    title: poi.title,
    subtitle: displayMeta.grade
      ? `${displayMeta.label} · ${poi.subtitle}`
      : `${displayMeta.label} · ${poi.subtitle}`,
    summary: poi.summary,
    sectionLabel: section.sectionName,
    location: poi.location,
    status: poi.verificationStatus,
    sourceLabel: poi.source?.label,
    sourceConfidence: poi.source?.confidence,
    navigationLocation: poi.location,
    what3words: readPayloadString(poi.payload, "what3wordsAddress"),
    mapPoi: poi,
  };
}

export function riverMapPoiToSelectedPoi(
  poi: MapPoi,
  river: CanonicalRiverSummary,
): SelectedPoi {
  const displayMeta = mapPoiDisplayMeta(poi);
  return {
    id: poi.id,
    kind: poi.kind,
    title: poi.title,
    subtitle: displayMeta.grade
      ? `${displayMeta.label} · ${poi.subtitle}`
      : `${displayMeta.label} · ${poi.subtitle}`,
    summary: poi.summary,
    sectionLabel: river.displayName,
    location: poi.location,
    status: poi.verificationStatus,
    sourceLabel: poi.source?.label,
    sourceConfidence: poi.source?.confidence,
    navigationLocation: poi.location,
    what3words: readPayloadString(poi.payload, "what3wordsAddress"),
    mapPoi: poi,
  };
}

export function contributionToSelectedPoi(
  contribution: Contribution,
  section: RiverSection,
  syncStatus?: ContributionSyncStatus,
): SelectedPoi {
  return {
    id: contribution.id,
    kind: "contribution",
    title: contribution.title,
    subtitle: `${contribution.type} · ${contribution.category}`,
    summary: contribution.detail,
    sectionLabel: section.sectionName,
    location: contribution.location ?? section.centre,
    status: contribution.status,
    sourceLabel: contribution.author,
    sourceConfidence: "community",
    navigationLocation: contribution.location,
    what3words: contribution.what3words,
    syncStatus,
    photos: contribution.photos,
    category: contribution.category,
    author: contribution.author,
    dateObserved: contribution.dateObserved,
    createdAt: contribution.createdAt,
    contributionType: contribution.type,
  };
}

export function defaultObservedDate() {
  return new Date().toISOString().slice(0, 10);
}



export function sourceCandidateStatusLabel(status: SourceCandidatePoiStatus) {
  const labels: Record<SourceCandidatePoiStatus, string> = {
    review_needed: "review needed",
    confirmed: "confirmed",
    rejected: "rejected",
    merged: "merged",
  };

  return labels[status];
}

export function formatSourceCandidateValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => formatSourceCandidateValue(item))
      .filter(Boolean)
      .join(", ");
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return "";
}

export function moderationResultMessage(
  contribution: Contribution,
  decision: ModerationDecision,
) {
  if (decision === "approve") {
    return `${contribution.title} published as reported.`;
  }

  return `${contribution.title} marked ${contributionStatusLabel(
    contribution.status,
  )}.`;
}

export function hasModeratorAccess(role?: MemberRole | null) {
  return role === "ADMIN" || role === "CONTRIB_MODERATOR";
}

export function hasAdminAccess(role?: MemberRole | null) {
  return role === "ADMIN";
}

export function mergeSectionContributions(
  current: Contribution[],
  sectionId: string,
  backendContributions: Contribution[],
  outboxRecords: ContributionOutboxRecord[],
) {
  const outboxByContributionId = new Map(
    outboxRecords.map((record) => [record.contribution.id, record] as const),
  );
  const backendIds = new Set(backendContributions.map((contribution) => contribution.id));
  const otherSectionContributions = current.filter(
    (contribution) => contribution.sectionId !== sectionId,
  );
  const localSectionContributions = current.filter((contribution) => {
    if (contribution.sectionId !== sectionId || backendIds.has(contribution.id)) {
      return false;
    }

    const outboxRecord = outboxByContributionId.get(contribution.id);
    return (
      ["queued", "syncing", "failed"].includes(outboxRecord?.syncStatus ?? "") ||
      (!outboxRecord && !contribution.serverRevision)
    );
  });

  return [
    ...backendContributions,
    ...localSectionContributions,
    ...otherSectionContributions,
  ];
}









