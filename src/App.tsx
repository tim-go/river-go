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
  Waves,
  X,
} from "lucide-react";
import L from "leaflet";
import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { riverSections } from "./data/demoData";
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
  signInWithGoogle,
  signOutCurrentUser,
  subscribeToAuthState,
  type AuthState,
} from "./services/firebaseAuth";
import {
  fetchAdminMembers,
  fetchCurrentMember,
  updateAdminMemberAccess,
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
  deletePhoto,
  fetchMyPhotos,
  type MemberPhoto,
} from "./services/photoApi";
import {
  fetchCoordinatesForWhat3Words,
  fetchWhat3WordsAddress,
  formatWhat3Words,
  googleMapsDirectionsUrl,
  googleMapsSearchUrl,
} from "./services/locationReferences";
import type {
  Contribution,
  ContributionPhoto,
  ContributionOutboxRecord,
  ContributionSyncStatus,
  ContributionType,
  HazardSeverity,
  HazardReview,
  LatLngTuple,
  LiveGaugeReading,
  RiverSection,
} from "./types";

const STORAGE_KEY = "river-go-demo-contributions";
const HAZARD_REVIEW_STORAGE_KEY = "river-go-demo-hazard-reviews";
const FAVOURITES_STORAGE_KEY = "river-go-demo-favourite-sections";
const WELCOME_SESSION_STORAGE_KEY = "riverlaunch-welcome-dismissed-session";
const SYNC_BANNER_DISMISSAL_STORAGE_KEY = "riverlaunch-sync-banner-dismissal";
const SYNC_BANNER_DISMISS_MS = 60 * 60 * 1000;
const SEARCH_FOCUS_ZOOM = 15;
const NEARBY_POI_MAX_KM = 5;

const bandLabels = {
  "too-low": "Too low",
  good: "Good",
  high: "High",
  unknown: "Unknown",
};

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

type AppSection = "search" | "map" | "favourites" | "profile" | "more" | "admin";
type AdminPage = "index" | "members" | "moderation" | "system";
type AuthSheetMode = "welcome" | "save-required";
type SearchMode = "name" | "point";

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
  { decision: "challenge", label: "Challenge" },
  { decision: "hide", label: "Hide" },
  { decision: "reject", label: "Reject" },
];

type MemberRoleFilter = "all" | MemberRole;
type MemberTrustFilter = "all" | MemberTrustLevel;
type ModerationDraftDecision = ModerationDecision | "";
type PendingPhotoDelete = { id: string; title: string };
type PendingPointDelete = { id: string; title: string };
type SyncBannerDismissal = {
  queuedOutboxCount: number;
  failedOutboxCount: number;
  expiresAt: number;
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
type LocationSearchResult = {
  label: string;
  location: LatLngTuple;
  nearestPlace?: string;
  country?: string;
  focusSection?: RiverSection;
  pois: NearbyPoiResult[];
};

interface SelectedPoi {
  id: string;
  kind: "access" | "hazard" | "feature" | "gauge" | "contribution";
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
}

const appNavItems: Array<{
  id: AppSection;
  label: string;
  icon: typeof Search;
}> = [
  { id: "search", label: "Search", icon: Search },
  { id: "map", label: "Map", icon: MapIcon },
  { id: "favourites", label: "Favourites", icon: Heart },
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

function loadHazardReviews(): Record<string, HazardReview> {
  try {
    const stored = localStorage.getItem(HAZARD_REVIEW_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Record<string, HazardReview>) : {};
  } catch {
    return {};
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
  detailsLabel = "Details",
  navigationLocation,
  navigationLabel = "Maps",
  navigationMode = "map",
  onDetails,
}: {
  title: string;
  subtitle: string;
  summary: string;
  detailsLabel?: string;
  navigationLocation?: LatLngTuple;
  navigationLabel?: string;
  navigationMode?: "directions" | "map";
  onDetails: () => void;
}) {
  const container = L.DomUtil.create("div", "map-popup-card");
  L.DomEvent.disableClickPropagation(container);

  const heading = L.DomUtil.create("strong", "", container);
  heading.textContent = title;

  const meta = L.DomUtil.create("span", "", container);
  meta.textContent = subtitle;

  const body = L.DomUtil.create("p", "", container);
  body.textContent = summary;

  const actions = L.DomUtil.create("div", "map-popup-actions", container);
  const detailsButton = L.DomUtil.create("button", "", actions);
  detailsButton.type = "button";
  detailsButton.textContent = detailsLabel;
  L.DomEvent.on(detailsButton, "click", (event) => {
    L.DomEvent.stop(event);
    onDetails();
  });

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

function routeEndpointBounds(route: LatLngTuple[]) {
  const start = route[0];
  const end = route[route.length - 1] ?? start;

  return L.latLngBounds([start, end]);
}

function formatLocation(location: LatLngTuple) {
  return `${location[0].toFixed(4)}, ${location[1].toFixed(4)}`;
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

function nearestSectionsForLocation(location: LatLngTuple) {
  return riverSections
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
) {
  const seedPois = riverSections.flatMap((section): NearbyPoiResult[] => [
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

    const section = riverSections.find((item) => item.id === contribution.sectionId);

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

function formatDistanceKm(distanceKm: number) {
  return distanceKm < 1
    ? `${Math.round(distanceKm * 1000)} m`
    : `${distanceKm.toFixed(1)} km`;
}

function navigationUrl(location: LatLngTuple) {
  return googleMapsDirectionsUrl(location);
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
              : "Sign in to save favourites and contribute"
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

function AuthPromptSheet({
  mode,
  authMessage,
  isAuthConfigured,
  onSignIn,
  onContinueAsGuest,
  onClose,
}: {
  mode: AuthSheetMode;
  authMessage: string;
  isAuthConfigured: boolean;
  onSignIn: () => void;
  onContinueAsGuest: () => void;
  onClose: () => void;
}) {
  const isWelcome = mode === "welcome";

  return (
    <div className="auth-sheet-backdrop" role="presentation">
      <section
        className="auth-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={isWelcome ? "Welcome to RiverLaunch.app" : "Sign in required"}
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
            <p className="eyebrow">
              {isWelcome ? "Community river intelligence" : "Account required"}
            </p>
            <h2>
              {isWelcome
                ? "Plan rivers openly. Save and contribute with an account."
                : "Sign in to save favourites or add local knowledge."}
            </h2>
            <p>
              Browse routes, levels, access points, hazards, and photos without an
              account. Sign in when you want RiverLaunch.app to save something for you or
              accept community updates.
            </p>
          </div>
          {authMessage ? <p className="profile-message">{authMessage}</p> : null}
          <div className="auth-sheet__actions">
            <button
              className="primary-action"
              type="button"
              onClick={onSignIn}
              disabled={!isAuthConfigured}
            >
              <LogIn size={16} />
              Sign in
            </button>
            {isWelcome ? (
              <button className="ghost-button" type="button" onClick={onContinueAsGuest}>
                Continue as guest
              </button>
            ) : (
              <button className="ghost-button" type="button" onClick={onClose}>
                Not now
              </button>
            )}
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

function PoiDetailPanel({
  poi,
  onClose,
  onAddPhoto,
}: {
  poi: SelectedPoi;
  onClose: () => void;
  onAddPhoto: () => void;
}) {
  const [what3wordsAddress, setWhat3WordsAddress] = useState(
    poi.what3words ?? "",
  );
  const [isWhat3WordsLoading, setIsWhat3WordsLoading] = useState(false);
  const [what3wordsUnavailable, setWhat3WordsUnavailable] = useState(false);
  const [copiedLocationLabel, setCopiedLocationLabel] = useState("");

  function resetWhat3WordsState() {
    setCopiedLocationLabel("");
    setWhat3WordsAddress(poi.what3words ?? "");
    setWhat3WordsUnavailable(false);
    setIsWhat3WordsLoading(false);
  }

  useEffect(() => {
    resetWhat3WordsState();
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
      <div className="panel-content">
        <div className="stat-grid">
          <Metric icon={MapPinned} label="Section" value={poi.sectionLabel} />
          <Metric icon={Navigation} label="Location" value={formatLocation(poi.location)} />
          <Metric icon={ShieldCheck} label="Status" value={poi.status ?? "Info"} />
          <Metric icon={MessageSquare} label="Source" value={poi.sourceConfidence ?? "Demo"} />
        </div>
        <section className="info-block">
          <h3>Details</h3>
          <p>{poi.summary}</p>
        </section>
        <section className="info-block">
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
        {poi.sourceLabel ? (
          <section className="info-block">
            <h3>Source</h3>
            <p>{poi.sourceLabel}</p>
          </section>
        ) : null}
        <div className="form-actions form-actions--inline">
          <button className="ghost-button" type="button" onClick={onAddPhoto}>
            <Camera size={16} />
            Add photo
          </button>
        </div>
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
        {poi.photos?.length ? (
          <section className="info-block">
            <h3>Photos</h3>
            <div className="poi-photo-grid">
              {poi.photos.map((photo) => (
                <figure key={photo.id}>
                  <img src={photo.displayUrl || photo.thumbnailUrl} alt="" />
                  <figcaption>
                    <strong>{photo.caption || poi.title}</strong>
                    {photo.originalName ? <span>{photo.originalName}</span> : null}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </section>
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
  const [hazardReviews, setHazardReviews] = useState<
    Record<string, HazardReview>
  >(() => loadHazardReviews());
  const [favouriteSectionIds, setFavouriteSectionIds] = useState<string[]>(() =>
    loadFavouriteSectionIds(),
  );
  const [isPanelOpen, setIsPanelOpen] = useState(false);
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
  const [authState, setAuthState] = useState<AuthState>({
    status: "loading",
    user: null,
    error: null,
  });
  const [authMessage, setAuthMessage] = useState("");
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [memberMessage, setMemberMessage] = useState("");
  const [memberPhotos, setMemberPhotos] = useState<MemberPhoto[]>([]);
  const [isMemberPhotosLoading, setIsMemberPhotosLoading] = useState(false);
  const [photoMessage, setPhotoMessage] = useState("");
  const [pendingPhotoDelete, setPendingPhotoDelete] =
    useState<PendingPhotoDelete | null>(null);
  const [memberContributions, setMemberContributions] = useState<Contribution[]>(
    [],
  );
  const [isMemberContributionsLoading, setIsMemberContributionsLoading] =
    useState(false);
  const [pointMessage, setPointMessage] = useState("");
  const [pendingPointDelete, setPendingPointDelete] =
    useState<PendingPointDelete | null>(null);
  const [adminMembers, setAdminMembers] = useState<MemberProfile[]>([]);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] =
    useState<MemberRoleFilter>("all");
  const [memberTrustFilter, setMemberTrustFilter] =
    useState<MemberTrustFilter>("all");
  const [moderationContributions, setModerationContributions] = useState<
    Contribution[]
  >([]);
  const [moderationDraftDecisions, setModerationDraftDecisions] = useState<
    Record<string, ModerationDraftDecision>
  >({});
  const [isModerationLoading, setIsModerationLoading] = useState(false);
  const [moderationMessage, setModerationMessage] = useState("");
  const [liveGauge, setLiveGauge] = useState<LiveGaugeReading | null>(null);
  const [isGaugeLoading, setIsGaugeLoading] = useState(false);
  const [isSectionListOpen, setIsSectionListOpen] = useState(false);
  const [authSheetMode, setAuthSheetMode] = useState<AuthSheetMode | null>(null);
  const [isWelcomeDismissedForSession, setIsWelcomeDismissedForSession] =
    useState(() => hasDismissedWelcomeForSession());
  const [syncBannerDismissal, setSyncBannerDismissal] =
    useState<SyncBannerDismissal | null>(() => loadSyncBannerDismissal());
  const [searchMode, setSearchMode] = useState<SearchMode>("name");
  const [riverSearchTerm, setRiverSearchTerm] = useState("");
  const [locationSearchInput, setLocationSearchInput] = useState("");
  const [locationSearchResult, setLocationSearchResult] =
    useState<LocationSearchResult | null>(null);
  const [locationSearchMessage, setLocationSearchMessage] = useState("");
  const [isLocationSearchLoading, setIsLocationSearchLoading] = useState(false);

  const activeSection = useMemo(
    () =>
      riverSections.find((section) => section.id === activeSectionId) ??
      riverSections[0],
    [activeSectionId],
  );

  const sectionContributions = contributions.filter(
    (contribution) => contribution.sectionId === activeSection.id,
  );
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
  const isAuthConfigured = authState.status !== "unconfigured";
  const isSignedIn = Boolean(authState.user);
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
  const favouriteSections = riverSections.filter((section) =>
    favouriteSectionIds.includes(section.id),
  );
  const isActiveSectionFavourite =
    isSignedIn && favouriteSectionIds.includes(activeSection.id);
  const canAccessAdminTools = hasModeratorAccess(memberProfile?.role);
  const canManageMembers = hasAdminAccess(memberProfile?.role);
  const filteredSearchSections = useMemo(() => {
    const searchTerm = riverSearchTerm.trim().toLowerCase();

    if (!searchTerm) {
      return riverSections;
    }

    return riverSections.filter((section) =>
      [
        section.riverName,
        section.sectionName,
        section.summary,
        section.difficulty,
        section.levelLabel,
        ...section.suitability,
      ].some((value) => value.toLowerCase().includes(searchTerm)),
    );
  }, [riverSearchTerm]);
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
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

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
      setAdminMembers([]);
      setMemberPhotos([]);
      setPhotoMessage("");
      setPendingPhotoDelete(null);
      setMemberContributions([]);
      setPointMessage("");
      setPendingPointDelete(null);
      setModerationContributions([]);
      setModerationDraftDecisions({});
      setModerationMessage("");
      return () => {
        isMounted = false;
      };
    }

    fetchCurrentMember()
      .then((member) => {
        if (isMounted) {
          setMemberProfile(member);
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
    if (!authState.user || activeAppSection !== "profile") {
      return;
    }

    void loadMemberPhotos();
    void loadMemberContributions();
  }, [activeAppSection, authState.user]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contributions));
  }, [contributions]);

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
    localStorage.setItem(
      HAZARD_REVIEW_STORAGE_KEY,
      JSON.stringify(hazardReviews),
    );
  }, [hazardReviews]);

  useEffect(() => {
    let isMounted = true;
    setIsGaugeLoading(true);
    setLiveGauge(null);

    fetchEnvironmentAgencyGaugeReading(activeSection)
      .then((reading) => {
        if (isMounted) {
          setLiveGauge(reading);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsGaugeLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeSection]);

  async function submitContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const safeTitle = title.trim();
    const safeDetail = detail.trim();

    if (!isSignedIn) {
      setFormError("Sign in before saving local knowledge.");
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
    setHazardReviews({});
    setSyncMessage("");
    clearSyncBannerDismissal();
  }

  async function syncOutboxNow() {
    if (queuedOutboxCount === 0 || isSyncingOutbox) {
      return;
    }

    if (!isSignedIn) {
      setSyncMessage("Sign in before syncing local contributions.");
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

  async function handleSignIn() {
    setAuthMessage("");

    try {
      await signInWithGoogle();
      return true;
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Could not sign in.");
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

  async function signInFromSheet() {
    const signedIn = await handleSignIn();

    if (signedIn) {
      setAuthSheetMode(null);
    }
  }

  function requireSignInForSave() {
    setAuthMessage("");
    setIsWelcomeDismissedForSession(true);
    setAuthSheetMode("save-required");
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

  function openSectionOnMap(sectionId: string | null | undefined) {
    const section = riverSections.find((item) => item.id === sectionId);

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
    setActiveAppSection("map");

    return section;
  }

  function openPhotoOnMap(photo: MemberPhoto) {
    if (!openSectionOnMap(photo.sectionId)) {
      setPhotoMessage("This photo is not attached to a known map section.");
    }
  }

  function openContributionOnMap(contribution: Contribution) {
    if (!openSectionOnMap(contribution.sectionId)) {
      setPointMessage("This item is not attached to a known map section.");
    }
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

  async function openModerationPanel() {
    setActiveAppSection("admin");
    setActiveAdminPage("moderation");
    setIsModerationLoading(true);
    setModerationMessage("");
    setModerationDraftDecisions({});

    try {
      setModerationContributions(await fetchModerationContributions());
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

  function confirmSeedHazard(hazardId: string) {
    setHazardReviews((current) => {
      const existing = current[hazardId];

      return {
        ...current,
        [hazardId]: {
          status: "confirmed",
          confirmations: (existing?.confirmations ?? 0) + 1,
          lastConfirmed: "Just now",
        },
      };
    });
  }

  function resolveSeedHazard(hazardId: string) {
    setHazardReviews((current) => ({
      ...current,
      [hazardId]: {
        status: "resolved",
        confirmations: current[hazardId]?.confirmations ?? 0,
        lastConfirmed: "Just now",
      },
    }));
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

  function handleMapClick(
    location: LatLngTuple,
    nextType?: ContributionType,
    label = "Selected map location",
  ) {
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
    setSectionFocusNonce((current) => current + 1);
    setIsSectionListOpen(false);
    setSearchFocusLocation(null);
    setSearchFocusLabel("Searched location");
    setShowSearchFocusMarker(false);
  }

  function openRouteDetails(section: RiverSection) {
    setActiveSectionId(section.id);
    setSectionFocusNonce((current) => current + 1);
    setSelectedPoi(null);
    setIsPanelOpen(true);
    setIsSectionListOpen(false);
  }

  function openPoiDetails(poi: SelectedPoi) {
    setSelectedPoi(poi);
    setIsPanelOpen(false);
    setIsFormOpen(false);
    setIsAddMode(false);
    setSearchFocusLocation(null);
    setSearchFocusLabel("Searched location");
    setShowSearchFocusMarker(false);
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
      const nearestSections = nearestSectionsForLocation(coordinates);
      setLocationSearchResult({
        label: formatLocation(coordinates),
        location: coordinates,
        focusSection: nearestSections[0]?.section,
        pois: nearbyPoisForLocation(coordinates, contributions),
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
        focusSection: nearestSectionsForLocation(location)[0]?.section,
        pois: nearbyPoisForLocation(location, contributions),
      });
    } catch {
      setLocationSearchMessage("Could not find that location reference.");
    } finally {
      setIsLocationSearchLoading(false);
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

  function toggleFavouriteSection(section: RiverSection) {
    if (!isSignedIn) {
      requireSignInForSave();
      return;
    }

    setFavouriteSectionIds((current) =>
      current.includes(section.id)
        ? current.filter((sectionId) => sectionId !== section.id)
        : [...current, section.id],
    );
  }

  const accountLabel =
    memberProfile?.displayName ?? authState.user?.displayName ?? "Guest";
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
      {activeAppSection === "map" ? (
        <section className="topbar" aria-label="Map controls">
          <div className="brand-lockup">
            <span className="brand-mark">
              <Waves size={22} strokeWidth={2.3} />
            </span>
            <div>
              <p className="eyebrow">{activeSection.riverName}</p>
              <h1>{activeSection.sectionName}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <button
              className={`ghost-button map-panel-toggle ${
                isSectionListOpen ? "map-panel-toggle--active" : ""
              }`}
              type="button"
              onClick={() => setIsSectionListOpen((current) => !current)}
              aria-pressed={isSectionListOpen}
            >
              <Route size={16} />
              Sections
            </button>
            <button
              className={`ghost-button map-panel-toggle ${
                isPanelOpen ? "map-panel-toggle--active" : ""
              }`}
              type="button"
              onClick={() => setIsPanelOpen((current) => !current)}
              aria-pressed={isPanelOpen}
            >
              <MapPinned size={16} />
              Route
            </button>
            <button
              className={`icon-button sync-icon-button ${
                queuedOutboxCount > 0 ? "sync-icon-button--queued" : ""
              }`}
              type="button"
              onClick={syncOutboxNow}
              disabled={!canSyncOutbox}
              title={syncActionLabel({ queuedOutboxCount, isSyncingOutbox })}
              aria-label={syncActionLabel({ queuedOutboxCount, isSyncingOutbox })}
            >
              <RefreshCw size={16} />
              {queuedOutboxCount > 0 ? (
                <span className="sync-badge">{queuedOutboxCount}</span>
              ) : null}
            </button>
            <button
              className={`icon-button ${
                isActiveSectionFavourite ? "icon-button--active" : ""
              }`}
              type="button"
              title={
                !isSignedIn
                  ? "Sign in to save favourites"
                  : isActiveSectionFavourite
                  ? "Remove from favourites"
                  : "Add to favourites"
              }
              aria-label={
                !isSignedIn
                  ? "Sign in to save favourites"
                  : isActiveSectionFavourite
                  ? "Remove from favourites"
                  : "Add to favourites"
              }
              aria-pressed={isActiveSectionFavourite}
              onClick={() => toggleFavouriteSection(activeSection)}
            >
              <Star size={18} fill={isActiveSectionFavourite ? "currentColor" : "none"} />
            </button>
            <button
              className="primary-action"
              type="button"
              title="Add local knowledge"
              onClick={() => startAddMode()}
            >
              <Plus size={18} />
              Add info
            </button>
            {authMessage || authState.error || memberMessage ? (
              <p className="topbar-message">
                {authMessage || authState.error || memberMessage}
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
            <span>Sections</span>
            <ChevronDown size={16} />
          </div>
          {riverSections.map((section) => (
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
              <span className={`level-pill level-pill--${section.levelBand}`}>
                {bandLabels[section.levelBand]}
              </span>
            </button>
          ))}
        </aside>

        <RiverMap
          activeSection={activeSection}
          contributions={contributions}
          outboxRecords={outboxRecords}
          selectedLocation={selectedLocation}
          searchFocusLocation={searchFocusLocation}
          searchFocusLabel={searchFocusLabel}
          showSearchFocusMarker={showSearchFocusMarker}
          searchFocusNonce={searchFocusNonce}
          isAddMode={isAddMode}
          onMapClick={handleMapClick}
          focusNonce={sectionFocusNonce}
          onOpenPoiDetails={openPoiDetails}
          onOpenRouteDetails={openRouteDetails}
          onSelectSection={selectSection}
        />

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

        {selectedPoi ? (
          <PoiDetailPanel
            poi={selectedPoi}
            onClose={() => setSelectedPoi(null)}
            onAddPhoto={() => startAddMode("photo")}
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

          <div className="panel-content">
            <div className="stat-grid">
              <Metric
                icon={Navigation}
                label="Distance"
                value={`${activeSection.distanceKm} km`}
              />
              <Metric
                icon={Clock3}
                label="Time"
                value={activeSection.estimatedTime}
              />
              <Metric
                icon={Droplets}
                label="Level"
                value={activeSection.levelLabel}
              />
              <Metric
                icon={ShieldAlert}
                label="Difficulty"
                value={activeSection.difficulty}
              />
            </div>

            <p className="section-summary">{activeSection.summary}</p>

            <div className="notice">
              <AlertTriangle size={18} />
              <span>{activeSection.runnableGuidance}</span>
            </div>

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
              <h3>Gauge</h3>
              <div className="gauge-card">
                <div>
                  <strong>{liveGauge?.gauge.name ?? activeSection.gauge.name}</strong>
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
              <p className="source-note">
                {liveGauge?.message ??
                  "Seed gauge context only. Provider mapping is still being verified."}
              </p>
            </section>

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

            <section className="info-block">
              <h3>Access</h3>
              <p>{activeSection.accessSummary}</p>
              <div className="access-list">
                {activeSection.accessPoints.map((accessPoint) => (
                  <div className="compact-item" key={accessPoint.id}>
                    <MapPin size={16} />
                    <div>
                      <strong>{accessPoint.name}</strong>
                      <span>{accessPoint.notes}</span>
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

            <section className="info-block">
              <div className="block-title">
                <h3>Hazards</h3>
                <span>{activeSection.hazards.length} seeded</span>
              </div>
              {activeSection.hazards.map((hazard) => {
                const review = hazardReviews[hazard.id];
                const status = review?.status ?? hazard.status;
                const lastConfirmed =
                  review?.lastConfirmed ?? hazard.lastConfirmed;
                const confirmations = review?.confirmations ?? 0;

                return (
                  <div className="hazard-item" key={hazard.id}>
                    <AlertTriangle size={17} />
                    <div>
                      <strong>{hazard.title}</strong>
                      <span>
                        {hazard.severity} · {status} · confirmed{" "}
                        {lastConfirmed}
                      </span>
                      <p>{hazard.description}</p>
                      <div className="verification-row">
                        <span className={`status-chip status-chip--${status}`}>
                          {status}
                        </span>
                        {confirmations > 0 ? (
                          <span>{confirmations} demo confirmations</span>
                        ) : (
                          <span>needs local confirmation</span>
                        )}
                      </div>
                      <div className="inline-actions">
                        <button
                          className="ghost-button ghost-button--compact"
                          type="button"
                          onClick={() => confirmSeedHazard(hazard.id)}
                        >
                          <CheckCircle2 size={15} />
                          Confirm
                        </button>
                        <button
                          className="ghost-button ghost-button--compact"
                          type="button"
                          onClick={() => resolveSeedHazard(hazard.id)}
                        >
                          <Flag size={15} />
                          Resolve
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                            <img
                              key={photo.id}
                              src={photo.thumbnailUrl || photo.displayUrl}
                              alt=""
                            />
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

            <section className="info-block">
              <h3>Photos</h3>
              <div className="photo-grid">
                {activeSection.photos.map((photo) => (
                  <figure key={photo.id}>
                    <img src={photo.url} alt="" />
                    <figcaption>
                      <strong>{photo.title}</strong>
                      <span>{photo.caption}</span>
                    </figcaption>
                  </figure>
                ))}
                {sectionContributionPhotos.map(({ contribution, photo }) => (
                  <figure key={photo.id}>
                    {photo.displayUrl ? (
                      <img src={photo.displayUrl} alt="" />
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
                    className={searchMode === "point" ? "active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={searchMode === "point"}
                    onClick={() => setSearchMode("point")}
                  >
                    <MapPin size={16} />
                    Point
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
                          <span className={`level-pill level-pill--${section.levelBand}`}>
                            {bandLabels[section.levelBand]}
                          </span>
                        </button>
                      ))}
                      {filteredSearchSections.length === 0 ? (
                        <p className="source-note">No matching sections yet.</p>
                      ) : null}
                    </div>
                  </section>
                ) : (
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
                )}
              </div>
            </PlaceholderPage>
          ) : activeAppSection === "favourites" ? (
            <PlaceholderPage section="favourites" title="Favourites">
              {!isSignedIn ? (
                <section className="sign-in-card">
                  <Star size={22} />
                  <div>
                    <h3>Sign in to save favourites</h3>
                    <p>
                      RiverLaunch.app treats favourites as account-only saved routes, so
                      sign in before saving sections.
                    </p>
                  </div>
                  <button
                    className="primary-action"
                    type="button"
                    onClick={requireSignInForSave}
                    disabled={!isAuthConfigured}
                  >
                    <LogIn size={16} />
                    Sign in
                  </button>
                </section>
              ) : (
                <div className="placeholder-list">
                  {favouriteSections.map((section) => (
                    <div className="placeholder-row" key={section.id}>
                      <span>
                        <strong>{section.riverName}</strong>
                        <small>{section.sectionName}</small>
                      </span>
                      <span className={`level-pill level-pill--${section.levelBand}`}>
                        {bandLabels[section.levelBand]}
                      </span>
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
                        className="icon-button icon-button--compact"
                        type="button"
                        title="Remove from favourites"
                        aria-label={`Remove ${section.sectionName} from favourites`}
                        onClick={() => setPendingUnfavouriteSection(section)}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                  {favouriteSections.length === 0 ? (
                    <div className="placeholder-row">
                      <span>
                        <strong>No favourites yet</strong>
                        <small>Use the star on the Map section to save a route here.</small>
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
                    <p>
                      Remove this route from your favourites?
                    </p>
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
            </PlaceholderPage>
          ) : activeAppSection === "profile" ? (
            <PlaceholderPage section="profile" title="Profile">
              <div className="profile-grid">
                <AppBrandPanel />
                <div className="profile-card">
                  <UserRound size={22} />
                  <div>
                    <strong>
                      {memberProfile?.displayName ??
                        authState.user?.displayName ??
                        "Signed out"}
                    </strong>
                    <span>
                      {memberProfile?.email ??
                        authState.user?.email ??
                        "Sign in to sync local knowledge"}
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
                      <h3>Sign in to save and contribute</h3>
                      <p>
                        Browsing is open to everyone. Favourites, local knowledge,
                        photos, and sync need a RiverLaunch.app account.
                      </p>
                    </div>
                    <button
                      className="primary-action"
                      type="button"
                      onClick={handleSignIn}
                      disabled={!isAuthConfigured}
                    >
                      <LogIn size={16} />
                      Sign in
                    </button>
                  </section>
                ) : null}
                {authMessage || authState.error || memberMessage ? (
                  <p className="profile-message">
                    {authMessage || authState.error || memberMessage}
                  </p>
                ) : null}
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
                {isSignedIn ? (
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
                          const section = riverSections.find(
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
                            <img
                              src={photo.thumbnailUrl ?? photo.displayUrl ?? ""}
                              alt={photo.caption || photo.contributionTitle}
                            />
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
                <button className="placeholder-row" type="button">
                  <span>
                    <strong>Settings</strong>
                    <small>Map, units, alerts, and account preferences</small>
                  </span>
                  <MoreHorizontal size={18} />
                </button>
                <button
                  className="placeholder-row"
                  type="button"
                  onClick={resetDemoContributions}
                >
                  <span>
                    <strong>Reset demo data</strong>
                    <small>Clear local demo contributions and hazard confirmations</small>
                  </span>
                  <RotateCcw size={18} />
                </button>
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
                      <button
                        className="ghost-button ghost-button--compact"
                        type="button"
                        onClick={() => setActiveAdminPage("index")}
                      >
                        <ChevronDown size={15} />
                        Admin
                      </button>
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
                                    <div className="member-access-controls">
                                      <label>
                                        <span>Role</span>
                                        <select
                                          value={member.role}
                                          onChange={(event) =>
                                            void updateMemberAccess(member, {
                                              role: event.target.value as MemberRole,
                                            })
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
                                          value={member.trustLevel}
                                          onChange={(event) =>
                                            void updateMemberAccess(member, {
                                              trustLevel: event.target
                                                .value as MemberTrustLevel,
                                            })
                                          }
                                        >
                                          {memberTrustOptions.map((trustLevel) => (
                                            <option key={trustLevel} value={trustLevel}>
                                              {trustLevel}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                    </div>
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
                      ) : activeAdminPage === "moderation" ? (
                        <>
                          <div className="quick-add-panel__header">
                            <div>
                              <p className="eyebrow">Moderation</p>
                              <h2>Contribution queue</h2>
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
                                              <a
                                                href={photo.displayUrl}
                                                target="_blank"
                                                rel="noreferrer"
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
                                              </a>
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
                                  No contributions need moderation.
                                </p>
                              ) : null}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="placeholder-list">
                          <div className="placeholder-row">
                            <span>
                              <strong>System</strong>
                              <small>Operational health and data-quality tools will live here.</small>
                            </span>
                            <ShieldCheck size={18} />
                          </div>
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
          onSignIn={signInFromSheet}
          onContinueAsGuest={continueAsGuest}
          onClose={closeAuthSheet}
        />
      ) : null}
    </main>
  );
}

function RiverMap({
  activeSection,
  contributions,
  outboxRecords,
  selectedLocation,
  searchFocusLocation,
  searchFocusLabel,
  showSearchFocusMarker,
  searchFocusNonce,
  isAddMode,
  onMapClick,
  focusNonce,
  onOpenPoiDetails,
  onOpenRouteDetails,
  onSelectSection,
}: {
  activeSection: RiverSection;
  contributions: Contribution[];
  outboxRecords: ContributionOutboxRecord[];
  selectedLocation: LatLngTuple | null;
  searchFocusLocation: LatLngTuple | null;
  searchFocusLabel: string;
  showSearchFocusMarker: boolean;
  searchFocusNonce: number;
  isAddMode: boolean;
  onMapClick: (
    location: LatLngTuple,
    nextType?: ContributionType,
    label?: string,
  ) => void;
  focusNonce: number;
  onOpenPoiDetails: (poi: SelectedPoi) => void;
  onOpenRouteDetails: (section: RiverSection) => void;
  onSelectSection: (section: RiverSection) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const callbackRef = useRef(onSelectSection);
  const mapClickRef = useRef(onMapClick);
  const poiDetailsRef = useRef(onOpenPoiDetails);
  const routeDetailsRef = useRef(onOpenRouteDetails);
  const previousSectionIdRef = useRef(activeSection.id);
  const previousFocusNonceRef = useRef(focusNonce);
  const previousSearchFocusNonceRef = useRef(searchFocusNonce);
  const shouldFitActiveSectionRef = useRef(true);
  const outboxByContributionId = useMemo(
    () =>
      new Map(
        outboxRecords.map((record) => [record.contribution.id, record] as const),
      ),
    [outboxRecords],
  );

  useEffect(() => {
    callbackRef.current = onSelectSection;
  }, [onSelectSection]);

  useEffect(() => {
    mapClickRef.current = onMapClick;
  }, [onMapClick]);

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
    const layers = layerRef.current;

    if (!map || !layers) {
      return;
    }

    layers.clearLayers();

    riverSections.forEach((section) => {
      const isActive = section.id === activeSection.id;
      const color =
        section.levelBand === "good"
          ? "#1f8a70"
          : section.levelBand === "high"
            ? "#b54708"
            : section.levelBand === "too-low"
              ? "#7c5c1d"
              : "#52606d";

      const routeLine = L.polyline(section.route, {
        color,
        weight: isActive ? 7 : 4,
        opacity: isActive ? 0.95 : 0.7,
      }).addTo(layers);

      routeLine.on("click", (event) => {
        L.DomEvent.stop(event.originalEvent);

        if (isAddMode) {
          mapClickRef.current(
            [event.latlng.lat, event.latlng.lng],
            undefined,
            "New map contribution",
          );
          return;
        }

        callbackRef.current(section);
      });

      const sectionMarker = L.marker(section.centre, {
        bubblingMouseEvents: false,
        icon: L.divIcon({
          className: "",
          html: markerHtml(isActive ? "section-active" : "section", "R"),
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
            detailsLabel: "Route details",
            onDetails: () => routeDetailsRef.current(section),
          }),
        )
        .on("click", (event) => {
          L.DomEvent.stop(event.originalEvent);
          sectionMarker.openPopup();
        });

      section.accessPoints.forEach((accessPoint) => {
        const marker = L.marker(accessPoint.location, {
          bubblingMouseEvents: false,
          icon: L.divIcon({
            className: "",
            html: markerHtml("access", accessPoint.type === "put-in" ? "I" : "O"),
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        });

        marker
          .addTo(layers)
          .bindPopup(
            createMapPopupContent({
              title: accessPoint.name,
              subtitle: `Access · ${accessPoint.type}`,
            summary: accessPoint.notes,
            navigationLocation: accessPoint.location,
            navigationLabel: "Directions",
            navigationMode: "directions",
            onDetails: () =>
              poiDetailsRef.current({
                  id: accessPoint.id,
                  kind: "access",
                  title: accessPoint.name,
                  subtitle: accessPoint.type,
                  summary: accessPoint.notes,
                  sectionLabel: section.sectionName,
                  location: accessPoint.location,
                  status: "Access point",
                  sourceLabel: accessPoint.source?.label,
                  sourceConfidence: accessPoint.source?.confidence,
                  navigationLocation: accessPoint.location,
                }),
            }),
          )
          .on("click", (event) => {
            L.DomEvent.stop(event.originalEvent);
            marker.openPopup();
          });
      });

      section.hazards.forEach((hazard) => {
        const marker = L.marker(hazard.location, {
          bubblingMouseEvents: false,
          icon: L.divIcon({
            className: "",
            html: markerHtml("hazard", "!"),
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          }),
        });

        marker
          .addTo(layers)
          .bindPopup(
            createMapPopupContent({
            title: hazard.title,
            subtitle: `${hazard.type} · ${hazard.severity}`,
            summary: hazard.description,
            navigationLocation: hazard.location,
            onDetails: () =>
              poiDetailsRef.current({
                  id: hazard.id,
                  kind: "hazard",
                  title: hazard.title,
                  subtitle: `${hazard.type} · ${hazard.severity}`,
                  summary: hazard.description,
                  sectionLabel: section.sectionName,
                  location: hazard.location,
                  status: hazard.status,
                sourceLabel: hazard.source?.label,
                sourceConfidence: hazard.source?.confidence,
                navigationLocation: hazard.location,
              }),
          }),
          )
          .on("click", (event) => {
            L.DomEvent.stop(event.originalEvent);
            marker.openPopup();
          });
      });

      section.features.forEach((feature) => {
        const marker = L.marker(feature.location, {
          bubblingMouseEvents: false,
          icon: L.divIcon({
            className: "",
            html: markerHtml("feature", "*"),
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          }),
        });

        marker
          .addTo(layers)
          .bindPopup(
            createMapPopupContent({
            title: feature.title,
            subtitle: `Feature · ${feature.type}`,
            summary: feature.description,
            navigationLocation: feature.location,
            onDetails: () =>
              poiDetailsRef.current({
                  id: feature.id,
                  kind: "feature",
                  title: feature.title,
                  subtitle: feature.type,
                  summary: feature.description,
                  sectionLabel: section.sectionName,
                  location: feature.location,
                  status: "Feature",
                sourceLabel: feature.source?.label,
                sourceConfidence: feature.source?.confidence,
                navigationLocation: feature.location,
              }),
          }),
          )
          .on("click", (event) => {
            L.DomEvent.stop(event.originalEvent);
            marker.openPopup();
          });
      });

      const gaugeMarker = L.marker(section.gauge.location, {
        bubblingMouseEvents: false,
        icon: L.divIcon({
          className: "",
          html: markerHtml("gauge", "~"),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      });

      gaugeMarker
        .addTo(layers)
        .bindPopup(
          createMapPopupContent({
            title: section.gauge.name,
            subtitle: "Gauge",
            summary: `${section.gauge.value} · ${section.gauge.observedAt}`,
            navigationLocation: section.gauge.location,
            onDetails: () =>
              poiDetailsRef.current({
                id: section.gauge.id,
                kind: "gauge",
                title: section.gauge.name,
                subtitle: "Gauge",
                summary: `${section.gauge.value}. Trend: ${section.gauge.trend}. Observed ${section.gauge.observedAt}.`,
                sectionLabel: section.sectionName,
                location: section.gauge.location,
                status: section.gauge.trend,
                sourceLabel: section.gauge.source?.label,
                sourceConfidence: section.gauge.source?.confidence,
                navigationLocation: section.gauge.location,
              }),
          }),
        )
        .on("click", (event) => {
          L.DomEvent.stop(event.originalEvent);
          gaugeMarker.openPopup();
        });
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
            navigationLocation: contribution.location,
            onDetails: () =>
              poiDetailsRef.current({
                id: contribution.id,
                kind: "contribution",
                title: contribution.title,
                subtitle: `${contribution.type} · ${contribution.category}`,
                summary: contribution.detail,
                sectionLabel:
                  riverSections.find((section) => section.id === contribution.sectionId)
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

    if (
      previousSectionIdRef.current !== activeSection.id ||
      previousFocusNonceRef.current !== focusNonce ||
      previousSearchFocusNonceRef.current !== searchFocusNonce
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
        if (searchFocusLocation) {
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
  }, [
    activeSection,
    contributions,
    focusNonce,
    outboxByContributionId,
    searchFocusLocation,
    showSearchFocusMarker,
    searchFocusNonce,
    selectedLocation,
    isAddMode,
  ]);

  return (
    <section className="map-stage" aria-label="River map">
      <div className="map-canvas" ref={mapContainerRef} />
      <div className="map-legend" aria-label="Map legend">
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
