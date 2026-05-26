import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  Copy,
  Clock3,
  Droplets,
  ExternalLink,
  Flag,
  Heart,
  LogIn,
  LogOut,
  Map as MapIcon,
  MapPinned,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Navigation,
  Plus,
  RotateCcw,
  RefreshCw,
  Route,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
  UserRound,
  UsersRound,
  Waves,
  X,
} from "lucide-react";
import L from "leaflet";
import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { riverSections } from "./data/demoData";
import { getSeedPoiWhat3Words } from "./data/seedLocationReferences";
import {
  setAnalyticsConsentPreference,
  trackPageView,
  trackProductEvent,
  type AnalyticsConsent,
} from "./services/analytics";
import {
  applyContributionModerationDecision,
  deleteContribution,
  fetchModerationContributions,
  fetchMyContributions,
  fetchSectionContributions,
  type ModerationDecision,
} from "./services/contributionApi";
import {
  createContributionOutboxRecord,
  createContributionOutboxStore,
} from "./services/contributionOutbox";
import { syncContributionOutbox } from "./services/contributionSync";
import {
  getCurrentUserIdToken,
  createAccountWithEmail,
  sendEmailPasswordReset,
  signInWithGoogle,
  signInWithEmail,
  signOutCurrentUser,
  subscribeToAuthState,
  type AuthState,
} from "./services/firebaseAuth";
import {
  fetchAdminMembers,
  fetchAdminMemberDetail,
  fetchCurrentMember,
  fetchMyEmergencyProfile,
  saveMyEmergencyProfile,
  updateMyProfile,
  updateAdminMemberAccess,
  type AdminMemberDetail,
  type MemberEmergencyProfile,
  type MemberProfile,
  type MemberRole,
  type MemberTrustLevel,
} from "./services/memberApi";
import { fetchEnvironmentAgencyGaugeReading } from "./services/riverLevels";
import {
  processContributionPhoto,
  type ProcessedContributionPhoto,
} from "./services/imageProcessing";
import { uploadContributionPhoto } from "./services/photoUpload";
import {
  fetchObservationJobRuns,
  fetchSectionObservations,
  runObservationIngestion,
  type ObservationParameter,
  type ObservationJobRun,
  type SectionObservationMeasure,
} from "./services/observationApi";
import {
  deletePhoto,
  fetchMyPhotos,
  type MemberPhoto,
} from "./services/photoApi";
import {
  fetchModerationMapPoiReviews,
  fetchSectionMapPois,
  reviewMapPoi,
  updateMapPoiVerificationStatus,
  type MapPoiCorrectionReview,
  type MapPoiReviewDecision,
} from "./services/mapPoiApi";
import {
  fetchCoordinatesForWhat3Words,
  fetchWhat3WordsAddress,
  formatWhat3Words,
  googleMapsDirectionsUrl,
  googleMapsSearchUrl,
} from "./services/locationReferences";
import {
  applyRouteSuggestionDecision,
  createRouteSuggestion,
  fetchApprovedRouteSuggestions,
  fetchModerationRouteSuggestions,
  fetchMyRouteSuggestions,
  updateModerationRouteSuggestion,
  type RouteSuggestion,
  type RouteSuggestionDecision,
} from "./services/routeSuggestionApi";
import {
  applyRouteAdjustmentDecision,
  createRouteAdjustment,
  fetchModerationRouteAdjustments,
  type RouteAdjustment,
  type RouteAdjustmentDecision,
} from "./services/routeAdjustmentApi";
import { snapRouteToWatercourses } from "./services/routeSnapApi";
import {
  fetchRouteOverrides,
  type RouteOverride,
} from "./services/routeOverrideApi";
import {
  fetchWatercourseImportStatus,
  fetchWatercoursesForBounds,
  searchWatercourses,
  type KnownWatercourse,
  type WatercourseImportStatus,
} from "./services/watercourseApi";
import type {
  Contribution,
  ContributionPhoto,
  ContributionOutboxRecord,
  ContributionSyncStatus,
  ContributionType,
  HazardSeverity,
  LatLngTuple,
  LiveGaugeReading,
  MapPoi,
  MapPoiKind,
  RiverSection,
} from "./types";

const STORAGE_KEY = "river-go-demo-contributions";
const FAVOURITES_STORAGE_KEY = "river-go-demo-favourite-sections";
const ROUTE_SUGGESTIONS_STORAGE_KEY = "riverlaunch-route-suggestions-v1";
const ANALYTICS_CONSENT_STORAGE_KEY = "riverlaunch-analytics-consent-v1";
const WELCOME_SESSION_STORAGE_KEY = "riverlaunch-welcome-dismissed-session";
const SYNC_BANNER_DISMISSAL_STORAGE_KEY = "riverlaunch-sync-banner-dismissal";
const LIVE_LOCATION_STORAGE_KEY = "riverlaunch-live-location-enabled";
const MIN_ACCOUNT_PASSWORD_LENGTH = 12;
const SYNC_BANNER_DISMISS_MS = 60 * 60 * 1000;
const SEARCH_FOCUS_ZOOM = 15;
const LIVE_LOCATION_FOCUS_ZOOM = 16;
const NEARBY_POI_MAX_KM = 5;
const ROUTE_POINT_DEDUPE_METRES = 3;
const ROUTE_SNAP_MAX_AVERAGE_DISTANCE_KM = 1.5;
const COMPACT_MAP_CONTROLS_QUERY = "(max-width: 430px)";
const ROUTE_IMPACT_CORRIDOR_METRES = 120;
const ROUTE_IMPACT_ENDPOINT_WARNING_METRES = 350;
const KNOWN_RIVER_FALLBACK_COLOUR = "#b42318";
const SELECTED_WATERCOURSE_FALLBACK_COLOUR = "#0f766e";
const WATERCOURSE_CONTEXT_CORRIDOR_METRES = 250;

type RouteDetailsTab =
  | "details"
  | "levels"
  | "access"
  | "hazards"
  | "updates"
  | "photos";

type PoiDetailsTab = "details" | "location" | "verification" | "photos";
type ObservationRangeHours = 48 | 168 | 672;

const bandLabels = {
  "too-low": "Too low",
  good: "Good",
  high: "High",
  unknown: "Unknown",
};

const observationParameterLabels: Record<ObservationParameter, string> = {
  river_level: "River level",
  river_flow: "River flow",
  rainfall: "Rainfall",
  tidal_level: "Tidal level",
  sea_level: "Sea level",
  release: "Release",
  forecast: "Forecast",
};

const observationRangeOptions: Array<{
  hours: ObservationRangeHours;
  label: string;
  rangeLabel: string;
  chartLabel: string;
}> = [
  { hours: 48, label: "48h", rangeLabel: "48h range", chartLabel: "Last 48 hours" },
  { hours: 168, label: "7d", rangeLabel: "7 day range", chartLabel: "Last 7 days" },
  { hours: 672, label: "28d", rangeLabel: "28 day range", chartLabel: "Last 28 days" },
];

const routeDetailsTabs: Array<{ id: RouteDetailsTab; label: string }> = [
  { id: "details", label: "Details" },
  { id: "levels", label: "Levels" },
  { id: "access", label: "Access" },
  { id: "hazards", label: "Hazards" },
  { id: "updates", label: "Updates" },
  { id: "photos", label: "Photos" },
];

const poiDetailsTabs: Array<{ id: PoiDetailsTab; label: string }> = [
  { id: "details", label: "Details" },
  { id: "location", label: "Location" },
  { id: "verification", label: "Verify" },
  { id: "photos", label: "Photos" },
];

const contributionOptions: Array<{
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

const categoryOptions: Record<ContributionType, string[]> = {
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

type AppSection = "search" | "map" | "groups" | "profile" | "more" | "admin";
type AdminPage = "index" | "members" | "member-detail" | "moderation" | "system";
type AuthSheetMode = "welcome" | "signin" | "save-required";
type AuthPanelMode = "create" | "signin";
type AppNotificationTone = "success" | "info" | "error";
type AppNotification = {
  id: number;
  message: string;
  tone: AppNotificationTone;
};
type RouteCreateMode = "idle" | "tracing" | "form";
type RouteDraftTarget =
  | { type: "new" }
  | { type: "section"; id: string; label: string }
  | { type: "route_suggestion"; id: string; label: string }
  | { type: "route_suggestion_edit"; id: string; label: string };
type RouteSnapCandidate = {
  id: string;
  label: string;
  route: LatLngTuple[];
};
type SearchMode = "name" | "waterways" | "point" | "favourites";
type ProfileMode =
  | "account"
  | "public"
  | "emergency"
  | "sync"
  | "activity"
  | "photos";

const memberRoleOptions: MemberRole[] = [
  "MEMBER",
  "TRUSTED_MEMBER",
  "CONTRIB_MODERATOR",
  "ADMIN",
];
const memberTrustOptions: MemberTrustLevel[] = ["NEW", "KNOWN", "TRUSTED"];

const moderationActions: Array<{
  decision: ModerationDecision;
  label: string;
}> = [
  { decision: "approve", label: "Publish as reported" },
  { decision: "confirm", label: "Confirm" },
  { decision: "request-confirmation", label: "Needs confirmation" },
  { decision: "challenge", label: "Challenge" },
  { decision: "hide", label: "Hide" },
  { decision: "reject", label: "Reject" },
  { decision: "resolve", label: "Resolve" },
];

const mapPoiStatusActions: Array<{
  status: MapPoi["verificationStatus"];
  label: string;
}> = [
  { status: "confirmed", label: "Mark confirmed" },
  { status: "needs-confirmation", label: "Needs confirmation" },
  { status: "needs-correction", label: "Needs correction" },
  { status: "resolved", label: "Mark resolved" },
];

const routeSuggestionActions: Array<{
  decision: RouteSuggestionDecision;
  label: string;
}> = [
  { decision: "request-review", label: "Back to review" },
  { decision: "approve", label: "Approve candidate" },
  { decision: "needs-info", label: "Needs more info" },
  { decision: "reject", label: "Reject" },
  { decision: "hide", label: "Hide" },
];

const routeAdjustmentActions: Array<{
  decision: RouteAdjustmentDecision;
  label: string;
}> = [
  { decision: "request-review", label: "Back to review" },
  { decision: "approve", label: "Approve edit" },
  { decision: "needs-info", label: "Needs more info" },
  { decision: "reject", label: "Reject" },
  { decision: "hide", label: "Hide" },
];

type MemberRoleFilter = "all" | MemberRole;
type MemberTrustFilter = "all" | MemberTrustLevel;
type ModerationTab =
  | "route-edits"
  | "route-suggestions"
  | "contributions"
  | "corrections";
type ModerationDraftDecision = ModerationDecision | "";
type RouteModerationDraftDecision = RouteSuggestionDecision | "";
type RouteAdjustmentDraftDecision = RouteAdjustmentDecision | "";
type PendingPhotoDelete = { id: string; title: string };
type PendingPointDelete = { id: string; title: string };
type PhotoLightboxItem = {
  src: string;
  title: string;
  caption?: string;
  alt?: string;
};
type SyncBannerDismissal = {
  queuedOutboxCount: number;
  failedOutboxCount: number;
  expiresAt: number;
};
type LiveLocationStatus =
  | "idle"
  | "locating"
  | "watching"
  | "denied"
  | "unavailable"
  | "error";
type LiveLocationSnapshot = {
  location: LatLngTuple;
  accuracyMeters: number | null;
  updatedAt: number;
};
type NearbyPoiResult = {
  id: string;
  kind: "access" | "hazard" | "feature" | "gauge" | "contribution";
  title: string;
  subtitle: string;
  section: RiverSection;
  location: LatLngTuple;
  distanceKm: number;
};
type RouteImpactPoi = {
  id: string;
  title: string;
  kind: "access" | "hazard" | "feature" | "gauge" | "contribution";
  beforeDistanceM: number;
  afterDistanceM: number;
};
type RouteAdjustmentImpact = {
  currentDistanceKm: number | null;
  proposedDistanceKm: number;
  distanceDeltaKm: number | null;
  pointsChecked: number;
  movedOutside: RouteImpactPoi[];
  newlyNear: RouteImpactPoi[];
  endpointWarnings: string[];
};
type LocationSearchResult = {
  label: string;
  location: LatLngTuple;
  nearestPlace?: string;
  country?: string;
  focusSection?: RiverSection;
  pois: NearbyPoiResult[];
};
type WatercourseContextPoi = {
  id: string;
  kind: NearbyPoiResult["kind"];
  title: string;
  subtitle: string;
  section: RiverSection;
  location: LatLngTuple;
  distanceM: number;
};
type WatercourseContextSection = {
  section: RiverSection;
  distanceM: number;
};

interface SelectedPoi {
  id: string;
  kind: MapPoiKind | "contribution";
  title: string;
  subtitle: string;
  summary: string;
  sectionLabel: string;
  location: LatLngTuple;
  status?: string;
  sourceLabel?: string;
  sourceConfidence?: string;
  navigationLocation?: LatLngTuple;
  what3words?: string;
  syncStatus?: ContributionSyncStatus;
  photos?: ContributionPhoto[];
  category?: string;
  author?: string;
  dateObserved?: string;
  createdAt?: string;
  contributionType?: ContributionType;
  mapPoi?: MapPoi;
}

const appNavItems: Array<{
  id: AppSection;
  label: string;
  icon: typeof Search;
}> = [
  { id: "map", label: "Map", icon: MapIcon },
  { id: "search", label: "Search", icon: Search },
  { id: "groups", label: "Groups", icon: UsersRound },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "more", label: "More", icon: MoreHorizontal },
];

function syncActionLabel({
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

function pluralise(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function SyncOutboxBanner({
  queuedOutboxCount,
  failedOutboxCount,
  isDismissed,
  isOnline,
  isSyncingOutbox,
  canSyncOutbox,
  onDismiss,
  onSync,
}: {
  queuedOutboxCount: number;
  failedOutboxCount: number;
  isDismissed: boolean;
  isOnline: boolean;
  isSyncingOutbox: boolean;
  canSyncOutbox: boolean;
  onDismiss: () => void;
  onSync: () => void;
}) {
  if (queuedOutboxCount === 0 || isDismissed) {
    return null;
  }

  const state = failedOutboxCount > 0 ? "failed" : !isOnline ? "offline" : "queued";
  const title =
    state === "failed"
      ? `${pluralise(failedOutboxCount, "change")} need retry`
      : state === "offline"
        ? `${pluralise(queuedOutboxCount, "change")} saved on this device`
        : `${pluralise(queuedOutboxCount, "change")} waiting to sync`;
  const detail =
    state === "failed"
      ? "Some local knowledge did not reach RiverLaunch.app. Retry when you have a stable connection."
      : state === "offline"
        ? "You are offline. These changes will stay local until you reconnect and sync."
        : "Sync now to publish your latest local knowledge to RiverLaunch.app.";

  return (
    <section className={`sync-banner sync-banner--${state}`} role="status">
      <div className="sync-banner__content">
        {state === "failed" ? (
          <AlertTriangle size={20} />
        ) : (
          <RefreshCw size={20} />
        )}
        <div>
          <strong>{title}</strong>
          <span>{detail}</span>
        </div>
      </div>
      <div className="sync-banner__actions">
        <button
          className="primary-action sync-banner__action"
          type="button"
          onClick={onSync}
          disabled={!canSyncOutbox}
        >
          <RefreshCw size={16} />
          {isSyncingOutbox ? "Syncing" : state === "failed" ? "Retry sync" : "Sync now"}
        </button>
        <button
          className="ghost-button sync-banner__action"
          type="button"
          onClick={onDismiss}
        >
          Later
        </button>
      </div>
    </section>
  );
}

function AnalyticsConsentBanner({
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <section className="analytics-consent-banner" aria-label="Analytics consent">
      <div>
        <strong>Help improve RiverLaunch.app</strong>
        <span>
          We use Firebase Analytics only if you agree. It helps us understand
          which routes, maps, and tools are useful.
        </span>
      </div>
      <div className="analytics-consent-banner__actions">
        <button className="ghost-button ghost-button--compact" type="button" onClick={onDecline}>
          Not now
        </button>
        <button className="primary-action primary-action--compact" type="button" onClick={onAccept}>
          Allow
        </button>
      </div>
    </section>
  );
}

function optionForType(type: ContributionType) {
  return contributionOptions.find((option) => option.type === type)!;
}

function loadContributions(): Contribution[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Contribution[]) : [];
  } catch {
    return [];
  }
}

function loadFavouriteSectionIds(): string[] {
  try {
    const stored = localStorage.getItem(FAVOURITES_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

function loadRouteSuggestions(): RouteSuggestion[] {
  try {
    const stored = localStorage.getItem(ROUTE_SUGGESTIONS_STORAGE_KEY);
    const suggestions = stored ? (JSON.parse(stored) as RouteSuggestion[]) : [];
    return suggestions.filter(
      (suggestion) =>
        Array.isArray(suggestion.route) &&
        suggestion.route.length >= 2 &&
        typeof suggestion.riverName === "string" &&
        typeof suggestion.sectionName === "string",
    );
  } catch {
    return [];
  }
}

function loadAnalyticsConsent(): AnalyticsConsent {
  try {
    const stored = localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    return stored === "accepted" || stored === "declined" ? stored : "unknown";
  } catch {
    return "unknown";
  }
}

function saveAnalyticsConsent(consent: AnalyticsConsent) {
  try {
    if (consent === "unknown") {
      localStorage.removeItem(ANALYTICS_CONSENT_STORAGE_KEY);
      return;
    }

    localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, consent);
  } catch {
    // Non-critical; analytics remains consent-gated for the current session.
  }
}

function hasDismissedWelcomeForSession() {
  try {
    return sessionStorage.getItem(WELCOME_SESSION_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function rememberWelcomeDismissedForSession() {
  try {
    sessionStorage.setItem(WELCOME_SESSION_STORAGE_KEY, "true");
  } catch {
    // Non-critical; the welcome sheet can reappear if session storage is unavailable.
  }
}

function loadLiveLocationEnabled() {
  try {
    return localStorage.getItem(LIVE_LOCATION_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function saveLiveLocationEnabled(enabled: boolean) {
  try {
    localStorage.setItem(LIVE_LOCATION_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // Non-critical; live location can still run for the current session.
  }
}

function loadSyncBannerDismissal(): SyncBannerDismissal | null {
  try {
    const stored = sessionStorage.getItem(SYNC_BANNER_DISMISSAL_STORAGE_KEY);
    if (!stored) return null;

    const value = JSON.parse(stored) as Partial<SyncBannerDismissal>;
    return typeof value.queuedOutboxCount === "number" &&
      typeof value.failedOutboxCount === "number" &&
      typeof value.expiresAt === "number"
      ? {
          queuedOutboxCount: value.queuedOutboxCount,
          failedOutboxCount: value.failedOutboxCount,
          expiresAt: value.expiresAt,
        }
      : null;
  } catch {
    return null;
  }
}

function saveSyncBannerDismissal(dismissal: SyncBannerDismissal | null) {
  try {
    if (!dismissal) {
      sessionStorage.removeItem(SYNC_BANNER_DISMISSAL_STORAGE_KEY);
      return;
    }

    sessionStorage.setItem(
      SYNC_BANNER_DISMISSAL_STORAGE_KEY,
      JSON.stringify(dismissal),
    );
  } catch {
    // Non-critical; the sync banner can reappear if session storage is unavailable.
  }
}

function markerHtml(kind: string, label: string) {
  return `<span class="map-marker map-marker--${kind}" aria-hidden="true">${label}</span>`;
}

function createMapPopupContent({
  title,
  subtitle,
  summary,
  imageUrl,
  imageAlt,
  onImageClick,
  detailsLabel = "Details",
  navigationLocation,
  navigationLabel = "Maps",
  navigationMode = "map",
  onDetails,
  selectLabel,
  onSelect,
}: {
  title: string;
  subtitle: string;
  summary: string;
  imageUrl?: string;
  imageAlt?: string;
  onImageClick?: () => void;
  detailsLabel?: string;
  navigationLocation?: LatLngTuple;
  navigationLabel?: string;
  navigationMode?: "directions" | "map";
  onDetails: () => void;
  selectLabel?: string;
  onSelect?: () => void;
}) {
  const container = L.DomUtil.create("div", "map-popup-card");
  L.DomEvent.disableClickPropagation(container);

  const heading = L.DomUtil.create("strong", "", container);
  heading.textContent = title;

  const meta = L.DomUtil.create("span", "", container);
  meta.textContent = subtitle;

  if (imageUrl) {
    const imageParent = onImageClick
      ? L.DomUtil.create("button", "map-popup-card__image-button", container)
      : container;
    if (onImageClick && imageParent instanceof HTMLButtonElement) {
      imageParent.type = "button";
      imageParent.title = "Open photo";
      L.DomEvent.on(imageParent, "click", (event) => {
        L.DomEvent.stop(event);
        container
          .closest(".leaflet-popup")
          ?.querySelector<HTMLAnchorElement>(".leaflet-popup-close-button")
          ?.click();
        onImageClick();
      });
    }

    const image = L.DomUtil.create(
      "img",
      "map-popup-card__image",
      imageParent,
    );
    image.src = imageUrl;
    image.alt = imageAlt ?? "";
  }

  const body = L.DomUtil.create("p", "", container);
  body.textContent = summary;

  const actions = L.DomUtil.create("div", "map-popup-actions", container);
  const detailsButton = L.DomUtil.create("button", "", actions);
  detailsButton.type = "button";
  detailsButton.textContent = detailsLabel;
  L.DomEvent.on(detailsButton, "click", (event) => {
    L.DomEvent.stop(event);
    container
      .closest(".leaflet-popup")
      ?.querySelector<HTMLAnchorElement>(".leaflet-popup-close-button")
      ?.click();
    onDetails();
  });

  if (onSelect) {
    const selectButton = L.DomUtil.create("button", "", actions);
    selectButton.type = "button";
    selectButton.textContent = selectLabel ?? "Select";
    L.DomEvent.on(selectButton, "click", (event) => {
      L.DomEvent.stop(event);
      container
        .closest(".leaflet-popup")
        ?.querySelector<HTMLAnchorElement>(".leaflet-popup-close-button")
        ?.click();
      onSelect();
    });
  }

  if (navigationLocation) {
    const link = L.DomUtil.create("a", "", actions);
    link.href =
      navigationMode === "directions"
        ? googleMapsDirectionsUrl(navigationLocation)
        : googleMapsSearchUrl(navigationLocation);
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = navigationLabel;
  }

  return container;
}

function createSearchedLocationPopup(location: LatLngTuple, title: string) {
  const container = L.DomUtil.create("div", "map-popup-card");
  L.DomEvent.disableClickPropagation(container);

  const heading = L.DomUtil.create("strong", "", container);
  heading.textContent = title;

  const meta = L.DomUtil.create("span", "", container);
  meta.textContent = formatLocation(location);

  const body = L.DomUtil.create("p", "", container);
  body.textContent = "Opened from Search.";

  const actions = L.DomUtil.create("div", "map-popup-actions", container);
  const link = L.DomUtil.create("a", "", actions);
  link.href = googleMapsSearchUrl(location);
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = "Maps";

  return container;
}

function createLiveLocationPopup(location: LiveLocationSnapshot) {
  const container = L.DomUtil.create("div", "map-popup-card");
  L.DomEvent.disableClickPropagation(container);

  const heading = L.DomUtil.create("strong", "", container);
  heading.textContent = "Your location";

  const meta = L.DomUtil.create("span", "", container);
  meta.textContent = formatLocation(location.location);

  const body = L.DomUtil.create("p", "", container);
  body.textContent = location.accuracyMeters
    ? `Accuracy about ${Math.round(location.accuracyMeters)} m.`
    : "Accuracy unavailable.";

  return container;
}

function createRouteSuggestionPopup(suggestion: RouteSuggestion) {
  const container = L.DomUtil.create("div", "map-popup-card");
  L.DomEvent.disableClickPropagation(container);

  const heading = L.DomUtil.create("strong", "", container);
  heading.textContent = suggestion.sectionName;

  const meta = L.DomUtil.create("span", "", container);
  meta.textContent = `${suggestion.riverName} · ${suggestion.difficulty}`;

  const body = L.DomUtil.create("p", "", container);
  body.textContent = suggestion.summary;

  const actions = L.DomUtil.create("div", "map-popup-actions", container);
  const status = L.DomUtil.create("span", "status-chip", actions);
  status.textContent =
    suggestion.status === "pending-review" ? "Pending review" : "Local draft";

  return container;
}

function createRouteAdjustmentPopup(adjustment: RouteAdjustment) {
  const container = L.DomUtil.create("div", "map-popup-card");
  L.DomEvent.disableClickPropagation(container);

  const heading = L.DomUtil.create("strong", "", container);
  heading.textContent = `Edit: ${adjustment.sectionName}`;

  const meta = L.DomUtil.create("span", "", container);
  meta.textContent = `${adjustment.riverName} · ${adjustment.difficulty}`;

  const body = L.DomUtil.create("p", "", container);
  body.textContent = adjustment.summary;

  const actions = L.DomUtil.create("div", "map-popup-actions", container);
  const status = L.DomUtil.create("span", "status-chip", actions);
  status.textContent = routeAdjustmentStatusLabel(adjustment.status);

  return container;
}

function routeSuggestionStatusLabel(status: RouteSuggestion["status"]) {
  if (status === "pending-review") return "Pending review";
  if (status === "needs-info") return "Needs more info";
  if (status === "approved") return "Approved candidate";
  if (status === "rejected") return "Rejected";
  if (status === "hidden") return "Hidden";
  return "Local draft";
}

function routeAdjustmentStatusLabel(status: RouteAdjustment["status"]) {
  if (status === "pending-review") return "Pending review";
  if (status === "needs-info") return "Needs more info";
  if (status === "approved") return "Approved adjustment";
  if (status === "rejected") return "Rejected";
  return "Hidden";
}

function routeEndpointBounds(route: LatLngTuple[]) {
  const start = route[0];
  const end = route[route.length - 1] ?? start;

  return L.latLngBounds([start, end]);
}

function formatLocation(location: LatLngTuple) {
  return `${location[0].toFixed(4)}, ${location[1].toFixed(4)}`;
}

function readCssColourToken(token: string, fallback: string) {
  if (typeof window === "undefined") {
    return fallback;
  }

  return (
    window
      .getComputedStyle(document.documentElement)
      .getPropertyValue(token)
      .trim() || fallback
  );
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatObservationValue(
  value: number | null | undefined,
  unit: string,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "No reading";
  }

  return `${value.toFixed(2)} ${unit}`;
}

function formatObservationRange(measure: SectionObservationMeasure) {
  if (!measure.history.length) {
    return "No stored history yet";
  }

  const values = measure.history.map((reading) => reading.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return `${min.toFixed(2)}-${max.toFixed(2)} ${measure.unit}`;
}

function getObservationRangeOption(hours: ObservationRangeHours) {
  return (
    observationRangeOptions.find((option) => option.hours === hours) ??
    observationRangeOptions[0]
  );
}

function getObservationStats(measure: SectionObservationMeasure) {
  if (measure.history.length < 2) {
    return {
      min: measure.latest?.value ?? null,
      max: measure.latest?.value ?? null,
      delta: 0,
      trend: "steady" as const,
    };
  }

  const values = measure.history.map((reading) => reading.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const first = values[0];
  const latest = values[values.length - 1];
  const delta = latest - first;
  const trend =
    Math.abs(delta) < 0.01 ? "steady" : delta > 0 ? "rising" : "falling";

  return { min, max, delta, trend };
}

function getPrimaryObservationMeasure(measures: SectionObservationMeasure[]) {
  const parameterPriority: ObservationParameter[] = [
    "river_level",
    "river_flow",
    "release",
    "rainfall",
    "tidal_level",
    "sea_level",
    "forecast",
  ];

  return (
    measures.find(
      (measure) => measure.relevance === "primary" && measure.latest,
    ) ??
    parameterPriority
      .map((parameter) =>
        measures.find((measure) => measure.parameter === parameter && measure.latest),
      )
      .find(Boolean) ??
    measures.find((measure) => measure.latest) ??
    measures[0] ??
    null
  );
}

function formatShortDateTime(value: string | null | undefined) {
  if (!value) {
    return "not checked";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

function buildObservationChartPoints(measure: SectionObservationMeasure) {
  const maxPoints = 220;
  const readings =
    measure.history.length > maxPoints
      ? sampleObservationHistory(measure.history, maxPoints)
      : measure.history;

  if (readings.length < 2) {
    return "";
  }

  const values = readings.map((reading) => reading.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 240;
  const height = 72;
  const padding = 6;

  return readings
    .map((reading, index) => {
      const x =
        padding + (index / Math.max(1, readings.length - 1)) * (width - padding * 2);
      const y =
        height -
        padding -
        ((reading.value - min) / range) * (height - padding * 2);

      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function sampleObservationHistory(
  history: SectionObservationMeasure["history"],
  maxPoints: number,
) {
  if (history.length <= maxPoints) {
    return history;
  }

  const lastIndex = history.length - 1;
  const sampled: SectionObservationMeasure["history"] = [];
  const seen = new Set<string>();

  for (let index = 0; index < maxPoints; index += 1) {
    const sourceIndex = Math.round((index / (maxPoints - 1)) * lastIndex);
    const reading = history[sourceIndex];

    if (!seen.has(reading.observedAt)) {
      sampled.push(reading);
      seen.add(reading.observedAt);
    }
  }

  return sampled;
}

function parseCoordinateSearch(value: string): LatLngTuple | null {
  const match = value
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);

  if (!match) {
    return null;
  }

  const lat = Number(match[1]);
  const lng = Number(match[2]);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return [lat, lng];
}

function looksLikeWhat3Words(value: string) {
  return /^\/{0,3}[\p{L}-]+(?:\.[\p{L}-]+){2}$/u.test(value.trim());
}

function normaliseWhat3WordsSearch(value: string) {
  return value.trim().replace(/^\/{1,3}/, "").toLowerCase();
}

function distanceKmBetween(from: LatLngTuple, to: LatLngTuple) {
  const earthRadiusKm = 6371;
  const lat1 = (from[0] * Math.PI) / 180;
  const lat2 = (to[0] * Math.PI) / 180;
  const deltaLat = ((to[0] - from[0]) * Math.PI) / 180;
  const deltaLng = ((to[1] - from[1]) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function routeDistanceKm(route: LatLngTuple[]) {
  return route.reduce((total, point, index) => {
    if (index === 0) {
      return total;
    }

    return total + distanceKmBetween(route[index - 1], point);
  }, 0);
}

function watercourseCentre(watercourse: KnownWatercourse): LatLngTuple | null {
  const firstRoute = watercourse.routes.find((route) => route.length > 0);

  if (!firstRoute?.length) {
    return null;
  }

  return firstRoute[Math.floor(firstRoute.length / 2)];
}

function routeImpactPoiLabel(kind: RouteImpactPoi["kind"]) {
  if (kind === "access") return "Access";
  if (kind === "hazard") return "Hazard";
  if (kind === "feature") return "Feature";
  if (kind === "gauge") return "Gauge";
  if (kind === "contribution") return "Community point";
  return "Point";
}

function projectPointForDistance(origin: LatLngTuple, point: LatLngTuple) {
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

function distanceMetersToSegment(
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

function distanceMetersToRoute(point: LatLngTuple, route: LatLngTuple[]) {
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

function collectRouteImpactPoints(
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

function calculateRouteAdjustmentImpact(
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

function routeCentre(route: LatLngTuple[]) {
  if (!route.length) {
    return null;
  }

  const middle = route[Math.floor(route.length / 2)];
  return middle ?? null;
}

function applyRouteOverridesToSections(
  sections: RiverSection[],
  overrides: RouteOverride[],
) {
  if (!overrides.length) {
    return sections;
  }

  const overridesBySectionId = new Map(
    overrides
      .filter((override) => override.routeSource === "section_fixture")
      .map((override) => [override.routeId, override] as const),
  );

  return sections.map((section) => {
    const override = overridesBySectionId.get(section.id);

    if (!override || override.route.length < 2) {
      return section;
    }

    return {
      ...section,
      riverName: override.metadata?.riverName ?? section.riverName,
      sectionName: override.metadata?.sectionName ?? section.sectionName,
      summary: override.metadata?.summary ?? section.summary,
      difficulty: override.metadata?.difficulty ?? section.difficulty,
      accessSummary: override.metadata?.accessNotes ?? section.accessSummary,
      route: override.route,
      centre: routeCentre(override.route) ?? section.centre,
      distanceKm: Number(routeDistanceKm(override.route).toFixed(1)),
      source: section.source
        ? {
            ...section.source,
            notes: `${section.source.notes} Route geometry has a moderator-approved override.`,
            updatedAt: override.appliedAt.slice(0, 10),
          }
        : section.source,
    };
  });
}

function routeSuggestionToCandidateSection(suggestion: RouteSuggestion): RiverSection {
  const route = suggestion.route;
  const centre = routeCentre(route) ?? route[0] ?? ([0, 0] as LatLngTuple);
  const updatedDate =
    suggestion.updatedAt?.slice(0, 10) ?? suggestion.createdAt.slice(0, 10);

  return {
    id: `candidate-route:${suggestion.id}`,
    riverName: suggestion.riverName,
    sectionName: suggestion.sectionName,
    summary: suggestion.summary,
    centre,
    route,
    distanceKm: Number(routeDistanceKm(route).toFixed(1)),
    estimatedTime: "Needs review",
    difficulty: suggestion.difficulty || "Needs grading",
    suitability: ["community candidate", "needs local verification"],
    levelBand: "unknown",
    levelLabel: "No linked level data",
    runnableGuidance:
      "Community candidate route. Treat this as unverified until local contributors confirm access, hazards, grade, and runnable conditions.",
    accessSummary: suggestion.accessNotes || "Access needs local review.",
    gauge: {
      id: `candidate-gauge:${suggestion.id}`,
      name: "No linked gauge yet",
      location: centre,
      value: "Unlinked",
      trend: "steady",
      observedAt: "Needs gauge review",
      source: {
        kind: "community",
        label: "Community route candidate",
        confidence: "low",
        updatedAt: updatedDate,
        notes:
          "Candidate route approved for community review. It is not verified trip advice or canonical route data.",
      },
    },
    accessPoints: [],
    hazards: [],
    features: [],
    photos: [],
    reports: [
      {
        id: `candidate-evidence:${suggestion.id}`,
        author: suggestion.author,
        dateObserved: suggestion.createdAt.slice(0, 10),
        type: "Route evidence",
        text: suggestion.evidence,
        source: {
          kind: "community",
          label: "Route suggestion evidence",
          confidence: "low",
          updatedAt: suggestion.createdAt.slice(0, 10),
          notes:
            "Evidence supplied by the route suggester. Moderators should verify before promotion.",
        },
      },
    ],
    source: {
      kind: "community",
      label: "Community route candidate",
      confidence: "low",
      updatedAt: updatedDate,
      notes:
        "Approved candidate route for community review. Not yet canonical, verified, or promoted as paddling advice.",
    },
  };
}

function mergeApprovedCandidateSections(
  sections: RiverSection[],
  suggestions: RouteSuggestion[],
) {
  const existingIds = new Set(sections.map((section) => section.id));
  const candidates = suggestions
    .filter(
      (suggestion) =>
        suggestion.status === "approved" && suggestion.route.length >= 2,
    )
    .map(routeSuggestionToCandidateSection)
    .filter((section) => !existingIds.has(section.id));

  return [...sections, ...candidates];
}

function isCandidateSection(section: RiverSection) {
  return section.id.startsWith("candidate-route:");
}

function candidateRouteSuggestionId(section: RiverSection) {
  return isCandidateSection(section)
    ? section.id.replace("candidate-route:", "")
    : null;
}

function isDuplicateRoutePoint(
  previous: LatLngTuple | undefined,
  next: LatLngTuple,
) {
  return (
    previous !== undefined &&
    distanceKmBetween(previous, next) * 1000 <= ROUTE_POINT_DEDUPE_METRES
  );
}

function nearestRoutePointIndex(route: LatLngTuple[], target: LatLngTuple) {
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

function routeSegmentBetween(
  route: LatLngTuple[],
  startIndex: number,
  endIndex: number,
) {
  if (startIndex <= endIndex) {
    return route.slice(startIndex, endIndex + 1);
  }

  return route.slice(endIndex, startIndex + 1).reverse();
}

function snapRoughTraceToKnownRoute(
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

function nearestSectionsForLocation(
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

function nearbyPoisForLocation(
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

function distanceMetersToRoutes(point: LatLngTuple, routes: LatLngTuple[][]) {
  return routes.reduce(
    (best, route) => Math.min(best, distanceMetersToRoute(point, route)),
    Infinity,
  );
}

function distanceMetersBetweenRoutes(
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

function watercourseRouteDistanceKm(watercourse: KnownWatercourse) {
  return watercourse.routes.reduce(
    (total, route) => total + routeDistanceKm(route),
    0,
  );
}

function collectWatercourseContextPois(
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

function collectWatercourseContextSections(
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

function watercourseTypeLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function watercourseHintRows(watercourse: KnownWatercourse) {
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

function formatDistanceKm(distanceKm: number) {
  return distanceKm < 1
    ? `${Math.round(distanceKm * 1000)} m`
    : `${distanceKm.toFixed(1)} km`;
}

function formatDistanceMetres(distanceMetres: number) {
  if (!Number.isFinite(distanceMetres)) {
    return "unknown";
  }

  return distanceMetres < 1000
    ? `${Math.round(distanceMetres)} m`
    : `${(distanceMetres / 1000).toFixed(1)} km`;
}

function formatSignedDistanceKm(distanceKm: number | null) {
  if (distanceKm == null) {
    return "Unknown";
  }

  const prefix = distanceKm > 0 ? "+" : "";
  return `${prefix}${distanceKm.toFixed(1)} km`;
}

function liveLocationStatusLabel(status: LiveLocationStatus) {
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

function liveLocationUpdatedLabel(location: LiveLocationSnapshot | null) {
  if (!location) {
    return "No location fix yet.";
  }

  return `Updated ${new Date(location.updatedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function navigationUrl(location: LatLngTuple) {
  return googleMapsDirectionsUrl(location);
}

function fallbackMapPoisForSection(section: RiverSection): MapPoi[] {
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

function readPayloadString(
  payload: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function mapPoiToSelectedPoi(poi: MapPoi, section: RiverSection): SelectedPoi {
  return {
    id: poi.id,
    kind: poi.kind,
    title: poi.title,
    subtitle: poi.subtitle,
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

function contributionToSelectedPoi(
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

function defaultObservedDate() {
  return new Date().toISOString().slice(0, 10);
}

function syncStatusLabel(status?: ContributionSyncStatus) {
  if (!status) {
    return "saved";
  }

  const labels: Record<ContributionSyncStatus, string> = {
    draft: "draft",
    queued: "queued offline",
    syncing: "syncing",
    synced: "synced",
    failed: "sync failed",
  };

  return labels[status];
}

function contributionStatusLabel(status: Contribution["status"]) {
  const labels: Record<Contribution["status"], string> = {
    active: "active",
    reported: "reported",
    pending: "pending review",
    "needs-confirmation": "needs confirmation",
    confirmed: "confirmed",
    challenged: "challenged",
    hidden: "hidden",
    rejected: "rejected",
    resolved: "resolved",
  };

  return labels[status] ?? status;
}

function moderationResultMessage(
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

function hasModeratorAccess(role?: MemberRole | null) {
  return role === "ADMIN" || role === "CONTRIB_MODERATOR";
}

function hasAdminAccess(role?: MemberRole | null) {
  return role === "ADMIN";
}

function mergeSectionContributions(
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

function AppNavigation({
  activeSection,
  collapsed,
  isAdmin,
  isSignedIn,
  isAuthConfigured,
  memberLabel,
  memberMeta,
  memberRole,
  onToggleCollapsed,
  onSelectSection,
  onSignIn,
}: {
  activeSection: AppSection;
  collapsed: boolean;
  isAdmin: boolean;
  isSignedIn: boolean;
  isAuthConfigured: boolean;
  memberLabel: string;
  memberMeta: string;
  memberRole: string;
  onToggleCollapsed: () => void;
  onSelectSection: (section: AppSection) => void;
  onSignIn: () => void;
}) {
  const visibleNavItems = isAdmin
    ? [...appNavItems, { id: "admin" as const, label: "Admin", icon: ShieldCheck }]
    : appNavItems;

  return (
    <aside className={`app-nav ${collapsed ? "app-nav--collapsed" : ""}`}>
      <div className="app-nav__header">
        <div className="app-nav__brand" title="RiverLaunch.app">
          <span className="brand-mark brand-mark--nav">
            <Waves size={20} strokeWidth={2.3} />
          </span>
          <span>
            <strong>RiverLaunch.app</strong>
            <small>River intelligence</small>
          </span>
        </div>
        <button
          className="app-nav__toggle"
          type="button"
          onClick={onToggleCollapsed}
          title={collapsed ? "Expand navigation" : "Collapse navigation"}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          <ChevronDown size={16} />
        </button>
      </div>
      <nav aria-label="App sections">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={`app-nav__item ${
                activeSection === item.id ? "app-nav__item--active" : ""
              }`}
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => onSelectSection(item.id)}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="app-nav__account">
        <button
          className="app-nav__account-main"
          type="button"
          title={
            isSignedIn
              ? `${memberLabel} · ${memberRole}`
              : "Create account or sign in"
          }
          onClick={isSignedIn ? () => onSelectSection("profile") : onSignIn}
          disabled={!isSignedIn && !isAuthConfigured}
        >
          <span className="app-nav__avatar">
            <UserRound size={18} />
          </span>
          <span className="app-nav__account-text">
            <strong>{memberLabel}</strong>
            <small>{memberMeta}</small>
          </span>
        </button>
        <span className="status-chip app-nav__account-role">{memberRole}</span>
      </div>
    </aside>
  );
}

function MobileBottomNav({
  activeSection,
  onSelectSection,
}: {
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
}) {
  return (
    <nav className="bottom-nav" aria-label="App sections">
      {appNavItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            className={`bottom-nav__item ${
              activeSection === item.id ||
              (activeSection === "admin" && item.id === "more")
                ? "bottom-nav__item--active"
                : ""
            }`}
            key={item.id}
            type="button"
            onClick={() => onSelectSection(item.id)}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function AppBrandPanel() {
  return (
    <div className="app-brand-panel">
      <span className="brand-mark">
        <Waves size={22} strokeWidth={2.3} />
      </span>
      <div>
        <strong>RiverLaunch.app</strong>
        <span>Community river intelligence for paddlers.</span>
      </div>
    </div>
  );
}

function AppNotificationBanner({
  notification,
  onDismiss,
}: {
  notification: AppNotification;
  onDismiss: () => void;
}) {
  return (
    <div
      className={`app-notification app-notification--${notification.tone}`}
      role="status"
    >
      <CheckCircle2 size={16} />
      <span>{notification.message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss notification">
        <X size={15} />
      </button>
    </div>
  );
}

function AuthPromptSheet({
  mode,
  authMessage,
  isAuthConfigured,
  onGoogleAuth,
  onCreateEmailAccount,
  onEmailSignIn,
  onPasswordReset,
  onContinueAsGuest,
  onClose,
}: {
  mode: AuthSheetMode;
  authMessage: string;
  isAuthConfigured: boolean;
  onGoogleAuth: () => Promise<boolean>;
  onCreateEmailAccount: (input: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<boolean>;
  onEmailSignIn: (input: { email: string; password: string }) => Promise<boolean>;
  onPasswordReset: (email: string) => Promise<boolean>;
  onContinueAsGuest: () => void;
  onClose: () => void;
}) {
  const isAccountRequired = mode === "save-required";
  const [authPanelMode, setAuthPanelMode] =
    useState<AuthPanelMode>(isAccountRequired ? "signin" : "create");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage("");

    if (!isAuthConfigured || isSubmitting) {
      return;
    }

    const safeEmail = email.trim();
    const safePassword = password;

    if (!safeEmail || !safePassword) {
      setFormMessage("Email and password are required.");
      return;
    }

    if (
      authPanelMode === "create" &&
      safePassword.length < MIN_ACCOUNT_PASSWORD_LENGTH
    ) {
      setFormMessage(
        `Use a password with at least ${MIN_ACCOUNT_PASSWORD_LENGTH} characters.`,
      );
      return;
    }

    setIsSubmitting(true);
    const ok =
      authPanelMode === "create"
        ? await onCreateEmailAccount({
            displayName: displayName.trim(),
            email: safeEmail,
            password: safePassword,
          })
        : await onEmailSignIn({ email: safeEmail, password: safePassword });
    setIsSubmitting(false);

    if (ok) {
      onClose();
    }
  }

  async function resetPassword() {
    setFormMessage("");

    if (!email.trim()) {
      setFormMessage("Enter your email address first.");
      return;
    }

    setIsSubmitting(true);
    const ok = await onPasswordReset(email.trim());
    setIsSubmitting(false);

    if (ok) {
      setFormMessage("Password reset email sent.");
    }
  }

  async function handleGoogleAuth() {
    setFormMessage("");
    setIsSubmitting(true);
    const ok = await onGoogleAuth();
    setIsSubmitting(false);

    if (ok) {
      onClose();
    }
  }

  return (
    <div className="auth-sheet-backdrop auth-sheet-backdrop--welcome" role="presentation">
      <section
        className="auth-sheet auth-sheet--welcome"
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to RiverLaunch.app"
      >
        <div className="auth-sheet__image">
          <img src="/images/river-tryweryn.jpeg" alt="" />
        </div>
        <div className="auth-sheet__content">
          <div className="auth-sheet__brand">
            <span className="brand-mark">
              <Waves size={22} strokeWidth={2.3} />
            </span>
            <span>RiverLaunch.app</span>
          </div>
          <div>
            <p className="eyebrow">Community river intelligence</p>
            <h2>Browse now. Save and contribute with an account.</h2>
            <p>
              Explore routes, levels, access points, hazards, and photos as a
              guest. Create an account when you want to save, upload, sync, or
              add local knowledge.
            </p>
          </div>
          {isAccountRequired ? (
            <p className="profile-message profile-message--neutral">
              That action needs an account. You can still continue browsing as a
              guest.
            </p>
          ) : null}
          {authMessage ? <p className="profile-message">{authMessage}</p> : null}
          {formMessage ? (
            <p className="profile-message profile-message--neutral">{formMessage}</p>
          ) : null}
          <div
            className="segmented-control auth-mode-tabs"
            role="tablist"
            aria-label="Account action"
          >
            <button
              className={authPanelMode === "create" ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={authPanelMode === "create"}
              onClick={() => setAuthPanelMode("create")}
            >
              Create account
            </button>
            <button
              className={authPanelMode === "signin" ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={authPanelMode === "signin"}
              onClick={() => setAuthPanelMode("signin")}
            >
              Sign in
            </button>
          </div>
          <form className="auth-form" onSubmit={submitEmailAuth}>
            {authPanelMode === "create" ? (
              <label>
                Display name
                <input
                  autoComplete="name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your paddling name"
                />
              </label>
            ) : null}
            <label>
              Email
              <input
                autoComplete="email"
                inputMode="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              Password
              <input
                autoComplete={
                  authPanelMode === "create" ? "new-password" : "current-password"
                }
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={
                  authPanelMode === "create"
                    ? "At least 12 characters"
                    : "Your password"
                }
                required
              />
              {authPanelMode === "create" ? (
                <span className="auth-password-tip">
                  Tip: three unrelated words are memorable and hard to guess.
                </span>
              ) : null}
            </label>
            <button
              className="primary-action primary-action--full"
              type="submit"
              disabled={!isAuthConfigured || isSubmitting}
            >
              <LogIn size={16} />
              {isSubmitting
                ? "Please wait..."
                : authPanelMode === "create"
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>
          <button
            className="ghost-button auth-google-button"
            type="button"
            onClick={handleGoogleAuth}
            disabled={!isAuthConfigured || isSubmitting}
          >
            <LogIn size={16} />
            {authPanelMode === "create"
              ? "Create account with Google"
              : "Sign in with Google"}
          </button>
          <div className="auth-sheet__actions">
            {authPanelMode === "signin" ? (
              <button
                className="ghost-button"
                type="button"
                onClick={() => void resetPassword()}
                disabled={!isAuthConfigured || isSubmitting}
              >
                Reset password
              </button>
            ) : null}
            <button
              className="ghost-button auth-guest-button"
              type="button"
              onClick={onContinueAsGuest}
            >
              Continue as guest
            </button>
          </div>
          {!isAuthConfigured ? (
            <p className="auth-sheet__note">
              Sign-in is not configured in this environment.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function PlaceholderPage({
  section,
  title,
  children,
}: {
  section: AppSection;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={`app-page app-page--${section}`} aria-label={title}>
      <div className="app-page__header">
        <h2>{title}</h2>
      </div>
      <div className="app-page__content">{children}</div>
    </section>
  );
}

function PhotoLightbox({
  photo,
  onClose,
}: {
  photo: PhotoLightboxItem;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="photo-lightbox-backdrop" role="presentation" onClick={onClose}>
      <section
        className="photo-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label={photo.title}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="icon-button photo-lightbox__close"
          type="button"
          aria-label="Close photo"
          title="Close"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <img src={photo.src} alt={photo.alt ?? photo.title} />
        <footer>
          <strong>{photo.title}</strong>
          {photo.caption ? <span>{photo.caption}</span> : null}
        </footer>
      </section>
    </div>
  );
}

function PoiDetailPanel({
  poi,
  onClose,
  onAddPhoto,
  onOpenPhoto,
  onReviewMapPoi,
  onUpdateMapPoiStatus,
  onUpdateContributionStatus,
  reviewMessage,
  isReviewSaving,
  isStatusSaving,
  canManagePoiStatus,
}: {
  poi: SelectedPoi;
  onClose: () => void;
  onAddPhoto: () => void;
  onOpenPhoto: (photo: PhotoLightboxItem) => void;
  onReviewMapPoi: (
    poi: MapPoi,
    decision: MapPoiReviewDecision,
    action?: "add" | "remove",
    note?: string,
  ) => void;
  onUpdateMapPoiStatus: (
    poi: MapPoi,
    status: MapPoi["verificationStatus"],
  ) => void;
  onUpdateContributionStatus: (
    poi: SelectedPoi,
    decision: ModerationDecision,
  ) => void;
  reviewMessage: string;
  isReviewSaving: boolean;
  isStatusSaving: boolean;
  canManagePoiStatus: boolean;
}) {
  const [what3wordsAddress, setWhat3WordsAddress] = useState(
    poi.what3words ?? "",
  );
  const [isWhat3WordsLoading, setIsWhat3WordsLoading] = useState(false);
  const [what3wordsUnavailable, setWhat3WordsUnavailable] = useState(false);
  const [copiedLocationLabel, setCopiedLocationLabel] = useState("");
  const [isCorrectionFormOpen, setIsCorrectionFormOpen] = useState(false);
  const [correctionNote, setCorrectionNote] = useState("");
  const [adminMapPoiStatus, setAdminMapPoiStatus] =
    useState<MapPoi["verificationStatus"]>("confirmed");
  const [adminContributionDecision, setAdminContributionDecision] =
    useState<ModerationDecision>("confirm");
  const [activePoiDetailsTab, setActivePoiDetailsTab] =
    useState<PoiDetailsTab>("details");

  function resetWhat3WordsState() {
    setCopiedLocationLabel("");
    setWhat3WordsAddress(poi.what3words ?? "");
    setWhat3WordsUnavailable(false);
    setIsWhat3WordsLoading(false);
  }

  useEffect(() => {
    resetWhat3WordsState();
    setIsCorrectionFormOpen(false);
    setCorrectionNote(poi.mapPoi?.viewerReview?.correctionNote ?? "");
    setAdminMapPoiStatus(poi.mapPoi?.verificationStatus ?? "confirmed");
    setAdminContributionDecision(
      poi.status === "needs-confirmation"
        ? "request-confirmation"
        : poi.status === "challenged"
          ? "challenge"
          : poi.status === "hidden"
            ? "hide"
            : poi.status === "rejected"
              ? "reject"
              : poi.status === "resolved"
                ? "resolve"
                : poi.status === "reported"
                  ? "approve"
                  : "confirm",
    );
    setActivePoiDetailsTab("details");
  }, [poi.id, poi.location, poi.what3words]);

  async function loadWhat3WordsAddress() {
    setIsWhat3WordsLoading(true);
    setWhat3WordsUnavailable(false);

    try {
      const result = await fetchWhat3WordsAddress(poi.location);
      setWhat3WordsUnavailable(!result.configured || !result.words);
      setWhat3WordsAddress(result.words ?? "");
    } catch {
      setWhat3WordsUnavailable(true);
    } finally {
      setIsWhat3WordsLoading(false);
    }
  }

  function retryWhat3WordsAddress() {
    setCopiedLocationLabel("");
    void loadWhat3WordsAddress();
  }

  async function copyLocationText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLocationLabel(`${label} copied`);
    } catch {
      setCopiedLocationLabel("Could not copy");
    }
  }

  const coordinateText = formatLocation(poi.location);
  const formattedWhat3Words = what3wordsAddress
    ? formatWhat3Words(what3wordsAddress)
    : "";
  const viewerCorrectionNote =
    poi.mapPoi?.viewerReview?.correctionNote?.trim() ?? "";
  const visiblePoiDetailsTabs = poiDetailsTabs.filter(
    (tab) => tab.id !== "verification" || poi.mapPoi || poi.kind === "contribution",
  );

  return (
    <section className="poi-detail-panel" aria-label="Point of interest details">
      <button
        className="panel-close"
        type="button"
        aria-label="Close point of interest details"
        title="Close"
        onClick={onClose}
      >
        <X size={18} />
      </button>
      <div className="poi-detail-panel__header">
        <p className="eyebrow">{poi.kind}</p>
        <h2>{poi.title}</h2>
        <span>{poi.subtitle}</span>
      </div>
      <div className="panel-content panel-content--tabbed">
        <div
          className="segmented-control route-detail-tabs poi-detail-tabs"
          role="tablist"
          aria-label="Point details"
        >
          {visiblePoiDetailsTabs.map((tab) => (
            <button
              className={activePoiDetailsTab === tab.id ? "active" : ""}
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activePoiDetailsTab === tab.id}
              onClick={() => setActivePoiDetailsTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activePoiDetailsTab === "details" ? (
          <div className="route-tab-panel" role="tabpanel">
            <div className="compact-summary-panel" aria-label="Point summary">
              <div className="compact-summary-item">
                <MapPinned size={15} />
                <span>Section</span>
                <strong>{poi.sectionLabel}</strong>
              </div>
              <div className="compact-summary-item">
                <Navigation size={15} />
                <span>Location</span>
                <strong>{formatLocation(poi.location)}</strong>
              </div>
              <div className="compact-summary-item">
                <ShieldCheck size={15} />
                <span>Status</span>
                <strong>{poi.status ?? "Info"}</strong>
              </div>
              <div className="compact-summary-item">
                <MessageSquare size={15} />
                <span>Source</span>
                <strong>{poi.sourceConfidence ?? "Demo"}</strong>
              </div>
            </div>
            <section className="info-block">
              <h3>Details</h3>
              <p>{poi.summary}</p>
            </section>
            {poi.sourceLabel ? (
              <section className="info-block">
                <h3>Source</h3>
                <p>{poi.sourceLabel}</p>
              </section>
            ) : null}
            {poi.kind === "contribution" ? (
              <section className="info-block">
                <h3>Contribution</h3>
                <div className="detail-list">
                  {poi.contributionType ? (
                    <span>
                      <strong>Type</strong>
                      {poi.contributionType}
                    </span>
                  ) : null}
                  {poi.category ? (
                    <span>
                      <strong>Category</strong>
                      {poi.category}
                    </span>
                  ) : null}
                  {poi.author ? (
                    <span>
                      <strong>Added by</strong>
                      {poi.author}
                    </span>
                  ) : null}
                  {poi.dateObserved ? (
                    <span>
                      <strong>Observed</strong>
                      {poi.dateObserved}
                    </span>
                  ) : null}
                  {poi.createdAt ? (
                    <span>
                      <strong>Added</strong>
                      {poi.createdAt}
                    </span>
                  ) : null}
                </div>
              </section>
            ) : null}
            {poi.syncStatus ? (
              <section className="info-block">
                <h3>Sync</h3>
                <span className={`status-chip status-chip--sync-${poi.syncStatus}`}>
                  {syncStatusLabel(poi.syncStatus)}
                </span>
              </section>
            ) : null}
          </div>
        ) : null}

        {activePoiDetailsTab === "location" ? (
          <div className="route-tab-panel" role="tabpanel">
            <section className="info-block info-block--first">
              <h3>Location</h3>
              <div className="detail-list">
                <span>
                  <strong>Coordinates</strong>
                  {coordinateText}
                </span>
                {formattedWhat3Words ? (
                  <span>
                    <strong>what3words</strong>
                    {formattedWhat3Words}
                  </span>
                ) : isWhat3WordsLoading ? (
                  <span>
                    <strong>what3words</strong>
                    Looking up...
                  </span>
                ) : what3wordsUnavailable ? (
                  <span>
                    <strong>what3words</strong>
                    Unavailable
                  </span>
                ) : null}
              </div>
              <div className="location-actions">
                <a
                  className="ghost-button ghost-button--compact"
                  href={googleMapsSearchUrl(poi.location)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapIcon size={15} />
                  Maps
                </a>
                {poi.navigationLocation ? (
                  <a
                    className="ghost-button ghost-button--compact"
                    href={googleMapsDirectionsUrl(poi.navigationLocation)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Navigation size={15} />
                    Navigate
                  </a>
                ) : null}
                <button
                  className="ghost-button ghost-button--compact"
                  type="button"
                  onClick={() => void copyLocationText("Coordinates", coordinateText)}
                >
                  <Copy size={15} />
                  Copy
                </button>
                {formattedWhat3Words ? (
                  <button
                    className="ghost-button ghost-button--compact"
                    type="button"
                    onClick={() =>
                      void copyLocationText("what3words", formattedWhat3Words)
                    }
                  >
                    <Copy size={15} />
                    W3W
                  </button>
                ) : !isWhat3WordsLoading ? (
                  <button
                    className="ghost-button ghost-button--compact"
                    type="button"
                    onClick={retryWhat3WordsAddress}
                  >
                    <RefreshCw size={15} />
                    Fetch W3W
                  </button>
                ) : null}
              </div>
              {copiedLocationLabel ? (
                <p className="source-note">{copiedLocationLabel}</p>
              ) : null}
            </section>
          </div>
        ) : null}

        {activePoiDetailsTab === "verification" &&
        (poi.mapPoi || poi.kind === "contribution") ? (
          <div className="route-tab-panel" role="tabpanel">
            <section className="info-block info-block--first">
              <div className="block-title">
                <h3>Verification</h3>
                <span
                  className={`status-chip status-chip--${
                    poi.mapPoi?.verificationStatus ?? poi.status ?? "reported"
                  }`}
                >
                  {poi.mapPoi?.verificationStatus ??
                    contributionStatusLabel(poi.status as Contribution["status"])}
                </span>
              </div>
              {poi.mapPoi ? (
                <>
                  <div className="detail-list">
                    <span>
                      <strong>Confirmations</strong>
                      {poi.mapPoi.confirmations}
                    </span>
                    <span>
                      <strong>Correction suggestions</strong>
                      {poi.mapPoi.corrections}
                    </span>
                  </div>
                  <div className="inline-actions">
                    <button
                      className={`ghost-button ghost-button--compact ${
                        poi.mapPoi.viewerReview?.confirmed ? "is-selected" : ""
                      }`}
                      type="button"
                      disabled={isReviewSaving}
                      aria-pressed={poi.mapPoi.viewerReview?.confirmed ?? false}
                      onClick={() =>
                        onReviewMapPoi(
                          poi.mapPoi!,
                          "confirm",
                          poi.mapPoi!.viewerReview?.confirmed ? "remove" : "add",
                        )
                      }
                    >
                      <CheckCircle2 size={15} />
                      {poi.mapPoi.viewerReview?.confirmed
                        ? "Confirmed"
                        : "Confirm"}
                    </button>
                    <button
                      className={`ghost-button ghost-button--compact ${
                        poi.mapPoi.viewerReview?.suggestedCorrection
                          ? "is-selected"
                          : ""
                      }`}
                      type="button"
                      disabled={isReviewSaving}
                      aria-pressed={
                        poi.mapPoi.viewerReview?.suggestedCorrection ?? false
                      }
                      onClick={() => {
                        setCorrectionNote(
                          poi.mapPoi?.viewerReview?.correctionNote ?? "",
                        );
                        setIsCorrectionFormOpen(true);
                      }}
                    >
                      <Flag size={15} />
                      {poi.mapPoi.viewerReview?.suggestedCorrection
                        ? "Correction suggested"
                        : "Suggest correction"}
                    </button>
                  </div>
                  {!isCorrectionFormOpen && viewerCorrectionNote ? (
                    <div className="inline-correction-note">
                      <span>Your correction</span>
                      <p>{viewerCorrectionNote}</p>
                    </div>
                  ) : null}
                  {isCorrectionFormOpen ? (
                    <div className="inline-correction-form">
                      <label>
                        <span>Correction note</span>
                        <textarea
                          rows={3}
                          value={correctionNote}
                          onChange={(event) => setCorrectionNote(event.target.value)}
                          placeholder="What needs correcting?"
                        />
                      </label>
                      <div className="inline-actions">
                        <button
                          className="ghost-button ghost-button--compact"
                          type="button"
                          disabled={isReviewSaving || correctionNote.trim().length < 3}
                          onClick={() => {
                            const note = correctionNote.trim();

                            if (note) {
                              onReviewMapPoi(
                                poi.mapPoi!,
                                "correction",
                                "add",
                                note,
                              );
                              setIsCorrectionFormOpen(false);
                            }
                          }}
                        >
                          Submit
                        </button>
                        <button
                          className="ghost-button ghost-button--compact"
                          type="button"
                          disabled={isReviewSaving}
                          onClick={() => {
                            setIsCorrectionFormOpen(false);
                            setCorrectionNote(
                              poi.mapPoi?.viewerReview?.correctionNote ?? "",
                            );
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="source-note">
                  This contribution is managed through the moderation workflow.
                  Confirmed items can still receive correction suggestions without
                  being made unconfirmed first.
                </p>
              )}
              {canManagePoiStatus ? (
                <div className="inline-admin-control">
                  <div>
                    <strong>Moderator status override</strong>
                    <span>
                      Use this only for data quality, safety, duplicate, or
                      moderation fixes.
                    </span>
                  </div>
                  {poi.mapPoi ? (
                    <div className="inline-admin-control__actions">
                      <select
                        value={adminMapPoiStatus}
                        onChange={(event) =>
                          setAdminMapPoiStatus(
                            event.target.value as MapPoi["verificationStatus"],
                          )
                        }
                      >
                        {mapPoiStatusActions.map((action) => (
                          <option key={action.status} value={action.status}>
                            {action.label}
                          </option>
                        ))}
                      </select>
                      <button
                        className="primary-action"
                        type="button"
                        disabled={isStatusSaving}
                        onClick={() => onUpdateMapPoiStatus(poi.mapPoi!, adminMapPoiStatus)}
                      >
                        Apply
                      </button>
                    </div>
                  ) : (
                    <div className="inline-admin-control__actions">
                      <select
                        value={adminContributionDecision}
                        onChange={(event) =>
                          setAdminContributionDecision(
                            event.target.value as ModerationDecision,
                          )
                        }
                      >
                        {moderationActions.map((action) => (
                          <option key={action.decision} value={action.decision}>
                            {action.label}
                          </option>
                        ))}
                      </select>
                      <button
                        className="primary-action"
                        type="button"
                        disabled={isStatusSaving}
                        onClick={() =>
                          onUpdateContributionStatus(poi, adminContributionDecision)
                        }
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
              {reviewMessage ? <p className="source-note">{reviewMessage}</p> : null}
            </section>
          </div>
        ) : null}

        {activePoiDetailsTab === "photos" ? (
          <div className="route-tab-panel" role="tabpanel">
            <section className="info-block info-block--first">
              <div className="block-title">
                <h3>Photos</h3>
                <span>{poi.photos?.length ?? 0} attached</span>
              </div>
              <button className="ghost-button" type="button" onClick={onAddPhoto}>
                <Camera size={16} />
                Add photo
              </button>
              {poi.photos?.length ? (
                <div className="poi-photo-grid">
                  {poi.photos.map((photo) => (
                    <figure key={photo.id}>
                      <button
                        className="photo-open-button"
                        type="button"
                        onClick={() =>
                          onOpenPhoto({
                            src: photo.displayUrl || photo.thumbnailUrl,
                            title: photo.caption || poi.title,
                            caption: photo.originalName,
                            alt: photo.caption || poi.title,
                          })
                        }
                      >
                        <img
                          src={photo.displayUrl || photo.thumbnailUrl}
                          alt=""
                        />
                      </button>
                      <figcaption>
                        <strong>{photo.caption || poi.title}</strong>
                        {photo.originalName ? (
                          <span>{photo.originalName}</span>
                        ) : null}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <p className="source-note">No photos have been added to this point yet.</p>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function RouteAdjustmentImpactPanel({
  impact,
}: {
  impact: RouteAdjustmentImpact;
}) {
  const impactedCount =
    impact.movedOutside.length + impact.newlyNear.length + impact.endpointWarnings.length;

  return (
    <div className="route-impact-panel">
      <div className="route-impact-panel__header">
        <strong>Impact review</strong>
        <span>{impactedCount ? `${impactedCount} checks flagged` : "No major flags"}</span>
      </div>
      <div className="route-impact-metrics" aria-label="Route edit impact metrics">
        <span>
          Current <strong>{impact.currentDistanceKm?.toFixed(1) ?? "?"} km</strong>
        </span>
        <span>
          Proposed <strong>{impact.proposedDistanceKm.toFixed(1)} km</strong>
        </span>
        <span>
          Change <strong>{formatSignedDistanceKm(impact.distanceDeltaKm)}</strong>
        </span>
        <span>
          Points <strong>{impact.pointsChecked}</strong>
        </span>
      </div>
      {impact.endpointWarnings.length ? (
        <ul className="route-impact-list route-impact-list--warning">
          {impact.endpointWarnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      {impact.movedOutside.length ? (
        <div className="route-impact-group">
          <span>May no longer sit on this route</span>
          <ul className="route-impact-list">
            {impact.movedOutside.slice(0, 4).map((point) => (
              <li key={point.id}>
                {routeImpactPoiLabel(point.kind)}: {point.title}{" "}
                <small>
                  {formatDistanceMetres(point.beforeDistanceM)} to{" "}
                  {formatDistanceMetres(point.afterDistanceM)}
                </small>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {impact.newlyNear.length ? (
        <div className="route-impact-group">
          <span>Newly near the proposed route</span>
          <ul className="route-impact-list">
            {impact.newlyNear.slice(0, 4).map((point) => (
              <li key={point.id}>
                {routeImpactPoiLabel(point.kind)}: {point.title}{" "}
                <small>{formatDistanceMetres(point.afterDistanceM)} away</small>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {!impactedCount ? (
        <p>
          Known points remain inside the {ROUTE_IMPACT_CORRIDOR_METRES} m review
          corridor. This does not confirm access, safety, or suitability.
        </p>
      ) : null}
    </div>
  );
}

function App() {
  const outboxStore = useMemo(() => createContributionOutboxStore(), []);
  const [activeAppSection, setActiveAppSection] =
    useState<AppSection>("map");
  const [activeAdminPage, setActiveAdminPage] = useState<AdminPage>("index");
  const [isAppNavCollapsed, setIsAppNavCollapsed] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState(riverSections[0].id);
  const [sectionFocusNonce, setSectionFocusNonce] = useState(0);
  const [pendingUnfavouriteSection, setPendingUnfavouriteSection] =
    useState<RiverSection | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>(() =>
    loadContributions(),
  );
  const [outboxRecords, setOutboxRecords] = useState<ContributionOutboxRecord[]>(
    [],
  );
  const [favouriteSectionIds, setFavouriteSectionIds] = useState<string[]>(() =>
    loadFavouriteSectionIds(),
  );
  const [routeSuggestions, setRouteSuggestions] = useState<RouteSuggestion[]>(
    loadRouteSuggestions,
  );
  const [approvedRouteSuggestions, setApprovedRouteSuggestions] = useState<
    RouteSuggestion[]
  >([]);
  const [routeAdjustments, setRouteAdjustments] = useState<RouteAdjustment[]>([]);
  const [routeOverrides, setRouteOverrides] = useState<RouteOverride[]>([]);
  const [routeCreateMode, setRouteCreateMode] =
    useState<RouteCreateMode>("idle");
  const [routeDraftTarget, setRouteDraftTarget] =
    useState<RouteDraftTarget>({ type: "new" });
  const [routeDraftPoints, setRouteDraftPoints] = useState<LatLngTuple[]>([]);
  const [routeDraftOriginalPoints, setRouteDraftOriginalPoints] = useState<
    LatLngTuple[] | null
  >(null);
  const [routeDraftSnapMessage, setRouteDraftSnapMessage] = useState("");
  const [isRouteSnapLoading, setIsRouteSnapLoading] = useState(false);
  const [showKnownRivers, setShowKnownRivers] = useState(false);
  const [showRoutesLayer, setShowRoutesLayer] = useState(true);
  const [showSelectedRoutePath, setShowSelectedRoutePath] = useState(true);
  const [routeFormError, setRouteFormError] = useState("");
  const [routeRiverName, setRouteRiverName] = useState("");
  const [routeSectionName, setRouteSectionName] = useState("");
  const [routeDifficulty, setRouteDifficulty] = useState("");
  const [routeSummary, setRouteSummary] = useState("");
  const [routeAccessNotes, setRouteAccessNotes] = useState("");
  const [routeEvidence, setRouteEvidence] = useState("");
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isRouteStatusCardVisible, setIsRouteStatusCardVisible] = useState(true);
  const [routeDetailsTab, setRouteDetailsTab] =
    useState<RouteDetailsTab>("details");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [contributionType, setContributionType] =
    useState<ContributionType>("hazard");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [formError, setFormError] = useState("");
  const [category, setCategory] = useState("weir");
  const [severity, setSeverity] = useState<HazardSeverity>("caution");
  const [dateObserved, setDateObserved] = useState(defaultObservedDate);
  const [craftType, setCraftType] = useState("open canoe");
  const [selectedPhoto, setSelectedPhoto] =
    useState<ProcessedContributionPhoto | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [photoFileName, setPhotoFileName] = useState("");
  const [isPhotoProcessing, setIsPhotoProcessing] = useState(false);
  const [isSubmittingContribution, setIsSubmittingContribution] = useState(false);
  const [selectedLocation, setSelectedLocation] =
    useState<LatLngTuple | null>(null);
  const [searchFocusLocation, setSearchFocusLocation] =
    useState<LatLngTuple | null>(null);
  const [searchFocusLabel, setSearchFocusLabel] = useState("Searched location");
  const [showSearchFocusMarker, setShowSearchFocusMarker] = useState(false);
  const [searchFocusNonce, setSearchFocusNonce] = useState(0);
  const [routeSuggestionFocusId, setRouteSuggestionFocusId] = useState<string | null>(
    null,
  );
  const [routeSuggestionFocusNonce, setRouteSuggestionFocusNonce] = useState(0);
  const [routeAdjustmentFocusId, setRouteAdjustmentFocusId] = useState<string | null>(
    null,
  );
  const [routeAdjustmentFocusNonce, setRouteAdjustmentFocusNonce] = useState(0);
  const [isCompactMapControls, setIsCompactMapControls] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia(COMPACT_MAP_CONTROLS_QUERY).matches,
  );
  const [areMapControlsExpanded, setAreMapControlsExpanded] = useState(false);
  const [selectedPoi, setSelectedPoi] = useState<SelectedPoi | null>(null);
  const [selectedTargetLabel, setSelectedTargetLabel] = useState(
    "Selected map location",
  );
  const [isAddMode, setIsAddMode] = useState(false);
  const [isSyncingOutbox, setIsSyncingOutbox] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [isLiveLocationEnabled, setIsLiveLocationEnabled] = useState(
    loadLiveLocationEnabled,
  );
  const [liveLocation, setLiveLocation] =
    useState<LiveLocationSnapshot | null>(null);
  const [liveLocationStatus, setLiveLocationStatus] =
    useState<LiveLocationStatus>("idle");
  const [liveLocationMessage, setLiveLocationMessage] = useState("");
  const [liveLocationFocusNonce, setLiveLocationFocusNonce] = useState(0);
  const [, setPendingLiveLocationFocus] = useState(false);
  const [authState, setAuthState] = useState<AuthState>({
    status: "loading",
    user: null,
    error: null,
  });
  const [authMessage, setAuthMessage] = useState("");
  const [appNotification, setAppNotification] =
    useState<AppNotification | null>(null);
  const [analyticsConsent, setAnalyticsConsent] = useState<AnalyticsConsent>(
    loadAnalyticsConsent,
  );
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [memberMessage, setMemberMessage] = useState("");
  const [publicNameDraft, setPublicNameDraft] = useState("");
  const [emergencyProfile, setEmergencyProfile] =
    useState<MemberEmergencyProfile | null>(null);
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [emergencyContactRelationship, setEmergencyContactRelationship] =
    useState("");
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isEmergencyProfileLoading, setIsEmergencyProfileLoading] =
    useState(false);
  const [isEmergencyProfileSaving, setIsEmergencyProfileSaving] =
    useState(false);
  const [memberPhotos, setMemberPhotos] = useState<MemberPhoto[]>([]);
  const [isMemberPhotosLoading, setIsMemberPhotosLoading] = useState(false);
  const [photoMessage, setPhotoMessage] = useState("");
  const [pendingPhotoDelete, setPendingPhotoDelete] =
    useState<PendingPhotoDelete | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoLightboxItem | null>(
    null,
  );
  const [memberContributions, setMemberContributions] = useState<Contribution[]>(
    [],
  );
  const [isMemberContributionsLoading, setIsMemberContributionsLoading] =
    useState(false);
  const [isMemberRouteSuggestionsLoading, setIsMemberRouteSuggestionsLoading] =
    useState(false);
  const [pointMessage, setPointMessage] = useState("");
  const [pendingPointDelete, setPendingPointDelete] =
    useState<PendingPointDelete | null>(null);
  const [adminMembers, setAdminMembers] = useState<MemberProfile[]>([]);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [selectedAdminMemberDetail, setSelectedAdminMemberDetail] =
    useState<AdminMemberDetail | null>(null);
  const [isAdminMemberDetailLoading, setIsAdminMemberDetailLoading] =
    useState(false);
  const [adminMemberDetailMessage, setAdminMemberDetailMessage] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] =
    useState<MemberRoleFilter>("all");
  const [memberTrustFilter, setMemberTrustFilter] =
    useState<MemberTrustFilter>("all");
  const [moderationContributions, setModerationContributions] = useState<
    Contribution[]
  >([]);
  const [moderationMapPoiReviews, setModerationMapPoiReviews] = useState<
    MapPoiCorrectionReview[]
  >([]);
  const [moderationRouteSuggestions, setModerationRouteSuggestions] = useState<
    RouteSuggestion[]
  >([]);
  const [moderationRouteAdjustments, setModerationRouteAdjustments] = useState<
    RouteAdjustment[]
  >([]);
  const [moderationDraftDecisions, setModerationDraftDecisions] = useState<
    Record<string, ModerationDraftDecision>
  >({});
  const [routeModerationDraftDecisions, setRouteModerationDraftDecisions] =
    useState<Record<string, RouteModerationDraftDecision>>({});
  const [routeAdjustmentDraftDecisions, setRouteAdjustmentDraftDecisions] =
    useState<Record<string, RouteAdjustmentDraftDecision>>({});
  const [moderationTab, setModerationTab] =
    useState<ModerationTab>("route-edits");
  const [isModerationLoading, setIsModerationLoading] = useState(false);
  const [moderationMessage, setModerationMessage] = useState("");
  const [liveGauge, setLiveGauge] = useState<LiveGaugeReading | null>(null);
  const [isGaugeLoading, setIsGaugeLoading] = useState(false);
  const [sectionObservations, setSectionObservations] = useState<
    SectionObservationMeasure[]
  >([]);
  const [observationRangeHours, setObservationRangeHours] =
    useState<ObservationRangeHours>(48);
  const [displayedObservationRangeHours, setDisplayedObservationRangeHours] =
    useState<ObservationRangeHours>(48);
  const [isSectionObservationsLoading, setIsSectionObservationsLoading] =
    useState(false);
  const [sectionObservationMessage, setSectionObservationMessage] = useState("");
  const [observationJobRuns, setObservationJobRuns] = useState<
    ObservationJobRun[]
  >([]);
  const [watercourseImportStatus, setWatercourseImportStatus] = useState<
    WatercourseImportStatus[]
  >([]);
  const [isObservationJobsLoading, setIsObservationJobsLoading] = useState(false);
  const [isObservationIngestionRunning, setIsObservationIngestionRunning] =
    useState(false);
  const [observationJobMessage, setObservationJobMessage] = useState("");
  const [observationCooldownNow, setObservationCooldownNow] = useState(() =>
    Date.now(),
  );
  const [sectionMapPois, setSectionMapPois] = useState<MapPoi[]>([]);
  const [isSectionMapPoisLoaded, setIsSectionMapPoisLoaded] = useState(false);
  const [mapPoiReviewMessage, setMapPoiReviewMessage] = useState("");
  const [isMapPoiReviewSaving, setIsMapPoiReviewSaving] = useState(false);
  const [isPoiStatusSaving, setIsPoiStatusSaving] = useState(false);
  const [isSectionListOpen, setIsSectionListOpen] = useState(false);
  const [authSheetMode, setAuthSheetMode] = useState<AuthSheetMode | null>(null);
  const [isWelcomeDismissedForSession, setIsWelcomeDismissedForSession] =
    useState(() => hasDismissedWelcomeForSession());
  const [syncBannerDismissal, setSyncBannerDismissal] =
    useState<SyncBannerDismissal | null>(() => loadSyncBannerDismissal());
  const [searchMode, setSearchMode] = useState<SearchMode>("name");
  const [profileMode, setProfileMode] = useState<ProfileMode>("account");
  const [riverSearchTerm, setRiverSearchTerm] = useState("");
  const [watercourseSearchTerm, setWatercourseSearchTerm] = useState("");
  const [watercourseSearchResults, setWatercourseSearchResults] = useState<
    KnownWatercourse[]
  >([]);
  const [watercourseSearchMessage, setWatercourseSearchMessage] = useState("");
  const [isWatercourseSearchLoading, setIsWatercourseSearchLoading] =
    useState(false);
  const [watercourseFocusId, setWatercourseFocusId] = useState<string | null>(
    null,
  );
  const [watercourseFocusNonce, setWatercourseFocusNonce] = useState(0);
  const [locationSearchInput, setLocationSearchInput] = useState("");
  const [locationSearchResult, setLocationSearchResult] =
    useState<LocationSearchResult | null>(null);
  const [locationSearchMessage, setLocationSearchMessage] = useState("");
  const [isLocationSearchLoading, setIsLocationSearchLoading] = useState(false);

  const appRiverSections = useMemo(
    () =>
      mergeApprovedCandidateSections(
        applyRouteOverridesToSections(riverSections, routeOverrides),
        approvedRouteSuggestions,
      ),
    [approvedRouteSuggestions, routeOverrides],
  );
  const activeSection = useMemo(
    () =>
      appRiverSections.find((section) => section.id === activeSectionId) ??
      appRiverSections[0],
    [activeSectionId, appRiverSections],
  );
  const activeRiverSections = useMemo(
    () =>
      appRiverSections.filter(
        (section) => section.riverName === activeSection.riverName,
      ),
    [activeSection.riverName, appRiverSections],
  );
  const observationSectionIdRef = useRef(activeSection.id);

  const sectionContributions = contributions.filter(
    (contribution) => contribution.sectionId === activeSection.id,
  );
  const fallbackSectionMapPois = useMemo(
    () => fallbackMapPoisForSection(activeSection),
    [activeSection],
  );
  const visibleSectionMapPois =
    isSectionMapPoisLoaded && sectionMapPois.length
      ? sectionMapPois
      : fallbackSectionMapPois;
  const visibleAccessPois = visibleSectionMapPois.filter(
    (poi) => poi.kind === "access",
  );
  const visibleHazardPois = visibleSectionMapPois.filter(
    (poi) => poi.kind === "hazard",
  );
  const primaryObservationMeasure = useMemo(
    () => getPrimaryObservationMeasure(sectionObservations),
    [sectionObservations],
  );
  const primaryObservationStats = primaryObservationMeasure
    ? getObservationStats(primaryObservationMeasure)
    : null;
  const routeStatusSummary = primaryObservationMeasure
    ? {
        label: observationParameterLabels[primaryObservationMeasure.parameter],
        value: formatObservationValue(
          primaryObservationMeasure.latest?.value,
          primaryObservationMeasure.unit,
        ),
        trend: primaryObservationStats?.trend ?? "steady",
        source: primaryObservationMeasure.stationName,
        observedAt: formatShortDateTime(
          primaryObservationMeasure.latest?.observedAt,
        ),
        state: primaryObservationMeasure.latest?.state ?? "unavailable",
      }
    : liveGauge
      ? {
          label: "River level",
          value:
            liveGauge.gauge.latestValue != null
              ? `${liveGauge.gauge.latestValue.toFixed(2)} ${liveGauge.gauge.unit}`
              : activeSection.gauge.value,
          trend: liveGauge.state ?? liveGauge.gauge.trend,
          source: liveGauge.gauge.name,
          observedAt: formatShortDateTime(liveGauge.gauge.observedAt),
          state: liveGauge.state ?? "checking",
        }
      : {
          label: "Level",
          value: activeSection.levelLabel,
          trend: activeSection.gauge.trend,
          source: activeSection.gauge.name,
          observedAt: activeSection.gauge.observedAt,
          state: activeSection.levelBand,
        };
  const latestObservationIngestionJob = observationJobRuns.find(
    (jobRun) => jobRun.jobType === "observations.ingest",
  );
  const latestObservationIngestionStartedAt = latestObservationIngestionJob
    ? new Date(latestObservationIngestionJob.startedAt).getTime()
    : Number.NaN;
  const observationIngestionCooldownMs = Number.isFinite(
    latestObservationIngestionStartedAt,
  )
    ? Math.max(
        0,
        15 * 60 * 1000 -
          (observationCooldownNow - latestObservationIngestionStartedAt),
      )
    : 0;
  const isObservationIngestionOnCooldown =
    observationIngestionCooldownMs > 0 ||
    latestObservationIngestionJob?.status === "running";
  const observationIngestionCooldownLabel =
    observationIngestionCooldownMs > 0
      ? `${Math.ceil(observationIngestionCooldownMs / 60000)} min`
      : "";
  const sectionContributionPhotos = sectionContributions.flatMap((contribution) =>
    (contribution.photos ?? []).map((photo) => ({ contribution, photo })),
  );

  const currentContributionOption = optionForType(contributionType);
  const outboxByContributionId = useMemo(
    () =>
      new Map(
        outboxRecords.map((record) => [record.contribution.id, record] as const),
      ),
    [outboxRecords],
  );
  const queuedOutboxCount = outboxRecords.filter((record) =>
    ["draft", "queued", "syncing", "failed"].includes(record.syncStatus),
  ).length;
  const failedOutboxCount = outboxRecords.filter(
    (record) => record.syncStatus === "failed",
  ).length;
  const moderationContributionPhotoCount = moderationContributions.filter(
    (contribution) => contribution.type === "photo",
  ).length;
  const isAuthConfigured = authState.status !== "unconfigured";
  const isSignedIn = Boolean(authState.user);
  const isLiveLocationSupported =
    typeof navigator !== "undefined" && "geolocation" in navigator;
  const liveLocationAlert =
    liveLocationStatus === "denied" ||
    liveLocationStatus === "unavailable" ||
    liveLocationStatus === "error"
      ? liveLocationMessage
      : "";
  const canSyncOutbox =
    queuedOutboxCount > 0 &&
    !isSyncingOutbox &&
    isSignedIn &&
    isOnline;
  const isSyncBannerDismissed =
    Boolean(syncBannerDismissal) &&
    syncBannerDismissal!.expiresAt > Date.now() &&
    queuedOutboxCount <= syncBannerDismissal!.queuedOutboxCount &&
    failedOutboxCount <= syncBannerDismissal!.failedOutboxCount;
  const favouriteSections = appRiverSections.filter((section) =>
    favouriteSectionIds.includes(section.id),
  );
  const isActiveSectionFavourite =
    isSignedIn && favouriteSectionIds.includes(activeSection.id);
  const canAccessAdminTools = hasModeratorAccess(memberProfile?.role);
  const canManageMembers = hasAdminAccess(memberProfile?.role);
  const filteredSearchSections = useMemo(() => {
    const searchTerm = riverSearchTerm.trim().toLowerCase();

    if (!searchTerm) {
      return appRiverSections;
    }

    return appRiverSections.filter((section) =>
      [
        section.riverName,
        section.sectionName,
        section.summary,
        section.difficulty,
        section.levelLabel,
        ...section.suitability,
      ].some((value) => value.toLowerCase().includes(searchTerm)),
    );
  }, [appRiverSections, riverSearchTerm]);
  const filteredAdminMembers = useMemo(() => {
    const searchTerm = memberSearch.trim().toLowerCase();

    return adminMembers.filter((member) => {
      const matchesSearch =
        !searchTerm ||
        [
          member.displayName,
          member.email,
          member.firebaseUid,
          member.role,
          member.trustLevel,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(searchTerm));
      const matchesRole =
        memberRoleFilter === "all" || member.role === memberRoleFilter;
      const matchesTrust =
        memberTrustFilter === "all" || member.trustLevel === memberTrustFilter;

      return matchesSearch && matchesRole && matchesTrust;
    });
  }, [adminMembers, memberRoleFilter, memberSearch, memberTrustFilter]);

  useEffect(() => subscribeToAuthState(setAuthState), []);

  useEffect(() => {
    setAnalyticsConsentPreference(analyticsConsent);
    saveAnalyticsConsent(analyticsConsent);
  }, [analyticsConsent]);

  useEffect(() => {
    if (analyticsConsent !== "accepted") {
      return;
    }

    const title =
      activeAppSection === "admin"
        ? `Admin ${activeAdminPage}`
        : activeAppSection === "profile"
          ? `Profile ${profileMode}`
          : activeAppSection === "search"
            ? `Search ${searchMode}`
            : activeAppSection === "map"
              ? `Map ${activeSection.sectionName}`
              : activeAppSection;
    const path =
      activeAppSection === "admin"
        ? `/admin/${activeAdminPage}`
        : activeAppSection === "profile"
          ? `/profile/${profileMode}`
          : activeAppSection === "search"
            ? `/search/${searchMode}`
            : `/${activeAppSection}`;

    void trackPageView({ title, path });
  }, [
    activeAdminPage,
    activeAppSection,
    activeSection.sectionName,
    analyticsConsent,
    profileMode,
    searchMode,
  ]);

  useEffect(() => {
    function updateOnlineState() {
      setIsOnline(navigator.onLine);
    }

    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);

    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  useEffect(() => {
    saveLiveLocationEnabled(isLiveLocationEnabled);
  }, [isLiveLocationEnabled]);

  useEffect(() => {
    if (!isLiveLocationEnabled) {
      setLiveLocation(null);
      setLiveLocationStatus("idle");
      setLiveLocationMessage("");
      setPendingLiveLocationFocus(false);
      return;
    }

    if (!isLiveLocationSupported) {
      setLiveLocation(null);
      setLiveLocationStatus("unavailable");
      setLiveLocationMessage("Location sharing is not available in this browser.");
      return;
    }

    setLiveLocationStatus("locating");
    setLiveLocationMessage("Waiting for browser location permission.");

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const nextLocation: LiveLocationSnapshot = {
          location: [position.coords.latitude, position.coords.longitude],
          accuracyMeters: Number.isFinite(position.coords.accuracy)
            ? position.coords.accuracy
            : null,
          updatedAt: position.timestamp || Date.now(),
        };

        setLiveLocation(nextLocation);
        setLiveLocationStatus("watching");
        setLiveLocationMessage("Live location is visible on the map.");
        setPendingLiveLocationFocus((shouldFocus) => {
          if (shouldFocus) {
            setLiveLocationFocusNonce((current) => current + 1);
          }

          return false;
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLiveLocationStatus("denied");
          setLiveLocationMessage("Location permission was denied by the browser.");
          return;
        }

        setLiveLocationStatus(
          error.code === error.POSITION_UNAVAILABLE ? "unavailable" : "error",
        );
        setLiveLocationMessage(
          error.code === error.TIMEOUT
            ? "Location timed out. Try again with a clearer signal."
            : "Could not get your current location.",
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isLiveLocationEnabled, isLiveLocationSupported]);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(COMPACT_MAP_CONTROLS_QUERY);
    const updateCompactControls = () => {
      setIsCompactMapControls(mediaQuery.matches);
      if (!mediaQuery.matches) {
        setAreMapControlsExpanded(false);
      }
    };

    updateCompactControls();
    mediaQuery.addEventListener("change", updateCompactControls);

    return () => {
      mediaQuery.removeEventListener("change", updateCompactControls);
    };
  }, []);

  useEffect(() => {
    if (authState.status === "loading") {
      return;
    }

    if (authState.user) {
      setAuthSheetMode(null);
      return;
    }

    if (!isWelcomeDismissedForSession && authSheetMode !== "save-required") {
      setAuthSheetMode("welcome");
    }
  }, [
    authState.status,
    authState.user,
    authSheetMode,
    isWelcomeDismissedForSession,
  ]);

  useEffect(() => {
    let isMounted = true;

    if (!authState.user) {
      setMemberProfile(null);
      setMemberMessage("");
      setPublicNameDraft("");
      setEmergencyProfile(null);
      setEmergencyContactName("");
      setEmergencyContactPhone("");
      setEmergencyContactRelationship("");
      setAdminMembers([]);
      setMemberPhotos([]);
      setPhotoMessage("");
      setPendingPhotoDelete(null);
      setMemberContributions([]);
      setPointMessage("");
      setPendingPointDelete(null);
      setModerationContributions([]);
      setModerationDraftDecisions({});
      setModerationRouteSuggestions([]);
      setRouteModerationDraftDecisions({});
      setModerationRouteAdjustments([]);
      setRouteAdjustmentDraftDecisions({});
      setModerationMessage("");
      return () => {
        isMounted = false;
      };
    }

    fetchCurrentMember()
      .then((member) => {
        if (isMounted) {
          setMemberProfile(member);
          setPublicNameDraft(member.publicName ?? member.displayName ?? "");
          setMemberMessage("");
        }
      })
      .catch((error) => {
        if (isMounted) {
          setMemberProfile(null);
          setMemberMessage(
            error instanceof Error ? error.message : "Could not load member profile.",
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [authState.user]);

  useEffect(() => {
    if (!appNotification) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setAppNotification((current) =>
        current?.id === appNotification.id ? null : current,
      );
    }, 6000);

    return () => window.clearTimeout(timeoutId);
  }, [appNotification]);

  useEffect(() => {
    let isMounted = true;

    if (!authState.user || profileMode !== "emergency") {
      return () => {
        isMounted = false;
      };
    }

    setIsEmergencyProfileLoading(true);
    fetchMyEmergencyProfile()
      .then((profile) => {
        if (isMounted) {
          setEmergencyProfile(profile);
          setEmergencyContactName(profile.emergencyContactName);
          setEmergencyContactPhone(profile.emergencyContactPhone);
          setEmergencyContactRelationship(profile.emergencyContactRelationship);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setMemberMessage(
            error instanceof Error
              ? error.message
              : "Could not load emergency contact.",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsEmergencyProfileLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [authState.user, profileMode]);

  useEffect(() => {
    if (
      activeAppSection === "admin" &&
      activeAdminPage === "members" &&
      canManageMembers
    ) {
      void openAdminPanel();
    }
  }, [activeAppSection, activeAdminPage, canManageMembers]);

  useEffect(() => {
    if (
      activeAppSection === "admin" &&
      activeAdminPage === "moderation" &&
      canAccessAdminTools
    ) {
      void openModerationPanel();
    }
  }, [activeAppSection, activeAdminPage, canAccessAdminTools]);

  useEffect(() => {
    if (
      activeAppSection === "admin" &&
      activeAdminPage === "system" &&
      canManageMembers
    ) {
      void loadObservationJobs();
    }
  }, [activeAppSection, activeAdminPage, canManageMembers]);

  useEffect(() => {
    if (!isObservationIngestionOnCooldown) {
      return;
    }

    const interval = window.setInterval(() => {
      setObservationCooldownNow(Date.now());
    }, 30000);

    return () => window.clearInterval(interval);
  }, [isObservationIngestionOnCooldown]);

  useEffect(() => {
    if (!authState.user || activeAppSection !== "profile") {
      return;
    }

    void loadMemberPhotos();
    void loadMemberContributions();
  }, [activeAppSection, authState.user]);

  useEffect(() => {
    let isMounted = true;

    fetchRouteOverrides()
      .then((overrides) => {
        if (isMounted) {
          setRouteOverrides(overrides);
        }
      })
      .catch(() => {
        if (isMounted) {
          setRouteOverrides([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetchApprovedRouteSuggestions()
      .then((suggestions) => {
        if (isMounted) {
          setApprovedRouteSuggestions(suggestions);
        }
      })
      .catch(() => {
        if (isMounted) {
          setApprovedRouteSuggestions([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contributions));
  }, [contributions]);

  useEffect(() => {
    localStorage.setItem(
      ROUTE_SUGGESTIONS_STORAGE_KEY,
      JSON.stringify(routeSuggestions),
    );
  }, [routeSuggestions]);

  useEffect(() => {
    let isMounted = true;

    if (!authState.user) {
      return () => {
        isMounted = false;
      };
    }

    fetchMyRouteSuggestions()
      .then((suggestions) => {
        if (!isMounted) {
          return;
        }

        setRouteSuggestions((current) => {
          const localOnly = current.filter(
            (suggestion) => suggestion.status === "local-draft",
          );
          const localIds = new Set(localOnly.map((suggestion) => suggestion.id));
          return [
            ...localOnly,
            ...suggestions.filter((suggestion) => !localIds.has(suggestion.id)),
          ];
        });
      })
      .catch(() => {
        // Local route suggestions remain visible if the API is unavailable.
      });

    return () => {
      isMounted = false;
    };
  }, [authState.user]);

  useEffect(() => {
    let isMounted = true;

    setIsSectionMapPoisLoaded(false);
    setSectionMapPois([]);
    setMapPoiReviewMessage("");
    fetchSectionMapPois(activeSection.id)
      .then((pois) => {
        if (isMounted) {
          setSectionMapPois(pois);
          setIsSectionMapPoisLoaded(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSectionMapPois([]);
          setIsSectionMapPoisLoaded(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeSection.id]);

  useEffect(() => {
    let isMounted = true;

    fetchSectionContributions(activeSection.id)
      .then((backendContributions) => {
        if (isMounted) {
          setContributions((current) =>
            mergeSectionContributions(
              current,
              activeSection.id,
              backendContributions,
              outboxRecords,
            ),
          );
        }
      })
      .catch((error) => {
        if (isMounted) {
          setSyncMessage(
            error instanceof Error
              ? `Could not load backend contributions: ${error.message}`
              : "Could not load backend contributions.",
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeSection.id, authState.user?.uid, outboxRecords]);

  useEffect(() => {
    localStorage.setItem(
      FAVOURITES_STORAGE_KEY,
      JSON.stringify(favouriteSectionIds),
    );
  }, [favouriteSectionIds]);

  useEffect(() => {
    let isMounted = true;

    outboxStore.list().then((records) => {
      if (isMounted) {
        setOutboxRecords(records);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [outboxStore]);

  useEffect(() => {
    let isMounted = true;
    const isNewSection = observationSectionIdRef.current !== activeSection.id;

    if (isNewSection) {
      observationSectionIdRef.current = activeSection.id;
      setLiveGauge(null);
      setSectionObservations([]);
      setDisplayedObservationRangeHours(observationRangeHours);
    }

    setIsGaugeLoading(true);
    setIsSectionObservationsLoading(true);
    setSectionObservationMessage("");

    Promise.allSettled([
      fetchSectionObservations(activeSection.id, observationRangeHours),
      fetchEnvironmentAgencyGaugeReading(activeSection),
    ])
      .then(([observationsResult, liveGaugeResult]) => {
        if (isMounted) {
          if (observationsResult.status === "fulfilled") {
            setSectionObservations(observationsResult.value);
            setDisplayedObservationRangeHours(observationRangeHours);
          } else {
            setSectionObservationMessage(
              observationsResult.reason instanceof Error
                ? observationsResult.reason.message
                : "Could not load stored observation history.",
            );
          }

          if (liveGaugeResult.status === "fulfilled") {
            setLiveGauge(liveGaugeResult.value);
          }
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsGaugeLoading(false);
          setIsSectionObservationsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeSection, observationRangeHours]);

  async function submitContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const safeTitle = title.trim();
    const safeDetail = detail.trim();

    if (!isSignedIn) {
      setFormError("Create an account or sign in before saving local knowledge.");
      setAuthSheetMode("save-required");
      return;
    }

    if (!safeTitle || !safeDetail) {
      setFormError("Add a title and detail before saving.");
      return;
    }

    if (currentContributionOption.locationRequired && !selectedLocation) {
      setFormError("Pick a map location for this contribution before saving.");
      return;
    }

    if (isPhotoProcessing || isSubmittingContribution) {
      return;
    }

    if (contributionType === "photo" && !selectedPhoto) {
      setFormError("Choose a photo before saving this contribution.");
      return;
    }

    const location = currentContributionOption.locationRequired
      ? selectedLocation!
      : (selectedLocation ?? undefined);
    const contributionId = crypto.randomUUID();
    setIsSubmittingContribution(true);
    setFormError("");

    let photos: Contribution["photos"] = [];

    try {
      if (contributionType === "photo" && selectedPhoto) {
        photos = [
          await uploadContributionPhoto(
            contributionId,
            selectedPhoto,
            safeDetail,
          ),
        ];
      }
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not upload this photo.",
      );
      setIsSubmittingContribution(false);
      return;
    }

    let what3words: string | undefined;
    if (location && isOnline) {
      try {
        const locationReference = await fetchWhat3WordsAddress(location);
        what3words = locationReference.words ?? undefined;
      } catch {
        what3words = undefined;
      }
    }

    const nextContribution: Contribution = {
      id: contributionId,
      sectionId: activeSection.id,
      type: contributionType,
      title: safeTitle,
      detail: safeDetail,
      category,
      severity: contributionType === "hazard" ? severity : undefined,
      status:
        contributionType === "hazard" ? "needs-confirmation" : "confirmed",
      author: authState.user?.displayName ?? "Local contributor",
      dateObserved,
      craftType:
        contributionType === "report" || contributionType === "hazard"
          ? craftType
          : undefined,
      confirmations: contributionType === "hazard" ? 0 : 1,
      lastConfirmed: contributionType === "hazard" ? undefined : "Just now",
      createdAt: "Just now",
      location,
      what3words,
      photos,
    };

    const outboxRecord = createContributionOutboxRecord(nextContribution);

    setContributions((current) => [nextContribution, ...current]);
    setOutboxRecords((current) => [
      outboxRecord,
      ...current.filter((record) => record.id !== outboxRecord.id),
    ]);
    clearSyncBannerDismissal();

    try {
      await outboxStore.save(outboxRecord);
    } catch (error) {
      const failedRecord: ContributionOutboxRecord = {
        ...outboxRecord,
        syncStatus: "failed",
        updatedAt: new Date().toISOString(),
        lastSyncError:
          error instanceof Error
            ? error.message
            : "Could not save contribution to offline outbox.",
      };
      setOutboxRecords((current) =>
        current.map((record) =>
          record.id === failedRecord.id ? failedRecord : record,
        ),
      );
    }

    setTitle("");
    setDetail("");
    clearSelectedPhoto();
    setFormError("");
    setSelectedLocation(null);
    setIsFormOpen(false);
    setIsSubmittingContribution(false);
    setSyncMessage("Saved locally. Sync now to publish this contribution.");
    void trackProductEvent(
      contributionType === "photo" ? "photo_uploaded" : "poi_created",
      {
        contribution_type: contributionType,
        section_id: activeSection.id,
        has_photo: photos.length > 0,
      },
    );
  }

  async function handlePhotoSelection(file: File | undefined) {
    clearSelectedPhoto();

    if (!file) {
      return;
    }

    setIsPhotoProcessing(true);
    setFormError("");

    try {
      const processedPhoto = await processContributionPhoto(file);
      setSelectedPhoto(processedPhoto);
      setPhotoPreviewUrl(URL.createObjectURL(processedPhoto.display.blob));
      setPhotoFileName(file.name);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Could not prepare this photo.",
      );
    } finally {
      setIsPhotoProcessing(false);
    }
  }

  function clearSelectedPhoto() {
    setSelectedPhoto(null);
    setPhotoFileName("");
    setPhotoPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return "";
    });
  }

  function resetDemoContributions() {
    setContributions([]);
    outboxRecords.forEach((record) => {
      void outboxStore.remove(record.id);
    });
    setOutboxRecords([]);
    setSyncMessage("");
    clearSyncBannerDismissal();
  }

  async function syncOutboxNow() {
    if (queuedOutboxCount === 0 || isSyncingOutbox) {
      return;
    }

    if (!isSignedIn) {
      setSyncMessage("Create an account or sign in before syncing local contributions.");
      setAuthSheetMode("save-required");
      return;
    }

    setIsSyncingOutbox(true);
    setSyncMessage("Syncing local changes...");

    try {
      const summary = await syncContributionOutbox(outboxStore, {
        getAuthToken: getCurrentUserIdToken,
      });
      const nextRecords = await outboxStore.list();
      setOutboxRecords(nextRecords);
      if (
        nextRecords.filter((record) =>
          ["draft", "queued", "syncing", "failed"].includes(record.syncStatus),
        ).length === 0
      ) {
        clearSyncBannerDismissal();
      }
      const backendContributions = await fetchSectionContributions(activeSection.id);
      setContributions((current) =>
        mergeSectionContributions(
          current,
          activeSection.id,
          backendContributions,
          nextRecords,
        ),
      );

      if (summary.attempted === 0) {
        setSyncMessage("No local changes to sync.");
      } else if (summary.failed > 0) {
        setSyncMessage(
          `${summary.synced} synced, ${summary.failed} need retry.`,
        );
      } else {
        setSyncMessage(`${summary.synced} synced.`);
      }
    } catch (error) {
      setSyncMessage(
        error instanceof Error ? error.message : "Could not sync changes.",
      );
      setOutboxRecords(await outboxStore.list());
    } finally {
      setIsSyncingOutbox(false);
    }
  }

  function handleSignIn() {
    setAuthMessage("");
    setIsWelcomeDismissedForSession(true);
    setAuthSheetMode("signin");
  }

  async function handleGoogleSignIn() {
    setAuthMessage("");

    try {
      await signInWithGoogle();
      void trackProductEvent("login", { method: "google" });
      return true;
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Could not sign in.");
      return false;
    }
  }

  async function handleCreateEmailAccount(input: {
    email: string;
    password: string;
    displayName: string;
  }) {
    setAuthMessage("");

    try {
      await createAccountWithEmail(input);
      void trackProductEvent("sign_up", { method: "password" });
      setActiveAppSection("profile");
      setProfileMode("public");
      return true;
    } catch (error) {
      setAuthMessage(
        error instanceof Error ? error.message : "Could not create account.",
      );
      return false;
    }
  }

  async function handleEmailSignIn(input: { email: string; password: string }) {
    setAuthMessage("");

    try {
      await signInWithEmail(input);
      void trackProductEvent("login", { method: "password" });
      return true;
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Could not sign in.");
      return false;
    }
  }

  async function handlePasswordReset(email: string) {
    setAuthMessage("");

    try {
      await sendEmailPasswordReset(email);
      return true;
    } catch (error) {
      setAuthMessage(
        error instanceof Error ? error.message : "Could not send reset email.",
      );
      return false;
    }
  }

  async function handleSignOut() {
    setAuthMessage("");

    try {
      await signOutCurrentUser();
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Could not sign out.");
    }
  }

  function continueAsGuest() {
    rememberWelcomeDismissedForSession();
    setIsWelcomeDismissedForSession(true);
    setAuthSheetMode(null);
  }

  function closeAuthSheet() {
    rememberWelcomeDismissedForSession();
    setIsWelcomeDismissedForSession(true);
    setAuthSheetMode(null);
  }

  function showAppNotification(
    message: string,
    tone: AppNotificationTone = "success",
  ) {
    setAppNotification({
      id: Date.now(),
      message,
      tone,
    });
  }

  function requireSignInForSave() {
    setAuthMessage("");
    setIsWelcomeDismissedForSession(true);
    setAuthSheetMode("save-required");
  }

  function enableLiveLocation(shouldFocus = false) {
    if (!isLiveLocationSupported) {
      setLiveLocationStatus("unavailable");
      setLiveLocationMessage("Location sharing is not available in this browser.");
      return;
    }

    setPendingLiveLocationFocus(shouldFocus);
    setIsLiveLocationEnabled(true);

    if (shouldFocus && liveLocation) {
      setLiveLocationFocusNonce((current) => current + 1);
      setPendingLiveLocationFocus(false);
    }
  }

  function disableLiveLocation() {
    setIsLiveLocationEnabled(false);
    setLiveLocation(null);
    setLiveLocationStatus("idle");
    setLiveLocationMessage("");
    setPendingLiveLocationFocus(false);
  }

  function handleLiveLocationToggle(enabled: boolean) {
    if (enabled) {
      enableLiveLocation(false);
      return;
    }

    disableLiveLocation();
  }

  function handleLiveLocationButtonClick() {
    if (!isLiveLocationEnabled) {
      enableLiveLocation(true);
      return;
    }

    if (liveLocation) {
      setLiveLocationFocusNonce((current) => current + 1);
      return;
    }

    setPendingLiveLocationFocus(true);
  }

  function dismissSyncBanner() {
    const dismissal: SyncBannerDismissal = {
      queuedOutboxCount,
      failedOutboxCount,
      expiresAt: Date.now() + SYNC_BANNER_DISMISS_MS,
    };
    setSyncBannerDismissal(dismissal);
    saveSyncBannerDismissal(dismissal);
  }

  function clearSyncBannerDismissal() {
    setSyncBannerDismissal(null);
    saveSyncBannerDismissal(null);
  }

  async function loadMemberPhotos() {
    if (!authState.user) {
      return;
    }

    setIsMemberPhotosLoading(true);
    setPhotoMessage("");

    try {
      setMemberPhotos(await fetchMyPhotos());
    } catch (error) {
      setPhotoMessage(
        error instanceof Error ? error.message : "Could not load your photos.",
      );
    } finally {
      setIsMemberPhotosLoading(false);
    }
  }

  async function loadMemberContributions() {
    if (!authState.user) {
      return;
    }

    setIsMemberContributionsLoading(true);
    setPointMessage("");

    try {
      setMemberContributions(await fetchMyContributions());
    } catch (error) {
      setPointMessage(
        error instanceof Error
          ? error.message
          : "Could not load your local knowledge.",
      );
    } finally {
      setIsMemberContributionsLoading(false);
    }
  }

  async function retryRouteSuggestion(suggestion: RouteSuggestion) {
    if (!authState.user) {
      requireSignInForSave();
      return;
    }

    setPointMessage("");

    try {
      const savedSuggestion = await createRouteSuggestion({
        riverName: suggestion.riverName,
        sectionName: suggestion.sectionName,
        difficulty: suggestion.difficulty,
        summary: suggestion.summary,
        accessNotes: suggestion.accessNotes,
        evidence: suggestion.evidence,
        route: suggestion.route,
      });
      setRouteSuggestions((current) => [
        savedSuggestion,
        ...current.filter((item) => item.id !== suggestion.id),
      ]);
      setPointMessage("Route suggestion sent for review.");
      void trackProductEvent("route_suggested", {
        section_id: savedSuggestion.id,
        source: "retry",
      });
    } catch (error) {
      setPointMessage(
        error instanceof Error
          ? error.message
          : "Could not send this route suggestion.",
      );
    }
  }

  async function loadMemberRouteSuggestions() {
    if (!authState.user) {
      return;
    }

    setIsMemberRouteSuggestionsLoading(true);
    setPointMessage("");

    try {
      const suggestions = await fetchMyRouteSuggestions();
      setRouteSuggestions((current) => {
        const localOnly = current.filter(
          (suggestion) => suggestion.status === "local-draft",
        );
        const localIds = new Set(localOnly.map((suggestion) => suggestion.id));
        return [
          ...localOnly,
          ...suggestions.filter((suggestion) => !localIds.has(suggestion.id)),
        ];
      });
    } catch (error) {
      setPointMessage(
        error instanceof Error
          ? error.message
          : "Could not load your route suggestions.",
      );
    } finally {
      setIsMemberRouteSuggestionsLoading(false);
    }
  }

  async function savePublicName() {
    if (!authState.user) {
      requireSignInForSave();
      return;
    }

    setIsProfileSaving(true);
    setMemberMessage("");

    try {
      const updatedMember = await updateMyProfile({
        publicName: publicNameDraft,
      });
      setMemberProfile(updatedMember);
      setPublicNameDraft(updatedMember.publicName ?? "");
      showAppNotification("Public profile name saved.");
    } catch (error) {
      setMemberMessage(
        error instanceof Error
          ? error.message
          : "Could not save public profile name.",
      );
    } finally {
      setIsProfileSaving(false);
    }
  }

  async function saveEmergencyContact() {
    if (!authState.user) {
      requireSignInForSave();
      return;
    }

    setIsEmergencyProfileSaving(true);
    setMemberMessage("");

    try {
      const savedProfile = await saveMyEmergencyProfile({
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelationship,
      });
      setEmergencyProfile(savedProfile);
      setEmergencyContactName(savedProfile.emergencyContactName);
      setEmergencyContactPhone(savedProfile.emergencyContactPhone);
      setEmergencyContactRelationship(savedProfile.emergencyContactRelationship);
      showAppNotification("Emergency contact saved.");
    } catch (error) {
      setMemberMessage(
        error instanceof Error
          ? error.message
          : "Could not save emergency contact.",
      );
    } finally {
      setIsEmergencyProfileSaving(false);
    }
  }

  function selectedPoiForContribution(
    contribution: Contribution,
    section: RiverSection,
  ): SelectedPoi | null {
    if (!contribution.location) {
      return null;
    }

    return {
      id: contribution.id,
      kind: "contribution",
      title: contribution.title,
      subtitle: `${contribution.type} · ${contribution.category}`,
      summary: contribution.detail,
      sectionLabel: section.sectionName,
      location: contribution.location,
      status: contribution.status,
      sourceLabel: contribution.author,
      sourceConfidence: "community",
      navigationLocation: contribution.location,
      what3words: contribution.what3words,
      photos: contribution.photos,
      category: contribution.category,
      author: contribution.author,
      dateObserved: contribution.dateObserved,
      createdAt: contribution.createdAt,
      contributionType: contribution.type,
    };
  }

  function openSectionOnMap(sectionId: string | null | undefined) {
    const section = appRiverSections.find((item) => item.id === sectionId);

    if (!section) {
      return null;
    }

    setActiveSectionId(section.id);
    setSectionFocusNonce((current) => current + 1);
    setIsPanelOpen(false);
    setSelectedPoi(null);
    setSearchFocusLocation(null);
    setSearchFocusLabel("Searched location");
    setShowSearchFocusMarker(false);
    setRouteSuggestionFocusId(null);
    setRouteAdjustmentFocusId(null);
    setActiveAppSection("map");

    return section;
  }

  function openPhotoOnMap(photo: MemberPhoto) {
    const relatedContribution = [
      ...memberContributions,
      ...(selectedAdminMemberDetail?.contributions ?? []),
    ].find((contribution) => contribution.id === photo.contributionId);

    if (relatedContribution) {
      openContributionOnMap(relatedContribution);
      return;
    }

    if (!openSectionOnMap(photo.sectionId)) {
      setPhotoMessage("This photo is not attached to a known map section.");
      setAdminMemberDetailMessage("This photo is not attached to a known map section.");
    }
  }

  function openMemberPhotoLightbox(photo: MemberPhoto) {
    const src = photo.displayUrl || photo.thumbnailUrl || "";

    if (!src) {
      return;
    }

    setLightboxPhoto({
      src,
      title: photo.contributionTitle,
      caption: photo.caption || photo.contributionDetail,
      alt: photo.caption || photo.contributionTitle,
    });
  }

  function openContributionOnMap(contribution: Contribution) {
    const section = openSectionOnMap(contribution.sectionId);

    if (!section) {
      setPointMessage("This item is not attached to a known map section.");
      setAdminMemberDetailMessage("This item is not attached to a known map section.");
      return;
    }

    if (contribution.location) {
      setSearchFocusLocation(contribution.location);
      setSearchFocusLabel(contribution.title);
      setShowSearchFocusMarker(false);
      setSearchFocusNonce((current) => current + 1);
      setSelectedPoi(selectedPoiForContribution(contribution, section));
    }
  }

  function openRouteSuggestionOnMap(suggestion: RouteSuggestion) {
    setRouteSuggestions((current) => {
      if (current.some((item) => item.id === suggestion.id)) {
        return current;
      }

      return [suggestion, ...current];
    });
    setRouteSuggestionFocusId(suggestion.id);
    setRouteSuggestionFocusNonce((current) => current + 1);
    setSearchFocusLocation(null);
    setSearchFocusLabel("Searched location");
    setShowSearchFocusMarker(false);
    setSelectedPoi(null);
    setIsPanelOpen(false);
    setIsFormOpen(false);
    setIsAddMode(false);
    setActiveAppSection("map");
  }

  function openRouteAdjustmentOnMap(adjustment: RouteAdjustment) {
    setRouteAdjustments((current) => {
      if (current.some((item) => item.id === adjustment.id)) {
        return current;
      }

      return [adjustment, ...current];
    });
    setRouteAdjustmentFocusId(adjustment.id);
    setRouteAdjustmentFocusNonce((current) => current + 1);
    setSearchFocusLocation(null);
    setSearchFocusLabel("Searched location");
    setShowSearchFocusMarker(false);
    setSelectedPoi(null);
    setIsPanelOpen(false);
    setIsFormOpen(false);
    setIsAddMode(false);
    setActiveAppSection("map");
  }

  function removeDeletedPhotoFromContributions(
    current: Contribution[],
    deletedPhoto: MemberPhoto,
  ) {
    return current.flatMap((contribution) => {
      if (contribution.id !== deletedPhoto.contributionId) {
        return [contribution];
      }

      const photos = (contribution.photos ?? []).filter(
        (photo) => photo.id !== deletedPhoto.id,
      );

      if (contribution.type === "photo" && photos.length === 0) {
        return [];
      }

      return [{ ...contribution, photos }];
    });
  }

  function requestDeletePhoto(photoId: string, title: string) {
    setPendingPhotoDelete({ id: photoId, title });
  }

  function requestDeletePoint(contributionId: string, title: string) {
    setPendingPointDelete({ id: contributionId, title });
  }

  async function handleDeletePhoto(photoId: string) {
    setPhotoMessage("");
    setModerationMessage("");

    try {
      const deletedPhoto = await deletePhoto(photoId);
      setMemberPhotos((current) =>
        current.filter((photo) => photo.id !== deletedPhoto.id),
      );
      setContributions((current) =>
        removeDeletedPhotoFromContributions(current, deletedPhoto),
      );
      setModerationContributions((current) =>
        removeDeletedPhotoFromContributions(current, deletedPhoto),
      );
      setPhotoMessage("Photo deleted.");
      setModerationMessage("Photo deleted.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not delete this photo.";
      setPhotoMessage(message);
      setModerationMessage(message);
    } finally {
      setPendingPhotoDelete(null);
    }
  }

  async function handleDeletePoint(contributionId: string) {
    setPointMessage("");
    setModerationMessage("");

    try {
      const deletedContribution = await deleteContribution(contributionId);
      setMemberContributions((current) =>
        current.filter((contribution) => contribution.id !== deletedContribution.id),
      );
      setContributions((current) =>
        current.filter((contribution) => contribution.id !== deletedContribution.id),
      );
      setModerationContributions((current) =>
        current.filter((contribution) => contribution.id !== deletedContribution.id),
      );
      setMemberPhotos((current) =>
        current.filter(
          (photo) => photo.contributionId !== deletedContribution.id,
        ),
      );
      setPointMessage("Point deleted.");
      setModerationMessage("Point deleted.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not delete this point.";
      setPointMessage(message);
      setModerationMessage(message);
    } finally {
      setPendingPointDelete(null);
    }
  }

  async function openAdminPanel() {
    setActiveAppSection("admin");
    setActiveAdminPage("members");
    setIsAdminLoading(true);
    setMemberMessage("");

    try {
      setAdminMembers(await fetchAdminMembers());
    } catch (error) {
      setMemberMessage(
        error instanceof Error ? error.message : "Could not load members.",
      );
    } finally {
      setIsAdminLoading(false);
    }
  }

  async function openAdminMemberDetail(member: MemberProfile) {
    setActiveAppSection("admin");
    setActiveAdminPage("member-detail");
    setSelectedAdminMemberDetail(null);
    setIsAdminMemberDetailLoading(true);
    setAdminMemberDetailMessage("");

    try {
      setSelectedAdminMemberDetail(await fetchAdminMemberDetail(member.id));
    } catch (error) {
      setAdminMemberDetailMessage(
        error instanceof Error
          ? error.message
          : "Could not load member details.",
      );
    } finally {
      setIsAdminMemberDetailLoading(false);
    }
  }

  async function openModerationPanel() {
    setActiveAppSection("admin");
    setActiveAdminPage("moderation");
    setModerationTab("route-edits");
    setIsModerationLoading(true);
    setModerationMessage("");
    setModerationDraftDecisions({});
    setModerationMapPoiReviews([]);
    setModerationRouteSuggestions([]);
    setRouteModerationDraftDecisions({});
    setModerationRouteAdjustments([]);
    setRouteAdjustmentDraftDecisions({});

    try {
      const [
        contributions,
        mapPoiReviews,
        routeSuggestions,
        routeAdjustments,
      ] = await Promise.all([
        fetchModerationContributions(),
        fetchModerationMapPoiReviews(),
        fetchModerationRouteSuggestions(),
        fetchModerationRouteAdjustments(),
      ]);
      setModerationContributions(contributions);
      setModerationMapPoiReviews(mapPoiReviews);
      setModerationRouteSuggestions(routeSuggestions);
      setModerationRouteAdjustments(routeAdjustments);
      setRouteAdjustments(routeAdjustments);
    } catch (error) {
      setModerationMessage(
        error instanceof Error
          ? error.message
          : "Could not load moderation queue.",
      );
    } finally {
      setIsModerationLoading(false);
    }
  }

  async function loadObservationJobs() {
    setIsObservationJobsLoading(true);
    setObservationJobMessage("");
    setObservationCooldownNow(Date.now());

    try {
      const [jobRuns, watercourseImports] = await Promise.all([
        fetchObservationJobRuns(),
        fetchWatercourseImportStatus(),
      ]);
      setObservationJobRuns(jobRuns);
      setWatercourseImportStatus(watercourseImports);
    } catch (error) {
      setObservationJobMessage(
        error instanceof Error
          ? error.message
          : "Could not load observation job status.",
      );
    } finally {
      setIsObservationJobsLoading(false);
    }
  }

  async function handleRunObservationIngestion() {
    if (isObservationIngestionOnCooldown) {
      return;
    }

    setIsObservationIngestionRunning(true);
    setObservationJobMessage("");
    setObservationCooldownNow(Date.now());

    try {
      const jobRun = await runObservationIngestion();
      setObservationJobRuns((current) => [
        jobRun,
        ...current.filter((item) => item.id !== jobRun.id),
      ]);
      setObservationCooldownNow(Date.now());
      setObservationJobMessage(
        `River levels refreshed: ${jobRun.readingsFetched} readings fetched, ${jobRun.readingsInserted} inserted.`,
      );

      if (activeAppSection === "map") {
        setDisplayedObservationRangeHours(observationRangeHours);
        setSectionObservations(
          await fetchSectionObservations(activeSection.id, observationRangeHours),
        );
      }
    } catch (error) {
      setObservationJobMessage(
        error instanceof Error
          ? error.message
          : "Could not refresh river levels.",
      );
      await loadObservationJobs();
    } finally {
      setIsObservationIngestionRunning(false);
    }
  }

  async function updateMemberAccess(
    member: MemberProfile,
    access: { role?: MemberRole; trustLevel?: MemberTrustLevel },
  ) {
    setMemberMessage("");

    try {
      const updatedMember = await updateAdminMemberAccess(member.id, {
        role: access.role ?? member.role,
        trustLevel: access.trustLevel ?? member.trustLevel,
      });
      setAdminMembers((current) =>
        current.map((item) => (item.id === updatedMember.id ? updatedMember : item)),
      );
      setSelectedAdminMemberDetail((current) =>
        current && current.member.id === updatedMember.id
          ? { ...current, member: updatedMember }
          : current,
      );
      if (memberProfile?.id === updatedMember.id) {
        setMemberProfile(updatedMember);
      }
    } catch (error) {
      setMemberMessage(
        error instanceof Error
          ? error.message
          : "Could not update member access.",
      );
    }
  }

  async function applyModerationDecision(
    contribution: Contribution,
    decision: ModerationDecision,
  ) {
    setModerationMessage("");

    try {
      const updatedContribution = await applyContributionModerationDecision(
        contribution.id,
        decision,
      );
      setModerationContributions((current) =>
        current.filter((item) => item.id !== updatedContribution.id),
      );
      setModerationDraftDecisions((current) => {
        const next = { ...current };
        delete next[updatedContribution.id];
        return next;
      });
      setContributions((current) =>
        current.map((item) =>
          item.id === updatedContribution.id ? updatedContribution : item,
        ),
      );
      setMemberContributions((current) =>
        current.map((item) =>
          item.id === updatedContribution.id ? updatedContribution : item,
        ),
      );
      setSelectedAdminMemberDetail((current) =>
        current
          ? {
              ...current,
              contributions: current.contributions.map((item) =>
                item.id === updatedContribution.id ? updatedContribution : item,
              ),
            }
          : current,
      );
      setSelectedPoi((current) => {
        if (current?.kind !== "contribution" || current.id !== updatedContribution.id) {
          return current;
        }

        const section =
          appRiverSections.find((item) => item.id === updatedContribution.sectionId) ??
          activeSection;
        return selectedPoiForContribution(updatedContribution, section);
      });
      setModerationMessage(
        moderationResultMessage(updatedContribution, decision),
      );
    } catch (error) {
      setModerationMessage(
        error instanceof Error
          ? error.message
          : "Could not update contribution moderation state.",
      );
    }
  }

  async function applyRouteModerationDecision(
    routeSuggestion: RouteSuggestion,
    decision: RouteSuggestionDecision,
  ) {
    setModerationMessage("");

    try {
      const updatedSuggestion = await applyRouteSuggestionDecision(
        routeSuggestion.id,
        decision,
      );
      setModerationRouteSuggestions((current) =>
        updatedSuggestion.status === "hidden"
          ? current.filter((item) => item.id !== updatedSuggestion.id)
          : current.map((item) =>
              item.id === updatedSuggestion.id ? updatedSuggestion : item,
            ),
      );
      setRouteModerationDraftDecisions((current) => {
        const next = { ...current };
        delete next[updatedSuggestion.id];
        return next;
      });
      setRouteSuggestions((current) =>
        current.map((item) =>
          item.id === updatedSuggestion.id ? updatedSuggestion : item,
        ),
      );
      setApprovedRouteSuggestions(await fetchApprovedRouteSuggestions());
      setModerationMessage(`Updated ${updatedSuggestion.sectionName}.`);
    } catch (error) {
      setModerationMessage(
        error instanceof Error
          ? error.message
          : "Could not update route suggestion.",
      );
    }
  }

  async function applyRouteAdjustmentModerationDecision(
    routeAdjustment: RouteAdjustment,
    decision: RouteAdjustmentDecision,
  ) {
    setModerationMessage("");

    try {
      const updatedAdjustment = await applyRouteAdjustmentDecision(
        routeAdjustment.id,
        decision,
      );
      setModerationRouteAdjustments((current) =>
        updatedAdjustment.status === "hidden"
          ? current.filter((item) => item.id !== updatedAdjustment.id)
          : current.map((item) =>
              item.id === updatedAdjustment.id ? updatedAdjustment : item,
            ),
      );
      setRouteAdjustmentDraftDecisions((current) => {
        const next = { ...current };
        delete next[updatedAdjustment.id];
        return next;
      });
      setRouteAdjustments((current) =>
        updatedAdjustment.status === "hidden"
          ? current.filter((item) => item.id !== updatedAdjustment.id)
          : current.map((item) =>
              item.id === updatedAdjustment.id ? updatedAdjustment : item,
            ),
      );
      if (
        updatedAdjustment.status === "approved" &&
        updatedAdjustment.targetType === "section"
      ) {
        setRouteOverrides(await fetchRouteOverrides());
        if (updatedAdjustment.targetId === activeSection.id) {
          setSectionFocusNonce((current) => current + 1);
        }
      }
      if (
        updatedAdjustment.status === "approved" &&
        updatedAdjustment.targetType === "route_suggestion"
      ) {
        setApprovedRouteSuggestions(await fetchApprovedRouteSuggestions());
        if (`candidate-route:${updatedAdjustment.targetId}` === activeSection.id) {
          setSectionFocusNonce((current) => current + 1);
        }
      }
      setModerationMessage(`Updated route edit for ${updatedAdjustment.sectionName}.`);
    } catch (error) {
      setModerationMessage(
        error instanceof Error
          ? error.message
          : "Could not update route edit.",
      );
    }
  }

  async function applyMapPoiVerificationStatus(
    poi: MapPoi,
    status: MapPoi["verificationStatus"],
  ) {
    setModerationMessage("");
    setMapPoiReviewMessage("");
    setIsPoiStatusSaving(true);

    try {
      const updatedPoi = await updateMapPoiVerificationStatus(poi.id, status);
      setModerationMapPoiReviews((current) =>
        current.filter((item) => item.poi.id !== updatedPoi.id),
      );
      setSectionMapPois((current) =>
        current.map((item) => (item.id === updatedPoi.id ? updatedPoi : item)),
      );
      setSelectedPoi((current) =>
        current?.mapPoi?.id === updatedPoi.id
          ? mapPoiToSelectedPoi(
              updatedPoi,
              appRiverSections.find((item) => item.id === updatedPoi.sectionId) ??
                activeSection,
            )
          : current,
      );
      setModerationMessage(`Updated ${updatedPoi.title}.`);
      setMapPoiReviewMessage(`Updated ${updatedPoi.title}.`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not update map point verification state.";
      setModerationMessage(message);
      setMapPoiReviewMessage(message);
    } finally {
      setIsPoiStatusSaving(false);
    }
  }

  async function applySelectedPoiContributionStatus(
    poi: SelectedPoi,
    decision: ModerationDecision,
  ) {
    if (poi.kind !== "contribution") {
      return;
    }

    setMapPoiReviewMessage("");
    setIsPoiStatusSaving(true);

    try {
      const updatedContribution = await applyContributionModerationDecision(
        poi.id,
        decision,
      );
      setModerationContributions((current) =>
        current.filter((item) => item.id !== updatedContribution.id),
      );
      setContributions((current) =>
        current.map((item) =>
          item.id === updatedContribution.id ? updatedContribution : item,
        ),
      );
      setMemberContributions((current) =>
        current.map((item) =>
          item.id === updatedContribution.id ? updatedContribution : item,
        ),
      );
      setSelectedAdminMemberDetail((current) =>
        current
          ? {
              ...current,
              contributions: current.contributions.map((item) =>
                item.id === updatedContribution.id ? updatedContribution : item,
              ),
            }
          : current,
      );
      const section =
        appRiverSections.find((item) => item.id === updatedContribution.sectionId) ??
        activeSection;
      setSelectedPoi(selectedPoiForContribution(updatedContribution, section));
      setMapPoiReviewMessage(
        moderationResultMessage(updatedContribution, decision),
      );
    } catch (error) {
      setMapPoiReviewMessage(
        error instanceof Error
          ? error.message
          : "Could not update contribution moderation state.",
      );
    } finally {
      setIsPoiStatusSaving(false);
    }
  }

  function updateContributionStatus(
    contributionId: string,
    status: "confirmed" | "resolved",
  ) {
    setContributions((current) =>
      current.map((contribution) =>
        contribution.id === contributionId
          ? {
              ...contribution,
              status,
              confirmations:
                status === "confirmed"
                  ? contribution.confirmations + 1
                  : contribution.confirmations,
              lastConfirmed: "Just now",
            }
          : contribution,
      ),
    );
  }

  function startRouteSuggestionMode(watercourse?: KnownWatercourse) {
    if (!isSignedIn) {
      requireSignInForSave();
      return;
    }

    const watercourseFocus = watercourse ? watercourseCentre(watercourse) : null;

    setRouteDraftTarget({ type: "new" });
    setRouteDraftPoints([]);
    setRouteDraftOriginalPoints(null);
    setRouteDraftSnapMessage("");
    setRouteCreateMode("tracing");
    setRouteFormError("");
    setRouteRiverName(watercourse?.name ?? activeSection.riverName);
    setRouteSectionName("");
    setRouteDifficulty("");
    setRouteSummary("");
    setRouteAccessNotes("");
    setRouteEvidence("");
    setIsAddMode(false);
    setIsFormOpen(false);
    setSelectedPoi(null);
    setIsPanelOpen(false);
    if (watercourse && watercourseFocus) {
      setShowKnownRivers(true);
      setWatercourseFocusId(watercourse.id);
      setWatercourseFocusNonce((current) => current + 1);
      setSearchFocusLocation(watercourseFocus);
      setSearchFocusLabel(watercourse.name ?? "Known waterway");
      setShowSearchFocusMarker(false);
      setSearchFocusNonce((current) => current + 1);
      setActiveAppSection("map");
    } else {
      setSearchFocusLocation(null);
      setSearchFocusLabel("Searched location");
      setShowSearchFocusMarker(false);
    }
    setRouteSuggestionFocusId(null);
    setRouteAdjustmentFocusId(null);
  }

  function startRouteAdjustmentMode(section: RiverSection) {
    if (!isSignedIn) {
      requireSignInForSave();
      return;
    }

    if (!canAccessAdminTools) {
      showAppNotification("Only admins and moderators can edit routes.", "error");
      return;
    }

    const routeSuggestionId = candidateRouteSuggestionId(section);

    setRouteDraftTarget({
      type: routeSuggestionId ? "route_suggestion" : "section",
      id: routeSuggestionId ?? section.id,
      label: `${section.riverName} · ${section.sectionName}`,
    });
    setRouteDraftPoints(section.route);
    setRouteDraftOriginalPoints(null);
    setRouteDraftSnapMessage("");
    setRouteCreateMode("form");
    setRouteFormError("");
    setRouteRiverName(section.riverName);
    setRouteSectionName(section.sectionName);
    setRouteDifficulty(section.difficulty);
    setRouteSummary(section.summary);
    setRouteAccessNotes(section.accessSummary);
    setRouteEvidence("");
    setIsAddMode(false);
    setIsFormOpen(false);
    setSelectedPoi(null);
    setIsPanelOpen(false);
    setSearchFocusLocation(null);
    setSearchFocusLabel("Searched location");
    setShowSearchFocusMarker(false);
    setRouteSuggestionFocusId(null);
    setRouteAdjustmentFocusId(null);
  }

  function startRouteSuggestionAdjustmentMode(suggestion: RouteSuggestion) {
    if (!isSignedIn) {
      requireSignInForSave();
      return;
    }

    if (!canAccessAdminTools) {
      showAppNotification("Only admins and moderators can edit routes.", "error");
      return;
    }

    setRouteDraftTarget({
      type:
        suggestion.status === "approved"
          ? "route_suggestion"
          : "route_suggestion_edit",
      id: suggestion.id,
      label: `${suggestion.riverName} · ${suggestion.sectionName}`,
    });
    setRouteDraftPoints(suggestion.route);
    setRouteDraftOriginalPoints(null);
    setRouteDraftSnapMessage("");
    setRouteCreateMode("form");
    setRouteFormError("");
    setRouteRiverName(suggestion.riverName);
    setRouteSectionName(suggestion.sectionName);
    setRouteDifficulty(suggestion.difficulty);
    setRouteSummary(suggestion.summary);
    setRouteAccessNotes(suggestion.accessNotes);
    setRouteEvidence(suggestion.evidence);
    setIsAddMode(false);
    setIsFormOpen(false);
    setSelectedPoi(null);
    setIsPanelOpen(false);
    setSearchFocusLocation(null);
    setSearchFocusLabel("Searched location");
    setShowSearchFocusMarker(false);
    setRouteSuggestionFocusId(null);
    setRouteAdjustmentFocusId(null);
    setActiveAppSection("map");
  }

  function cancelRouteSuggestion() {
    setRouteCreateMode("idle");
    setRouteDraftTarget({ type: "new" });
    setRouteDraftPoints([]);
    setRouteDraftOriginalPoints(null);
    setRouteDraftSnapMessage("");
    setRouteFormError("");
  }

  function undoRouteDraftPoint() {
    setRouteDraftPoints((current) => current.slice(0, -1));
    setRouteDraftOriginalPoints(null);
    setRouteDraftSnapMessage("");
    setRouteFormError("");
  }

  function updateRouteDraftPoint(index: number, location: LatLngTuple) {
    setRouteDraftPoints((current) =>
      current.map((point, pointIndex) => (pointIndex === index ? location : point)),
    );
    setRouteDraftOriginalPoints(null);
    setRouteDraftSnapMessage("");
    setRouteFormError("");
  }

  async function snapRouteDraftToKnownRiver() {
    if (routeDraftPoints.length < 2) {
      setRouteFormError("Add at least a start and finish point before snapping.");
      return;
    }

    setIsRouteSnapLoading(true);
    setRouteFormError("");
    setRouteDraftSnapMessage("");

    try {
      const backendSnap = await snapRouteToWatercourses(routeDraftPoints);

      if (backendSnap.matchedPoints >= 2 && backendSnap.route.length >= 2) {
        setRouteDraftOriginalPoints((current) => current ?? routeDraftPoints);
        setRouteDraftPoints(backendSnap.route);
        setRouteDraftSnapMessage(
          `Snapped to ${backendSnap.source.label} (${backendSnap.confidence} confidence). ${backendSnap.warnings[0]}`,
        );
        return;
      }
    } catch {
      // Fall through to in-app route geometry snapping for local/offline/dev use.
    } finally {
      setIsRouteSnapLoading(false);
    }

    const candidates: RouteSnapCandidate[] =
      routeDraftTarget.type === "section"
        ? [
            {
              id: activeSection.id,
              label: `${activeSection.riverName} · ${activeSection.sectionName}`,
              route: activeSection.route,
            },
          ]
        : appRiverSections.map((section) => ({
            id: section.id,
            label: `${section.riverName} · ${section.sectionName}`,
            route: section.route,
          }));

    const snapped = snapRoughTraceToKnownRoute(routeDraftPoints, candidates);

    if (!snapped) {
      setRouteFormError(
        "Could not snap this trace to a known waterway. Add points closer to the river or save it as a rough trace.",
      );
      setRouteDraftSnapMessage("");
      return;
    }

    setRouteDraftOriginalPoints((current) => current ?? routeDraftPoints);
    setRouteDraftPoints(snapped.snappedTrace);
    setRouteFormError("");
    setRouteDraftSnapMessage(
      `Snapped to ${snapped.candidate.label}. Review the line before saving.`,
    );
  }

  function restoreRoughRouteDraft() {
    if (!routeDraftOriginalPoints) {
      return;
    }

    setRouteDraftPoints(routeDraftOriginalPoints);
    setRouteDraftOriginalPoints(null);
    setRouteDraftSnapMessage("");
    setRouteFormError("");
  }

  function finishRouteTrace() {
    if (routeDraftPoints.length < 2) {
      setRouteFormError("Add at least a start and finish point before continuing.");
      return;
    }

    setRouteCreateMode("form");
    setRouteFormError("");
  }

  function closeRouteSuggestionForm() {
    setRouteCreateMode("idle");
    setRouteDraftTarget({ type: "new" });
    setRouteDraftPoints([]);
    setRouteDraftOriginalPoints(null);
    setRouteDraftSnapMessage("");
    setRouteFormError("");
  }

  async function saveRouteSuggestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isSignedIn) {
      requireSignInForSave();
      return;
    }

    const safeRiverName = routeRiverName.trim();
    const safeSectionName = routeSectionName.trim();
    const safeDifficulty = routeDifficulty.trim();
    const safeSummary = routeSummary.trim();
    const safeAccessNotes = routeAccessNotes.trim();
    const safeEvidence = routeEvidence.trim();

    if (routeDraftPoints.length < 2) {
      setRouteFormError("Trace at least two points for this route.");
      return;
    }

    if (!safeRiverName || !safeSectionName || !safeSummary || !safeEvidence) {
      setRouteFormError(
        "Add river name, section name, summary, and evidence before saving.",
      );
      return;
    }

    const suggestionInput = {
      riverName: safeRiverName,
      sectionName: safeSectionName,
      difficulty: safeDifficulty || "Needs grading",
      summary: safeSummary,
      accessNotes: safeAccessNotes || "Access needs local review.",
      evidence: safeEvidence,
      route: routeDraftPoints,
    };

    if (routeDraftTarget.type === "route_suggestion_edit") {
      if (!canAccessAdminTools) {
        setRouteFormError("Only admins and moderators can update route suggestions.");
        return;
      }

      try {
        const updatedSuggestion = await updateModerationRouteSuggestion(
          routeDraftTarget.id,
          suggestionInput,
        );
        setModerationRouteSuggestions((current) =>
          current.map((item) =>
            item.id === updatedSuggestion.id ? updatedSuggestion : item,
          ),
        );
        setRouteSuggestions((current) =>
          current.map((item) =>
            item.id === updatedSuggestion.id ? updatedSuggestion : item,
          ),
        );
        if (updatedSuggestion.status === "approved") {
          setApprovedRouteSuggestions(await fetchApprovedRouteSuggestions());
        }
        setRouteCreateMode("idle");
        setRouteDraftTarget({ type: "new" });
        setRouteDraftPoints([]);
        setRouteDraftOriginalPoints(null);
        setRouteDraftSnapMessage("");
        setRouteFormError("");
        showAppNotification("Route suggestion updated.", "info");
      } catch (error) {
        setRouteFormError(
          error instanceof Error
            ? error.message
            : "Could not update route suggestion.",
        );
      }
      return;
    }

    if (routeDraftTarget.type !== "new") {
      if (!canAccessAdminTools) {
        setRouteFormError("Only admins and moderators can save route edits.");
        return;
      }

      try {
        const savedAdjustment = await createRouteAdjustment({
          targetType: routeDraftTarget.type,
          targetId: routeDraftTarget.id,
          ...suggestionInput,
        });
        setRouteAdjustments((current) => [savedAdjustment, ...current]);
        setModerationRouteAdjustments((current) => [
          savedAdjustment,
          ...current,
        ]);
        setRouteAdjustmentFocusId(savedAdjustment.id);
        setRouteAdjustmentFocusNonce((current) => current + 1);
        setRouteCreateMode("idle");
        setRouteDraftTarget({ type: "new" });
        setRouteDraftPoints([]);
        setRouteDraftOriginalPoints(null);
        setRouteDraftSnapMessage("");
        setRouteFormError("");
        showAppNotification("Route edit saved for review.", "info");
      } catch (error) {
        setRouteFormError(
          error instanceof Error ? error.message : "Could not save route edit.",
        );
      }
      return;
    }

    const localSuggestion: RouteSuggestion = {
      id: crypto.randomUUID(),
      ...suggestionInput,
      status: "local-draft",
      author:
        memberProfile?.publicName ??
        memberProfile?.displayName ??
        authState.user?.displayName ??
        "Route contributor",
      createdAt: new Date().toISOString(),
    };

    try {
      const savedSuggestion = await createRouteSuggestion(suggestionInput);
      setRouteSuggestions((current) => [savedSuggestion, ...current]);
      setRouteCreateMode("idle");
      setRouteDraftTarget({ type: "new" });
      setRouteDraftPoints([]);
      setRouteDraftOriginalPoints(null);
      setRouteDraftSnapMessage("");
      setRouteFormError("");
      showAppNotification("Route suggestion sent for review.", "info");
      void trackProductEvent("route_suggested", {
        section_id: savedSuggestion.id,
        source: "map",
      });
    } catch {
      setRouteSuggestions((current) => [localSuggestion, ...current]);
      setRouteCreateMode("idle");
      setRouteDraftTarget({ type: "new" });
      setRouteDraftPoints([]);
      setRouteDraftOriginalPoints(null);
      setRouteDraftSnapMessage("");
      setRouteFormError("");
      showAppNotification(
        "Route suggestion saved locally. Try again when the API is available.",
        "info",
      );
    }
  }

  function handleMapClick(
    location: LatLngTuple,
    nextType?: ContributionType,
    label = "Selected map location",
  ) {
    if (routeCreateMode === "tracing") {
      setRouteDraftPoints((current) =>
        isDuplicateRoutePoint(current[current.length - 1], location)
          ? current
          : [...current, location],
      );
      setRouteDraftOriginalPoints(null);
      setRouteDraftSnapMessage("");
      setRouteFormError("");
      return;
    }

    if (!isAddMode && !nextType) {
      return;
    }

    setSelectedLocation(location);
    setSearchFocusLocation(null);
    setSearchFocusLabel("Searched location");
    setShowSearchFocusMarker(false);
    setSelectedTargetLabel(label);
    setFormError("");
    if (nextType) {
      chooseContributionType(nextType);
    }
    setIsFormOpen(true);
    setIsAddMode(false);
  }

  function closeContributionForm() {
    setIsFormOpen(false);
    setIsAddMode(false);
    setSelectedLocation(null);
    setSelectedTargetLabel("Selected map location");
    setFormError("");
    clearSelectedPhoto();
  }

  function chooseContributionType(nextType: ContributionType) {
    setContributionType(nextType);
    setCategory(categoryOptions[nextType][0]);
    setFormError("");
    if (nextType !== "photo") {
      clearSelectedPhoto();
    }
  }

  function startAddMode(nextType: ContributionType = contributionType) {
    if (!isSignedIn) {
      setIsAddMode(false);
      setIsFormOpen(false);
      requireSignInForSave();
      return;
    }

    setRouteCreateMode("idle");
    setRouteDraftTarget({ type: "new" });
    setRouteDraftPoints([]);
    setRouteDraftOriginalPoints(null);
    setRouteDraftSnapMessage("");
    const requiresLocation = optionForType(nextType).locationRequired;
    chooseContributionType(nextType);
    setIsAddMode(requiresLocation);
    setIsFormOpen(!requiresLocation);
    setSelectedLocation(null);
    setSearchFocusLocation(null);
    setSearchFocusLabel("Searched location");
    setShowSearchFocusMarker(false);
    setSelectedTargetLabel(
      optionForType(nextType).locationRequired
        ? "Choose a map location"
        : "Section-level condition report",
    );
    setFormError("");
  }

  function selectSection(section: RiverSection) {
    setActiveSectionId(section.id);
    setShowRoutesLayer(true);
    setShowSelectedRoutePath(true);
    setIsRouteStatusCardVisible(true);
    setSectionFocusNonce((current) => current + 1);
    setIsSectionListOpen(false);
    setSearchFocusLocation(null);
    setSearchFocusLabel("Searched location");
    setShowSearchFocusMarker(false);
    void trackProductEvent("select_content", {
      content_type: "route",
      item_id: section.id,
      river_name: section.riverName,
    });
  }

  function openRouteDetails(section: RiverSection) {
    setActiveSectionId(section.id);
    setShowSelectedRoutePath(true);
    setIsRouteStatusCardVisible(true);
    setSelectedPoi(null);
    setRouteDetailsTab("details");
    setIsPanelOpen(true);
    setIsSectionListOpen(false);
    void trackProductEvent("select_content", {
      content_type: "route_details",
      item_id: section.id,
      river_name: section.riverName,
    });
  }

  function openCurrentRouteDetailsTab(tab: RouteDetailsTab) {
    setSelectedPoi(null);
    setRouteDetailsTab(tab);
    setIsPanelOpen(true);
    setIsSectionListOpen(false);
    if (tab === "levels") {
      void trackProductEvent("route_level_viewed", {
        section_id: activeSection.id,
        river_name: activeSection.riverName,
      });
    }
  }

  function toggleRouteDetailsPanel() {
    setSelectedPoi(null);
    setIsPanelOpen((current) => {
      const next = !current;
      if (next) {
        setRouteDetailsTab("details");
      }
      return next;
    });
  }

  function openPoiDetails(poi: SelectedPoi) {
    setSelectedPoi(poi);
    setIsPanelOpen(false);
    setIsFormOpen(false);
    setIsAddMode(false);
    setRouteCreateMode("idle");
    setRouteDraftPoints([]);
    setRouteDraftOriginalPoints(null);
    setRouteDraftSnapMessage("");
    setMapPoiReviewMessage("");
    setSearchFocusLocation(null);
    setSearchFocusLabel("Searched location");
    setShowSearchFocusMarker(false);
    void trackProductEvent("select_content", {
      content_type: "poi",
      item_id: poi.id,
      poi_kind: poi.kind,
    });
  }

  async function submitMapPoiReview(
    poi: MapPoi,
    decision: MapPoiReviewDecision,
    action: "add" | "remove" = "add",
    note?: string,
  ) {
    if (!isSignedIn) {
      requireSignInForSave();
      return;
    }

    setIsMapPoiReviewSaving(true);
    setMapPoiReviewMessage("");

    try {
      const updatedPoi = await reviewMapPoi(poi.id, decision, action, note);
      setSectionMapPois((current) =>
        current.map((item) => (item.id === updatedPoi.id ? updatedPoi : item)),
      );
      setSelectedPoi((current) => {
        if (!current?.mapPoi || current.mapPoi.id !== updatedPoi.id) {
          return current;
        }

        const section =
          appRiverSections.find((item) => item.id === updatedPoi.sectionId) ??
          activeSection;
        return mapPoiToSelectedPoi(updatedPoi, section);
      });
      setMapPoiReviewMessage(
        decision === "confirm"
          ? action === "remove"
            ? "Your confirmation was removed."
            : "Thanks. This point is marked as confirmed."
          : "Thanks. This point is marked as needing correction.",
      );
    } catch (error) {
      setMapPoiReviewMessage(
        error instanceof Error ? error.message : "Could not review this point.",
      );
    } finally {
      setIsMapPoiReviewSaving(false);
    }
  }

  async function handleLocationReferenceSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const searchValue = locationSearchInput.trim();
    setLocationSearchMessage("");
    setLocationSearchResult(null);

    if (!searchValue) {
      setLocationSearchMessage("Enter a what3words address or coordinates.");
      return;
    }

    const coordinates = parseCoordinateSearch(searchValue);

    if (coordinates) {
      const nearestSections = nearestSectionsForLocation(
        coordinates,
        appRiverSections,
      );
      setLocationSearchResult({
        label: formatLocation(coordinates),
        location: coordinates,
        focusSection: nearestSections[0]?.section,
        pois: nearbyPoisForLocation(coordinates, contributions, appRiverSections),
      });
      void trackProductEvent("search", {
        search_term: "coordinates",
        search_type: "location",
      });
      return;
    }

    if (!looksLikeWhat3Words(searchValue)) {
      setLocationSearchMessage(
        "Enter a what3words address like ///filled.count.soap or coordinates like 52.0521,-2.7123.",
      );
      return;
    }

    setIsLocationSearchLoading(true);

    try {
      const result = await fetchCoordinatesForWhat3Words(
        normaliseWhat3WordsSearch(searchValue),
      );

      if (!result.configured || !result.coordinates) {
        setLocationSearchMessage("Could not find that location reference.");
        return;
      }

      const location: LatLngTuple = [
        result.coordinates.lat,
        result.coordinates.lng,
      ];

      setLocationSearchResult({
        label: result.words ? formatWhat3Words(result.words) : formatWhat3Words(searchValue),
        location,
        nearestPlace: result.nearestPlace,
        country: result.country,
        focusSection: nearestSectionsForLocation(location, appRiverSections)[0]
          ?.section,
        pois: nearbyPoisForLocation(location, contributions, appRiverSections),
      });
      void trackProductEvent("search", {
        search_term: normaliseWhat3WordsSearch(searchValue),
        search_type: "what3words",
      });
    } catch {
      setLocationSearchMessage("Could not find that location reference.");
    } finally {
      setIsLocationSearchLoading(false);
    }
  }

  async function handleWatercourseSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const searchValue = watercourseSearchTerm.trim();
    setWatercourseSearchMessage("");
    setWatercourseSearchResults([]);

    if (searchValue.length < 2) {
      setWatercourseSearchMessage("Enter at least 2 characters.");
      return;
    }

    setIsWatercourseSearchLoading(true);

    try {
      const results = await searchWatercourses(searchValue);
      setWatercourseSearchResults(results);
      if (!results.length) {
        setWatercourseSearchMessage("No matching known waterways found.");
      }
      void trackProductEvent("search", {
        search_term: searchValue,
        search_type: "watercourse",
      });
    } catch (error) {
      setWatercourseSearchMessage(
        error instanceof Error ? error.message : "Could not search waterways.",
      );
    } finally {
      setIsWatercourseSearchLoading(false);
    }
  }

  function openSearchLocationOnMap(
    section: RiverSection,
    location: LatLngTuple,
    label = "Searched location",
    showMarker = true,
  ) {
    selectSection(section);
    setSearchFocusLocation(location);
    setSearchFocusLabel(label);
    setShowSearchFocusMarker(showMarker);
    setSearchFocusNonce((current) => current + 1);
    setSelectedLocation(null);
    setSelectedPoi(null);
    setIsFormOpen(false);
    setIsAddMode(false);
    setActiveAppSection("map");
  }

  function openWatercourseOnMap(watercourse: KnownWatercourse) {
    const centre = watercourseCentre(watercourse);

    if (!centre) {
      setWatercourseSearchMessage("This waterway has no displayable geometry.");
      return;
    }

    setShowKnownRivers(true);
    setWatercourseFocusId(watercourse.id);
    setWatercourseFocusNonce((current) => current + 1);
    setSearchFocusLocation(centre);
    setSearchFocusLabel(watercourse.name ?? "Known waterway");
    setShowSearchFocusMarker(false);
    setSearchFocusNonce((current) => current + 1);
    setSelectedLocation(null);
    setSelectedPoi(null);
    setIsFormOpen(false);
    setIsAddMode(false);
    setActiveAppSection("map");
  }

  function toggleFavouriteSection(section: RiverSection) {
    if (!isSignedIn) {
      requireSignInForSave();
      return;
    }

    setFavouriteSectionIds((current) => {
      if (current.includes(section.id)) {
        return current.filter((sectionId) => sectionId !== section.id);
      }

      void trackProductEvent("add_to_favorites", {
        content_type: "route",
        item_id: section.id,
        river_name: section.riverName,
      });
      return [...current, section.id];
    });
  }

  const accountLabel =
    memberProfile?.publicName ??
    memberProfile?.displayName ??
    authState.user?.displayName ??
    "Guest";
  const accountMeta =
    memberProfile?.email ??
    authState.user?.email ??
    "Browse freely; sign in to save";
  const accountRole = memberProfile?.role ?? (isSignedIn ? "Member" : "Signed out");

  return (
    <main
      className={`app-shell ${
        activeAppSection === "map" ? "" : "app-shell--content-only"
      }`}
    >
      <div className="beta-banner" role="note">
        <strong>Beta</strong>
        <span>App is in testing. Check local conditions before paddling.</span>
      </div>

      {appNotification ? (
        <AppNotificationBanner
          notification={appNotification}
          onDismiss={() => setAppNotification(null)}
        />
      ) : null}

      {analyticsConsent === "unknown" ? (
        <AnalyticsConsentBanner
          onAccept={() => setAnalyticsConsent("accepted")}
          onDecline={() => setAnalyticsConsent("declined")}
        />
      ) : null}

      {activeAppSection === "map" ? (
        <section className="topbar" aria-label="Map controls">
          <div className="brand-lockup">
            <span className="brand-mark">
              <Waves size={22} strokeWidth={2.3} />
            </span>
            <div>
              <p className="eyebrow">{activeSection.riverName}</p>
              <h1>{activeSection.sectionName}</h1>
              <p className="topbar-level-summary">
                <Droplets size={12} />
                <span>
                  {routeStatusSummary.value} · {routeStatusSummary.trend} ·{" "}
                  {routeStatusSummary.observedAt}
                </span>
              </p>
            </div>
          </div>
          <div
            className={`topbar-actions ${
              isCompactMapControls && areMapControlsExpanded
                ? "topbar-actions--expanded"
                : ""
            }`}
          >
            <button
              className={`ghost-button map-panel-toggle ${
                isSectionListOpen ? "map-panel-toggle--active" : ""
              }`}
              type="button"
              onClick={() => setIsSectionListOpen((current) => !current)}
              title="Sections"
              aria-label="Sections"
              aria-pressed={isSectionListOpen}
            >
              <Route size={16} />
              Sections
            </button>
            <button
              className={`ghost-button map-panel-toggle ${
                showRoutesLayer ? "map-panel-toggle--active" : ""
              }`}
              type="button"
              onClick={() => setShowRoutesLayer((current) => !current)}
              title={showRoutesLayer ? "Hide routes" : "Show routes"}
              aria-label={showRoutesLayer ? "Hide routes" : "Show routes"}
              aria-pressed={showRoutesLayer}
            >
              <MapPinned size={16} />
              Routes
            </button>
            <button
              className={`ghost-button map-panel-toggle ${
                isPanelOpen && routeDetailsTab === "levels"
                  ? "map-panel-toggle--active"
                  : ""
              }`}
              type="button"
              onClick={() => openCurrentRouteDetailsTab("levels")}
              title="View levels"
              aria-label="View levels"
              aria-pressed={isPanelOpen && routeDetailsTab === "levels"}
            >
              <Droplets size={16} />
              Levels
            </button>
            <button
              className={`ghost-button map-panel-toggle ${
                isPanelOpen && routeDetailsTab !== "levels"
                  ? "map-panel-toggle--active"
                  : ""
              }`}
              type="button"
              onClick={toggleRouteDetailsPanel}
              title="Section details"
              aria-label="Section details"
              aria-pressed={isPanelOpen && routeDetailsTab !== "levels"}
            >
              <MapPinned size={16} />
              Details
            </button>
            <button
              className={`ghost-button map-panel-toggle topbar-secondary-control ${
                showKnownRivers ? "map-panel-toggle--active" : ""
              }`}
              type="button"
              onClick={() => setShowKnownRivers((current) => !current)}
              title="Show known rivers"
              aria-label="Show known rivers"
              aria-pressed={showKnownRivers}
            >
              <Waves size={16} />
              Rivers
            </button>
            {isCompactMapControls ? (
              <button
                className={`ghost-button map-panel-toggle topbar-controls-toggle ${
                  areMapControlsExpanded ? "map-panel-toggle--active" : ""
                }`}
                type="button"
                onClick={() => setAreMapControlsExpanded((current) => !current)}
                title={
                  areMapControlsExpanded ? "Hide map controls" : "Show map controls"
                }
                aria-label={
                  areMapControlsExpanded ? "Hide map controls" : "Show map controls"
                }
                aria-expanded={areMapControlsExpanded}
              >
                <MoreHorizontal size={16} />
                Controls
                <ChevronDown size={14} />
              </button>
            ) : null}
            <button
              className={`icon-button sync-icon-button topbar-secondary-control ${
                queuedOutboxCount > 0 ? "sync-icon-button--queued" : ""
              }`}
              type="button"
              onClick={syncOutboxNow}
              disabled={!canSyncOutbox}
              title={syncActionLabel({ queuedOutboxCount, isSyncingOutbox })}
              aria-label={syncActionLabel({ queuedOutboxCount, isSyncingOutbox })}
            >
              <RefreshCw size={16} />
              <span className="topbar-control-label">Sync</span>
              {queuedOutboxCount > 0 ? (
                <span className="sync-badge">{queuedOutboxCount}</span>
              ) : null}
            </button>
            <button
              className={`icon-button topbar-secondary-control ${
                isActiveSectionFavourite ? "icon-button--active" : ""
              }`}
              type="button"
              title={
                !isSignedIn
                  ? "Create account to save favourites"
                  : isActiveSectionFavourite
                  ? "Remove from favourites"
                  : "Add to favourites"
              }
              aria-label={
                !isSignedIn
                  ? "Create account to save favourites"
                  : isActiveSectionFavourite
                  ? "Remove from favourites"
                  : "Add to favourites"
              }
              aria-pressed={isActiveSectionFavourite}
              onClick={() => toggleFavouriteSection(activeSection)}
            >
              <Star size={18} fill={isActiveSectionFavourite ? "currentColor" : "none"} />
              <span className="topbar-control-label">
                {isActiveSectionFavourite ? "Saved" : "Favourite"}
              </span>
            </button>
            <button
              className={`icon-button topbar-secondary-control ${
                isLiveLocationEnabled ? "icon-button--active" : ""
              }`}
              type="button"
              title={
                isLiveLocationEnabled
                  ? "Centre on my live location"
                  : "Show my live location"
              }
              aria-label={
                isLiveLocationEnabled
                  ? "Centre on my live location"
                  : "Show my live location"
              }
              aria-pressed={isLiveLocationEnabled}
              onClick={handleLiveLocationButtonClick}
              disabled={!isLiveLocationSupported}
            >
              <Navigation size={18} />
              <span className="topbar-control-label">Location</span>
            </button>
            {canAccessAdminTools ? (
              <button
                className={`ghost-button map-panel-toggle topbar-secondary-control ${
                  routeDraftTarget.type !== "new" ? "map-panel-toggle--active" : ""
                }`}
                type="button"
                title="Edit this route"
                aria-label="Edit this route"
                aria-pressed={routeDraftTarget.type !== "new"}
                onClick={() => startRouteAdjustmentMode(activeSection)}
              >
                <Route size={16} />
                Edit route
              </button>
            ) : null}
            <button
              className={`ghost-button map-panel-toggle topbar-secondary-control ${
                routeCreateMode !== "idle" && routeDraftTarget.type === "new"
                  ? "map-panel-toggle--active"
                  : ""
              }`}
              type="button"
              title="Suggest a missing route"
              aria-label="Suggest a missing route"
              aria-pressed={routeCreateMode !== "idle"}
              onClick={() => startRouteSuggestionMode()}
            >
              <Route size={16} />
              Suggest route
            </button>
            <button
              className="primary-action topbar-secondary-control"
              type="button"
              title="Add local knowledge"
              onClick={() => startAddMode()}
            >
              <Plus size={18} />
              Add info
            </button>
            {authMessage || authState.error || liveLocationAlert ? (
              <p className="topbar-message">
                {authMessage || authState.error || liveLocationAlert}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <section
        className={`app-body ${
          isAppNavCollapsed ? "app-body--nav-collapsed" : ""
        }`}
      >
        <AppNavigation
          activeSection={activeAppSection}
          collapsed={isAppNavCollapsed}
          isAdmin={canAccessAdminTools}
          isSignedIn={isSignedIn}
          isAuthConfigured={isAuthConfigured}
          memberLabel={accountLabel}
          memberMeta={accountMeta}
          memberRole={accountRole}
          onToggleCollapsed={() => setIsAppNavCollapsed((current) => !current)}
          onSelectSection={setActiveAppSection}
          onSignIn={handleSignIn}
        />

        <section className="app-view">
          {activeAppSection === "map" ? (
      <section
        className={`workspace ${
          isSectionListOpen ? "workspace--sections-open" : ""
        }`}
      >
        <SyncOutboxBanner
          queuedOutboxCount={queuedOutboxCount}
          failedOutboxCount={failedOutboxCount}
          isDismissed={isSyncBannerDismissed}
          isOnline={isOnline}
          isSyncingOutbox={isSyncingOutbox}
          canSyncOutbox={canSyncOutbox}
          onDismiss={dismissSyncBanner}
          onSync={syncOutboxNow}
        />
        <aside
          className={`section-list ${
            isSectionListOpen ? "section-list--open" : "section-list--closed"
          }`}
          aria-label="River sections"
        >
          <div className="section-list__header">
            <span>{activeSection.riverName} sections</span>
            <button
              className="icon-button icon-button--compact section-list__close"
              type="button"
              aria-label="Close sections"
              title="Close"
              onClick={() => setIsSectionListOpen(false)}
            >
              <X size={16} />
            </button>
          </div>
          {activeRiverSections.map((section) => (
            <button
              className={`section-row ${
                section.id === activeSection.id ? "section-row--active" : ""
              }`}
              key={section.id}
              type="button"
              onClick={() => selectSection(section)}
            >
              <span>
                <strong>{section.riverName}</strong>
                <small>{section.sectionName}</small>
              </span>
              <span className="section-row__badges">
                {isCandidateSection(section) ? (
                  <span className="candidate-pill">Candidate</span>
                ) : null}
                <span className={`level-pill level-pill--${section.levelBand}`}>
                  {bandLabels[section.levelBand]}
                </span>
              </span>
            </button>
          ))}
        </aside>

        <RiverMap
          sections={appRiverSections}
          activeSection={activeSection}
          mapPois={visibleSectionMapPois}
          contributions={contributions}
          routeSuggestions={routeSuggestions}
          routeAdjustments={routeAdjustments}
          routeSuggestionFocusId={routeSuggestionFocusId}
          routeSuggestionFocusNonce={routeSuggestionFocusNonce}
          routeAdjustmentFocusId={routeAdjustmentFocusId}
          routeAdjustmentFocusNonce={routeAdjustmentFocusNonce}
          outboxRecords={outboxRecords}
          selectedLocation={selectedLocation}
          routeDraftPoints={routeDraftPoints}
          liveLocation={liveLocation}
          liveLocationFocusNonce={liveLocationFocusNonce}
          searchFocusLocation={searchFocusLocation}
          searchFocusLabel={searchFocusLabel}
          showSearchFocusMarker={showSearchFocusMarker}
          searchFocusNonce={searchFocusNonce}
          isAddMode={isAddMode}
          routeCreateMode={routeCreateMode}
          showRoutesLayer={showRoutesLayer}
          showSelectedRoutePath={showSelectedRoutePath}
          showKnownRivers={showKnownRivers}
          watercourseFocusId={watercourseFocusId}
          watercourseFocusNonce={watercourseFocusNonce}
          onMapClick={handleMapClick}
          onMoveRouteDraftPoint={updateRouteDraftPoint}
          focusNonce={sectionFocusNonce}
          onOpenPoiDetails={openPoiDetails}
          onOpenRouteDetails={openRouteDetails}
          onOpenPhoto={setLightboxPhoto}
          onSelectSection={selectSection}
        />

        {isRouteStatusCardVisible ? (
          <section className="route-status-card" aria-label="Selected route level">
            <div className="route-status-card__main">
              <span className="route-status-card__icon">
                <Droplets size={16} />
              </span>
              <div>
                <span>{routeStatusSummary.label}</span>
                <strong>{routeStatusSummary.value}</strong>
              </div>
            </div>
            <button
              className="ghost-button ghost-button--compact"
              type="button"
              onClick={() => openCurrentRouteDetailsTab("levels")}
            >
              View levels
            </button>
            <button
              className="icon-button icon-button--compact route-status-card__hide"
              type="button"
              title="Hide level summary"
              aria-label="Hide level summary"
              onClick={() => setIsRouteStatusCardVisible(false)}
            >
              <X size={14} />
            </button>
            <div className="route-status-card__meta">
              <span>{routeStatusSummary.trend}</span>
              <span>{routeStatusSummary.source}</span>
              <span>Updated {routeStatusSummary.observedAt}</span>
            </div>
          </section>
        ) : (
          <button
            className="route-status-toggle"
            type="button"
            onClick={() => setIsRouteStatusCardVisible(true)}
          >
            <Droplets size={15} />
            Show levels
          </button>
        )}

        {isFormOpen ? (
          <section className="quick-add-panel" aria-label="Add contribution">
            <div className="quick-add-panel__header">
              <div>
                <p className="eyebrow">Add info</p>
                <h2>{selectedTargetLabel}</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Close contribution form"
                title="Close"
                onClick={closeContributionForm}
              >
                <X size={18} />
              </button>
            </div>

            <form className="quick-add-form" onSubmit={submitContribution}>
              <div className="segmented-control" role="tablist">
                {contributionOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      className={contributionType === option.type ? "active" : ""}
                      key={option.type}
                      type="button"
                      title={`Add ${option.label.toLowerCase()}`}
                      onClick={() => {
                        chooseContributionType(option.type);
                      }}
                    >
                      <Icon size={16} />
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <label>
                Title
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={currentContributionOption.titlePlaceholder}
                  required
                />
              </label>

              <div className="form-grid">
                <label>
                  Category
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    {categoryOptions[contributionType].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Date observed
                  <input
                    type="date"
                    value={dateObserved}
                    onChange={(event) => setDateObserved(event.target.value)}
                  />
                </label>
              </div>

              {contributionType === "hazard" ? (
                <div className="form-grid">
                  <label>
                    Severity
                    <select
                      value={severity}
                      onChange={(event) =>
                        setSeverity(event.target.value as HazardSeverity)
                      }
                    >
                      <option value="info">Info</option>
                      <option value="caution">Caution</option>
                      <option value="significant">Significant</option>
                      <option value="serious">Serious</option>
                    </select>
                  </label>

                  <label>
                    Craft
                    <select
                      value={craftType}
                      onChange={(event) => setCraftType(event.target.value)}
                    >
                      <option value="open canoe">Open canoe</option>
                      <option value="tandem canoe">Tandem canoe</option>
                      <option value="inflatable canoe">Inflatable canoe</option>
                      <option value="touring kayak">Touring kayak</option>
                      <option value="SUP">SUP</option>
                    </select>
                  </label>
                </div>
              ) : null}

              {contributionType === "report" ? (
                <label>
                  Craft
                  <select
                    value={craftType}
                    onChange={(event) => setCraftType(event.target.value)}
                  >
                    <option value="open canoe">Open canoe</option>
                    <option value="tandem canoe">Tandem canoe</option>
                    <option value="inflatable canoe">Inflatable canoe</option>
                    <option value="touring kayak">Touring kayak</option>
                    <option value="SUP">SUP</option>
                  </select>
                </label>
              ) : null}

              {contributionType === "photo" ? (
                <div className="photo-input-panel">
                  <label>
                    Photo
                    <input
                      accept="image/*"
                      type="file"
                      onChange={(event) =>
                        void handlePhotoSelection(event.target.files?.[0])
                      }
                    />
                  </label>
                  <p>
                    Photos are resized in this browser before upload. Exact EXIF
                    metadata is not kept in the resized image.
                  </p>
                  {isPhotoProcessing ? (
                    <span className="source-note">Preparing photo...</span>
                  ) : null}
                  {photoPreviewUrl ? (
                    <figure className="photo-preview">
                      <img src={photoPreviewUrl} alt="" />
                      <figcaption>
                        <strong>{photoFileName}</strong>
                        <span>
                          {selectedPhoto
                            ? `${Math.round(
                                selectedPhoto.display.sizeBytes / 1024,
                              )} KB upload image`
                            : "Ready to upload"}
                        </span>
                      </figcaption>
                    </figure>
                  ) : null}
                </div>
              ) : null}

              <label>
                Detail
                <textarea
                  value={detail}
                  onChange={(event) => setDetail(event.target.value)}
                  placeholder={currentContributionOption.detailPlaceholder}
                  rows={3}
                  required
                />
              </label>

              {formError ? <p className="form-error">{formError}</p> : null}

              <div className="location-card">
                <MapPinned size={17} />
                <span>
                  {selectedLocation
                    ? `Placed at ${formatLocation(selectedLocation)}`
                    : currentContributionOption.locationRequired
                      ? "Pick a point on the map before saving this contribution."
                      : "No map point selected. This condition report will attach to the current section."}
                </span>
              </div>

              <div className="form-actions">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={closeContributionForm}
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  className="submit-button"
                  type="submit"
                  disabled={isPhotoProcessing || isSubmittingContribution}
                >
                  <Flag size={16} />
                  {isSubmittingContribution ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {isAddMode ? (
          <section className="add-mode-banner" aria-label="Add mode active">
            <div>
              <p className="eyebrow">Add mode</p>
              <strong>Click the river map where the knowledge belongs.</strong>
              <span>
                Click an open part of the route or map to place a new item.
                Existing markers open their details.
              </span>
            </div>
            <button
              className="ghost-button ghost-button--compact"
              type="button"
              onClick={() => setIsAddMode(false)}
            >
              <X size={15} />
              Cancel
            </button>
          </section>
        ) : null}

        {routeCreateMode === "tracing" ? (
          <section className="add-mode-banner route-draft-banner" aria-label="Route tracing active">
            <div>
              <p className="eyebrow">
                {routeDraftTarget.type !== "new" ? "Edit route" : "Suggest route"}
              </p>
              <strong>
                {routeDraftTarget.type !== "new"
                  ? "Drag existing points or click the map to extend the corrected route."
                  : "Click along the river to sketch the candidate route."}
              </strong>
              <span>
                {routeDraftPoints.length
                  ? `${routeDraftPoints.length} point${
                      routeDraftPoints.length === 1 ? "" : "s"
                    } added. This will be reviewed before changing published route data.`
                  : routeDraftTarget.type !== "new"
                    ? "Existing route points are loaded. Drag a point to move it, or click the map to add another point."
                    : "Start at the put-in or upstream end, then add points downstream."}
              </span>
              {routeFormError ? <span className="form-error">{routeFormError}</span> : null}
              {routeDraftSnapMessage ? (
                <span className="route-snap-message">{routeDraftSnapMessage}</span>
              ) : null}
            </div>
            <div className="route-draft-actions">
              <button
                className="ghost-button ghost-button--compact"
                type="button"
                onClick={undoRouteDraftPoint}
                disabled={routeDraftPoints.length === 0}
              >
                <RotateCcw size={15} />
                Undo
              </button>
              {routeDraftOriginalPoints ? (
                <button
                  className="ghost-button ghost-button--compact"
                  type="button"
                  onClick={restoreRoughRouteDraft}
                >
                  Restore rough
                </button>
              ) : (
                <button
                  className="ghost-button ghost-button--compact"
                  type="button"
                  onClick={() => void snapRouteDraftToKnownRiver()}
                  disabled={routeDraftPoints.length < 2 || isRouteSnapLoading}
                >
                  <Route size={15} />
                  {isRouteSnapLoading ? "Snapping..." : "Snap"}
                </button>
              )}
              <button
                className="ghost-button ghost-button--compact"
                type="button"
                onClick={cancelRouteSuggestion}
              >
                <X size={15} />
                Cancel
              </button>
              <button
                className="submit-button submit-button--compact"
                type="button"
                onClick={finishRouteTrace}
                disabled={routeDraftPoints.length < 2}
              >
                Details
              </button>
            </div>
          </section>
        ) : null}

        {routeCreateMode === "form" ? (
          <section className="quick-add-panel route-suggestion-panel" aria-label="Suggest route">
            <div className="quick-add-panel__header">
              <div>
                <p className="eyebrow">
                  {routeDraftTarget.type !== "new" ? "Edit route" : "Suggest route"}
                </p>
                <h2>
                  {routeDraftTarget.type === "route_suggestion_edit"
                    ? "Route suggestion"
                    : routeDraftTarget.type !== "new"
                    ? "Route adjustment"
                    : "Candidate river section"}
                </h2>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Close route suggestion form"
                title="Close"
                onClick={closeRouteSuggestionForm}
              >
                <X size={18} />
              </button>
            </div>

            <form className="quick-add-form" onSubmit={saveRouteSuggestion}>
              <div className="notice">
                <AlertTriangle size={18} />
                <span>
                  {routeDraftTarget.type !== "new"
                    ? routeDraftTarget.type === "route_suggestion_edit"
                      ? "Update this pending suggestion before making a moderation decision. This does not create a separate route edit."
                      : "Route edits are stored as review records. Update route details, adjust the trace if needed, and add evidence before it changes public route data."
                    : "Route suggestions go to review. Add evidence from paddling, clubs, official trails, or venue/local knowledge."}
                </span>
              </div>

              {routeDraftTarget.type !== "new" ? (
                <div className="location-card">
                  <ShieldCheck size={17} />
                  <span>Editing existing route: {routeDraftTarget.label}</span>
                </div>
              ) : null}

              <div className="form-grid">
                <label>
                  River
                  <input
                    value={routeRiverName}
                    onChange={(event) => setRouteRiverName(event.target.value)}
                    placeholder="River name"
                    required
                  />
                </label>
                <label>
                  Section
                  <input
                    value={routeSectionName}
                    onChange={(event) => setRouteSectionName(event.target.value)}
                    placeholder="Put-in to take-out"
                    required
                  />
                </label>
              </div>

              <label>
                Grade / difficulty
                <input
                  value={routeDifficulty}
                  onChange={(event) => setRouteDifficulty(event.target.value)}
                  placeholder="Grade II, Grade III-IV, touring, unknown"
                />
              </label>

              <label>
                Summary
                <textarea
                  value={routeSummary}
                  onChange={(event) => setRouteSummary(event.target.value)}
                  rows={3}
                  placeholder="What kind of section is this, and who is it suitable for?"
                  required
                />
              </label>

              <label>
                Access notes
                <textarea
                  value={routeAccessNotes}
                  onChange={(event) => setRouteAccessNotes(event.target.value)}
                  rows={2}
                  placeholder="Put-in, take-out, parking, portage, restrictions, or sensitivity."
                />
              </label>

              <label>
                Evidence / source
                <textarea
                  value={routeEvidence}
                  onChange={(event) => setRouteEvidence(event.target.value)}
                  rows={3}
                  placeholder="Recent paddle, club/local knowledge, official trail, venue source, or partner data."
                  required
                />
              </label>

              <div className="location-card">
                <Route size={17} />
                <span>
                  {routeDraftTarget.type !== "new"
                    ? routeDraftTarget.type === "route_suggestion_edit"
                      ? `Suggestion trace with ${routeDraftPoints.length} points. Use Edit trace only if the geometry needs changing.`
                      : `Current trace with ${routeDraftPoints.length} points. Use Edit trace only if the geometry needs changing.`
                    : `Rough trace with ${routeDraftPoints.length} points. Reviewers will verify route line, access, hazards, level guidance, and source confidence before publication.`}
                </span>
              </div>

              {routeFormError ? <p className="form-error">{routeFormError}</p> : null}

              <div className="form-actions">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => setRouteCreateMode("tracing")}
                >
                  {routeDraftTarget.type !== "new" ? "Edit trace" : "Back to trace"}
                </button>
                <button className="submit-button" type="submit">
                  <Flag size={16} />
                  Save
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {selectedPoi ? (
          <PoiDetailPanel
            poi={selectedPoi}
            onClose={() => setSelectedPoi(null)}
            onAddPhoto={() => startAddMode("photo")}
            onOpenPhoto={setLightboxPhoto}
            onReviewMapPoi={(poi, decision, action, note) =>
              void submitMapPoiReview(poi, decision, action, note)
            }
            onUpdateMapPoiStatus={(poi, status) =>
              void applyMapPoiVerificationStatus(poi, status)
            }
            onUpdateContributionStatus={(poi, decision) =>
              void applySelectedPoiContributionStatus(poi, decision)
            }
            reviewMessage={mapPoiReviewMessage}
            isReviewSaving={isMapPoiReviewSaving}
            isStatusSaving={isPoiStatusSaving}
            canManagePoiStatus={canAccessAdminTools}
          />
        ) : null}

        <section
          className={`detail-panel ${isPanelOpen ? "detail-panel--open" : ""}`}
          aria-label="Selected river section"
        >
          <button
            className="panel-close"
            type="button"
            aria-label="Close section panel"
            title="Close"
            onClick={() => setIsPanelOpen(false)}
          >
            <X size={18} />
          </button>

          <div className="section-hero">
            <img src={activeSection.photos[0]?.url} alt="" />
            <div className="section-hero__overlay">
              <p>{activeSection.riverName}</p>
              <h2>{activeSection.sectionName}</h2>
            </div>
          </div>

          <div className="panel-content panel-content--tabbed">
            <div className="route-layer-options">
              <span>Route display</span>
              <button
                className={`ghost-button ghost-button--compact ${
                  showSelectedRoutePath ? "map-panel-toggle--active" : ""
                }`}
                type="button"
                onClick={() =>
                  setShowSelectedRoutePath((current) => {
                    const next = !current;
                    if (next) {
                      setShowRoutesLayer(true);
                    }
                    return next;
                  })
                }
                aria-pressed={showSelectedRoutePath}
              >
                {showSelectedRoutePath ? "Hide path" : "Show path"}
              </button>
            </div>
            <div
              className="segmented-control route-detail-tabs"
              role="tablist"
              aria-label="Route details"
            >
              {routeDetailsTabs.map((tab) => (
                <button
                  className={routeDetailsTab === tab.id ? "active" : ""}
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={routeDetailsTab === tab.id}
                  onClick={() => setRouteDetailsTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {routeDetailsTab === "details" ? (
              <div className="route-tab-panel" role="tabpanel">
                <div className="route-summary-panel" aria-label="Route summary">
                  <div className="route-summary-item">
                    <Navigation size={15} />
                    <span>Distance</span>
                    <strong>{activeSection.distanceKm} km</strong>
                  </div>
                  <div className="route-summary-item">
                    <Clock3 size={15} />
                    <span>Time</span>
                    <strong>{activeSection.estimatedTime}</strong>
                  </div>
                  <div className="route-summary-item">
                    <Droplets size={15} />
                    <span>Level</span>
                    <strong>{activeSection.levelLabel}</strong>
                  </div>
                  <div className="route-summary-item">
                    <ShieldAlert size={15} />
                    <span>Difficulty</span>
                    <strong>{activeSection.difficulty}</strong>
                  </div>
                </div>

                <p className="section-summary">{activeSection.summary}</p>

                {isCandidateSection(activeSection) ? (
                  <div className="notice notice--candidate">
                    <Flag size={18} />
                    <span>
                      This is an approved community candidate route. It still
                      needs local verification before being treated as trip
                      advice.
                    </span>
                  </div>
                ) : null}

                <div className="notice">
                  <AlertTriangle size={18} />
                  <span>{activeSection.runnableGuidance}</span>
                </div>

                <section className="info-block">
                  <div className="block-title">
                    <h3>Source confidence</h3>
                    <span>{activeSection.source?.confidence ?? "demo"}</span>
                  </div>
                  <p>
                    {activeSection.source?.notes ??
                      "Demo fixture data. Verify before using for public trip planning."}
                  </p>
                </section>
              </div>
            ) : null}

            {routeDetailsTab === "levels" ? (
              <div className="route-tab-panel" role="tabpanel">
                <section className="info-block info-block--first">
                  <div className="block-title">
                    <h3>Observations</h3>
                    <span>
                      {isSectionObservationsLoading
                        ? sectionObservations.length
                          ? "Updating"
                          : "Loading"
                        : sectionObservations.length
                          ? `${sectionObservations.length} linked`
                          : "No stored link"}
                    </span>
                  </div>
                  <div
                    className="segmented-control observation-range-tabs"
                    aria-label="Observation range"
                  >
                    {observationRangeOptions.map((option) => (
                      <button
                        className={
                          option.hours === observationRangeHours ? "active" : ""
                        }
                        type="button"
                        key={option.hours}
                        onClick={() => setObservationRangeHours(option.hours)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {sectionObservations.length ? (
                    <div
                      className={`observation-list ${
                        isSectionObservationsLoading ? "observation-list--updating" : ""
                      }`}
                    >
                      {sectionObservations.map((measure) => {
                        const rangeOption =
                          getObservationRangeOption(displayedObservationRangeHours);
                        const chartPoints = buildObservationChartPoints(measure);
                        const latestChartPoint = chartPoints
                          .split(" ")
                          .at(-1)
                          ?.split(",");
                        const stats = getObservationStats(measure);
                        const midValue =
                          stats.min != null && stats.max != null
                            ? (stats.min + stats.max) / 2
                            : null;

                        return (
                          <article className="observation-card" key={measure.id}>
                            <div className="observation-card__header">
                              <div>
                                <strong>{measure.stationName}</strong>
                                <span>
                                  {observationParameterLabels[measure.parameter]} ·{" "}
                                  {measure.relevance.replaceAll("_", " ")}
                                </span>
                              </div>
                              <span
                                className={`status-chip status-chip--${
                                  measure.latest?.state ?? "unavailable"
                                }`}
                              >
                                {measure.latest?.state ?? "unavailable"}
                              </span>
                            </div>
                            <div className="observation-metrics">
                              <span>
                                <strong>
                                  {formatObservationValue(
                                    measure.latest?.value,
                                    measure.unit,
                                  )}
                                </strong>
                                Latest
                              </span>
                              <span>
                                <strong>{formatObservationRange(measure)}</strong>
                                {rangeOption.rangeLabel}
                              </span>
                              <span>
                                <strong className={`trend-label trend-label--${stats.trend}`}>
                                  {stats.trend}
                                </strong>
                                Trend
                              </span>
                            </div>
                            {chartPoints ? (
                              <div
                                className="observation-chart"
                                role="img"
                                aria-label={`${rangeOption.chartLabel} ${observationParameterLabels[
                                  measure.parameter
                                ].toLowerCase()} trend from ${formatObservationValue(
                                  stats.min,
                                  measure.unit,
                                )} to ${formatObservationValue(stats.max, measure.unit)}`}
                              >
                                <div
                                  className="observation-chart__axis"
                                  aria-hidden="true"
                                >
                                  <span>{formatObservationValue(stats.max, measure.unit)}</span>
                                  <span>{formatObservationValue(midValue, measure.unit)}</span>
                                  <span>{formatObservationValue(stats.min, measure.unit)}</span>
                                </div>
                                <svg
                                  viewBox="0 0 240 72"
                                  aria-hidden="true"
                                  preserveAspectRatio="none"
                                >
                                  <line
                                    className="observation-chart__grid observation-chart__grid--major"
                                    x1="0"
                                    x2="240"
                                    y1="8"
                                    y2="8"
                                  />
                                  <line
                                    className="observation-chart__grid"
                                    x1="0"
                                    x2="240"
                                    y1="36"
                                    y2="36"
                                  />
                                  <line
                                    className="observation-chart__grid observation-chart__grid--major"
                                    x1="0"
                                    x2="240"
                                    y1="64"
                                    y2="64"
                                  />
                                  <polyline
                                    className="observation-chart__line"
                                    points={chartPoints}
                                  />
                                  <circle
                                    className="observation-chart__point"
                                    cx={latestChartPoint?.[0]}
                                    cy={latestChartPoint?.[1]}
                                    r="3"
                                  />
                                </svg>
                              </div>
                            ) : null}
                            <div className="observation-meta">
                              <span>
                                Observed{" "}
                                {formatDateTime(measure.latest?.observedAt ?? null)}
                              </span>
                              <span>{measure.confidence.replaceAll("-", " ")}</span>
                            </div>
                            {measure.sourceUrl ? (
                              <a
                                className="source-link"
                                href={measure.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Source
                              </a>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="gauge-card">
                      <div>
                        <strong>
                          {liveGauge?.gauge.name ?? activeSection.gauge.name}
                        </strong>
                        <span>
                          {isGaugeLoading
                            ? "Checking Environment Agency"
                            : liveGauge?.gauge.observedAt
                              ? new Date(liveGauge.gauge.observedAt).toLocaleString()
                              : activeSection.gauge.observedAt}
                        </span>
                      </div>
                      <div>
                        <strong>
                          {liveGauge?.gauge.latestValue != null
                            ? `${liveGauge.gauge.latestValue.toFixed(2)} ${liveGauge.gauge.unit}`
                            : activeSection.gauge.value}
                        </strong>
                        <span>{liveGauge?.state ?? activeSection.gauge.trend}</span>
                      </div>
                    </div>
                  )}
                  <p className="source-note">
                    {sectionObservationMessage ||
                      (sectionObservations.length
                        ? "Stored provider observations are cached by RiverLaunch.app. Runnable interpretation still needs local validation."
                        : liveGauge?.message ??
                          "Seed gauge context only. Provider mapping is still being verified.")}
                  </p>
                </section>

                <section className="info-block">
                  <h3>Runnable guidance</h3>
                  <div className="notice">
                    <AlertTriangle size={18} />
                    <span>{activeSection.runnableGuidance}</span>
                  </div>
                </section>
              </div>
            ) : null}

            {routeDetailsTab === "access" ? (
              <div className="route-tab-panel" role="tabpanel">
                <section className="info-block info-block--first">
                  <h3>Access</h3>
                  <p>{activeSection.accessSummary}</p>
                  <div className="access-list">
                    {visibleAccessPois.map((accessPoint) => (
                      <div className="compact-item" key={accessPoint.id}>
                        <MapPin size={16} />
                        <div>
                          <strong>{accessPoint.title}</strong>
                          <span>{accessPoint.summary}</span>
                          <a
                            className="compact-nav-link"
                            href={navigationUrl(accessPoint.location)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink size={14} />
                            Navigate
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}

            {routeDetailsTab === "hazards" ? (
              <div className="route-tab-panel" role="tabpanel">
                <section className="info-block info-block--first">
                  <div className="block-title">
                    <h3>Hazards</h3>
                    <span>{visibleHazardPois.length} seeded</span>
                  </div>
                  {visibleHazardPois.map((hazard) => (
                    <div className="hazard-item" key={hazard.id}>
                      <AlertTriangle size={17} />
                      <div>
                        <strong>{hazard.title}</strong>
                        <span>{hazard.subtitle}</span>
                        <p>{hazard.summary}</p>
                        <div className="verification-row">
                          <span
                            className={`status-chip status-chip--${hazard.verificationStatus}`}
                          >
                            {hazard.verificationStatus}
                          </span>
                          {hazard.confirmations > 0 ? (
                            <span>{hazard.confirmations} confirmations</span>
                          ) : (
                            <span>needs local confirmation</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </section>
              </div>
            ) : null}

            {routeDetailsTab === "updates" ? (
              <div className="route-tab-panel" role="tabpanel">
                <section className="contribution-box contribution-box--prominent">
                  <div className="block-title">
                    <h3>Add info</h3>
                    <span>{sectionContributions.length} local updates</span>
                  </div>
                  <div className="contribution-actions">
                    {contributionOptions.slice(0, 4).map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          className="ghost-button"
                          key={option.type}
                          type="button"
                          onClick={() => startAddMode(option.type)}
                        >
                          <Icon size={16} />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="info-block">
                  <div className="block-title">
                    <h3>Community Updates</h3>
                    <span>{sectionContributions.length} local</span>
                  </div>
                  {syncMessage ? (
                    <p className="source-note">{syncMessage}</p>
                  ) : null}
                  <div className="report-list">
                    {activeSection.reports.map((report) => (
                      <div className="report-item" key={report.id}>
                        <MessageSquare size={16} />
                        <div>
                          <strong>{report.type}</strong>
                          <span>
                            {report.author} · {report.dateObserved}
                          </span>
                          <p>{report.text}</p>
                        </div>
                      </div>
                    ))}
                    {sectionContributions.map((contribution) => (
                      <div className="report-item" key={contribution.id}>
                        {contribution.type === "hazard" ? (
                          <AlertTriangle size={16} />
                        ) : contribution.type === "photo" ? (
                          <Camera size={16} />
                        ) : contribution.type === "feature" ? (
                          <MapPin size={16} />
                        ) : contribution.type === "access" ? (
                          <MapPinned size={16} />
                        ) : (
                          <MessageSquare size={16} />
                        )}
                        <div>
                          <strong>{contribution.title}</strong>
                          <span>
                            {contribution.author} · {contribution.type} · observed{" "}
                            {contribution.dateObserved ?? "today"} ·{" "}
                            {contribution.createdAt}
                          </span>
                          {contribution.craftType ? (
                            <span>{contribution.craftType}</span>
                          ) : null}
                          {contribution.location ? (
                            <span>{formatLocation(contribution.location)}</span>
                          ) : null}
                          <p>{contribution.detail}</p>
                          {contribution.photos?.length ? (
                            <div className="contribution-photo-strip">
                              {contribution.photos.map((photo) => (
                                <button
                                  className="photo-open-button"
                                  key={photo.id}
                                  type="button"
                                  onClick={() =>
                                    setLightboxPhoto({
                                      src: photo.displayUrl || photo.thumbnailUrl,
                                      title: photo.caption || contribution.title,
                                      caption: contribution.detail,
                                      alt: photo.caption || contribution.title,
                                    })
                                  }
                                >
                                  <img
                                    src={photo.thumbnailUrl || photo.displayUrl}
                                    alt=""
                                  />
                                </button>
                              ))}
                            </div>
                          ) : null}
                          <div className="verification-row">
                            <span
                              className={`status-chip status-chip--${
                                contribution.status ?? "confirmed"
                              }`}
                            >
                              {contributionStatusLabel(
                                contribution.status ?? "confirmed",
                              )}
                            </span>
                            <span>
                              {contribution.confirmations ?? 0} confirmations
                            </span>
                            <span
                              className={`status-chip status-chip--sync-${
                                outboxByContributionId.get(contribution.id)
                                  ?.syncStatus ?? "local"
                              }`}
                            >
                              {syncStatusLabel(
                                outboxByContributionId.get(contribution.id)
                                  ?.syncStatus,
                              )}
                            </span>
                          </div>
                          {outboxByContributionId.get(contribution.id)
                            ?.lastSyncError ? (
                            <p className="sync-error">
                              {
                                outboxByContributionId.get(contribution.id)
                                  ?.lastSyncError
                              }
                            </p>
                          ) : null}
                          {contribution.type === "hazard" ? (
                            <div className="inline-actions">
                              <button
                                className="ghost-button ghost-button--compact"
                                type="button"
                                onClick={() =>
                                  updateContributionStatus(
                                    contribution.id,
                                    "confirmed",
                                  )
                                }
                              >
                                <CheckCircle2 size={15} />
                                Confirm
                              </button>
                              <button
                                className="ghost-button ghost-button--compact"
                                type="button"
                                onClick={() =>
                                  updateContributionStatus(
                                    contribution.id,
                                    "resolved",
                                  )
                                }
                              >
                                <Flag size={15} />
                                Resolve
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}

            {routeDetailsTab === "photos" ? (
              <div className="route-tab-panel" role="tabpanel">
                <section className="info-block info-block--first">
                  <h3>Photos</h3>
                  <div className="photo-grid">
                    {activeSection.photos.map((photo) => (
                      <figure key={photo.id}>
                        <button
                          className="photo-open-button"
                          type="button"
                          onClick={() =>
                            setLightboxPhoto({
                              src: photo.url,
                              title: photo.title,
                              caption: photo.caption,
                              alt: photo.title,
                            })
                          }
                        >
                          <img src={photo.url} alt="" />
                        </button>
                        <figcaption>
                          <strong>{photo.title}</strong>
                          <span>{photo.caption}</span>
                        </figcaption>
                      </figure>
                    ))}
                    {sectionContributionPhotos.map(({ contribution, photo }) => (
                      <figure key={photo.id}>
                        {photo.displayUrl ? (
                          <button
                            className="photo-open-button"
                            type="button"
                            onClick={() =>
                              setLightboxPhoto({
                                src: photo.displayUrl || photo.thumbnailUrl,
                                title: photo.caption || contribution.title,
                                caption: contribution.detail,
                                alt: photo.caption || contribution.title,
                              })
                            }
                          >
                            <img src={photo.displayUrl} alt="" />
                          </button>
                        ) : (
                          <div className="photo-placeholder">
                            <Camera size={24} />
                          </div>
                        )}
                        <figcaption>
                          <strong>{contribution.title}</strong>
                          <span>{photo.caption || contribution.detail}</span>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}
          </div>
        </section>
      </section>
          ) : activeAppSection === "search" ? (
            <PlaceholderPage section="search" title="Search">
              <div className="search-panel">
                <div className="segmented-control search-mode-tabs" role="tablist">
                  <button
                    className={searchMode === "name" ? "active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={searchMode === "name"}
                    onClick={() => setSearchMode("name")}
                  >
                    <Search size={16} />
                    Name
                  </button>
                  <button
                    className={searchMode === "waterways" ? "active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={searchMode === "waterways"}
                    onClick={() => setSearchMode("waterways")}
                  >
                    <Waves size={16} />
                    Rivers
                  </button>
                  <button
                    className={searchMode === "point" ? "active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={searchMode === "point"}
                    onClick={() => setSearchMode("point")}
                  >
                    <MapPin size={16} />
                    Point
                  </button>
                  <button
                    className={searchMode === "favourites" ? "active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={searchMode === "favourites"}
                    onClick={() => setSearchMode("favourites")}
                  >
                    <Heart size={16} />
                    Favourites
                  </button>
                </div>

                {searchMode === "name" ? (
                  <section className="search-mode-panel" aria-label="Search by name">
                    <label>
                      River or section
                      <input
                        value={riverSearchTerm}
                        onChange={(event) => setRiverSearchTerm(event.target.value)}
                        placeholder="Tryweryn, Wye, Dee"
                      />
                    </label>
                    <div className="filter-row">
                      <span className="status-chip">Grade I-II</span>
                      <span className="status-chip">Grade III-IV</span>
                      <span className="status-chip">Running now</span>
                      <span className="status-chip">Open canoe</span>
                    </div>
                    <div className="placeholder-list">
                      {filteredSearchSections.map((section) => (
                        <button
                          className="placeholder-row"
                          key={section.id}
                          type="button"
                          onClick={() => {
                            selectSection(section);
                            setActiveAppSection("map");
                          }}
                        >
                          <span>
                            <strong>{section.riverName}</strong>
                            <small>{section.sectionName}</small>
                          </span>
                          <span className="section-row__badges">
                            {isCandidateSection(section) ? (
                              <span className="candidate-pill">Candidate</span>
                            ) : null}
                            <span className={`level-pill level-pill--${section.levelBand}`}>
                              {bandLabels[section.levelBand]}
                            </span>
                          </span>
                        </button>
                      ))}
                      {filteredSearchSections.length === 0 ? (
                        <p className="source-note">No matching sections yet.</p>
                      ) : null}
                    </div>
                  </section>
                ) : searchMode === "waterways" ? (
                  <form
                    className="location-search-card"
                    onSubmit={(event) => void handleWatercourseSearch(event)}
                    aria-label="Search known rivers"
                  >
                    <div>
                      <h3>Find a river or waterway</h3>
                      <p>
                        Search imported OSM waterway names, then open the local
                        stretch on the map with the known-rivers layer enabled.
                      </p>
                    </div>
                    <label>
                      Waterway name
                      <input
                        value={watercourseSearchTerm}
                        onChange={(event) =>
                          setWatercourseSearchTerm(event.target.value)
                        }
                        placeholder="Tryweryn, Wye, Dee"
                      />
                    </label>
                    <button
                      className="primary-action"
                      type="submit"
                      disabled={isWatercourseSearchLoading}
                    >
                      <Search size={16} />
                      {isWatercourseSearchLoading ? "Searching" : "Find"}
                    </button>
                    {watercourseSearchMessage ? (
                      <p className="form-error">{watercourseSearchMessage}</p>
                    ) : null}
                    {watercourseSearchResults.length ? (
                      <div className="placeholder-list">
                        {watercourseSearchResults.map((watercourse) => {
                          const distanceKm = watercourse.routes.reduce(
                            (total, route) => total + routeDistanceKm(route),
                            0,
                          );

                          return (
                            <div
                              className="placeholder-row watercourse-search-row"
                              key={watercourse.id}
                            >
                              <span>
                                <strong>
                                  {watercourse.name ?? "Unnamed waterway"}
                                </strong>
                                <small>
                                  {watercourseTypeLabel(
                                    watercourse.watercourseType,
                                  )}{" "}
                                  · {distanceKm.toFixed(1)} km reference line ·{" "}
                                  {watercourse.source.sourceVersion}
                                </small>
                              </span>
                              <span className="status-chip">
                                {watercourse.source.label}
                              </span>
                              <div className="location-result-actions">
                                <button
                                  className="ghost-button ghost-button--compact"
                                  type="button"
                                  onClick={() => openWatercourseOnMap(watercourse)}
                                >
                                  <MapIcon size={15} />
                                  Open
                                </button>
                                <button
                                  className="ghost-button ghost-button--compact"
                                  type="button"
                                  onClick={() => startRouteSuggestionMode(watercourse)}
                                >
                                  <Route size={15} />
                                  Suggest route
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </form>
                ) : searchMode === "point" ? (
                  <form
                    className="location-search-card"
                    onSubmit={(event) => void handleLocationReferenceSearch(event)}
                    aria-label="Search by point"
                  >
                    <div>
                      <h3>Find a point</h3>
                      <p>
                        Enter a what3words address or coordinates to find nearby
                        points of interest.
                      </p>
                    </div>
                  <label>
                    Location reference
                    <input
                      value={locationSearchInput}
                      onChange={(event) => setLocationSearchInput(event.target.value)}
                      placeholder="///filled.count.soap or 52.0521,-2.7123"
                    />
                  </label>
                  <button
                    className="primary-action"
                    type="submit"
                    disabled={isLocationSearchLoading}
                  >
                    <Search size={16} />
                    {isLocationSearchLoading ? "Searching" : "Find"}
                  </button>
                  {locationSearchMessage ? (
                    <p className="form-error">{locationSearchMessage}</p>
                  ) : null}
                  {locationSearchResult ? (
                    <div className="location-search-result">
                      <div className="location-search-result__summary">
                        <div>
                          <strong>{locationSearchResult.label}</strong>
                          <span>{formatLocation(locationSearchResult.location)}</span>
                          {locationSearchResult.nearestPlace ||
                          locationSearchResult.country ? (
                            <small>
                              {[locationSearchResult.nearestPlace, locationSearchResult.country]
                                .filter(Boolean)
                                .join(" · ")}
                            </small>
                          ) : null}
                        </div>
                        {locationSearchResult.focusSection ? (
                          <button
                            className="primary-action"
                            type="button"
                            onClick={() =>
                              openSearchLocationOnMap(
                                locationSearchResult.focusSection!,
                                locationSearchResult.location,
                                "Searched location",
                              )
                            }
                          >
                            <MapIcon size={16} />
                            Open point
                          </button>
                        ) : null}
                      </div>
                      <h4>Nearby Points of Interest</h4>
                      {locationSearchResult.pois.length ? (
                        <div className="placeholder-list">
                          {locationSearchResult.pois.map((poi) => (
                            <div className="placeholder-row location-result-row" key={poi.id}>
                              <span>
                                <strong>{poi.title}</strong>
                                <small>
                                  {poi.subtitle} · {formatDistanceKm(poi.distanceKm)}
                                </small>
                              </span>
                              <span className="status-chip">{poi.kind}</span>
                              <div className="location-result-actions">
                                <button
                                  className="ghost-button ghost-button--compact"
                                  type="button"
                                  onClick={() =>
                                    openSearchLocationOnMap(
                                      poi.section,
                                      poi.location,
                                      poi.title,
                                      false,
                                    )
                                  }
                                >
                                  <MapIcon size={15} />
                                  Open
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="source-note">
                          No nearby POIs in the current sample catalogue.
                        </p>
                      )}
                    </div>
                  ) : null}
                  </form>
                ) : (
                  <section className="search-mode-panel" aria-label="Favourite routes">
                    {!isSignedIn ? (
                      <section className="sign-in-card">
                        <Star size={22} />
                        <div>
                          <h3>Create account to save favourites</h3>
                          <p>
                            RiverLaunch.app treats favourites as account-only saved
                            routes, so create an account or sign in before saving sections.
                          </p>
                        </div>
                        <button
                          className="primary-action"
                          type="button"
                          onClick={requireSignInForSave}
                          disabled={!isAuthConfigured}
                        >
                          <LogIn size={16} />
                          Create account / Sign in
                        </button>
                      </section>
                    ) : (
                      <div className="placeholder-list">
                        {favouriteSections.map((section) => (
                          <div
                            className="placeholder-row favourite-row"
                            key={section.id}
                          >
                            <span>
                              <strong>{section.riverName}</strong>
                              <small>{section.sectionName}</small>
                            </span>
                            <span className="section-row__badges">
                              {isCandidateSection(section) ? (
                                <span className="candidate-pill">Candidate</span>
                              ) : null}
                              <span className={`level-pill level-pill--${section.levelBand}`}>
                                {bandLabels[section.levelBand]}
                              </span>
                            </span>
                            <div className="favourite-row__actions">
                              <button
                                className="ghost-button ghost-button--compact"
                                type="button"
                                onClick={() => {
                                  selectSection(section);
                                  setActiveAppSection("map");
                                }}
                              >
                                <MapIcon size={15} />
                                Open
                              </button>
                              <button
                                className="ghost-button ghost-button--compact"
                                type="button"
                                title="Remove from favourites"
                                aria-label={`Remove ${section.sectionName} from favourites`}
                                onClick={() => setPendingUnfavouriteSection(section)}
                              >
                                <X size={15} />
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                        {favouriteSections.length === 0 ? (
                          <div className="placeholder-row">
                            <span>
                              <strong>No favourites yet</strong>
                              <small>
                                Use the star on the Map section to save a route here.
                              </small>
                            </span>
                            <Star size={18} />
                          </div>
                        ) : null}
                      </div>
                    )}
                    {isSignedIn && pendingUnfavouriteSection ? (
                      <section className="confirm-panel" role="dialog" aria-modal="true">
                        <div>
                          <p className="eyebrow">Remove favourite</p>
                          <h3>{pendingUnfavouriteSection.sectionName}</h3>
                          <p>Remove this route from your favourites?</p>
                        </div>
                        <div className="form-actions">
                          <button
                            className="ghost-button"
                            type="button"
                            onClick={() => setPendingUnfavouriteSection(null)}
                          >
                            Cancel
                          </button>
                          <button
                            className="submit-button"
                            type="button"
                            onClick={() => {
                              toggleFavouriteSection(pendingUnfavouriteSection);
                              setPendingUnfavouriteSection(null);
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </section>
                    ) : null}
                  </section>
                )}
              </div>
            </PlaceholderPage>
          ) : activeAppSection === "groups" ? (
            <PlaceholderPage section="groups" title="Groups">
              <div className="profile-grid">
                <AppBrandPanel />
                <section className="sign-in-card">
                  <UsersRound size={22} />
                  <div>
                    <h3>Group activities</h3>
                    <p>
                      This future area will help clubs, friends, and paddling
                      groups plan trips, share route choices, coordinate meeting
                      points, and keep activity notes together.
                    </p>
                  </div>
                </section>
                <div className="placeholder-list">
                  <div className="placeholder-row">
                    <span>
                      <strong>Plan a paddle</strong>
                      <small>Draft group trips with sections, dates, and meeting points.</small>
                    </span>
                    <Route size={18} />
                  </div>
                  <div className="placeholder-row">
                    <span>
                      <strong>Invite members</strong>
                      <small>Coordinate who is joining and what information they need.</small>
                    </span>
                    <UsersRound size={18} />
                  </div>
                  <div className="placeholder-row">
                    <span>
                      <strong>Share updates</strong>
                      <small>Keep level, access, and safety notes attached to an activity.</small>
                    </span>
                    <MessageSquare size={18} />
                  </div>
                </div>
              </div>
            </PlaceholderPage>
          ) : activeAppSection === "profile" ? (
            <PlaceholderPage section="profile" title="Profile">
              <div className="profile-grid">
                <div className="segmented-control profile-mode-tabs" role="tablist">
                  <button
                    className={profileMode === "account" ? "active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={profileMode === "account"}
                    onClick={() => setProfileMode("account")}
                  >
                    <UserRound size={16} />
                    Account
                  </button>
                  <button
                    className={profileMode === "public" ? "active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={profileMode === "public"}
                    onClick={() => setProfileMode("public")}
                  >
                    <UserRound size={16} />
                    Public
                  </button>
                  <button
                    className={profileMode === "emergency" ? "active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={profileMode === "emergency"}
                    onClick={() => setProfileMode("emergency")}
                  >
                    <ShieldCheck size={16} />
                    ICE
                  </button>
                  <button
                    className={profileMode === "sync" ? "active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={profileMode === "sync"}
                    onClick={() => setProfileMode("sync")}
                  >
                    <RefreshCw size={16} />
                    Sync
                  </button>
                  <button
                    className={profileMode === "activity" ? "active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={profileMode === "activity"}
                    onClick={() => setProfileMode("activity")}
                  >
                    <MapPin size={16} />
                    Points
                  </button>
                  <button
                    className={profileMode === "photos" ? "active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={profileMode === "photos"}
                    onClick={() => setProfileMode("photos")}
                  >
                    <Camera size={16} />
                    Photos
                  </button>
                </div>
                {profileMode === "account" ? (
                  <section className="profile-mode-panel" aria-label="My account">
                    <AppBrandPanel />
                    <div className="profile-card">
                      <UserRound size={22} />
                      <div>
                        <strong>
                          {memberProfile?.publicName ??
                            memberProfile?.displayName ??
                            authState.user?.displayName ??
                            "Signed out"}
                        </strong>
                        <span>
                          {memberProfile?.email ??
                            authState.user?.email ??
                            "Create account or sign in to sync"}
                        </span>
                      </div>
                      <span className="status-chip">
                        {memberProfile?.role ?? "Guest"}
                      </span>
                    </div>
                    {!isSignedIn ? (
                      <section className="sign-in-card">
                        <LogIn size={22} />
                        <div>
                          <h3>Create account or sign in</h3>
                          <p>
                            Browsing is open to everyone. Favourites, local
                            knowledge, photos, and sync need a RiverLaunch.app
                            account.
                          </p>
                        </div>
                        <button
                          className="primary-action"
                          type="button"
                          onClick={handleSignIn}
                          disabled={!isAuthConfigured}
                        >
                          <LogIn size={16} />
                          Create account / Sign in
                        </button>
                      </section>
                    ) : null}
                    {authMessage || authState.error || memberMessage ? (
                      <p className="profile-message">
                        {authMessage || authState.error || memberMessage}
                      </p>
                    ) : null}
                    <div className="profile-stats">
                  <Metric
                    icon={MessageSquare}
                    label="Local updates"
                    value={String(contributions.length)}
                  />
                  <Metric
                    icon={RefreshCw}
                    label="Outbox"
                    value={String(queuedOutboxCount)}
                  />
                  <Metric
                    icon={ShieldCheck}
                    label="Trust"
                    value={memberProfile?.trustLevel ?? "Unsigned"}
                  />
                  <Metric
                    icon={MapIcon}
                    label="Current section"
                    value={activeSection.riverName}
                  />
                    </div>
                    <div className="profile-actions">
                  {isSignedIn ? (
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={handleSignOut}
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  ) : null}
                    </div>
                  </section>
                ) : null}
                {profileMode === "public" ? (
                  <section className="profile-mode-panel" aria-label="Public profile">
                    {!isSignedIn ? (
                      <section className="sign-in-card">
                        <LogIn size={22} />
                        <div>
                          <h3>Create account to edit your public name</h3>
                          <p>
                            Your public contributor name is shown beside local
                            knowledge, photos, and confirmations.
                          </p>
                        </div>
                        <button
                          className="primary-action"
                          type="button"
                          onClick={handleSignIn}
                          disabled={!isAuthConfigured}
                        >
                          <LogIn size={16} />
                          Create account / Sign in
                        </button>
                      </section>
                    ) : (
                      <section className="profile-card profile-card--stacked">
                        <div className="block-title">
                          <div>
                            <h3>Public profile name</h3>
                            <span>Shown beside your public contributions</span>
                          </div>
                          <span className="status-chip">
                            {memberProfile?.publicNameStatus ?? "active"}
                          </span>
                        </div>
                        <div className="form-grid">
                          <label>
                            <span>Public name</span>
                            <input
                              type="text"
                              value={publicNameDraft}
                              onChange={(event) =>
                                setPublicNameDraft(event.target.value)
                              }
                              placeholder="Tim, Joe G, Sarah Canoe"
                              maxLength={40}
                            />
                          </label>
                        </div>
                        <p className="source-note">
                          Most paddlers use a real first name or recognisable
                          paddling name. Do not use an email address, offensive
                          wording, impersonation, or organisation names you do not
                          represent.
                        </p>
                        {memberMessage ? (
                          <p className="profile-message">{memberMessage}</p>
                        ) : null}
                        <div className="profile-actions">
                          <button
                            className="primary-action"
                            type="button"
                            onClick={() => void savePublicName()}
                            disabled={isProfileSaving}
                          >
                            <UserRound size={16} />
                            {isProfileSaving ? "Saving" : "Save name"}
                          </button>
                        </div>
                      </section>
                    )}
                  </section>
                ) : null}

                {profileMode === "emergency" ? (
                  <section className="profile-mode-panel" aria-label="Emergency contact">
                    {!isSignedIn ? (
                      <section className="sign-in-card">
                        <LogIn size={22} />
                        <div>
                          <h3>Create account to manage emergency contact</h3>
                          <p>
                            Emergency contact details are private account data for
                            future group sessions.
                          </p>
                        </div>
                        <button
                          className="primary-action"
                          type="button"
                          onClick={handleSignIn}
                          disabled={!isAuthConfigured}
                        >
                          <LogIn size={16} />
                          Create account / Sign in
                        </button>
                      </section>
                    ) : (
                      <section className="profile-card profile-card--stacked">
                        <div className="block-title">
                          <div>
                            <h3>Emergency contact</h3>
                            <span>Private ICE details for future group sessions</span>
                          </div>
                          <span className="status-chip">
                            {emergencyProfile?.visibilityDefault ?? "private"}
                          </span>
                        </div>
                        {isEmergencyProfileLoading ? (
                          <p className="source-note">
                            Loading emergency contact...
                          </p>
                        ) : (
                          <>
                            <div className="form-grid">
                              <label>
                                <span>Contact name</span>
                                <input
                                  type="text"
                                  value={emergencyContactName}
                                  onChange={(event) =>
                                    setEmergencyContactName(event.target.value)
                                  }
                                  maxLength={80}
                                />
                              </label>
                              <label>
                                <span>Contact phone</span>
                                <input
                                  type="tel"
                                  value={emergencyContactPhone}
                                  onChange={(event) =>
                                    setEmergencyContactPhone(event.target.value)
                                  }
                                  maxLength={40}
                                />
                              </label>
                              <label>
                                <span>Relationship</span>
                                <input
                                  type="text"
                                  value={emergencyContactRelationship}
                                  onChange={(event) =>
                                    setEmergencyContactRelationship(
                                      event.target.value,
                                    )
                                  }
                                  placeholder="Partner, parent, friend"
                                  maxLength={60}
                                />
                              </label>
                            </div>
                            <p className="source-note">
                              Stored privately. Do not enter medical information
                              here. In future group sessions you will choose
                              whether to share this emergency contact with the
                              organiser.
                            </p>
                            {memberMessage ? (
                              <p className="profile-message">{memberMessage}</p>
                            ) : null}
                            <div className="profile-actions">
                              <button
                                className="primary-action"
                                type="button"
                                onClick={() => void saveEmergencyContact()}
                                disabled={isEmergencyProfileSaving}
                              >
                                <ShieldCheck size={16} />
                                {isEmergencyProfileSaving
                                  ? "Saving"
                                  : "Save emergency contact"}
                              </button>
                            </div>
                          </>
                        )}
                      </section>
                    )}
                  </section>
                ) : null}

                {profileMode === "sync" ? (
                  <section className="profile-mode-panel" aria-label="Sync">
                    <SyncOutboxBanner
                      queuedOutboxCount={queuedOutboxCount}
                      failedOutboxCount={failedOutboxCount}
                      isDismissed={isSyncBannerDismissed}
                      isOnline={isOnline}
                      isSyncingOutbox={isSyncingOutbox}
                      canSyncOutbox={canSyncOutbox}
                      onDismiss={dismissSyncBanner}
                      onSync={syncOutboxNow}
                    />
                    <div className="profile-stats">
                      <Metric
                        icon={MessageSquare}
                        label="Local updates"
                        value={String(contributions.length)}
                      />
                      <Metric
                        icon={RefreshCw}
                        label="Queued outbox"
                        value={String(queuedOutboxCount)}
                      />
                      <Metric
                        icon={AlertTriangle}
                        label="Failed syncs"
                        value={String(failedOutboxCount)}
                      />
                      <Metric
                        icon={MapIcon}
                        label="Current section"
                        value={activeSection.riverName}
                      />
                    </div>
                    <div className="profile-actions">
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={syncOutboxNow}
                        disabled={!canSyncOutbox}
                      >
                        <RefreshCw size={16} />
                        Sync now
                      </button>
                    </div>
                  </section>
                ) : null}

                {profileMode === "activity" ? (
                  <section className="profile-mode-panel" aria-label="Points">
                    {!isSignedIn ? (
                      <section className="sign-in-card">
                        <LogIn size={22} />
                        <div>
                          <h3>Create account to manage your points</h3>
                          <p>
                            Synced local knowledge is attached to your
                            RiverLaunch.app account.
                          </p>
                        </div>
                        <button
                          className="primary-action"
                          type="button"
                          onClick={handleSignIn}
                          disabled={!isAuthConfigured}
                        >
                          <LogIn size={16} />
                          Create account / Sign in
                        </button>
                      </section>
                    ) : null}
                    {isSignedIn ? (
                  <>
                  <section className="profile-card profile-card--stacked">
                    <div className="block-title">
                      <div>
                        <h3>My points</h3>
                        <span>{memberContributions.length} saved</span>
                      </div>
                      <button
                        className="ghost-button ghost-button--compact"
                        type="button"
                        onClick={() => void loadMemberContributions()}
                        disabled={isMemberContributionsLoading}
                      >
                        <RefreshCw size={15} />
                        Refresh
                      </button>
                    </div>
                    {pointMessage ? (
                      <p className="profile-message">{pointMessage}</p>
                    ) : null}
                    {isMemberContributionsLoading ? (
                      <p className="source-note">Loading your points...</p>
                    ) : memberContributions.length ? (
                      <div className="profile-photo-list">
                        {memberContributions.map((contribution) => {
                          const section = appRiverSections.find(
                            (item) => item.id === contribution.sectionId,
                          );

                          return (
                            <article
                              className="profile-point-row"
                              key={contribution.id}
                            >
                              <div className="profile-point-icon">
                                {contribution.type === "photo" ? (
                                  <Camera size={18} />
                                ) : contribution.type === "hazard" ? (
                                  <AlertTriangle size={18} />
                                ) : contribution.type === "access" ? (
                                  <MapPinned size={18} />
                                ) : contribution.type === "feature" ? (
                                  <MapPin size={18} />
                                ) : (
                                  <MessageSquare size={18} />
                                )}
                              </div>
                              <div>
                                <strong>{contribution.title}</strong>
                                <span>{contribution.detail}</span>
                                <small>
                                  {section?.sectionName ?? contribution.sectionId} ·{" "}
                                  {contribution.type} ·{" "}
                                  {contributionStatusLabel(contribution.status)}
                                </small>
                              </div>
                              <div className="profile-photo-actions">
                                <button
                                  className="ghost-button ghost-button--compact"
                                  type="button"
                                  onClick={() => openContributionOnMap(contribution)}
                                >
                                  <MapIcon size={15} />
                                  Map
                                </button>
                                <button
                                  className="ghost-button ghost-button--compact"
                                  type="button"
                                  onClick={() =>
                                    requestDeletePoint(
                                      contribution.id,
                                      contribution.title,
                                    )
                                  }
                                >
                                  <Trash2 size={15} />
                                  Delete
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="source-note">
                        Synced local knowledge will appear here.
                      </p>
                    )}
                  </section>
                  <section className="profile-card profile-card--stacked">
                    <div className="block-title">
                      <div>
                        <h3>My route suggestions</h3>
                        <span>{routeSuggestions.length} saved</span>
                      </div>
                      <button
                        className="ghost-button ghost-button--compact"
                        type="button"
                        onClick={() => void loadMemberRouteSuggestions()}
                        disabled={isMemberRouteSuggestionsLoading}
                      >
                        <RefreshCw size={15} />
                        Refresh
                      </button>
                    </div>
                    {isMemberRouteSuggestionsLoading ? (
                      <p className="source-note">Loading your route suggestions...</p>
                    ) : routeSuggestions.length ? (
                      <div className="profile-photo-list">
                        {routeSuggestions.map((suggestion) => (
                          <article
                            className="profile-point-row"
                            key={suggestion.id}
                          >
                            <div className="profile-point-icon">
                              <Route size={18} />
                            </div>
                            <div>
                              <strong>{suggestion.sectionName}</strong>
                              <span>{suggestion.summary}</span>
                              <small>
                                {suggestion.riverName} · {suggestion.difficulty} ·{" "}
                                {suggestion.status.replaceAll("-", " ")}
                              </small>
                            </div>
                            <div className="profile-photo-actions">
                              <button
                                className="ghost-button ghost-button--compact"
                                type="button"
                                onClick={() => openRouteSuggestionOnMap(suggestion)}
                              >
                                <MapIcon size={15} />
                                Map
                              </button>
                              {suggestion.status === "local-draft" ? (
                                <button
                                  className="ghost-button ghost-button--compact"
                                  type="button"
                                  onClick={() => void retryRouteSuggestion(suggestion)}
                                >
                                  <RefreshCw size={15} />
                                  Send
                                </button>
                              ) : null}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="source-note">
                        Suggested routes you submit will appear here.
                      </p>
                    )}
                  </section>
                  </>
                ) : null}
                  </section>
                ) : null}

                {profileMode === "photos" ? (
                  <section className="profile-mode-panel" aria-label="Photos">
                    {!isSignedIn ? (
                      <section className="sign-in-card">
                        <LogIn size={22} />
                        <div>
                          <h3>Create account to manage your photos</h3>
                          <p>
                            Uploaded photos are attached to your
                            RiverLaunch.app account.
                          </p>
                        </div>
                        <button
                          className="primary-action"
                          type="button"
                          onClick={handleSignIn}
                          disabled={!isAuthConfigured}
                        >
                          <LogIn size={16} />
                          Create account / Sign in
                        </button>
                      </section>
                    ) : null}
                {isSignedIn ? (
                  <section className="profile-card profile-card--stacked">
                    <div className="block-title">
                      <div>
                        <h3>My photos</h3>
                        <span>{memberPhotos.length} uploaded</span>
                      </div>
                      <button
                        className="ghost-button ghost-button--compact"
                        type="button"
                        onClick={() => void loadMemberPhotos()}
                        disabled={isMemberPhotosLoading}
                      >
                        <RefreshCw size={15} />
                        Refresh
                      </button>
                    </div>
                    {photoMessage ? (
                      <p className="profile-message">{photoMessage}</p>
                    ) : null}
                    {isMemberPhotosLoading ? (
                      <p className="source-note">Loading your photos...</p>
                    ) : memberPhotos.length ? (
                      <div className="profile-photo-list">
                        {memberPhotos.map((photo) => (
                          <article className="profile-photo-row" key={photo.id}>
                            <button
                              className="photo-open-button"
                              type="button"
                              onClick={() => openMemberPhotoLightbox(photo)}
                            >
                              <img
                                src={photo.thumbnailUrl ?? photo.displayUrl ?? ""}
                                alt=""
                              />
                            </button>
                            <div>
                              <strong>{photo.contributionTitle}</strong>
                              <span>{photo.caption || photo.contributionDetail}</span>
                              <small>
                                {photo.sectionId ?? "No section"} ·{" "}
                                {photo.photoModerationStatus} ·{" "}
                                {new Date(photo.createdAt).toLocaleDateString()}
                              </small>
                            </div>
                            <div className="profile-photo-actions">
                              <button
                                className="ghost-button ghost-button--compact"
                                type="button"
                                onClick={() => openPhotoOnMap(photo)}
                              >
                                <MapIcon size={15} />
                                Map
                              </button>
                              <button
                                className="ghost-button ghost-button--compact"
                                type="button"
                                onClick={() =>
                                  requestDeletePhoto(
                                    photo.id,
                                    photo.caption || photo.contributionTitle,
                                  )
                                }
                              >
                                <Trash2 size={15} />
                                Delete
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="source-note">
                        Uploaded photos will appear here after they sync.
                      </p>
                    )}
                  </section>
                ) : null}
                  </section>
                ) : null}
              </div>
            </PlaceholderPage>
          ) : activeAppSection === "more" ? (
            <PlaceholderPage section="more" title="More">
              <AppBrandPanel />
              <div className="placeholder-list">
                {canAccessAdminTools ? (
                  <button
                    className="placeholder-row"
                    type="button"
                    onClick={() => {
                      setActiveAdminPage(canManageMembers ? "index" : "moderation");
                      setActiveAppSection("admin");
                    }}
                  >
                    <span>
                      <strong>{canManageMembers ? "Admin" : "Moderation"}</strong>
                      <small>
                        {canManageMembers
                          ? "Members, moderation, and platform controls"
                          : "Contribution queue, reports, and disputes"}
                      </small>
                    </span>
                    <ShieldCheck size={18} />
                  </button>
                ) : null}
                <button className="placeholder-row" type="button">
                  <span>
                    <strong>Offline packs</strong>
                    <small>Saved rivers for poor signal</small>
                  </span>
                  <RefreshCw size={18} />
                </button>
                <section className="settings-panel" aria-label="Settings">
                  <div className="settings-panel__header">
                    <span>
                      <strong>Settings</strong>
                      <small>Map, units, alerts, and account preferences</small>
                    </span>
                    <MoreHorizontal size={18} />
                  </div>
                  <label className="setting-toggle">
                    <input
                      type="checkbox"
                      checked={isLiveLocationEnabled}
                      disabled={!isLiveLocationSupported}
                      onChange={(event) =>
                        handleLiveLocationToggle(event.target.checked)
                      }
                    />
                    <span>
                      <strong>Show my live location</strong>
                      <small>
                        {isLiveLocationSupported
                          ? `${liveLocationStatusLabel(liveLocationStatus)} · ${liveLocationUpdatedLabel(liveLocation)}`
                          : "Not available in this browser"}
                      </small>
                    </span>
                  </label>
                  {liveLocationMessage ? (
                    <p className="source-note">{liveLocationMessage}</p>
                  ) : null}
                  {isLiveLocationEnabled ? (
                    <button
                      className="ghost-button ghost-button--compact"
                      type="button"
                      onClick={handleLiveLocationButtonClick}
                    >
                      <Navigation size={15} />
                      Centre on map
                    </button>
                  ) : null}
                </section>
              </div>
            </PlaceholderPage>
          ) : (
            <PlaceholderPage section="admin" title="Admin">
              {canAccessAdminTools ? (
                <div className="admin-workspace">
                  {activeAdminPage === "index" ? (
                    <div className="placeholder-list">
                      {canManageMembers ? (
                        <button
                          className="placeholder-row"
                          type="button"
                          onClick={openAdminPanel}
                        >
                          <span>
                            <strong>Members</strong>
                            <small>Member directory, roles, and recent activity</small>
                          </span>
                          <UserRound size={18} />
                        </button>
                      ) : null}
                      <button
                        className="placeholder-row"
                        type="button"
                        onClick={openModerationPanel}
                      >
                        <span>
                          <strong>Moderation</strong>
                          <small>Contribution queue, reports, and disputes</small>
                        </span>
                        <Flag size={18} />
                      </button>
                      {canManageMembers ? (
                        <button
                          className="placeholder-row"
                          type="button"
                          onClick={() => setActiveAdminPage("system")}
                        >
                          <span>
                            <strong>System</strong>
                            <small>Data quality, sync health, and platform status</small>
                          </span>
                          <ShieldCheck size={18} />
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <section className="admin-page">
                      <nav className="admin-breadcrumb" aria-label="Admin breadcrumb">
                        <button
                          type="button"
                          onClick={() => setActiveAdminPage("index")}
                        >
                          Admin
                        </button>
                        {activeAdminPage === "members" ? (
                          <>
                            <span>/</span>
                            <strong>Members</strong>
                          </>
                        ) : activeAdminPage === "member-detail" ? (
                          <>
                            <span>/</span>
                            <button type="button" onClick={openAdminPanel}>
                              Members
                            </button>
                            <span>/</span>
                            <strong>
                              {selectedAdminMemberDetail?.member.displayName ??
                                selectedAdminMemberDetail?.member.email ??
                                "Member"}
                            </strong>
                          </>
                        ) : activeAdminPage === "moderation" ? (
                          <>
                            <span>/</span>
                            <strong>Moderation</strong>
                          </>
                        ) : activeAdminPage === "system" ? (
                          <>
                            <span>/</span>
                            <strong>System</strong>
                          </>
                        ) : null}
                      </nav>
                      {activeAdminPage === "members" && canManageMembers ? (
                        <>
                          <div className="quick-add-panel__header">
                            <div>
                              <p className="eyebrow">Members</p>
                              <h2>Member directory</h2>
                            </div>
                            <button
                              className="ghost-button ghost-button--compact"
                              type="button"
                              onClick={openAdminPanel}
                            >
                              <RefreshCw size={15} />
                              Refresh
                            </button>
                          </div>
                          {isAdminLoading ? (
                            <p className="source-note">Loading members...</p>
                          ) : (
                            <>
                              <div className="member-directory-filters">
                                <label className="member-search">
                                  <span>Search</span>
                                  <input
                                    type="search"
                                    value={memberSearch}
                                    onChange={(event) =>
                                      setMemberSearch(event.target.value)
                                    }
                                    placeholder="Name, email, role, or UID"
                                  />
                                </label>
                                <label>
                                  <span>Role</span>
                                  <select
                                    value={memberRoleFilter}
                                    onChange={(event) =>
                                      setMemberRoleFilter(
                                        event.target.value as MemberRoleFilter,
                                      )
                                    }
                                  >
                                    <option value="all">All roles</option>
                                    {memberRoleOptions.map((role) => (
                                      <option key={role} value={role}>
                                        {role}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label>
                                  <span>Trust</span>
                                  <select
                                    value={memberTrustFilter}
                                    onChange={(event) =>
                                      setMemberTrustFilter(
                                        event.target.value as MemberTrustFilter,
                                      )
                                    }
                                  >
                                    <option value="all">All trust</option>
                                    {memberTrustOptions.map((trustLevel) => (
                                      <option key={trustLevel} value={trustLevel}>
                                        {trustLevel}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                              <div className="member-list member-list--full">
                                {filteredAdminMembers.map((member) => (
                                  <div className="member-row" key={member.id}>
                                    <div className="member-identity">
                                      <strong>
                                        {member.displayName ??
                                          member.email ??
                                          member.firebaseUid}
                                      </strong>
                                      <span>{member.email ?? "No email"}</span>
                                      <div className="member-status-row">
                                        <span className="status-chip">
                                          {member.role}
                                        </span>
                                        <span className="status-chip">
                                          {member.trustLevel}
                                        </span>
                                      </div>
                                    </div>
                                    <button
                                      className="ghost-button ghost-button--compact"
                                      type="button"
                                      onClick={() => void openAdminMemberDetail(member)}
                                    >
                                      <ExternalLink size={15} />
                                      View
                                    </button>
                                  </div>
                                ))}
                                {adminMembers.length === 0 ? (
                                  <p className="source-note">No members found.</p>
                                ) : filteredAdminMembers.length === 0 ? (
                                  <p className="source-note">
                                    No members match those filters.
                                  </p>
                                ) : null}
                              </div>
                            </>
                          )}
                        </>
                      ) : activeAdminPage === "member-detail" && canManageMembers ? (
                        <>
                          <div className="quick-add-panel__header">
                            <div>
                              <p className="eyebrow">Members</p>
                              <h2>
                                {selectedAdminMemberDetail?.member.displayName ??
                                  selectedAdminMemberDetail?.member.email ??
                                  "Member details"}
                              </h2>
                            </div>
                            <div className="profile-actions">
                              <button
                                className="ghost-button ghost-button--compact"
                                type="button"
                                onClick={openAdminPanel}
                              >
                                Members
                              </button>
                              {selectedAdminMemberDetail ? (
                                <button
                                  className="ghost-button ghost-button--compact"
                                  type="button"
                                  onClick={() =>
                                    void openAdminMemberDetail(
                                      selectedAdminMemberDetail.member,
                                    )
                                  }
                                >
                                  <RefreshCw size={15} />
                                  Refresh
                                </button>
                              ) : null}
                            </div>
                          </div>
                          {adminMemberDetailMessage ? (
                            <p className="profile-message">
                              {adminMemberDetailMessage}
                            </p>
                          ) : null}
                          {isAdminMemberDetailLoading ? (
                            <p className="source-note">Loading member details...</p>
                          ) : selectedAdminMemberDetail ? (
                            <div className="member-detail-page">
                              <section className="profile-card profile-card--stacked">
                                <div className="block-title">
                                  <div>
                                    <h3>Account</h3>
                                    <span>
                                      {selectedAdminMemberDetail.member.email ??
                                        "No email"}
                                    </span>
                                  </div>
                                  <span className="status-chip">
                                    {selectedAdminMemberDetail.member.role}
                                  </span>
                                </div>
                                <div className="member-detail-grid">
                                  <Metric
                                    icon={UserRound}
                                    label="Display name"
                                    value={
                                      selectedAdminMemberDetail.member.displayName ??
                                      "Not set"
                                    }
                                  />
                                  <Metric
                                    icon={Clock3}
                                    label="Signed up"
                                    value={formatDateTime(
                                      selectedAdminMemberDetail.member.createdAt,
                                    )}
                                  />
                                  <Metric
                                    icon={RefreshCw}
                                    label="Last seen"
                                    value={formatDateTime(
                                      selectedAdminMemberDetail.member.lastSeenAt,
                                    )}
                                  />
                                  <Metric
                                    icon={ShieldCheck}
                                    label="Approval"
                                    value="Active account"
                                  />
                                </div>
                              </section>

                              <section className="profile-card profile-card--stacked">
                                <div className="block-title">
                                  <div>
                                    <h3>Access controls</h3>
                                    <span>Role and trust apply immediately</span>
                                  </div>
                                  <span className="status-chip">
                                    {selectedAdminMemberDetail.member.trustLevel}
                                  </span>
                                </div>
                                <div className="member-access-controls member-access-controls--detail">
                                  <label>
                                    <span>Role</span>
                                    <select
                                      value={selectedAdminMemberDetail.member.role}
                                      onChange={(event) =>
                                        void updateMemberAccess(
                                          selectedAdminMemberDetail.member,
                                          {
                                            role: event.target.value as MemberRole,
                                          },
                                        )
                                      }
                                    >
                                      {memberRoleOptions.map((role) => (
                                        <option key={role} value={role}>
                                          {role}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label>
                                    <span>Trust</span>
                                    <select
                                      value={
                                        selectedAdminMemberDetail.member.trustLevel
                                      }
                                      onChange={(event) =>
                                        void updateMemberAccess(
                                          selectedAdminMemberDetail.member,
                                          {
                                            trustLevel: event.target
                                              .value as MemberTrustLevel,
                                          },
                                        )
                                      }
                                    >
                                      {memberTrustOptions.map((trustLevel) => (
                                        <option key={trustLevel} value={trustLevel}>
                                          {trustLevel}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label>
                                    <span>Approval</span>
                                    <select value="active" disabled>
                                      <option value="active">Active</option>
                                    </select>
                                  </label>
                                </div>
                              </section>

                              <div className="member-detail-stat-grid">
                                <Metric
                                  icon={MapPin}
                                  label="Contributions"
                                  value={`${selectedAdminMemberDetail.stats.contributionCount}`}
                                />
                                <Metric
                                  icon={Camera}
                                  label="Photos"
                                  value={`${selectedAdminMemberDetail.stats.photoCount}`}
                                />
                              </div>

                              <section className="profile-card profile-card--stacked">
                                <div className="block-title">
                                  <div>
                                    <h3>Contributions</h3>
                                    <span>
                                      {selectedAdminMemberDetail.contributions.length} items
                                    </span>
                                  </div>
                                </div>
                                {selectedAdminMemberDetail.contributions.length ? (
                                  <div className="profile-photo-list">
                                    {selectedAdminMemberDetail.contributions.map(
                                      (contribution) => {
                                        const section = appRiverSections.find(
                                          (item) =>
                                            item.id === contribution.sectionId,
                                        );

                                        return (
                                          <article
                                            className="profile-point-row"
                                            key={contribution.id}
                                          >
                                            <div className="profile-point-icon">
                                              <MapPin size={18} />
                                            </div>
                                            <div>
                                              <strong>{contribution.title}</strong>
                                              <span>{contribution.detail}</span>
                                              <small>
                                                {section?.sectionName ??
                                                  contribution.sectionId}{" "}
                                                · {contribution.type} ·{" "}
                                                {contributionStatusLabel(
                                                  contribution.status,
                                                )}
                                              </small>
                                            </div>
                                            <div className="profile-photo-actions">
                                              <button
                                                className="ghost-button ghost-button--compact"
                                                type="button"
                                                onClick={() =>
                                                  openContributionOnMap(
                                                    contribution,
                                                  )
                                                }
                                              >
                                                <MapIcon size={15} />
                                                Map
                                              </button>
                                            </div>
                                          </article>
                                        );
                                      },
                                    )}
                                  </div>
                                ) : (
                                  <p className="source-note">
                                    This member has no synced contributions.
                                  </p>
                                )}
                              </section>

                              <section className="profile-card profile-card--stacked">
                                <div className="block-title">
                                  <div>
                                    <h3>Photos</h3>
                                    <span>
                                      {selectedAdminMemberDetail.photos.length} uploads
                                    </span>
                                  </div>
                                </div>
                                {selectedAdminMemberDetail.photos.length ? (
                                  <div className="profile-photo-list">
                                    {selectedAdminMemberDetail.photos.map((photo) => (
                                      <article
                                        className="profile-photo-row"
                                        key={photo.id}
                                      >
                                        <button
                                          className="photo-open-button"
                                          type="button"
                                          onClick={() =>
                                            openMemberPhotoLightbox(photo)
                                          }
                                        >
                                          <img
                                            src={
                                              photo.thumbnailUrl ??
                                              photo.displayUrl ??
                                              ""
                                            }
                                            alt=""
                                          />
                                        </button>
                                        <div>
                                          <strong>
                                            {photo.contributionTitle}
                                          </strong>
                                          <span>
                                            {photo.caption ||
                                              photo.contributionDetail}
                                          </span>
                                          <small>
                                            {photo.sectionId ?? "No section"} ·{" "}
                                            {photo.photoModerationStatus} ·{" "}
                                            {new Date(
                                              photo.createdAt,
                                            ).toLocaleDateString()}
                                          </small>
                                        </div>
                                        <div className="profile-photo-actions">
                                          <button
                                            className="ghost-button ghost-button--compact"
                                            type="button"
                                            onClick={() => openPhotoOnMap(photo)}
                                          >
                                            <MapIcon size={15} />
                                            Map
                                          </button>
                                        </div>
                                      </article>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="source-note">
                                    This member has no uploaded photos.
                                  </p>
                                )}
                              </section>
                            </div>
                          ) : (
                            <p className="source-note">No member selected.</p>
                          )}
                        </>
                      ) : activeAdminPage === "moderation" ? (
                        <>
                          <div className="quick-add-panel__header">
                            <div>
                              <p className="eyebrow">Moderation</p>
                              <h2>Moderation queue</h2>
                            </div>
                            <button
                              className="ghost-button ghost-button--compact"
                              type="button"
                              onClick={openModerationPanel}
                            >
                              <RefreshCw size={15} />
                              Refresh
                            </button>
                          </div>
                          {moderationMessage ? (
                            <p className="profile-message">{moderationMessage}</p>
                          ) : null}
                          {isModerationLoading ? (
                            <p className="source-note">Loading moderation queue...</p>
                          ) : (
                            <div className="moderation-list">
                              <div
                                className="segmented-control moderation-tabs"
                                role="tablist"
                                aria-label="Moderation queue type"
                              >
                                <button
                                  className={moderationTab === "route-edits" ? "active" : ""}
                                  type="button"
                                  role="tab"
                                  aria-selected={moderationTab === "route-edits"}
                                  onClick={() => setModerationTab("route-edits")}
                                >
                                  <Route size={16} />
                                  Route edits
                                  <span>{moderationRouteAdjustments.length}</span>
                                </button>
                                <button
                                  className={
                                    moderationTab === "route-suggestions" ? "active" : ""
                                  }
                                  type="button"
                                  role="tab"
                                  aria-selected={moderationTab === "route-suggestions"}
                                  onClick={() => setModerationTab("route-suggestions")}
                                >
                                  <MapPinned size={16} />
                                  Suggestions
                                  <span>{moderationRouteSuggestions.length}</span>
                                </button>
                                <button
                                  className={
                                    moderationTab === "contributions" ? "active" : ""
                                  }
                                  type="button"
                                  role="tab"
                                  aria-selected={moderationTab === "contributions"}
                                  onClick={() => setModerationTab("contributions")}
                                >
                                  <Flag size={16} />
                                  Points
                                  <span>{moderationContributions.length}</span>
                                </button>
                                <button
                                  className={
                                    moderationTab === "corrections" ? "active" : ""
                                  }
                                  type="button"
                                  role="tab"
                                  aria-selected={moderationTab === "corrections"}
                                  onClick={() => setModerationTab("corrections")}
                                >
                                  <MessageSquare size={16} />
                                  Corrections
                                  <span>{moderationMapPoiReviews.length}</span>
                                </button>
                              </div>
                              {moderationTab === "contributions" && moderationContributionPhotoCount ? (
                                <p className="source-note">
                                  {moderationContributionPhotoCount} photo contribution
                                  {moderationContributionPhotoCount === 1 ? "" : "s"} in
                                  this queue.
                                </p>
                              ) : null}
                              {moderationTab === "contributions" ? (
                                <>
                              {moderationContributions.map((contribution) => {
                                const draftDecision =
                                  moderationDraftDecisions[contribution.id] ?? "";

                                return (
                                  <article
                                    className="moderation-row"
                                    key={contribution.id}
                                  >
                                    <div className="moderation-row__content">
                                      <strong>{contribution.title}</strong>
                                      <span className="moderation-row__meta">
                                        {contribution.type} ·{" "}
                                        {contributionStatusLabel(
                                          contribution.status,
                                        )}{" "}
                                        · {contribution.sectionId}
                                      </span>
                                      <p>{contribution.detail}</p>
                                      {contribution.photos?.length ? (
                                        <div className="moderation-photo-grid">
                                          {contribution.photos.map((photo) => (
                                            <div
                                              className="moderation-photo-card"
                                              key={photo.id}
                                            >
                                              <button
                                                className="photo-open-button"
                                                type="button"
                                                onClick={() =>
                                                  setLightboxPhoto({
                                                    src:
                                                      photo.displayUrl ||
                                                      photo.thumbnailUrl,
                                                    title:
                                                      photo.caption ||
                                                      contribution.title,
                                                    caption:
                                                      photo.originalName ||
                                                      contribution.detail,
                                                    alt:
                                                      photo.caption ||
                                                      contribution.title,
                                                  })
                                                }
                                              >
                                                <img
                                                  src={
                                                    photo.thumbnailUrl ||
                                                    photo.displayUrl
                                                  }
                                                  alt={
                                                    photo.caption ||
                                                    contribution.title
                                                  }
                                                />
                                              </button>
                                              <span>
                                                {photo.caption ||
                                                  photo.originalName ||
                                                  "Photo"}
                                              </span>
                                              <button
                                                className="ghost-button ghost-button--compact"
                                                type="button"
                                                onClick={() =>
                                                  requestDeletePhoto(
                                                    photo.id,
                                                    photo.caption ||
                                                      contribution.title,
                                                  )
                                                }
                                              >
                                                <Trash2 size={15} />
                                                Delete
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      ) : null}
                                      <small className="moderation-row__meta">
                                        {contribution.author} · observed{" "}
                                        {contribution.dateObserved}
                                      </small>
                                    </div>
                                    <div className="moderation-status">
                                      <span
                                        className={`status-chip status-chip--${contribution.status}`}
                                      >
                                        {contributionStatusLabel(
                                          contribution.status,
                                        )}
                                      </span>
                                    </div>
                                    <div className="moderation-actions">
                                      <label>
                                        <span>Decision</span>
                                        <select
                                          aria-label={`Moderation decision for ${contribution.title}`}
                                          value={draftDecision}
                                          onChange={(event) => {
                                            setModerationDraftDecisions(
                                              (current) => ({
                                                ...current,
                                                [contribution.id]: event.target
                                                  .value as ModerationDraftDecision,
                                              }),
                                            );
                                          }}
                                        >
                                          <option value="">Choose...</option>
                                          {moderationActions.map((action) => (
                                            <option
                                              key={action.decision}
                                              value={action.decision}
                                            >
                                              {action.label}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                      <button
                                        className="ghost-button ghost-button--compact moderation-apply-button"
                                        type="button"
                                        disabled={!draftDecision}
                                        onClick={() => {
                                          if (!draftDecision) {
                                            return;
                                          }
                                          void applyModerationDecision(
                                            contribution,
                                            draftDecision,
                                          );
                                        }}
                                      >
                                        Apply
                                      </button>
                                    </div>
                                  </article>
                                );
                              })}
                              {moderationContributions.length === 0 ? (
                                <p className="source-note">
                                  No point or photo contributions need moderation.
                                </p>
                              ) : null}
                                </>
                              ) : null}
                              {moderationTab === "corrections" ? (
                              moderationMapPoiReviews.length ? (
                                <>
                                  <div className="moderation-section-heading">
                                    <h3>Map point corrections</h3>
                                    <span>{moderationMapPoiReviews.length} items</span>
                                  </div>
                                  {moderationMapPoiReviews.map((review) => (
                                    <article
                                      className="moderation-row"
                                      key={review.id}
                                    >
                                      <div className="moderation-row__content">
                                        <strong>{review.poi.title}</strong>
                                        <span className="moderation-row__meta">
                                          {review.poi.kind} · {review.poi.sectionId}
                                        </span>
                                        <p>{review.note}</p>
                                        <small className="moderation-row__meta">
                                          Suggested by{" "}
                                          {review.reviewer.displayName ??
                                            review.reviewer.email ??
                                            "RiverLaunch.app member"}
                                        </small>
                                      </div>
                                      <div className="moderation-status">
                                        <span
                                          className={`status-chip status-chip--${review.poi.verificationStatus}`}
                                        >
                                          {review.poi.verificationStatus}
                                        </span>
                                      </div>
                                      <div className="moderation-actions">
                                        <button
                                          className="ghost-button ghost-button--compact"
                                          type="button"
                                          onClick={() =>
                                            void applyMapPoiVerificationStatus(
                                              review.poi,
                                              "confirmed",
                                            )
                                          }
                                        >
                                          Confirm point
                                        </button>
                                        <button
                                          className="ghost-button ghost-button--compact"
                                          type="button"
                                          onClick={() =>
                                            void applyMapPoiVerificationStatus(
                                              review.poi,
                                              "resolved",
                                            )
                                          }
                                        >
                                          Mark resolved
                                        </button>
                                      </div>
                                    </article>
                                  ))}
                                </>
                              ) : (
                                <p className="source-note">
                                  No map point corrections need moderation.
                                </p>
                              )
                              ) : null}
                              {moderationTab === "route-edits" ? (
                                  moderationRouteAdjustments.length ? (
                                    <>
                                      <div className="moderation-section-heading">
                                        <h3>Route edits</h3>
                                        <span>
                                          {moderationRouteAdjustments.length} items
                                        </span>
                                      </div>
                                      {moderationRouteAdjustments.map((adjustment) => {
                                        const draftDecision =
                                          routeAdjustmentDraftDecisions[
                                            adjustment.id
                                          ] ?? "";
                                        const impact = calculateRouteAdjustmentImpact(
                                          adjustment,
                                          appRiverSections,
                                          contributions,
                                        );

                                        return (
                                          <article
                                            className="moderation-row moderation-row--route-edit"
                                            key={adjustment.id}
                                          >
                                            <div className="moderation-row__content">
                                              <strong>{adjustment.sectionName}</strong>
                                              <span className="moderation-row__meta">
                                                Existing {adjustment.targetType === "section" ? "section" : "route candidate"} ·{" "}
                                                {adjustment.riverName} ·{" "}
                                                {adjustment.difficulty}
                                              </span>
                                              <p>{adjustment.summary}</p>
                                              <small className="moderation-row__meta">
                                                Evidence: {adjustment.evidence}
                                              </small>
                                              <small className="moderation-row__meta">
                                                Target {adjustment.targetId} ·{" "}
                                                {adjustment.route.length} route points ·{" "}
                                                edited by {adjustment.author}
                                              </small>
                                              <RouteAdjustmentImpactPanel
                                                impact={impact}
                                              />
                                            </div>
                                            <div className="moderation-status">
                                              <span className="status-chip">
                                                {routeAdjustmentStatusLabel(
                                                  adjustment.status,
                                                )}
                                              </span>
                                            </div>
                                            <div className="moderation-actions">
                                              <button
                                                className="ghost-button ghost-button--compact"
                                                type="button"
                                                onClick={() =>
                                                  openRouteAdjustmentOnMap(adjustment)
                                                }
                                              >
                                                <MapIcon size={15} />
                                                Map
                                              </button>
                                              <label>
                                                <span>Decision</span>
                                                <select
                                                  aria-label={`Route edit decision for ${adjustment.sectionName}`}
                                                  value={draftDecision}
                                                  onChange={(event) => {
                                                    setRouteAdjustmentDraftDecisions(
                                                      (current) => ({
                                                        ...current,
                                                        [adjustment.id]: event
                                                          .target
                                                          .value as RouteAdjustmentDraftDecision,
                                                      }),
                                                    );
                                                  }}
                                                >
                                                  <option value="">Choose...</option>
                                                  {routeAdjustmentActions.map((action) => (
                                                    <option
                                                      key={action.decision}
                                                      value={action.decision}
                                                    >
                                                      {action.label}
                                                    </option>
                                                  ))}
                                                </select>
                                              </label>
                                              <button
                                                className="ghost-button ghost-button--compact moderation-apply-button"
                                                type="button"
                                                disabled={!draftDecision}
                                                onClick={() => {
                                                  if (!draftDecision) {
                                                    return;
                                                  }
                                                  void applyRouteAdjustmentModerationDecision(
                                                    adjustment,
                                                    draftDecision,
                                                  );
                                                }}
                                              >
                                                Apply
                                              </button>
                                            </div>
                                          </article>
                                        );
                                      })}
                                    </>
                                  ) : (
                                    <p className="source-note">
                                      No route edits need moderation.
                                    </p>
                                  )
                              ) : null}
                              {moderationTab === "route-suggestions" ? (
                                  moderationRouteSuggestions.length ? (
                                    <>
                                      <div className="moderation-section-heading">
                                        <h3>Route suggestions</h3>
                                        <span>
                                          {moderationRouteSuggestions.length} items
                                        </span>
                                      </div>
                                  {moderationRouteSuggestions.map((suggestion) => {
                                    const draftDecision =
                                      routeModerationDraftDecisions[
                                        suggestion.id
                                      ] ?? "";

                                    return (
                                      <article
                                        className="moderation-row"
                                        key={suggestion.id}
                                      >
                                        <div className="moderation-row__content">
                                          <strong>{suggestion.sectionName}</strong>
                                          <span className="moderation-row__meta">
                                            {suggestion.riverName} ·{" "}
                                            {suggestion.difficulty} ·{" "}
                                            {routeSuggestionStatusLabel(
                                              suggestion.status,
                                            )}
                                          </span>
                                          <p>{suggestion.summary}</p>
                                          <small className="moderation-row__meta">
                                            Evidence: {suggestion.evidence}
                                          </small>
                                          <small className="moderation-row__meta">
                                            {suggestion.route.length} route points ·{" "}
                                            suggested by {suggestion.author}
                                          </small>
                                        </div>
                                        <div className="moderation-status">
                                          <span className="status-chip">
                                            {routeSuggestionStatusLabel(
                                              suggestion.status,
                                            )}
                                          </span>
                                        </div>
                                        <div className="moderation-actions">
                                          <button
                                            className="ghost-button ghost-button--compact"
                                            type="button"
                                            onClick={() =>
                                              openRouteSuggestionOnMap(suggestion)
                                            }
                                          >
                                            <MapIcon size={15} />
                                            Map
                                          </button>
                                          <button
                                            className="ghost-button ghost-button--compact"
                                            type="button"
                                            onClick={() =>
                                              startRouteSuggestionAdjustmentMode(
                                                suggestion,
                                              )
                                            }
                                          >
                                            <Route size={15} />
                                            Edit
                                          </button>
                                          <label>
                                            <span>Decision</span>
                                            <select
                                              aria-label={`Route moderation decision for ${suggestion.sectionName}`}
                                              value={draftDecision}
                                              onChange={(event) => {
                                                setRouteModerationDraftDecisions(
                                                  (current) => ({
                                                    ...current,
                                                    [suggestion.id]: event.target
                                                      .value as RouteModerationDraftDecision,
                                                  }),
                                                );
                                              }}
                                            >
                                              <option value="">Choose...</option>
                                              {routeSuggestionActions.map((action) => (
                                                <option
                                                  key={action.decision}
                                                  value={action.decision}
                                                >
                                                  {action.label}
                                                </option>
                                              ))}
                                            </select>
                                          </label>
                                          <button
                                            className="ghost-button ghost-button--compact moderation-apply-button"
                                            type="button"
                                            disabled={!draftDecision}
                                            onClick={() => {
                                              if (!draftDecision) {
                                                return;
                                              }
                                              void applyRouteModerationDecision(
                                                suggestion,
                                                draftDecision,
                                              );
                                            }}
                                          >
                                            Apply
                                          </button>
                                        </div>
                                      </article>
                                    );
                                  })}
                                    </>
                                  ) : (
                                    <p className="source-note">
                                      No route suggestions need moderation.
                                    </p>
                                  )
                              ) : null}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="placeholder-list">
                          <section className="profile-card profile-card--stacked">
                            <div className="block-title">
                              <div>
                                <h3>River level ingestion</h3>
                                <span>
                                  Manual refresh for provider-backed level,
                                  rainfall, and flow readings.
                                </span>
                              </div>
                              <span className="status-chip">
                                {latestObservationIngestionJob?.status ?? "not run"}
                              </span>
                            </div>
                            <p className="source-note">
                              This runs the same guarded ingestion endpoint that
                              Cloud Scheduler will call later. It is limited to
                              one run every 15 minutes.
                            </p>
                            <div className="inline-actions system-actions">
                              <button
                                className="primary-action system-action-button"
                                type="button"
                                disabled={
                                  isObservationIngestionRunning ||
                                  isObservationIngestionOnCooldown
                                }
                                onClick={() => void handleRunObservationIngestion()}
                              >
                                <RefreshCw size={16} />
                                {isObservationIngestionRunning
                                  ? "Refreshing..."
                                  : isObservationIngestionOnCooldown
                                    ? `Available in ${observationIngestionCooldownLabel}`
                                    : "Refresh river levels"}
                              </button>
                              <button
                                className="ghost-button system-action-button"
                                type="button"
                                disabled={isObservationJobsLoading}
                                onClick={() => void loadObservationJobs()}
                              >
                                <RefreshCw size={16} />
                                Refresh status
                              </button>
                            </div>
                            {observationJobMessage ? (
                              <p className="profile-message profile-message--neutral">
                                {observationJobMessage}
                              </p>
                            ) : null}
                          </section>

                          <section className="profile-card profile-card--stacked">
                            <div className="block-title">
                              <div>
                                <h3>Recent observation jobs</h3>
                                <span>{observationJobRuns.length} listed</span>
                              </div>
                            </div>
                            {isObservationJobsLoading ? (
                              <p className="source-note">Loading job status...</p>
                            ) : observationJobRuns.length ? (
                              <div className="placeholder-list">
                                {observationJobRuns.map((jobRun) => (
                                  <div
                                    className="placeholder-row system-job-row"
                                    key={jobRun.id}
                                  >
                                    <span>
                                      <strong>
                                        {jobRun.jobType.replace("observations.", "")}
                                      </strong>
                                      <small>
                                        {jobRun.status} ·{" "}
                                        {formatDateTime(jobRun.startedAt)} ·{" "}
                                        {jobRun.readingsFetched} fetched ·{" "}
                                        {jobRun.readingsInserted} inserted ·{" "}
                                        {jobRun.errorCount} errors
                                      </small>
                                    </span>
                                    <ShieldCheck size={18} />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="source-note">
                                No observation jobs have been recorded yet.
                              </p>
                            )}
                          </section>
                          <section className="profile-card profile-card--stacked">
                            <div className="block-title">
                              <div>
                                <h3>Waterway seed status</h3>
                                <span>
                                  {watercourseImportStatus.length
                                    ? `${watercourseImportStatus.length} source version${
                                        watercourseImportStatus.length === 1
                                          ? ""
                                          : "s"
                                      }`
                                    : "No status loaded"}
                                </span>
                              </div>
                            </div>
                            {isObservationJobsLoading ? (
                              <p className="source-note">Loading seed status...</p>
                            ) : watercourseImportStatus.length ? (
                              <div className="placeholder-list">
                                {watercourseImportStatus.map((status) => (
                                  <div
                                    className="placeholder-row system-job-row"
                                    key={`${status.source}:${status.sourceVersion}`}
                                  >
                                    <span>
                                      <strong>{status.sourceVersion}</strong>
                                      <small>
                                        {status.featureCount.toLocaleString()} waterways ·{" "}
                                        {status.namedFeatureCount.toLocaleString()} named ·{" "}
                                        {status.licence}
                                        {status.latestUpdatedAt
                                          ? ` · refreshed ${formatDateTime(
                                              status.latestUpdatedAt,
                                            )}`
                                          : ""}
                                      </small>
                                    </span>
                                    <Waves size={18} />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="source-note">
                                No OSM waterway import status has been recorded yet.
                              </p>
                            )}
                          </section>
                          {canManageMembers ? (
                            <button
                              className="placeholder-row"
                              type="button"
                              onClick={resetDemoContributions}
                            >
                              <span>
                                <strong>Reset demo data</strong>
                                <small>
                                  Clear this browser's local demo contributions,
                                  offline queue, and hazard confirmations.
                                </small>
                              </span>
                              <RotateCcw size={18} />
                            </button>
                          ) : null}
                        </div>
                      )}
                    </section>
                  )}
                </div>
              ) : (
                <div className="profile-message">Admin access is required.</div>
              )}
            </PlaceholderPage>
          )}
        </section>
      </section>

      <MobileBottomNav
        activeSection={activeAppSection}
        onSelectSection={setActiveAppSection}
      />

      {lightboxPhoto ? (
        <PhotoLightbox
          photo={lightboxPhoto}
          onClose={() => setLightboxPhoto(null)}
        />
      ) : null}

      {pendingPhotoDelete ? (
        <div className="auth-sheet-backdrop" role="presentation">
          <section
            className="confirm-panel confirm-panel--modal"
            role="dialog"
            aria-modal="true"
            aria-label="Delete photo"
          >
            <div>
              <p className="eyebrow">Delete photo</p>
              <h3>{pendingPhotoDelete.title}</h3>
              <p>
                Hide this photo from RiverLaunch.app? The audit record will be
                retained.
              </p>
            </div>
            <div className="form-actions">
              <button
                className="ghost-button"
                type="button"
                onClick={() => setPendingPhotoDelete(null)}
              >
                Cancel
              </button>
              <button
                className="submit-button"
                type="button"
                onClick={() => void handleDeletePhoto(pendingPhotoDelete.id)}
              >
                Delete
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {pendingPointDelete ? (
        <div className="auth-sheet-backdrop" role="presentation">
          <section
            className="confirm-panel confirm-panel--modal"
            role="dialog"
            aria-modal="true"
            aria-label="Delete point"
          >
            <div>
              <p className="eyebrow">Delete point</p>
              <h3>{pendingPointDelete.title}</h3>
              <p>
                Hide this point and any attached photos from RiverLaunch.app?
                The audit record will be retained.
              </p>
            </div>
            <div className="form-actions">
              <button
                className="ghost-button"
                type="button"
                onClick={() => setPendingPointDelete(null)}
              >
                Cancel
              </button>
              <button
                className="submit-button"
                type="button"
                onClick={() => void handleDeletePoint(pendingPointDelete.id)}
              >
                Delete
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {authSheetMode ? (
        <AuthPromptSheet
          mode={authSheetMode}
          authMessage={authMessage || authState.error || ""}
          isAuthConfigured={isAuthConfigured}
          onGoogleAuth={handleGoogleSignIn}
          onCreateEmailAccount={handleCreateEmailAccount}
          onEmailSignIn={handleEmailSignIn}
          onPasswordReset={handlePasswordReset}
          onContinueAsGuest={continueAsGuest}
          onClose={closeAuthSheet}
        />
      ) : null}
    </main>
  );
}

function RiverMap({
  sections,
  activeSection,
  mapPois,
  contributions,
  routeSuggestions,
  routeAdjustments,
  routeSuggestionFocusId,
  routeSuggestionFocusNonce,
  routeAdjustmentFocusId,
  routeAdjustmentFocusNonce,
  outboxRecords,
  selectedLocation,
  routeDraftPoints,
  liveLocation,
  liveLocationFocusNonce,
  searchFocusLocation,
  searchFocusLabel,
  showSearchFocusMarker,
  searchFocusNonce,
  isAddMode,
  routeCreateMode,
  showRoutesLayer,
  showSelectedRoutePath,
  showKnownRivers,
  watercourseFocusId,
  watercourseFocusNonce,
  onMapClick,
  onMoveRouteDraftPoint,
  focusNonce,
  onOpenPoiDetails,
  onOpenRouteDetails,
  onOpenPhoto,
  onSelectSection,
}: {
  sections: RiverSection[];
  activeSection: RiverSection;
  mapPois: MapPoi[];
  contributions: Contribution[];
  routeSuggestions: RouteSuggestion[];
  routeAdjustments: RouteAdjustment[];
  routeSuggestionFocusId: string | null;
  routeSuggestionFocusNonce: number;
  routeAdjustmentFocusId: string | null;
  routeAdjustmentFocusNonce: number;
  outboxRecords: ContributionOutboxRecord[];
  selectedLocation: LatLngTuple | null;
  routeDraftPoints: LatLngTuple[];
  liveLocation: LiveLocationSnapshot | null;
  liveLocationFocusNonce: number;
  searchFocusLocation: LatLngTuple | null;
  searchFocusLabel: string;
  showSearchFocusMarker: boolean;
  searchFocusNonce: number;
  isAddMode: boolean;
  routeCreateMode: RouteCreateMode;
  showRoutesLayer: boolean;
  showSelectedRoutePath: boolean;
  showKnownRivers: boolean;
  watercourseFocusId: string | null;
  watercourseFocusNonce: number;
  onMapClick: (
    location: LatLngTuple,
    nextType?: ContributionType,
    label?: string,
  ) => void;
  onMoveRouteDraftPoint: (index: number, location: LatLngTuple) => void;
  focusNonce: number;
  onOpenPoiDetails: (poi: SelectedPoi) => void;
  onOpenRouteDetails: (section: RiverSection) => void;
  onOpenPhoto: (photo: PhotoLightboxItem) => void;
  onSelectSection: (section: RiverSection) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const callbackRef = useRef(onSelectSection);
  const mapClickRef = useRef(onMapClick);
  const moveRouteDraftPointRef = useRef(onMoveRouteDraftPoint);
  const poiDetailsRef = useRef(onOpenPoiDetails);
  const routeDetailsRef = useRef(onOpenRouteDetails);
  const previousSectionIdRef = useRef(activeSection.id);
  const previousFocusNonceRef = useRef(focusNonce);
  const previousSearchFocusNonceRef = useRef(searchFocusNonce);
  const previousRouteSuggestionFocusNonceRef = useRef(routeSuggestionFocusNonce);
  const previousRouteAdjustmentFocusNonceRef = useRef(routeAdjustmentFocusNonce);
  const previousLiveLocationFocusNonceRef = useRef(liveLocationFocusNonce);
  const previousWatercourseFocusNonceRef = useRef(watercourseFocusNonce);
  const shouldFitActiveSectionRef = useRef(true);
  const knownWatercoursesRequestRef = useRef(0);
  const [knownWatercourses, setKnownWatercourses] = useState<KnownWatercourse[]>(
    [],
  );
  const [knownWatercourseStatus, setKnownWatercourseStatus] = useState("");
  const [selectedWatercourseId, setSelectedWatercourseId] = useState<string | null>(
    null,
  );
  const outboxByContributionId = useMemo(
    () =>
      new Map(
        outboxRecords.map((record) => [record.contribution.id, record] as const),
      ),
    [outboxRecords],
  );
  const selectedWatercourse = useMemo(
    () =>
      selectedWatercourseId
        ? knownWatercourses.find(
            (watercourse) => watercourse.id === selectedWatercourseId,
          ) ?? null
        : null,
    [knownWatercourses, selectedWatercourseId],
  );
  const selectedWatercoursePois = useMemo(
    () =>
      selectedWatercourse
        ? collectWatercourseContextPois(
            selectedWatercourse,
            mapPois,
            contributions,
            sections,
          )
        : [],
    [contributions, mapPois, sections, selectedWatercourse],
  );
  const selectedWatercourseSections = useMemo(
    () =>
      selectedWatercourse
        ? collectWatercourseContextSections(selectedWatercourse, sections)
        : [],
    [sections, selectedWatercourse],
  );

  useEffect(() => {
    callbackRef.current = onSelectSection;
  }, [onSelectSection]);

  useEffect(() => {
    mapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    moveRouteDraftPointRef.current = onMoveRouteDraftPoint;
  }, [onMoveRouteDraftPoint]);

  useEffect(() => {
    poiDetailsRef.current = onOpenPoiDetails;
  }, [onOpenPoiDetails]);

  useEffect(() => {
    routeDetailsRef.current = onOpenRouteDetails;
  }, [onOpenRouteDetails]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(mapContainerRef.current, {
      center: [52.6, -2.9],
      zoom: 6,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a>',
      maxZoom: 18,
    }).addTo(map);

    L.control.zoom({ position: "bottomleft" }).addTo(map);
    map.on("click", (event) => {
      mapClickRef.current(
        [event.latlng.lat, event.latlng.lng],
        undefined,
        "New map contribution",
      );
    });

    const layers = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerRef.current = layers;

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        if (mapRef.current === map && map.getContainer().isConnected) {
          map.invalidateSize();
        }
      });
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    if (!showKnownRivers) {
      setKnownWatercourses([]);
      setKnownWatercourseStatus("");
      setSelectedWatercourseId(null);
      return;
    }

    let isCancelled = false;
    let timeoutId = 0;

    const loadWatercourses = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        const bounds = map.getBounds();
        const requestId = knownWatercoursesRequestRef.current + 1;
        knownWatercoursesRequestRef.current = requestId;
        setKnownWatercourseStatus("Loading known rivers...");

        void fetchWatercoursesForBounds(
          {
            minLng: bounds.getWest(),
            minLat: bounds.getSouth(),
            maxLng: bounds.getEast(),
            maxLat: bounds.getNorth(),
          },
          map.getZoom(),
        )
          .then((watercourses) => {
            if (
              isCancelled ||
              knownWatercoursesRequestRef.current !== requestId
            ) {
              return;
            }

            setKnownWatercourses(watercourses);
            setKnownWatercourseStatus(
              watercourses.length
                ? `${watercourses.length} known river lines in view`
                : "No known river lines in this view",
            );
          })
          .catch(() => {
            if (
              isCancelled ||
              knownWatercoursesRequestRef.current !== requestId
            ) {
              return;
            }

            setKnownWatercourses([]);
            setKnownWatercourseStatus("Known rivers unavailable in this view");
          });
      }, 180);
    };

    loadWatercourses();
    map.on("moveend zoomend", loadWatercourses);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
      map.off("moveend zoomend", loadWatercourses);
    };
  }, [showKnownRivers]);

  useEffect(() => {
    if (
      selectedWatercourseId &&
      !knownWatercourses.some(
        (watercourse) => watercourse.id === selectedWatercourseId,
      )
    ) {
      setSelectedWatercourseId(null);
    }
  }, [knownWatercourses, selectedWatercourseId]);

  useEffect(() => {
    if (
      !watercourseFocusId ||
      previousWatercourseFocusNonceRef.current === watercourseFocusNonce
    ) {
      return;
    }

    const matchedWatercourse = knownWatercourses.find(
      (watercourse) => watercourse.id === watercourseFocusId,
    );

    if (!matchedWatercourse) {
      return;
    }

    previousWatercourseFocusNonceRef.current = watercourseFocusNonce;
    setSelectedWatercourseId(matchedWatercourse.id);
  }, [knownWatercourses, watercourseFocusId, watercourseFocusNonce]);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layerRef.current;

    if (!map || !layers) {
      return;
    }

    layers.clearLayers();

    if (showKnownRivers) {
      const knownRiverColour = readCssColourToken(
        "--known-river",
        KNOWN_RIVER_FALLBACK_COLOUR,
      );

      knownWatercourses.forEach((watercourse) => {
        watercourse.routes.forEach((route) => {
          L.polyline(route, {
            color: knownRiverColour,
            dashArray: "4 5",
            interactive: false,
            opacity: 0.7,
            weight: 2,
          }).addTo(layers);

          const hitTarget = L.polyline(route, {
            color: "#000",
            interactive: true,
            opacity: 0,
            weight: 18,
          }).addTo(layers);

          hitTarget.on("click", (event) => {
            L.DomEvent.stop(event.originalEvent);

            if (isAddMode || routeCreateMode === "tracing") {
              mapClickRef.current(
                [event.latlng.lat, event.latlng.lng],
                undefined,
                routeCreateMode === "tracing"
                  ? "New route point"
                  : "New map contribution",
              );
              return;
            }

            setSelectedWatercourseId(watercourse.id);
          });
        });
      });

    }

    const renderedSections = showRoutesLayer
      ? sections.filter(
          (section) => section.id !== activeSection.id || showSelectedRoutePath,
        )
      : [];
    let clickedRouteLine: L.Polyline | null = null;
    const routeLineDefaults = new Map<L.Polyline, L.PolylineOptions>();

    renderedSections.forEach((section) => {
      const isActive = section.id === activeSection.id;
      const isCandidate = isCandidateSection(section);
      const color =
        isCandidate
          ? "#7c3aed"
          : section.levelBand === "good"
          ? "#1f8a70"
          : section.levelBand === "high"
            ? "#b54708"
            : section.levelBand === "too-low"
              ? "#7c5c1d"
              : "#52606d";
      const defaultRouteStyle: L.PolylineOptions = {
        color,
        weight: isActive ? 4 : 3,
        opacity: isActive ? 0.5 : 0.26,
        dashArray: isCandidate ? "8 6" : undefined,
      };
      const highlightedRouteStyle: L.PolylineOptions = {
        ...defaultRouteStyle,
        weight: 7,
        opacity: 0.95,
      };

      const routeLine = L.polyline(section.route, defaultRouteStyle).addTo(layers);
      routeLineDefaults.set(routeLine, defaultRouteStyle);
      const routePopup = createMapPopupContent({
        title: section.sectionName,
        subtitle: section.riverName,
        summary: section.summary,
        detailsLabel: "Details",
        selectLabel: "Select route",
        onDetails: () => routeDetailsRef.current(section),
        onSelect: () => callbackRef.current(section),
      });

      routeLine.bindPopup(routePopup);
      routeLine.on("mouseover", () => routeLine.setStyle(highlightedRouteStyle));
      routeLine.on("mouseout", () => {
        if (clickedRouteLine !== routeLine) {
          routeLine.setStyle(defaultRouteStyle);
        }
      });

      routeLine.on("click", (event) => {
        L.DomEvent.stop(event.originalEvent);

        if (isAddMode || routeCreateMode === "tracing") {
          mapClickRef.current(
            [event.latlng.lat, event.latlng.lng],
            undefined,
            routeCreateMode === "tracing"
              ? "New route point"
              : "New map contribution",
          );
          return;
        }

        if (clickedRouteLine && clickedRouteLine !== routeLine) {
          clickedRouteLine.setStyle(
            routeLineDefaults.get(clickedRouteLine) ?? {},
          );
        }
        clickedRouteLine = routeLine;
        routeLine.setStyle(highlightedRouteStyle);
        routeLine.openPopup(event.latlng);
      });

      routeLine.on("popupclose", () => {
        if (clickedRouteLine === routeLine) {
          clickedRouteLine = null;
          routeLine.setStyle(defaultRouteStyle);
        }
      });

      const sectionMarker = L.marker(section.centre, {
        bubblingMouseEvents: false,
        icon: L.divIcon({
          className: "",
          html: markerHtml(
            isActive && isCandidate
              ? "section-candidate-active"
              : isActive
                ? "section-active"
                : isCandidate
                  ? "section-candidate"
                  : "section",
            isCandidate ? "C" : "R",
          ),
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
      });

      sectionMarker
        .addTo(layers)
        .bindPopup(
          createMapPopupContent({
            title: section.sectionName,
            subtitle: section.riverName,
            summary: section.summary,
            detailsLabel: "Details",
            selectLabel: "Select route",
            onDetails: () => routeDetailsRef.current(section),
            onSelect: () => callbackRef.current(section),
          }),
        )
        .on("click", (event) => {
          L.DomEvent.stop(event.originalEvent);
          sectionMarker.openPopup();
        });

      mapPois
        .filter((poi) => poi.sectionId === section.id)
        .forEach((poi) => {
        const markerLabel =
          poi.kind === "hazard"
            ? "!"
            : poi.kind === "feature"
              ? "*"
              : poi.kind === "gauge"
                ? "~"
                : readPayloadString(poi.payload, "accessType") === "put-in"
                  ? "I"
                  : "O";
        const markerSize = poi.kind === "hazard" ? 30 : poi.kind === "feature" ? 26 : 28;
        const marker = L.marker(poi.location, {
          bubblingMouseEvents: false,
          icon: L.divIcon({
            className: "",
            html: markerHtml(poi.kind, markerLabel),
            iconSize: [markerSize, markerSize],
            iconAnchor: [markerSize / 2, markerSize / 2],
          }),
        });

        marker
          .addTo(layers)
          .bindPopup(
            createMapPopupContent({
              title: poi.title,
              subtitle: poi.subtitle,
              summary: poi.summary,
              navigationLocation: poi.location,
              navigationLabel: poi.kind === "access" ? "Directions" : "Maps",
              navigationMode: poi.kind === "access" ? "directions" : "map",
              onDetails: () =>
                poiDetailsRef.current(mapPoiToSelectedPoi(poi, section)),
            }),
          )
          .on("click", (event) => {
            L.DomEvent.stop(event.originalEvent);
            marker.openPopup();
          });
      });
    });

    routeSuggestions.forEach((suggestion) => {
      if (suggestion.status === "approved" || suggestion.route.length < 2) {
        return;
      }

      const isFocusedRouteSuggestion = suggestion.id === routeSuggestionFocusId;
      const line = L.polyline(suggestion.route, {
        color: "#7c3aed",
        dashArray: "6 6",
        opacity: isFocusedRouteSuggestion ? 0.95 : 0.78,
        weight: isFocusedRouteSuggestion ? 7 : 5,
      }).addTo(layers);

      line.bindPopup(createRouteSuggestionPopup(suggestion));

      const startMarker = L.marker(suggestion.route[0], {
        bubblingMouseEvents: false,
        icon: L.divIcon({
          className: "",
          html: markerHtml("route-draft", "S"),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(layers);
      startMarker.bindPopup(createRouteSuggestionPopup(suggestion));

      const finish = suggestion.route[suggestion.route.length - 1];
      const finishMarker = L.marker(finish, {
        bubblingMouseEvents: false,
        icon: L.divIcon({
          className: "",
          html: markerHtml("route-draft", "F"),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(layers);
      finishMarker.bindPopup(createRouteSuggestionPopup(suggestion));
    });

    routeAdjustments.forEach((adjustment) => {
      if (adjustment.route.length < 2) {
        return;
      }

      const isFocusedRouteAdjustment = adjustment.id === routeAdjustmentFocusId;
      const line = L.polyline(adjustment.route, {
        color: "#0f766e",
        dashArray: "10 5",
        opacity: isFocusedRouteAdjustment ? 0.98 : 0.82,
        weight: isFocusedRouteAdjustment ? 8 : 5,
      }).addTo(layers);

      line.bindPopup(createRouteAdjustmentPopup(adjustment));

      const startMarker = L.marker(adjustment.route[0], {
        bubblingMouseEvents: false,
        icon: L.divIcon({
          className: "",
          html: markerHtml("route-edit", "E"),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(layers);
      startMarker.bindPopup(createRouteAdjustmentPopup(adjustment));

      const finish = adjustment.route[adjustment.route.length - 1];
      const finishMarker = L.marker(finish, {
        bubblingMouseEvents: false,
        icon: L.divIcon({
          className: "",
          html: markerHtml("route-edit", "F"),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(layers);
      finishMarker.bindPopup(createRouteAdjustmentPopup(adjustment));
    });

    contributions.forEach((contribution) => {
      if (!contribution.location) {
        return;
      }

      const syncStatus = outboxByContributionId.get(contribution.id)?.syncStatus;
      const kind =
        syncStatus === "failed"
          ? "failed"
          : syncStatus && syncStatus !== "synced"
            ? "queued"
            : contribution.type === "hazard"
              ? "hazard"
              : "community";
      const label =
        contribution.type === "hazard"
          ? "!"
          : contribution.type === "photo"
            ? "P"
            : contribution.type === "feature"
              ? "*"
              : contribution.type === "access"
                ? "A"
                : "N";
      const popupPhoto =
        contribution.type === "photo" ? contribution.photos?.[0] : undefined;
      const popupPhotoUrl = popupPhoto?.thumbnailUrl || popupPhoto?.displayUrl;
      const popupPhotoDisplayUrl = popupPhoto?.displayUrl || popupPhotoUrl;
      const popupPhotoTitle = popupPhoto?.caption || contribution.title;

      const marker = L.marker(contribution.location, {
        bubblingMouseEvents: false,
        icon: L.divIcon({
          className: "",
          html: markerHtml(kind, label),
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
      });

      marker
        .addTo(layers)
        .bindPopup(
          createMapPopupContent({
            title: contribution.title,
            subtitle: `${contribution.type} · ${contributionStatusLabel(contribution.status)}`,
            summary: contribution.detail,
            imageUrl: popupPhotoUrl,
            imageAlt: popupPhotoTitle,
            onImageClick:
              popupPhotoDisplayUrl
                ? () =>
                    onOpenPhoto({
                      src: popupPhotoDisplayUrl,
                      title: popupPhotoTitle,
                      caption: popupPhoto?.originalName || contribution.detail,
                      alt: popupPhotoTitle,
                    })
                : undefined,
            navigationLocation: contribution.location,
            onDetails: () =>
              poiDetailsRef.current({
                id: contribution.id,
                kind: "contribution",
                title: contribution.title,
                subtitle: `${contribution.type} · ${contribution.category}`,
                summary: contribution.detail,
                sectionLabel:
                  sections.find((section) => section.id === contribution.sectionId)
                    ?.sectionName ?? activeSection.sectionName,
                location: contribution.location!,
                status: contribution.status,
                sourceLabel: contribution.author,
                sourceConfidence: "community",
                navigationLocation: contribution.location!,
                what3words: contribution.what3words,
                syncStatus,
                photos: contribution.photos,
                category: contribution.category,
                author: contribution.author,
                dateObserved: contribution.dateObserved,
                createdAt: contribution.createdAt,
                contributionType: contribution.type,
              }),
          }),
        )
        .on("click", (event) => {
          L.DomEvent.stop(event.originalEvent);
          marker.openPopup();
        });
    });

    if (searchFocusLocation && showSearchFocusMarker) {
      L.marker(searchFocusLocation, {
        icon: L.divIcon({
          className: "",
          html: markerHtml("search", "S"),
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
      })
        .addTo(layers)
        .bindPopup(
          createSearchedLocationPopup(searchFocusLocation, searchFocusLabel),
        );
    }

    if (liveLocation) {
      if (liveLocation.accuracyMeters) {
        L.circle(liveLocation.location, {
          radius: liveLocation.accuracyMeters,
          color: "#277da1",
          fillColor: "#277da1",
          fillOpacity: 0.08,
          interactive: false,
          weight: 1,
        }).addTo(layers);
      }

      L.marker(liveLocation.location, {
        bubblingMouseEvents: false,
        icon: L.divIcon({
          className: "",
          html: markerHtml("user-location", ""),
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
      })
        .addTo(layers)
        .bindPopup(createLiveLocationPopup(liveLocation));
    }

    if (selectedLocation) {
      L.marker(selectedLocation, {
        icon: L.divIcon({
          className: "",
          html: markerHtml("draft", "+"),
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
      })
        .addTo(layers);
    }

    if (routeDraftPoints.length) {
      if (routeDraftPoints.length >= 2) {
        L.polyline(routeDraftPoints, {
          color: "#7c3aed",
          dashArray: "7 7",
          opacity: 0.95,
          weight: 5,
        }).addTo(layers);
      }

      routeDraftPoints.forEach((point, index) => {
        const isLast = index === routeDraftPoints.length - 1;
        const draftMarker = L.marker(point, {
          bubblingMouseEvents: false,
          draggable: routeCreateMode === "tracing",
          icon: L.divIcon({
            className: "",
            html: markerHtml(
              isLast ? "route-draft-active" : "route-draft",
              String(index + 1),
            ),
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          }),
        }).addTo(layers);

        draftMarker.on("dragend", () => {
          const nextLocation = draftMarker.getLatLng();
          moveRouteDraftPointRef.current(index, [
            nextLocation.lat,
            nextLocation.lng,
          ]);
        });
      });
    }

    if (showKnownRivers && selectedWatercourse) {
      const selectedColour = readCssColourToken(
        "--selected-watercourse",
        SELECTED_WATERCOURSE_FALLBACK_COLOUR,
      );

      selectedWatercourse.routes.forEach((route) => {
        L.polyline(route, {
          color: selectedColour,
          interactive: false,
          opacity: 0.98,
          weight: 6,
        }).addTo(layers);
      });
    }

    if (
      previousFocusNonceRef.current !== focusNonce ||
      previousSearchFocusNonceRef.current !== searchFocusNonce ||
      previousRouteSuggestionFocusNonceRef.current !== routeSuggestionFocusNonce ||
      previousRouteAdjustmentFocusNonceRef.current !== routeAdjustmentFocusNonce
    ) {
      shouldFitActiveSectionRef.current = true;
    }

    if (shouldFitActiveSectionRef.current) {
      const bounds = routeEndpointBounds(activeSection.route);
      let rafId = 0;
      let didFit = false;
      const timeoutIds: number[] = [];
      const fitRoute = (attempt = 0) => {
        if (mapRef.current !== map || !map.getContainer().isConnected) {
          return;
        }

        const container = map.getContainer();
        if ((container.clientWidth === 0 || container.clientHeight === 0) && attempt < 4) {
          timeoutIds.push(window.setTimeout(() => fitRoute(attempt + 1), 80));
          return;
        }

        map.invalidateSize();
        const focusedRouteSuggestion =
          routeSuggestionFocusId && previousRouteSuggestionFocusNonceRef.current !== routeSuggestionFocusNonce
            ? routeSuggestions.find(
                (suggestion) => suggestion.id === routeSuggestionFocusId,
              )
            : null;
        const focusedRouteAdjustment =
          routeAdjustmentFocusId && previousRouteAdjustmentFocusNonceRef.current !== routeAdjustmentFocusNonce
            ? routeAdjustments.find(
                (adjustment) => adjustment.id === routeAdjustmentFocusId,
              )
            : null;

        if (focusedRouteAdjustment?.route.length) {
          map.fitBounds(L.latLngBounds(focusedRouteAdjustment.route), {
            animate: false,
            maxZoom: 14,
            paddingTopLeft: [48, 84],
            paddingBottomRight: [48, 96],
          });
        } else if (focusedRouteSuggestion?.route.length) {
          map.fitBounds(L.latLngBounds(focusedRouteSuggestion.route), {
            animate: false,
            maxZoom: 14,
            paddingTopLeft: [48, 84],
            paddingBottomRight: [48, 96],
          });
        } else if (searchFocusLocation) {
          map.setView(searchFocusLocation, SEARCH_FOCUS_ZOOM, {
            animate: false,
          });
        } else {
          map.fitBounds(bounds, {
            animate: false,
            maxZoom: 13,
            paddingTopLeft: [48, 84],
            paddingBottomRight: [48, 96],
          });
        }
        didFit = true;
        shouldFitActiveSectionRef.current = false;
        previousSectionIdRef.current = activeSection.id;
        previousFocusNonceRef.current = focusNonce;
        previousSearchFocusNonceRef.current = searchFocusNonce;
        previousRouteSuggestionFocusNonceRef.current = routeSuggestionFocusNonce;
        previousRouteAdjustmentFocusNonceRef.current = routeAdjustmentFocusNonce;
      };
      rafId = window.requestAnimationFrame(fitRoute);
      [80, 180, 360].forEach((delay) => {
        timeoutIds.push(window.setTimeout(fitRoute, delay));
      });

      return () => {
        window.cancelAnimationFrame(rafId);
        timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
        if (!didFit) {
          shouldFitActiveSectionRef.current = true;
        }
      };
    }

    previousSectionIdRef.current = activeSection.id;
    previousFocusNonceRef.current = focusNonce;
    previousSearchFocusNonceRef.current = searchFocusNonce;
    previousRouteSuggestionFocusNonceRef.current = routeSuggestionFocusNonce;
    previousRouteAdjustmentFocusNonceRef.current = routeAdjustmentFocusNonce;
  }, [
    activeSection,
    contributions,
    focusNonce,
    liveLocation,
    mapPois,
    knownWatercourses,
    outboxByContributionId,
    routeAdjustments,
    routeAdjustmentFocusId,
    routeAdjustmentFocusNonce,
    searchFocusLocation,
    showSearchFocusMarker,
    searchFocusNonce,
    selectedLocation,
    selectedWatercourse,
    isAddMode,
    routeCreateMode,
    routeDraftPoints,
    routeSuggestionFocusId,
    routeSuggestionFocusNonce,
    routeSuggestions,
    sections,
    showRoutesLayer,
    showSelectedRoutePath,
    showKnownRivers,
    onOpenPhoto,
  ]);

  useEffect(() => {
    const map = mapRef.current;

    if (
      !map ||
      !liveLocation ||
      previousLiveLocationFocusNonceRef.current === liveLocationFocusNonce
    ) {
      return;
    }

    previousLiveLocationFocusNonceRef.current = liveLocationFocusNonce;
    map.invalidateSize();
    map.setView(liveLocation.location, LIVE_LOCATION_FOCUS_ZOOM, {
      animate: false,
    });
  }, [liveLocationFocusNonce, liveLocation]);

  function openWatercoursePoi(poi: WatercourseContextPoi) {
    if (poi.kind === "contribution") {
      const contribution = contributions.find((item) => item.id === poi.id);

      if (!contribution) {
        return;
      }

      poiDetailsRef.current(
        contributionToSelectedPoi(
          contribution,
          poi.section,
          outboxByContributionId.get(contribution.id)?.syncStatus,
        ),
      );
      return;
    }

    const mapPoi =
      mapPois.find((item) => item.id === poi.id) ??
      fallbackMapPoisForSection(poi.section).find((item) => item.id === poi.id);

    if (!mapPoi) {
      return;
    }

    poiDetailsRef.current(mapPoiToSelectedPoi(mapPoi, poi.section));
  }

  const selectedWatercourseHintRows = selectedWatercourse
    ? watercourseHintRows(selectedWatercourse)
    : [];

  return (
    <section className="map-stage" aria-label="River map">
      <div className="map-canvas" ref={mapContainerRef} />
      {selectedWatercourse ? (
        <aside
          className="watercourse-panel"
          aria-label="Selected waterway stretch"
        >
          <div className="watercourse-panel__header">
            <div>
              <p className="eyebrow">Local stretch</p>
              <h2>{selectedWatercourse.name ?? "Unnamed waterway"}</h2>
            </div>
            <button
              className="icon-button icon-button--compact"
              type="button"
              aria-label="Close waterway details"
              title="Close"
              onClick={() => setSelectedWatercourseId(null)}
            >
              <X size={16} />
            </button>
          </div>

          <div className="watercourse-panel__summary">
            <span>{watercourseTypeLabel(selectedWatercourse.watercourseType)}</span>
            <span>
              {watercourseRouteDistanceKm(selectedWatercourse).toFixed(1)} km in view
            </span>
            <span>{selectedWatercourse.source.sourceVersion}</span>
          </div>

          <p className="source-note">
            OSM waterway geometry is local map context only. It does not confirm
            paddleability, access, grade, hazards, or current conditions.
          </p>

          {selectedWatercourseHintRows.length ? (
            <dl className="watercourse-hints">
              {selectedWatercourseHintRows.slice(0, 6).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="watercourse-context">
            <h3>Routes near this stretch</h3>
            {selectedWatercourseSections.length ? (
              <div className="watercourse-list">
                {selectedWatercourseSections.map(({ section, distanceM }) => (
                  <button
                    className="watercourse-list-row"
                    key={section.id}
                    type="button"
                    onClick={() => callbackRef.current(section)}
                  >
                    <span>
                      <strong>{section.sectionName}</strong>
                      <small>
                        {section.riverName} · {formatDistanceMetres(distanceM)}
                      </small>
                    </span>
                    <Route size={15} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-state">No RiverLaunch routes near this visible stretch yet.</p>
            )}
          </div>

          <div className="watercourse-context">
            <h3>Points near this stretch</h3>
            {selectedWatercoursePois.length ? (
              <div className="watercourse-list">
                {selectedWatercoursePois.map((poi) => (
                  <button
                    className="watercourse-list-row"
                    key={`${poi.kind}:${poi.id}`}
                    type="button"
                    onClick={() => openWatercoursePoi(poi)}
                  >
                    <span>
                      <strong>{poi.title}</strong>
                      <small>
                        {routeImpactPoiLabel(poi.kind)} ·{" "}
                        {formatDistanceMetres(poi.distanceM)}
                      </small>
                    </span>
                    <MapPin size={15} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-state">No POIs close to this visible stretch yet.</p>
            )}
          </div>
        </aside>
      ) : null}
      <div className="map-legend" aria-label="Map legend">
        {showKnownRivers ? (
          <span title={knownWatercourseStatus || undefined}>
            <i className="legend-line legend-line--known-river" /> Known rivers
            {knownWatercourseStatus ? (
              <small className="map-legend__status">
                {knownWatercourseStatus}
              </small>
            ) : null}
          </span>
        ) : null}
        <span>
          <i className="legend-dot legend-dot--section" /> Section
        </span>
        <span>
          <i className="legend-dot legend-dot--access" /> Access
        </span>
        <span>
          <i className="legend-dot legend-dot--hazard" /> Hazard
        </span>
        <span>
          <i className="legend-dot legend-dot--gauge" /> Gauge
        </span>
      </div>
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Navigation;
  label: string;
  value: string;
}) {
  return (
    <div className="metric">
      <Icon size={17} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default App;
