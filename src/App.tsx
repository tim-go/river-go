import {
  AlertTriangle,
  Award,
  Backpack,
  Camera,
  CheckCircle2,
  Clock3,
  Droplets,
  ExternalLink,
  Flag,
  Heart,
  Info,
  HelpCircle,
  LogIn,
  LogOut,
  Map as MapIcon,
  MapPinned,
  MapPin,
  MessageSquare,
  ChevronLeft,
  Layers,
  Navigation,
  Palette,
  Plus,
  RotateCcw,
  RefreshCw,
  Route,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
  Settings as SettingsIcon,
  UserRound,
  UsersRound,
  Waves,
  X,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  setAnalyticsConsentPreference,
  trackPageView,
  trackProductEvent,
  type AnalyticsConsent,
} from "./services/analytics";
import {
  fetchRiverLevelLines,
  fetchRiverLevelStates,
  fetchSectionLevelStates,
  fetchStations,
  type RiverLevelLine,
  type RiverLevelState,
  type SectionLevelState,
  type Station,
} from "./services/levelStateApi";
import {
  MapFilterControl,
  type FilterCategory,
} from "./components/map/MapFilterControl";
import { MapActionButton, MapActions } from "./components/map/MapActions";
import { WeatherTimebar } from "./components/map/WeatherTimebar";
import {
  fetchRainFrames,
  nearestNowFrameIndex,
  type RainFrameInfo,
} from "./services/weatherApi";
import {
  fetchCanonicalRivers,
  fetchSourceCandidatePois,
  updateSourceCandidatePoiStatus,
  type CanonicalRiverSummary,
  type SourceCandidatePoi,
} from "./services/canonicalRiverApi";
import {
  fetchPublicSections,
  promoteRouteSuggestionToSection,
  type CommunitySection,
} from "./services/routesApi";
import {
  applyContributionModerationDecision,
  deleteContribution,
  fetchModerationContributions,
  fetchMapPoiContributions,
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
  reloadCurrentUser,
  sendCurrentUserEmailVerification,
  sendEmailPasswordReset,
  signInWithGoogle,
  signInWithEmail,
  signOutCurrentUser,
  subscribeToAuthState,
  updateMyDisplayName,
  type AuthState,
} from "./services/firebaseAuth";
import {
  acceptContributorTerms,
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
import {
  CONTRIBUTOR_TERMS_VERSION,
  REQUIRE_EMAIL_VERIFICATION,
  hasAcceptedCurrentContributorTerms,
} from "./lib/contributorTerms";
import { generateUuid } from "./lib/uuid";
import { evaluateContributorGate } from "./lib/contributorGate";
import {
  processContributionPhoto,
  type ProcessedContributionPhoto,
} from "./services/imageProcessing";
import { uploadContributionPhoto } from "./services/photoUpload";
import {
  fetchObservationJobRuns,
  fetchRiverObservations,
  runObservationIngestion,
  type ObservationJobRun,
  type SectionObservationMeasure,
} from "./services/observationApi";
import { messageTone, profileMessageToneClass } from "./lib/messageTone";
import { formatLocation, formatDateTime, getPrimaryObservationMeasure, parseCoordinateSearch, looksLikeWhat3Words, normaliseWhat3WordsSearch, routeDistanceKm } from "./lib/format";
import {
  deletePhoto,
  fetchMyPhotos,
  type MemberPhoto,
} from "./services/photoApi";
import {
  fetchModerationMapPoiReviews,
  fetchAllMapPois,
  fetchRiverMapPois,
  fetchSectionMapPois,
  reviewMapPoi,
  updateMapPoiVerificationStatus,
  type MapPoiCorrectionReview,
  type MapPoiReviewDecision,
} from "./services/mapPoiApi";
import { fetchAmenities, type Amenity } from "./services/amenityApi";
import {
  fetchCoordinatesForWhat3Words,
  fetchWhat3WordsAddress,
  formatWhat3Words,
} from "./services/locationReferences";
import { routeSuggestionStatusLabel, routeAdjustmentStatusLabel } from "./lib/mapPopups";
import { loadContributions, loadFavouriteSectionIds, loadFavouriteRiverIds, saveFavouriteRiverIds, loadRouteSuggestions, loadAnalyticsConsent, saveAnalyticsConsent, hasDismissedWelcomeForSession, rememberWelcomeDismissedForSession, loadLiveLocationEnabled, saveLiveLocationEnabled, loadSyncBannerDismissal, saveSyncBannerDismissal, STORAGE_KEY, FAVOURITES_STORAGE_KEY, ROUTE_SUGGESTIONS_STORAGE_KEY } from "./lib/storage";
import { SyncOutboxBanner } from "./components/SyncOutboxBanner";
import { AnalyticsConsentBanner } from "./components/AnalyticsConsentBanner";
import { AppNavigation, MobileBottomNav } from "./components/AppNavigation";
import { AboutScreen } from "./components/AboutScreen";
import { FaqsScreen } from "./components/FaqsScreen";
import { PaddleHistoryPanel } from "./components/PaddleHistoryPanel";
import { KitInventoryPanel } from "./components/KitInventoryPanel";
import { SkillsPanel } from "./components/SkillsPanel";
import { AppNotificationBanner } from "./components/AppNotificationBanner";
import { PlaceholderPage } from "./components/PlaceholderPage";
import { SignedOutNotice } from "./components/SignedOutNotice";
import { RiverCard } from "./components/RiverCard";
import { DashboardHub } from "./components/DashboardHub";
import { ProfileAvatarEditor } from "./components/ProfileAvatarEditor";
import { PublicProfilePage } from "./components/PublicProfilePage";
import { RiverDetailPage } from "./components/RiverDetailPage";
import { PublicProfileControls } from "./components/PublicProfileControls";
import { PwaInstallSettingRow } from "./pwa/PwaInstallSettingRow";
import { GroupsPanel } from "./components/GroupsPanel";
import { PhotoLightbox } from "./components/PhotoLightbox";
import { AuthPromptSheet } from "./components/AuthPromptSheet";
import {
  ContributorOnramp,
  type ContributorActionResult,
} from "./components/ContributorOnramp";
import { DetailPanel } from "./components/DetailPanel";
import { PoiDetailPanel } from "./components/PoiDetailPanel";
import { RiverMap } from "./components/RiverMap";
import { useDiscovery } from "./discovery/DiscoveryContext";
import { RouteAdjustmentImpactPanel } from "./components/RouteAdjustmentImpactPanel";
import { Metric } from "./components/Metric";
import { contributionStatusLabel, moderationActions } from "./lib/contributionLabels";
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
  fetchWatercourseImportStatus,
  searchWatercourses,
  type KnownWatercourse,
  type WatercourseImportStatus,
} from "./services/watercourseApi";
import type {
  Contribution,
  ContributionOutboxRecord,
  ContributionType,
  HazardSeverity,
  LatLngTuple,
  LiveLocationSnapshot,
  MapPoi,
  RiverSection,
  MarkerClickMode,
  SyncBannerDismissal,
  AppSection,
  AppNotification,
  AppNotificationTone,
  PhotoLightboxItem,
  AuthSheetMode,
  SelectedPoi,
  GroupPublic,
} from "./types";
import { discoverClubs } from "./services/groupsApi";
import {
  AdminPage,
  bandLabels,
  calculateRouteAdjustmentImpact,
  candidateRouteSuggestionId,
  canonicalRiverOverviewSectionId,
  canonicalRiverToOverviewSection,
  communitySectionToRiverSection,
  categoryOptions,
  contributionOptions,
  defaultObservedDate,
  emptyCanonicalOverviewSection,
  fallbackMapPoisForSection,
  formatDistanceKm,
  formatSourceCandidateValue,
  hasAdminAccess,
  distanceMetersToRoute,
  hasModeratorAccess,
  isCandidateSection,
  isCanonicalOverviewSection,
  isDuplicateRoutePoint,
  LiveLocationStatus,
  liveLocationStatusLabel,
  liveLocationUpdatedLabel,
  LocationSearchResult,
  MapFocusPlacement,
  mapPoiToSelectedPoi,
  MemberRoleFilter,
  memberRoleOptions,
  MemberTrustFilter,
  memberTrustOptions,
  mergeSectionContributions,
  ModerationDraftDecision,
  moderationResultMessage,
  ModerationTab,
  nearbyPoisForLocation,
  nearestSectionsForLocation,
  OpenPoiDetailsOptions,
  optionForType,
  PendingPhotoDelete,
  PendingPointDelete,
  ProfileMode,
  routeAdjustmentActions,
  RouteAdjustmentDraftDecision,
  RouteCreateMode,
  RouteDraftTarget,
  RouteModerationDraftDecision,
  RouteSnapCandidate,
  routeSuggestionActions,
  SearchMode,
  snapRoughTraceToKnownRoute,
  SourceCandidateDraftStatus,
  sourceCandidateStatusActions,
  sourceCandidateStatusLabel,
  syncActionLabel,
  SYNC_BANNER_DISMISS_MS,
  watercourseCentre,
  watercourseTypeLabel,
} from "./appCore";

// When a contribution is added from a river overview, link it to the nearest POI
// only if that POI is within this distance — beyond it, the contribution still
// lands on the POI's section (so it's loadable) but isn't misattributed to a
// far-off point. ~1km comfortably covers typical access/rapid spacing on a reach
// while rejecting a photo dropped on a different river than the one focused.
const NEAREST_POI_ATTACH_METERS = 1000;

// A club is a first-class, addressable entity: /club/<handle-or-id>. This is the
// only routed entity for now (paddler profiles, /p/<handle>, will follow the
// same shape). Everything else is the section-based nav.
function parseGroupRoute(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  // /club/ is the canonical (displayed) form. /c/ and /clubs/ are accepted
  // aliases, as are the legacy /group, /g and /groups (older shared/invite
  // links must keep resolving).
  const match = window.location.pathname.match(
    /^\/(?:c|club|clubs|g|group|groups)\/([^/]+)\/?$/,
  );
  return match ? decodeURIComponent(match[1]) : null;
}

// A public paddler profile: /p/<handle-or-id>. Same routed-entity shape as clubs.
function parseProfileRoute(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const match = window.location.pathname.match(/^\/p\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

// A river's dedicated detail page: /river/<id>. Same routed-entity shape.
function parseRiverRoute(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const match = window.location.pathname.match(/^\/river\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Where an entity page's back button returns to. `section`/`searchMode` restore
// a React-state view (e.g. Discover ▸ Clubs) that the URL doesn't encode.
type ReturnTarget = {
  label: string;
  section?: AppSection;
  searchMode?: SearchMode;
};

const CLUB_KIND_LABELS: Record<string, string> = {
  club: "Club",
  subgroup: "Subgroup",
  friends: "Friends",
  trip: "Trip",
};
const capitalise = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

function App() {
  const outboxStore = useMemo(() => createContributionOutboxStore(), []);
  const [activeAppSection, setActiveAppSection] = useState<AppSection>(() =>
    parseGroupRoute() ? "groups" : "map",
  );
  const [groupRoute, setGroupRoute] = useState<string | null>(() =>
    parseGroupRoute(),
  );
  // The open public paddler profile (/p/<token>), or null.
  const [profileRoute, setProfileRoute] = useState<string | null>(() =>
    parseProfileRoute(),
  );
  // The open river detail page (/river/<id>), or null.
  const [riverRoute, setRiverRoute] = useState<string | null>(() =>
    parseRiverRoute(),
  );
  // Shared back-navigation utility. Any page that opens an entity page (a club
  // or a paddler profile) can pass a return target describing where "back" goes:
  // a label to show, and — because app sections/search live in React state, not
  // the URL — the section (and search tab) to restore. Stored in history.state
  // so nesting and the browser Back button stay in sync. Null means there was no
  // internal caller, so the entity falls back to its own default exit.
  const [returnTarget, setReturnTarget] = useState<ReturnTarget | null>(
    () => (window.history.state?.back as ReturnTarget | undefined) ?? null,
  );
  // Restore the caller's section/search-tab (used when the back target points at
  // a React-state section like Discover, which the URL doesn't carry).
  const restoreReturnSection = (target: ReturnTarget) => {
    setActiveAppSection(target.section ?? "map");
    if (target.searchMode) {
      setSearchMode(target.searchMode);
    }
    setGroupRoute(null);
    setProfileRoute(null);
    setRiverRoute(null);
    setReturnTarget(null);
    window.history.pushState({}, "", "/");
  };
  // Open a club entity page by handle or id (pushes /club/<token>); null returns
  // to the section view. `back` shows a back button to the calling page.
  const openGroup = (idOrHandle: string | null, back?: ReturnTarget) => {
    if (idOrHandle) {
      window.history.pushState(
        { back: back ?? null },
        "",
        `/club/${encodeURIComponent(idOrHandle)}`,
      );
      setReturnTarget(back ?? null);
      setProfileRoute(null);
      setRiverRoute(null);
      setGroupRoute(idOrHandle);
      setActiveAppSection("groups");
    } else {
      if (parseGroupRoute()) {
        window.history.pushState({}, "", "/");
      }
      setGroupRoute(null);
      setReturnTarget(null);
    }
  };
  // Open a paddler's public profile, remembering how to get back.
  const openProfile = (idOrHandle: string, backLabel = "Back") => {
    const back: ReturnTarget = { label: backLabel };
    window.history.pushState(
      { back },
      "",
      `/p/${encodeURIComponent(idOrHandle)}`,
    );
    setReturnTarget(back);
    setProfileRoute(idOrHandle);
  };
  const closeProfile = () => {
    if (returnTarget?.section) {
      restoreReturnSection(returnTarget);
    } else if (returnTarget) {
      // The previous history entry is the calling page; popstate restores it.
      window.history.back();
    } else {
      window.history.pushState({}, "", "/");
      setProfileRoute(null);
      setActiveAppSection("map");
    }
  };
  // Open a river's detail page, remembering how to get back.
  const openRiverPage = (riverId: string, back?: ReturnTarget) => {
    window.history.pushState(
      { back: back ?? null },
      "",
      `/river/${encodeURIComponent(riverId)}`,
    );
    setReturnTarget(back ?? null);
    setProfileRoute(null);
    setGroupRoute(null);
    setRiverRoute(riverId);
  };
  const closeRiverPage = () => {
    if (returnTarget?.section) {
      restoreReturnSection(returnTarget);
    } else if (returnTarget) {
      window.history.back();
    } else {
      window.history.pushState({}, "", "/");
      setRiverRoute(null);
      setActiveAppSection("map");
    }
  };
  // Back from a club page: restore the caller's section if it lives in React
  // state (e.g. Discover), else browser-back to a URL-carried caller, else fall
  // back to the clubs list.
  const handleGroupBack = () => {
    if (returnTarget?.section) {
      restoreReturnSection(returnTarget);
    } else if (returnTarget) {
      window.history.back();
    } else {
      openGroup(null);
    }
  };
  const navigateSection = (section: AppSection) => {
    setActiveAppSection(section);
    if (parseGroupRoute() || parseProfileRoute() || parseRiverRoute()) {
      window.history.pushState({}, "", "/");
    }
    setGroupRoute(null);
    setProfileRoute(null);
    setRiverRoute(null);
    setReturnTarget(null);
  };
  useEffect(() => {
    const onPopState = () => {
      const route = parseGroupRoute();
      const profile = parseProfileRoute();
      setGroupRoute(route);
      setProfileRoute(profile);
      setRiverRoute(parseRiverRoute());
      setReturnTarget(
        (window.history.state?.back as ReturnTarget | undefined) ?? null,
      );
      if (route) {
        setActiveAppSection("groups");
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const [activeAdminPage, setActiveAdminPage] = useState<AdminPage>("index");
  // The left nav collapses by default at iPad width and below (<= 1024px). The
  // user can still toggle it; the auto-collapse only fires when the viewport
  // crosses the breakpoint, so a manual choice isn't clobbered on every resize.
  const [isAppNavCollapsed, setIsAppNavCollapsed] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 1024,
  );
  useEffect(() => {
    let wasNarrow = window.innerWidth <= 1024;
    const onResize = () => {
      const isNarrow = window.innerWidth <= 1024;
      if (isNarrow !== wasNarrow) {
        wasNarrow = isNarrow;
        setIsAppNavCollapsed(isNarrow);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const [theme, setTheme] = useState<"tide" | "daybreak" | "surge">(() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("rl-theme");
      if (saved === "surge" || saved === "daybreak" || saved === "tide") {
        return saved;
      }
    }
    return "surge";
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("rl-theme", theme);
    } catch {
      // ignore persistence errors
    }
  }, [theme]);
  const [activeSectionId, setActiveSectionId] = useState("");
  const [sectionFocusNonce, setSectionFocusNonce] = useState(0);
  const hasCenteredOnFirstRiverRef = useRef(false);
  const [pendingUnfavouriteSection, setPendingUnfavouriteSection] =
    useState<RiverSection | null>(null);
  const [pendingPromoteSuggestionId, setPendingPromoteSuggestionId] = useState<
    string | null
  >(null);
  const [promotingSuggestionId, setPromotingSuggestionId] = useState<
    string | null
  >(null);
  const [contributions, setContributions] = useState<Contribution[]>(() =>
    loadContributions(),
  );
  const [outboxRecords, setOutboxRecords] = useState<ContributionOutboxRecord[]>(
    [],
  );
  const [favouriteSectionIds, setFavouriteSectionIds] = useState<string[]>(() =>
    loadFavouriteSectionIds(),
  );
  const [favouriteRiverIds, setFavouriteRiverIds] = useState<string[]>(() =>
    loadFavouriteRiverIds(),
  );
  const [riverLevels, setRiverLevels] = useState<
    Record<string, SectionObservationMeasure | null>
  >({});
  const [routeSuggestions, setRouteSuggestions] = useState<RouteSuggestion[]>(
    loadRouteSuggestions,
  );
  const [approvedRouteSuggestions, setApprovedRouteSuggestions] = useState<
    RouteSuggestion[]
  >([]);
  const [routeAdjustments, setRouteAdjustments] = useState<RouteAdjustment[]>([]);
  const [communitySections, setCommunitySections] = useState<CommunitySection[]>(
    [],
  );
  const [canonicalRivers, setCanonicalRivers] = useState<CanonicalRiverSummary[]>(
    [],
  );
  const [sectionLevelStates, setSectionLevelStates] = useState<
    Map<string, SectionLevelState>
  >(() => new Map());
  useEffect(() => {
    let cancelled = false;
    fetchSectionLevelStates()
      .then((states) => {
        if (!cancelled) {
          setSectionLevelStates(
            new Map(states.map((state) => [state.sectionId, state])),
          );
        }
      })
      .catch(() => {
        // No level states available → section lines render neutral/grey.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [riverLevelStates, setRiverLevelStates] = useState<
    Map<string, RiverLevelState>
  >(() => new Map());
  useEffect(() => {
    let cancelled = false;
    fetchRiverLevelStates()
      .then((states) => {
        if (!cancelled) {
          setRiverLevelStates(
            new Map(states.map((state) => [state.riverId, state])),
          );
        }
      })
      .catch(() => {
        // No river level states → river markers keep their discipline colour.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [riverLevelLines, setRiverLevelLines] = useState<RiverLevelLine[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchRiverLevelLines()
      .then((lines) => {
        if (!cancelled) setRiverLevelLines(lines);
      })
      .catch(() => {
        // No river lines available → the level network simply isn't drawn.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [selectedCanonicalRiverId, setSelectedCanonicalRiverId] =
    useState<string | null>(null);
  // Whether the selected river filters/focuses the MAP (its POIs, amenities,
  // the "river:" layer chip). The panel + its data always follow the selected
  // river; this gates only the map-side filter so "Details" can open the panel
  // without touching the map. See the river popup (Details / Snap view / Select).
  const [riverFilterActive, setRiverFilterActive] = useState(false);
  // Explicit "fit the whole river" camera move (Select / Discover search),
  // replacing the old auto-flyToBounds-on-select.
  const [riverBoundsFocus, setRiverBoundsFocus] = useState<{
    bbox: [number, number, number, number];
    nonce: number;
  } | null>(null);
  const { selectRiver: selectDiscoveryRiver } = useDiscovery();
  useEffect(() => {
    selectDiscoveryRiver(selectedCanonicalRiverId);
  }, [selectedCanonicalRiverId, selectDiscoveryRiver]);
  const [isSelectedRiverPanelOpen, setIsSelectedRiverPanelOpen] =
    useState(false);
  const [isSelectedRiverPanelExpanded, setIsSelectedRiverPanelExpanded] =
    useState(false);
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
  // Map markers always open the quick-info popup (which offers Details / Snap).
  const markerClickMode: MarkerClickMode = "info";
  const [showRoutesLayer, setShowRoutesLayer] = useState(false);
  const [showRiverLayer, setShowRiverLayer] = useState(true);
  // Community photo points are a normal layer, on by default; the Layers control
  // owns visibility. Distinct from POI kinds — these are photo-type contributions.
  const [showPhotoLayer, setShowPhotoLayer] = useState(true);
  const [isLevelLegendOpen, setIsLevelLegendOpen] = useState(false);
  // The map layers control now lives in the floating action bar (a toggle),
  // not the header. This owns its open/closed state.
  const [isMapLayersOpen, setIsMapLayersOpen] = useState(false);
  const [riverDisciplineFilter, setRiverDisciplineFilter] = useState<
    "all" | "whitewater" | "touring"
  >("all");
  const [activePoiKinds, setActivePoiKinds] = useState<Set<string>>(
    // POIs are a normal layer, on by default; the Layers control owns visibility.
    () => new Set(["access", "hazard", "feature"]),
  );
  const [activeAmenityKinds, setActiveAmenityKinds] = useState<Set<string>>(
    () => new Set(),
  );
  const [showRain, setShowRain] = useState(false);
  const [rainFrames, setRainFrames] = useState<RainFrameInfo[]>([]);
  const [selectedRainTs, setSelectedRainTs] = useState(0);
  const [showPaddlerGauges, setShowPaddlerGauges] = useState(false);
  const [showAllStations, setShowAllStations] = useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  useEffect(() => {
    if (!showRain || rainFrames.length > 0) return;
    let cancelled = false;
    fetchRainFrames()
      .then((result) => {
        if (cancelled || result.frames.length === 0) return;
        setRainFrames(result.frames);
        const nowIndex = nearestNowFrameIndex(result.frames);
        setSelectedRainTs(result.frames[nowIndex].ts);
      })
      .catch(() => {
        // No frames available → the timebar simply doesn't render.
      });
    return () => {
      cancelled = true;
    };
  }, [showRain, rainFrames.length]);
  const mapLayerCategories = useMemo<FilterCategory[]>(
    () => [
      {
        id: "discipline",
        label: "Discipline",
        color: "#6ed7a6",
        kind: "filter",
        options: [
          { id: "discipline:whitewater", label: "Whitewater" },
          { id: "discipline:touring", label: "Touring" },
        ],
      },
      {
        id: "layers",
        label: "Layers",
        color: "#7db8f5",
        options: [
          { id: "rivers", label: "Rivers" },
          { id: "waterways", label: "Waterways" },
          { id: "routes", label: "Sections" },
        ],
      },
      {
        id: "pois",
        label: "POIs",
        color: "#ffce4d",
        options: [
          { id: "poi:access", label: "Access" },
          { id: "poi:hazard", label: "Hazards" },
          { id: "poi:feature", label: "Features" },
          { id: "photos", label: "Photos" },
        ],
      },
      {
        id: "weather",
        label: "Weather",
        color: "#b9a6ee",
        options: [{ id: "weather:rain", label: "Rain" }],
      },
      {
        id: "stations",
        label: "Stations",
        color: "#5fd0d9",
        options: [
          { id: "stations:paddler", label: "Paddler gauges" },
          { id: "stations:all", label: "All stations" },
        ],
      },
      {
        id: "amenities",
        label: "Amenities",
        color: "#e8b079",
        options: [
          { id: "amenity:pub", label: "Pubs" },
          { id: "amenity:car_park", label: "Car parks" },
          { id: "amenity:toilets", label: "Toilets" },
          { id: "amenity:cafe", label: "Cafés" },
          { id: "amenity:shop", label: "Shops" },
        ],
      },
    ],
    [],
  );
  const selectedMapLayers = useMemo(() => {
    const set = new Set<string>();
    if (selectedCanonicalRiverId && riverFilterActive) {
      set.add(`river:${selectedCanonicalRiverId}`);
    }
    if (riverDisciplineFilter !== "all") {
      set.add(`discipline:${riverDisciplineFilter}`);
    }
    if (showRiverLayer) set.add("rivers");
    if (showKnownRivers) set.add("waterways");
    if (showRoutesLayer) set.add("routes");
    if (showPhotoLayer) set.add("photos");
    for (const kind of activePoiKinds) set.add(`poi:${kind}`);
    for (const kind of activeAmenityKinds) set.add(`amenity:${kind}`);
    if (showRain) set.add("weather:rain");
    if (showPaddlerGauges) set.add("stations:paddler");
    if (showAllStations) set.add("stations:all");
    return set;
  }, [
    selectedCanonicalRiverId,
    riverFilterActive,
    riverDisciplineFilter,
    showRiverLayer,
    showKnownRivers,
    showRoutesLayer,
    showPhotoLayer,
    activePoiKinds,
    activeAmenityKinds,
    showRain,
    showPaddlerGauges,
    showAllStations,
  ]);
  const toggleMapLayer = (id: string) => {
    if (id.startsWith("river:")) {
      // The "River: <name>" focus pill — removing/toggling it exits focus.
      setSelectedCanonicalRiverId(null);
    } else if (id === "discipline:whitewater") {
      setRiverDisciplineFilter((current) =>
        current === "whitewater" ? "all" : "whitewater",
      );
    } else if (id === "discipline:touring") {
      setRiverDisciplineFilter((current) =>
        current === "touring" ? "all" : "touring",
      );
    } else if (id === "rivers") setShowRiverLayer((value) => !value);
    else if (id === "waterways") setShowKnownRivers((value) => !value);
    else if (id === "routes") setShowRoutesLayer((value) => !value);
    else if (id === "photos") setShowPhotoLayer((value) => !value);
    else if (id === "weather:rain") setShowRain((value) => !value);
    else if (id === "stations:paddler")
      setShowPaddlerGauges((value) => !value);
    else if (id === "stations:all") setShowAllStations((value) => !value);
    else if (id.startsWith("poi:")) {
      const kind = id.slice(4);
      setActivePoiKinds((previous) => {
        const next = new Set(previous);
        if (next.has(kind)) {
          next.delete(kind);
        } else {
          next.add(kind);
        }
        return next;
      });
    } else if (id.startsWith("amenity:")) {
      const kind = id.slice(8);
      setActiveAmenityKinds((previous) => {
        const next = new Set(previous);
        if (next.has(kind)) {
          next.delete(kind);
        } else {
          next.add(kind);
        }
        return next;
      });
    }
  };
  const clearMapLayers = () => {
    setSelectedCanonicalRiverId(null);
    setRiverDisciplineFilter("all");
    setShowRiverLayer(false);
    setShowKnownRivers(false);
    setShowRoutesLayer(false);
    setShowPhotoLayer(false);
    setActivePoiKinds(new Set());
    setActiveAmenityKinds(new Set());
    setShowRain(false);
    setShowPaddlerGauges(false);
    setShowAllStations(false);
  };
  const [allMapPois, setAllMapPois] = useState<MapPoi[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchAllMapPois()
      .then((pois) => {
        if (!cancelled) setAllMapPois(pois);
      })
      .catch(() => {
        // No global POIs available → POI filters render nothing.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const globalPois = useMemo(
    () => allMapPois.filter((poi) => activePoiKinds.has(poi.kind)),
    [allMapPois, activePoiKinds],
  );
  const [allAmenities, setAllAmenities] = useState<Amenity[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchAmenities()
      .then((result) => {
        if (!cancelled) setAllAmenities(result);
      })
      .catch(() => {
        // No amenities available → the amenity filters render nothing.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const displayedAmenities = useMemo(
    () =>
      allAmenities.filter((amenity) =>
        activeAmenityKinds.has(amenity.category),
      ),
    [allAmenities, activeAmenityKinds],
  );
  useEffect(() => {
    let cancelled = false;
    fetchStations()
      .then((result) => {
        if (!cancelled) setStations(result);
      })
      .catch(() => {
        // No stations available → the stations layer renders nothing.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const displayedStations = useMemo(() => {
    if (showAllStations) return stations;
    if (showPaddlerGauges) return stations.filter((s) => s.paddlerGauge);
    return [];
  }, [stations, showAllStations, showPaddlerGauges]);
  const mapDisplayRivers = useMemo(
    () =>
      riverDisciplineFilter === "all"
        ? canonicalRivers
        : canonicalRivers.filter(
            (river) =>
              river.discipline === "both" ||
              river.discipline === riverDisciplineFilter,
          ),
    [canonicalRivers, riverDisciplineFilter],
  );
  const [riverNationFilter, setRiverNationFilter] = useState("all");
  const riverNations = useMemo(() => {
    const nations = new Set<string>();
    for (const river of canonicalRivers) {
      if (river.nation) {
        nations.add(river.nation);
      }
    }
    return [...nations].sort();
  }, [canonicalRivers]);
  const [routeFormError, setRouteFormError] = useState("");
  const [routeRiverName, setRouteRiverName] = useState("");
  const [routeSectionName, setRouteSectionName] = useState("");
  const [routeDifficulty, setRouteDifficulty] = useState("");
  const [routeSummary, setRouteSummary] = useState("");
  const [routeAccessNotes, setRouteAccessNotes] = useState("");
  const [routeEvidence, setRouteEvidence] = useState("");
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
  const [routeSuggestionFocusId, setRouteSuggestionFocusId] = useState<string | null>(
    null,
  );
  const [routeSuggestionFocusNonce, setRouteSuggestionFocusNonce] = useState(0);
  const [routeAdjustmentFocusId, setRouteAdjustmentFocusId] = useState<string | null>(
    null,
  );
  const [routeAdjustmentFocusNonce, setRouteAdjustmentFocusNonce] = useState(0);
  const [selectedPoi, setSelectedPoi] = useState<SelectedPoi | null>(null);
  const [poiContributions, setPoiContributions] = useState<Contribution[]>([]);
  const [isPoiDetailExpanded, setIsPoiDetailExpanded] = useState(false);
  const [detailFocusLocation, setDetailFocusLocation] =
    useState<LatLngTuple | null>(null);
  const [detailFocusPlacement, setDetailFocusPlacement] =
    useState<MapFocusPlacement>("center");
  const [detailFocusNonce, setDetailFocusNonce] = useState(0);
  const [selectedTargetLabel, setSelectedTargetLabel] = useState(
    "Selected map location",
  );
  const [isAddMode, setIsAddMode] = useState(false);
  const [addModeTargetPoiId, setAddModeTargetPoiId] = useState<string | null>(
    null,
  );
  const [isSyncingOutbox, setIsSyncingOutbox] = useState(false);
  const [, setSyncMessage] = useState("");
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
  const [nameDraft, setNameDraft] = useState("");
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
  const [sourceCandidatePois, setSourceCandidatePois] = useState<
    SourceCandidatePoi[]
  >([]);
  const [moderationDraftDecisions, setModerationDraftDecisions] = useState<
    Record<string, ModerationDraftDecision>
  >({});
  const [routeModerationDraftDecisions, setRouteModerationDraftDecisions] =
    useState<Record<string, RouteModerationDraftDecision>>({});
  const [routeAdjustmentDraftDecisions, setRouteAdjustmentDraftDecisions] =
    useState<Record<string, RouteAdjustmentDraftDecision>>({});
  const [sourceCandidateDraftStatuses, setSourceCandidateDraftStatuses] =
    useState<Record<string, SourceCandidateDraftStatus>>({});
  const [moderationTab, setModerationTab] =
    useState<ModerationTab>("route-edits");
  const [isModerationLoading, setIsModerationLoading] = useState(false);
  const [moderationMessage, setModerationMessage] = useState("");
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
  const [selectedRiverMapPois, setSelectedRiverMapPois] = useState<MapPoi[]>([]);
  const [mapPoiReviewMessage, setMapPoiReviewMessage] = useState("");
  const [isMapPoiReviewSaving, setIsMapPoiReviewSaving] = useState(false);
  const [isPoiStatusSaving, setIsPoiStatusSaving] = useState(false);
  const [authSheetMode, setAuthSheetMode] = useState<AuthSheetMode | null>(null);
  const [isContributorOnrampOpen, setIsContributorOnrampOpen] = useState(false);
  const [pendingContributorAction, setPendingContributorAction] = useState<
    (() => void) | null
  >(null);
  const [isWelcomeDismissedForSession, setIsWelcomeDismissedForSession] =
    useState(() => hasDismissedWelcomeForSession());
  const [syncBannerDismissal, setSyncBannerDismissal] =
    useState<SyncBannerDismissal | null>(() => loadSyncBannerDismissal());
  const [searchMode, setSearchMode] = useState<SearchMode>("name");
  const [profileMode, setProfileMode] = useState<ProfileMode>("account");
  const [riverSearchTerm, setRiverSearchTerm] = useState("");
  const [clubSearchTerm, setClubSearchTerm] = useState("");
  const [discoveredClubs, setDiscoveredClubs] = useState<GroupPublic[]>([]);
  const [clubsLoading, setClubsLoading] = useState(false);
  useEffect(() => {
    if (activeAppSection !== "discover" || searchMode !== "clubs") {
      return;
    }
    let active = true;
    setClubsLoading(true);
    const timer = window.setTimeout(() => {
      void discoverClubs(clubSearchTerm)
        .then((clubs) => {
          if (active) setDiscoveredClubs(clubs);
        })
        .catch(() => {
          if (active) setDiscoveredClubs([]);
        })
        .finally(() => {
          if (active) setClubsLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAppSection, searchMode, clubSearchTerm]);
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
    () => [
      ...canonicalRivers.map(canonicalRiverToOverviewSection),
      ...communitySections.map((section) =>
        communitySectionToRiverSection(
          section,
          canonicalRivers.find((river) => river.id === section.riverId)
            ?.displayName,
        ),
      ),
    ],
    [canonicalRivers, communitySections],
  );
  const activeSection = useMemo(
    () =>
      appRiverSections.find((section) => section.id === activeSectionId) ??
      appRiverSections[0] ??
      emptyCanonicalOverviewSection,
    [activeSectionId, appRiverSections],
  );
  const selectedCanonicalRiver = useMemo(
    () =>
      selectedCanonicalRiverId
        ? canonicalRivers.find((river) => river.id === selectedCanonicalRiverId) ??
          null
        : null,
    [canonicalRivers, selectedCanonicalRiverId],
  );
  // Selecting a river puts it on the layers bar as the first, removable "River"
  // filter pill (the focus chip). Removing it exits focus — see toggleMapLayer.
  const mapLayerCategoriesWithRiver = useMemo<FilterCategory[]>(
    () =>
      selectedCanonicalRiver
        ? [
            {
              id: "river",
              label: "River",
              color: "#3f7cac",
              kind: "filter",
              options: [
                {
                  id: `river:${selectedCanonicalRiver.id}`,
                  label: selectedCanonicalRiver.displayName,
                },
              ],
            },
            ...mapLayerCategories,
          ]
        : mapLayerCategories,
    [mapLayerCategories, selectedCanonicalRiver],
  );
  const fallbackSectionMapPois = useMemo(
    () => fallbackMapPoisForSection(activeSection),
    [activeSection],
  );
  const visibleSectionMapPois = isSectionMapPoisLoaded
    ? sectionMapPois
    : fallbackSectionMapPois;
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
  const currentContributionOption = optionForType(contributionType);
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
  const hasVerifiedEmail = Boolean(authState.user?.emailVerified);
  const hasContributorPublicName = Boolean(memberProfile?.publicName?.trim());
  const hasAcceptedContributorTerms = hasAcceptedCurrentContributorTerms(
    memberProfile?.contributorTermsVersion,
  );
  const canContribute = evaluateContributorGate({
    isSignedIn,
    emailVerified: hasVerifiedEmail,
    hasPublicName: hasContributorPublicName,
    hasAcceptedTerms: hasAcceptedContributorTerms,
    requireEmailVerification: REQUIRE_EMAIL_VERIFICATION,
  });
  const isLiveLocationSupported =
    typeof navigator !== "undefined" &&
    "geolocation" in navigator &&
    // Browsers block geolocation on insecure origins (e.g. http on a LAN IP),
    // where it would otherwise surface as a misleading "permission denied".
    (typeof window === "undefined" || window.isSecureContext);
  const liveLocationAlert =
    // Only nag for runtime failures (denied/error). "unavailable" is
    // environmental (no geolocation / insecure origin) — shown inline, not toasted.
    liveLocationStatus === "denied" || liveLocationStatus === "error"
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
  const favouriteRivers = canonicalRivers.filter((river) =>
    favouriteRiverIds.includes(river.id),
  );
  const isActiveSectionFavourite =
    isSignedIn && favouriteSectionIds.includes(activeSection.id);
  const canAccessAdminTools = hasModeratorAccess(memberProfile?.role);
  const canManageMembers = hasAdminAccess(memberProfile?.role);
  const filteredSearchRivers = useMemo(() => {
    const term = riverSearchTerm.trim().toLowerCase();
    return canonicalRivers.filter((river) => {
      const disciplineOk =
        riverDisciplineFilter === "all" ||
        river.discipline === "both" ||
        river.discipline === riverDisciplineFilter;
      const nationOk =
        riverNationFilter === "all" || river.nation === riverNationFilter;
      const nameOk =
        !term ||
        [
          river.displayName,
          river.canonicalName,
          river.region,
          river.nation,
        ].some((value) => (value ?? "").toLowerCase().includes(term));
      return disciplineOk && nationOk && nameOk;
    });
  }, [
    canonicalRivers,
    riverSearchTerm,
    riverDisciplineFilter,
    riverNationFilter,
  ]);
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
    const mapPoiId = selectedPoi?.mapPoi?.id;
    if (!mapPoiId) {
      setPoiContributions([]);
      return;
    }

    let active = true;
    fetchMapPoiContributions(mapPoiId)
      .then((list) => {
        if (active) setPoiContributions(list);
      })
      .catch(() => {
        if (active) setPoiContributions([]);
      });
    return () => {
      active = false;
    };
  }, [selectedPoi?.mapPoi?.id]);

  useEffect(() => {
    void loadCanonicalRivers();
    void loadCommunitySections();
  }, []);

  useEffect(() => {
    if (!selectedCanonicalRiverId) return;
    void loadCommunitySections();
  }, [selectedCanonicalRiverId]);

  // On first load, centre the map on the first river once its record arrives;
  // the initial empty overview otherwise parks the map on empty space.
  useEffect(() => {
    if (hasCenteredOnFirstRiverRef.current || !canonicalRivers.length) {
      return;
    }
    hasCenteredOnFirstRiverRef.current = true;
    setSectionFocusNonce((current) => current + 1);
  }, [canonicalRivers]);

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
          : activeAppSection === "discover"
            ? `Discover ${searchMode}`
            : activeAppSection === "map"
              ? `Map ${activeSection.sectionName}`
              : activeAppSection;
    const path =
      activeAppSection === "admin"
        ? `/admin/${activeAdminPage}`
        : activeAppSection === "profile"
          ? `/profile/${profileMode}`
          : activeAppSection === "discover"
            ? `/discover/${searchMode}`
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
      setLiveLocationMessage(
        typeof window !== "undefined" && !window.isSecureContext
          ? "Live location needs a secure (HTTPS) connection — unavailable on this address."
          : "Location sharing is not available in this browser.",
      );
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

  // After a fresh sign-in within the session, land on the Dashboard. The ref
  // skips the initial load (already-signed-in users keep the default view), and
  // the sessionStorage flag carries the intent across the full-page redirects
  // used by /signup and installed-PWA Google sign-in.
  const prevSignedInRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (authState.status === "loading") {
      return;
    }
    const signedIn = Boolean(authState.user);
    const previouslySignedIn = prevSignedInRef.current;
    prevSignedInRef.current = signedIn;
    if (!signedIn) {
      return;
    }
    const pendingLanding = sessionStorage.getItem("postAuthLanding");
    if (parseGroupRoute()) {
      // Signed in while on a group entity URL (e.g. an invite link) — stay on
      // the group rather than bouncing to the dashboard.
      sessionStorage.removeItem("postAuthLanding");
      setActiveAppSection("groups");
    } else if (previouslySignedIn === false || pendingLanding === "dashboard") {
      sessionStorage.removeItem("postAuthLanding");
      setActiveAppSection("dashboard");
    }
  }, [authState.status, authState.user]);

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
          setNameDraft(member.displayName ?? "");
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

  // Surface a live-location problem (denied/unavailable/error) as a dismissible,
  // auto-clearing notification rather than a persistent top-bar message.
  useEffect(() => {
    if (liveLocationAlert) {
      showAppNotification(liveLocationAlert, "error");
    }
  }, [liveLocationAlert]);

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

    if (isCanonicalOverviewSection(activeSection)) {
      setIsSectionMapPoisLoaded(true);
      return () => {
        isMounted = false;
      };
    }

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

    setSelectedRiverMapPois([]);

    if (!selectedCanonicalRiverId) {
      return () => {
        isMounted = false;
      };
    }

    fetchRiverMapPois(selectedCanonicalRiverId)
      .then((pois) => {
        if (isMounted) {
          setSelectedRiverMapPois(pois);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSelectedRiverMapPois([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [authState.user?.uid, selectedCanonicalRiverId]);

  useEffect(() => {
    let isMounted = true;

    if (isCanonicalOverviewSection(activeSection)) {
      return () => {
        isMounted = false;
      };
    }

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
    saveFavouriteRiverIds(favouriteRiverIds);
  }, [favouriteRiverIds]);

  // Shared cache of each river's primary-gauge level, used by the Dashboard
  // (favourites, eagerly) and Discover (lazily, as cards scroll in).
  // requestRiverLevel dedupes via a ref so it stays a stable callback; failures
  // and gauge-less rivers resolve to null so cards stay honest ("No live gauge").
  const requestedRiverLevels = useRef(new Set<string>());
  const requestRiverLevel = useCallback((riverId: string) => {
    if (requestedRiverLevels.current.has(riverId)) {
      return;
    }
    requestedRiverLevels.current.add(riverId);
    void (async () => {
      let measure: SectionObservationMeasure | null = null;
      try {
        // River gauges are keyed by river (river_measure_links) — pick the
        // primary measure from the river's observations.
        const measures = await fetchRiverObservations(riverId, 48);
        measure = getPrimaryObservationMeasure(measures) ?? null;
      } catch {
        measure = null;
      }
      setRiverLevels((current) => ({ ...current, [riverId]: measure }));
    })();
  }, []);

  useEffect(() => {
    if (activeAppSection !== "dashboard" || !isSignedIn) {
      return;
    }
    for (const riverId of favouriteRiverIds) {
      requestRiverLevel(riverId);
    }
  }, [activeAppSection, isSignedIn, favouriteRiverIds, requestRiverLevel]);

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
    const contributionId = generateUuid();
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

    // A contribution added from a canonical-river overview otherwise inherits the
    // overview's pseudo-section id, which the map never loads — orphaning it. When
    // there's no explicit POI target, anchor it to the focused river's nearest POI
    // so it lands on a real, loadable section (and, when the POI is close enough,
    // links to it so the photo surfaces via that point's badge).
    let resolvedSectionId = activeSection.id;
    let resolvedMapPoiId = addModeTargetPoiId ?? undefined;
    if (
      !resolvedMapPoiId &&
      location &&
      isCanonicalOverviewSection(activeSection) &&
      selectedRiverMapPois.length > 0
    ) {
      let nearestPoi: MapPoi | null = null;
      let nearestMeters = Infinity;
      for (const poi of selectedRiverMapPois) {
        const meters = distanceMetersToRoute(location, [poi.location]);
        if (meters < nearestMeters) {
          nearestMeters = meters;
          nearestPoi = poi;
        }
      }
      if (nearestPoi) {
        resolvedSectionId = nearestPoi.sectionId;
        if (nearestMeters <= NEAREST_POI_ATTACH_METERS) {
          resolvedMapPoiId = nearestPoi.id;
        }
      }
    }

    const nextContribution: Contribution = {
      id: contributionId,
      sectionId: resolvedSectionId,
      mapPoiId: resolvedMapPoiId,
      type: contributionType,
      title: safeTitle,
      detail: safeDetail,
      category,
      severity: contributionType === "hazard" ? severity : undefined,
      status: "pending",
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
    if (
      nextContribution.mapPoiId &&
      nextContribution.mapPoiId === selectedPoi?.mapPoi?.id
    ) {
      setPoiContributions((current) => [nextContribution, ...current]);
    }
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
    setAddModeTargetPoiId(null);
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
      // Return to the map and re-show the login screen.
      setActiveAppSection("map");
      setIsWelcomeDismissedForSession(false);
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

  // Gated entry to the contribution flow: sign-in, then the contributor
  // identity on-ramp (verified email + public name + accepted terms), then add.
  // Ensures the member meets the contributor identity gate before any
  // contribution action (add, confirm, correct): routes to sign-in, then the
  // on-ramp, then runs the action. On-ramp completion re-runs the stored action.
  function ensureContributorIdentity(proceed: () => void) {
    if (!isSignedIn) {
      requireSignInForSave();
      return;
    }
    if (!canContribute) {
      setPendingContributorAction(() => proceed);
      setIsContributorOnrampOpen(true);
      return;
    }
    proceed();
  }

  function requestAddContribution(nextType?: ContributionType) {
    ensureContributorIdentity(() => {
      setAddModeTargetPoiId(null);
      if (nextType) {
        startAddMode(nextType);
      } else {
        startAddMode();
      }
    });
  }

  // CON-F19: add a report/photo attached to an existing POI rather than dropping
  // a duplicate marker. Falls back to a standalone add for non-map POIs.
  function requestAddToPoi(poi: SelectedPoi, nextType: ContributionType) {
    const mapPoiId = poi.mapPoi?.id ?? null;
    ensureContributorIdentity(() => {
      if (mapPoiId) {
        startAddModeForPoi(poi, mapPoiId, nextType);
      } else {
        setAddModeTargetPoiId(null);
        startAddMode(nextType);
      }
    });
  }

  function startAddModeForPoi(
    poi: SelectedPoi,
    mapPoiId: string,
    nextType: ContributionType,
  ) {
    setRouteCreateMode("idle");
    setRouteDraftTarget({ type: "new" });
    setRouteDraftPoints([]);
    setRouteDraftOriginalPoints(null);
    setRouteDraftSnapMessage("");
    setAddModeTargetPoiId(mapPoiId);
    chooseContributionType(nextType);
    setSelectedLocation(poi.location);
    setSearchFocusLocation(null);
    setSearchFocusLabel("Searched location");
    setShowSearchFocusMarker(false);
    setSelectedPoi(null);
    setIsPoiDetailExpanded(false);
    setIsAddMode(false);
    setIsFormOpen(true);
    setSelectedTargetLabel(`On ${poi.title}`);
    setFormError("");
  }

  function closeContributorOnramp() {
    setIsContributorOnrampOpen(false);
    setPendingContributorAction(null);
  }

  function handleContributorOnrampReady() {
    const action = pendingContributorAction;
    setIsContributorOnrampOpen(false);
    setPendingContributorAction(null);
    action?.();
  }

  async function handleResendVerificationEmail(): Promise<ContributorActionResult> {
    try {
      await sendCurrentUserEmailVerification();
      return {
        ok: true,
        message: `Verification email sent${
          authState.user?.email ? ` to ${authState.user.email}` : ""
        }.`,
      };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not send the verification email.",
      };
    }
  }

  async function handleRefreshEmailVerification(): Promise<ContributorActionResult> {
    try {
      const refreshed = await reloadCurrentUser();
      if (refreshed) {
        setAuthState({ status: "ready", user: refreshed, error: null });
      }
      if (refreshed?.emailVerified) {
        return { ok: true, message: "Email verified — thank you." };
      }
      return {
        ok: false,
        message: "Not verified yet. Open the link in the email, then refresh.",
      };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not refresh your verification status.",
      };
    }
  }

  async function handleSetContributorPublicName(
    name: string,
  ): Promise<ContributorActionResult> {
    try {
      const updated = await updateMyProfile({ publicName: name });
      setMemberProfile(updated);
      setPublicNameDraft(updated.publicName ?? "");
      return {
        ok: true,
        message: updated.publicName
          ? `You'll post as ${updated.publicName}.`
          : undefined,
      };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not save your public name.",
      };
    }
  }

  async function handleAcceptContributorTermsAction(): Promise<ContributorActionResult> {
    try {
      const updated = await acceptContributorTerms(CONTRIBUTOR_TERMS_VERSION);
      setMemberProfile(updated);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not record your acceptance.",
      };
    }
  }

  function enableLiveLocation(shouldFocus = false) {
    if (!isLiveLocationSupported) {
      setLiveLocationStatus("unavailable");
      setLiveLocationMessage(
        typeof window !== "undefined" && !window.isSecureContext
          ? "Live location needs a secure (HTTPS) connection — unavailable on this address."
          : "Location sharing is not available in this browser.",
      );
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

  async function saveName() {
    if (!authState.user) {
      requireSignInForSave();
      return;
    }
    if (!nameDraft.trim()) {
      showAppNotification("Add your name.", "error");
      return;
    }
    setIsProfileSaving(true);
    try {
      // Update the Firebase displayName, then re-fetch the member (GET /api/me
      // upserts → syncs display_name from the refreshed token).
      await updateMyDisplayName(nameDraft.trim());
      const updatedMember = await fetchCurrentMember();
      setMemberProfile(updatedMember);
      setNameDraft(updatedMember.displayName ?? "");
      showAppNotification("Name saved.");
    } catch (error) {
      showAppNotification(
        error instanceof Error ? error.message : "Could not save your name.",
        "error",
      );
    } finally {
      setIsProfileSaving(false);
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
    setSelectedCanonicalRiverId(
      isCanonicalOverviewSection(section)
        ? section.id.replace("canonical-river:", "")
        : null,
    );
    setIsSelectedRiverPanelOpen(isCanonicalOverviewSection(section));
    setIsSelectedRiverPanelExpanded(false);
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

  async function loadCanonicalRivers() {
    try {
      const rivers = await fetchCanonicalRivers();
      setCanonicalRivers(rivers);
      setSelectedCanonicalRiverId((current) =>
        current && rivers.some((river) => river.id === current) ? current : null,
      );
      setActiveSectionId((current) => {
        if (
          current &&
          rivers.some((river) => canonicalRiverOverviewSectionId(river.id) === current)
        ) {
          return current;
        }

        return rivers[0] ? canonicalRiverOverviewSectionId(rivers[0].id) : "";
      });
    } catch {
      setCanonicalRivers([]);
      setSelectedCanonicalRiverId(null);
      setIsSelectedRiverPanelOpen(false);
      setActiveSectionId("");
    }
  }

  // Canonical, community-promoted sections (routes.ts). Public + unauthenticated;
  // loaded whole (the catalogue is community-origin only, so it stays small) on
  // app load and again whenever a river is selected, so a freshly promoted
  // section shows up without a full reload.
  async function loadCommunitySections() {
    try {
      setCommunitySections(await fetchPublicSections());
    } catch {
      setCommunitySections([]);
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
    setSourceCandidatePois([]);
    setSourceCandidateDraftStatuses({});

    try {
      const [
        contributions,
        mapPoiReviews,
        routeSuggestions,
        routeAdjustments,
        sourceCandidates,
      ] = await Promise.all([
        fetchModerationContributions(),
        fetchModerationMapPoiReviews(),
        fetchModerationRouteSuggestions(),
        fetchModerationRouteAdjustments(),
        fetchSourceCandidatePois({ status: "review_needed", limit: 150 }),
      ]);
      setModerationContributions(contributions);
      setModerationMapPoiReviews(mapPoiReviews);
      setModerationRouteSuggestions(routeSuggestions);
      setModerationRouteAdjustments(routeAdjustments);
      setRouteAdjustments(routeAdjustments);
      setSourceCandidatePois(sourceCandidates);
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

  async function applySourceCandidateStatus(candidate: SourceCandidatePoi) {
    const status = sourceCandidateDraftStatuses[candidate.id];

    if (!status) {
      return;
    }

    setModerationMessage("");
    setIsModerationLoading(true);

    try {
      const updatedCandidate = await updateSourceCandidatePoiStatus(
        candidate.id,
        status,
      );
      setSourceCandidatePois((current) =>
        status === "review_needed"
          ? current.map((item) =>
              item.id === updatedCandidate.id ? updatedCandidate : item,
            )
          : current.filter((item) => item.id !== updatedCandidate.id),
      );
      setSourceCandidateDraftStatuses((current) => {
        const next = { ...current };
        delete next[candidate.id];
        return next;
      });
      void loadCanonicalRivers();
      setModerationMessage(`Updated ${updatedCandidate.title}.`);
    } catch (error) {
      setModerationMessage(
        error instanceof Error
          ? error.message
          : "Could not update source candidate.",
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

  // Promote an approved route suggestion into a canonical, published section.
  // A distinct, explicit second moderator action from approve — never
  // automatic — with a confirm step (see docs/development/plan-community-sections.md).
  async function confirmPromoteRouteSuggestion(suggestion: RouteSuggestion) {
    setModerationMessage("");
    setPromotingSuggestionId(suggestion.id);

    try {
      await promoteRouteSuggestionToSection(suggestion.id);
      setPendingPromoteSuggestionId(null);
      setModerationRouteSuggestions(await fetchModerationRouteSuggestions());
      await loadCommunitySections();
      setModerationMessage(`Promoted ${suggestion.sectionName} to a section.`);
    } catch (error) {
      setModerationMessage(
        error instanceof Error ? error.message : "Could not promote this suggestion.",
      );
    } finally {
      setPromotingSuggestionId(null);
    }
  }

  function viewPromotedSection(routeId: string) {
    const section = appRiverSections.find((item) => item.id === routeId);
    if (!section) {
      showAppNotification("That section hasn't loaded yet — try again shortly.", "error");
      return;
    }
    selectSection(section);
    setActiveAppSection("map");
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
        updatedAdjustment.targetType === "section" &&
        updatedAdjustment.targetId === activeSection.id
      ) {
        setSectionFocusNonce((current) => current + 1);
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


  function startRouteSuggestionMode(
    watercourse?: KnownWatercourse,
    riverNameOverride?: string,
  ) {
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
    setRouteRiverName(
      watercourse?.name ?? riverNameOverride ?? activeSection.riverName,
    );
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
      id: generateUuid(),
      ...suggestionInput,
      status: "local-draft",
      author:
        memberProfile?.publicName ??
        memberProfile?.displayName ??
        authState.user?.displayName ??
        "Route contributor",
      createdAt: new Date().toISOString(),
      promotedRouteId: null,
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
    setAddModeTargetPoiId(null);
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
    const isRiverOverview = isCanonicalOverviewSection(section);
    setActiveSectionId(section.id);
    setSelectedCanonicalRiverId(
      isRiverOverview ? section.id.replace("canonical-river:", "") : null,
    );
    setIsSelectedRiverPanelOpen(isRiverOverview);
    setIsSelectedRiverPanelExpanded(false);
    setSelectedPoi(null);
    setIsPoiDetailExpanded(false);
    setShowRoutesLayer(!isRiverOverview);
    setSectionFocusNonce((current) => current + 1);
    setSearchFocusLocation(null);
    setSearchFocusLabel("Searched location");
    setShowSearchFocusMarker(false);
    void trackProductEvent("select_content", {
      content_type: "route",
      item_id: section.id,
      river_name: section.riverName,
    });
  }

  function focusRiverBounds(bbox: [number, number, number, number]) {
    setRiverBoundsFocus((prev) => ({ bbox, nonce: (prev?.nonce ?? 0) + 1 }));
  }

  // Select a canonical river. `filter` toggles the map filter/focus, `zoom`
  // moves the camera ("point" = centre on it, "bounds" = fit the whole river,
  // "none" = leave the map), and `panel` opens the detail panel ("small",
  // "full", or "none"). Drives the three river-popup buttons + Discover search.
  function selectCanonicalRiver(
    riverId: string | null,
    options: {
      filter?: boolean;
      zoom?: "point" | "bounds" | "none";
      panel?: "small" | "full" | "none";
    } = {},
  ) {
    const { filter = true, zoom = "bounds", panel = "small" } = options;
    const has = Boolean(riverId);
    setSelectedCanonicalRiverId(riverId);
    setRiverFilterActive(has && filter);
    setIsSelectedRiverPanelOpen(has && panel !== "none");
    setIsSelectedRiverPanelExpanded(has && panel === "full");
    const river = riverId
      ? canonicalRivers.find((item) => item.id === riverId)
      : null;
    if (river) {
      if (zoom === "point") {
        // "or-center" so it centres on desktop too — plain "mobile-top-half"
        // is a no-op above the mobile breakpoint.
        focusDetailLocation(river.centre, "mobile-top-half-or-center");
      } else if (zoom === "bounds") {
        focusRiverBounds(river.bbox);
      }
    }
    setSelectedPoi(null);
    setIsPoiDetailExpanded(false);
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
  }

  // Closing the river panel keeps the map where it is — no snap-back.
  function closeSelectedRiverPanel() {
    setIsSelectedRiverPanelOpen(false);
    setIsSelectedRiverPanelExpanded(false);
  }

  function focusDetailLocation(
    location: LatLngTuple,
    placement: MapFocusPlacement,
  ) {
    setDetailFocusLocation(location);
    setDetailFocusPlacement(placement);
    setDetailFocusNonce((current) => current + 1);
  }

  function openRouteDetails(section: RiverSection) {
    setActiveSectionId(section.id);
    setSelectedPoi(null);
    setIsPanelOpen(true);
    // The river panel occupies the same slot — never show both stacked.
    setIsSelectedRiverPanelOpen(false);
    void trackProductEvent("select_content", {
      content_type: "route_details",
      item_id: section.id,
      river_name: section.riverName,
    });
  }

  function openPoiDetails(
    poi: SelectedPoi,
    options: OpenPoiDetailsOptions = {},
  ) {
    setSelectedPoi(poi);
    setIsPoiDetailExpanded(options.expand ?? false);
    setIsSelectedRiverPanelOpen(false);
    setIsSelectedRiverPanelExpanded(false);
    if (options.focusMap) {
      focusDetailLocation(poi.location, options.focusPlacement ?? "center");
    }
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

  function closePoiDetails() {
    // Keep the map where it is on close — tapping a POI's map icon flies the
    // map to it; closing the panel should NOT snap back to the prior view.
    setSelectedPoi(null);
    setIsPoiDetailExpanded(false);
    setIsSelectedRiverPanelOpen(false);
    setIsSelectedRiverPanelExpanded(false);
  }

  async function submitMapPoiReview(
    poi: MapPoi,
    decision: MapPoiReviewDecision,
    action: "add" | "remove" = "add",
    note?: string,
  ) {
    if (!canContribute) {
      ensureContributorIdentity(() => {
        void submitMapPoiReview(poi, decision, action, note);
      });
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

  function toggleFavouriteRiver(riverId: string) {
    if (!isSignedIn) {
      requireSignInForSave();
      return;
    }

    setFavouriteRiverIds((current) =>
      current.includes(riverId)
        ? current.filter((id) => id !== riverId)
        : [...current, riverId],
    );
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
  const isCanonicalRiverOverviewActive = isCanonicalOverviewSection(activeSection);

  return (
    <main
      className={`app-shell ${
        activeAppSection === "map" && !riverRoute && !profileRoute
          ? ""
          : "app-shell--content-only"
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
          onSelectSection={navigateSection}
          onSignIn={handleSignIn}
        />

        <section
          className={`app-view ${
            activeAppSection === "map" && !profileRoute
              ? "app-view--with-topbar"
              : ""
          }`}
        >
      {activeAppSection === "map" && !profileRoute && !riverRoute ? (
        <section className="topbar" aria-label="Map controls">
          <div className="topbar-actions">
            <MapFilterControl
              variant="summary"
              categories={mapLayerCategoriesWithRiver}
              selected={selectedMapLayers}
              onToggle={toggleMapLayer}
              onClear={clearMapLayers}
              onExpandedChange={setIsMapLayersOpen}
            />
            {authMessage || authState.error ? (
              <p className="topbar-message">
                {authMessage || authState.error}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
      {activeAppSection === "map" && !profileRoute && !riverRoute ? (
        <div className="map-floating-actions">
          <MapFilterControl
            variant="floating"
            categories={mapLayerCategoriesWithRiver}
            selected={selectedMapLayers}
            onToggle={toggleMapLayer}
            onClear={clearMapLayers}
            expanded={isMapLayersOpen}
            onExpandedChange={setIsMapLayersOpen}
          />
          <MapActions>
            <MapActionButton
              label={isMapLayersOpen ? "Hide map layers" : "Map layers"}
              active={isMapLayersOpen}
              onClick={() => setIsMapLayersOpen((value) => !value)}
            >
              <Layers size={19} />
            </MapActionButton>
            <MapActionButton
              label={isLevelLegendOpen ? "Hide legend" : "Show legend"}
              active={isLevelLegendOpen}
              onClick={() => setIsLevelLegendOpen((value) => !value)}
            >
              <Palette size={19} />
            </MapActionButton>
            <MapActionButton
              label={
                isLiveLocationEnabled
                  ? "Centre on my location"
                  : "Show my location"
              }
              active={isLiveLocationEnabled}
              onClick={handleLiveLocationButtonClick}
            >
              <Navigation size={19} />
            </MapActionButton>
            <MapActionButton
              label="Add local knowledge"
              onClick={() => requestAddContribution()}
            >
              <Plus size={19} />
            </MapActionButton>
            <MapActionButton
              label="Suggest a section"
              active={routeCreateMode !== "idle" && routeDraftTarget.type === "new"}
              onClick={() => startRouteSuggestionMode()}
            >
              <span className="map-action-combo">
                <Route size={18} />
                <Plus
                  size={11}
                  strokeWidth={3}
                  className="map-action-combo__plus"
                />
              </span>
            </MapActionButton>
            <MapActionButton
              label={syncActionLabel({ queuedOutboxCount, isSyncingOutbox })}
              badge={queuedOutboxCount > 0}
              onClick={() => {
                if (canSyncOutbox) syncOutboxNow();
              }}
            >
              <RefreshCw size={18} />
            </MapActionButton>
          </MapActions>
        </div>
      ) : null}
      {activeAppSection === "map" && showRain && rainFrames.length > 0 ? (
        <WeatherTimebar
          frames={rainFrames}
          selectedTs={selectedRainTs}
          onSelect={setSelectedRainTs}
        />
      ) : null}
          {riverRoute ? (
            <section className="app-page app-page--river">
              <div className="app-page__content app-page__content--wide">
                <RiverDetailPage
                  riverId={riverRoute}
                  onBack={closeRiverPage}
                  onViewOnMap={(riverId) => {
                    setRiverRoute(null);
                    setReturnTarget(null);
                    window.history.pushState({}, "", "/");
                    selectCanonicalRiver(riverId, { zoom: "bounds" });
                    setActiveAppSection("map");
                  }}
                  onViewPoiOnMap={(poi) => {
                    if (!riverRoute) return;
                    setRiverRoute(null);
                    setReturnTarget(null);
                    window.history.pushState({}, "", "/");
                    selectCanonicalRiver(riverRoute, {
                      zoom: "none",
                      panel: "none",
                    });
                    focusDetailLocation(poi.location, "center");
                    setActiveAppSection("map");
                  }}
                  onOpenPhoto={setLightboxPhoto}
                />
              </div>
            </section>
          ) : profileRoute ? (
            <section className="app-page app-page--profile">
              <div className="app-page__content">
                <PublicProfilePage
                  token={profileRoute}
                  onBack={closeProfile}
                  backLabel={returnTarget?.label ?? "Back"}
                  onOpenPhoto={setLightboxPhoto}
                />
              </div>
            </section>
          ) : activeAppSection === "map" ? (
      <section className="workspace">
        {selectedCanonicalRiver && !isSelectedRiverPanelOpen ? (
          <button
            className="map-river-details"
            type="button"
            onClick={() =>
              openRiverPage(selectedCanonicalRiver.id, {
                label: "Map",
                section: "map",
              })
            }
          >
            <MapPinned size={15} />
            River details
          </button>
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

        <RiverMap
          sections={appRiverSections}
          activeSection={activeSection}
          canonicalRivers={mapDisplayRivers}
          selectedCanonicalRiver={selectedCanonicalRiver}
          isSelectedRiverPanelOpen={isSelectedRiverPanelOpen}
          isSelectedRiverPanelExpanded={isSelectedRiverPanelExpanded}
          isPoiDetailsOpen={Boolean(selectedPoi)}
          mapPois={visibleSectionMapPois}
          selectedRiverMapPois={selectedRiverMapPois}
          favouriteRiverIds={favouriteRiverIds}
          onToggleFavouriteRiver={toggleFavouriteRiver}
          onSuggestSection={(riverName) => {
            setIsSelectedRiverPanelOpen(false);
            startRouteSuggestionMode(undefined, riverName);
          }}
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
          detailFocusLocation={detailFocusLocation}
          detailFocusPlacement={detailFocusPlacement}
          detailFocusNonce={detailFocusNonce}
          riverFilterActive={riverFilterActive}
          riverBoundsFocus={riverBoundsFocus}
          searchFocusLocation={searchFocusLocation}
          searchFocusLabel={searchFocusLabel}
          showSearchFocusMarker={showSearchFocusMarker}
          searchFocusNonce={searchFocusNonce}
          isAddMode={isAddMode}
          routeCreateMode={routeCreateMode}
          markerClickMode={markerClickMode}
          showRoutesLayer={showRoutesLayer}
          approvedRouteSuggestions={approvedRouteSuggestions}
          showRiverLayer={showRiverLayer}
          sectionLevelStates={sectionLevelStates}
          riverLevelStates={riverLevelStates}
          globalPois={globalPois}
          activePoiKinds={activePoiKinds}
          showPhotoLayer={showPhotoLayer}
          amenities={displayedAmenities}
          riverLevelLines={riverLevelLines}
          showRain={showRain}
          stations={displayedStations}
          rainTs={selectedRainTs}
          showSelectedRoutePath={!isCanonicalRiverOverviewActive}
          showKnownRivers={showKnownRivers}
          isLevelLegendOpen={isLevelLegendOpen}
          watercourseFocusId={watercourseFocusId}
          watercourseFocusNonce={watercourseFocusNonce}
          onMapClick={handleMapClick}
          onMoveRouteDraftPoint={updateRouteDraftPoint}
          focusNonce={sectionFocusNonce}
          onOpenPoiDetails={openPoiDetails}
          onOpenRouteDetails={openRouteDetails}
          onOpenPhoto={setLightboxPhoto}
          onSelectSection={selectSection}
          onSelectCanonicalRiver={selectCanonicalRiver}
          onOpenRiverPage={(riverId) =>
            openRiverPage(riverId, { label: "Map", section: "map" })
          }
          onCloseSelectedRiverPanel={closeSelectedRiverPanel}
          onToggleSelectedRiverPanelExpanded={() =>
            setIsSelectedRiverPanelExpanded((current) => !current)
          }
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

        {routeCreateMode === "tracing" ? (
          <section className="add-mode-banner route-draft-banner" aria-label="Route tracing active">
            <div>
              <p className="eyebrow">
                {routeDraftTarget.type !== "new"
                  ? "Edit section"
                  : "Suggest section"}
              </p>
              <strong>
                {routeDraftTarget.type !== "new"
                  ? "Drag existing points or click the map to extend the corrected section."
                  : "Click along the river to sketch the candidate section."}
              </strong>
              <span>
                {routeDraftPoints.length
                  ? `${routeDraftPoints.length} point${
                      routeDraftPoints.length === 1 ? "" : "s"
                    } added. This will be reviewed before changing published section data.`
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
          <section className="quick-add-panel route-suggestion-panel" aria-label="Suggest section">
            <div className="quick-add-panel__header">
              <div>
                <p className="eyebrow">
                  {routeDraftTarget.type !== "new"
                    ? "Edit section"
                    : "Suggest section"}
                </p>
                <h2>
                  {routeDraftTarget.type === "route_suggestion_edit"
                    ? "Suggested section"
                    : routeDraftTarget.type !== "new"
                    ? "Section adjustment"
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
            isExpanded={isPoiDetailExpanded}
            onToggleExpanded={() =>
              setIsPoiDetailExpanded((current) => !current)
            }
            onClose={closePoiDetails}
            onAddPhoto={() =>
              selectedPoi && requestAddToPoi(selectedPoi, "photo")
            }
            onAddUpdate={() =>
              selectedPoi && requestAddToPoi(selectedPoi, "report")
            }
            linkedContributions={poiContributions}
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

        {!isCanonicalRiverOverviewActive && isPanelOpen ? (
          <DetailPanel
            title={activeSection.sectionName}
            eyebrow={activeSection.riverName}
            onClose={() => setIsPanelOpen(false)}
            ariaLabel="Selected river section"
            actions={
              <>
                {canAccessAdminTools ? (
                  <button
                    className="icon-button icon-button--compact"
                    type="button"
                    aria-label="Edit this section"
                    title="Edit section"
                    onClick={() => startRouteAdjustmentMode(activeSection)}
                  >
                    <Route size={16} />
                  </button>
                ) : null}
                <button
                  className={`icon-button icon-button--compact ${
                    isActiveSectionFavourite ? "icon-button--active" : ""
                  }`}
                  type="button"
                  aria-label={
                    !isSignedIn
                      ? "Create account to save favourites"
                      : isActiveSectionFavourite
                        ? "Remove from favourites"
                        : "Add to favourites"
                  }
                  title={
                    !isSignedIn
                      ? "Create account to save favourites"
                      : isActiveSectionFavourite
                        ? "Remove from favourites"
                        : "Add to favourites"
                  }
                  aria-pressed={isActiveSectionFavourite}
                  onClick={() => toggleFavouriteSection(activeSection)}
                >
                  <Star
                    size={16}
                    fill={isActiveSectionFavourite ? "currentColor" : "none"}
                  />
                </button>
              </>
            }
          >
              <div className="route-tab-panel" role="tabpanel">
                <div className="route-summary-panel" aria-label="Route summary">
                  <div className="route-summary-item">
                    <Navigation size={15} />
                    <span>Distance</span>
                    <strong>{formatDistanceKm(activeSection.distanceKm)}</strong>
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
                      This is an approved community candidate section. It
                      still needs local verification before being treated as
                      trip advice.
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
        </DetailPanel>
        ) : null}
      </section>
          ) : activeAppSection === "dashboard" ? (
            <PlaceholderPage section="dashboard" title="Your dashboard">
              <div className="dashboard-page">
                {!isSignedIn ? (
                  <SignedOutNotice
                    message="Sign in to favourite rivers and keep their conditions one tap away."
                    onSignIn={handleSignIn}
                  />
                ) : favouriteRivers.length === 0 ? (
                  <div className="dashboard-empty">
                    <p>
                      No favourite rivers yet. Open a river and tap the star to
                      add it here.
                    </p>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => setActiveAppSection("discover")}
                    >
                      Browse rivers
                    </button>
                  </div>
                ) : (
                  <div className="river-card-grid">
                    {favouriteRivers.map((river) => (
                      <RiverCard
                        key={river.id}
                        river={river}
                        isFavourite
                        level={riverLevels[river.id]}
                        onToggleFavourite={toggleFavouriteRiver}
                        onOpenPage={(riverId) =>
                          openRiverPage(riverId, {
                            label: "Dashboard",
                            section: "dashboard",
                          })
                        }
                        onOpen={(riverId) => {
                          selectCanonicalRiver(riverId, { zoom: "bounds" });
                          setActiveAppSection("map");
                        }}
                      />
                    ))}
                  </div>
                )}
                {isSignedIn ? (
                  <DashboardHub
                    onOpenGroups={() => setActiveAppSection("groups")}
                    onOpenProfileTab={(tab) => {
                      setProfileMode(tab);
                      setActiveAppSection("profile");
                    }}
                  />
                ) : null}
              </div>
            </PlaceholderPage>
          ) : activeAppSection === "discover" ? (
            <PlaceholderPage section="discover" title="Discover">
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
                    Rivers
                  </button>
                  <button
                    className={searchMode === "waterways" ? "active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={searchMode === "waterways"}
                    onClick={() => setSearchMode("waterways")}
                  >
                    <Waves size={16} />
                    Waterways
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
                    className={searchMode === "clubs" ? "active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={searchMode === "clubs"}
                    onClick={() => setSearchMode("clubs")}
                  >
                    <UsersRound size={16} />
                    Clubs
                  </button>
                  <button
                    className={searchMode === "favourites" ? "active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={searchMode === "favourites"}
                    onClick={() => setSearchMode("favourites")}
                  >
                    <Heart size={16} />
                    Section Favs
                  </button>
                </div>

                {searchMode === "name" ? (
                  <div className="discover-page">
                    <div className="discover-filters">
                      <input
                        className="discover-search"
                        value={riverSearchTerm}
                        onChange={(event) => setRiverSearchTerm(event.target.value)}
                        placeholder="Search rivers, regions, nations…"
                        aria-label="Search rivers"
                      />
                      <div
                        className="discover-chips"
                        role="group"
                        aria-label="Filter rivers"
                      >
                        <button
                          type="button"
                          className={`discover-chip${riverDisciplineFilter === "all" ? " discover-chip--active" : ""}`}
                          onClick={() => setRiverDisciplineFilter("all")}
                        >
                          All
                        </button>
                        <button
                          type="button"
                          className={`discover-chip${riverDisciplineFilter === "whitewater" ? " discover-chip--active" : ""}`}
                          onClick={() => setRiverDisciplineFilter("whitewater")}
                        >
                          Whitewater
                        </button>
                        <button
                          type="button"
                          className={`discover-chip${riverDisciplineFilter === "touring" ? " discover-chip--active" : ""}`}
                          onClick={() => setRiverDisciplineFilter("touring")}
                        >
                          Canoe touring
                        </button>
                        {riverNations.length ? (
                          <span className="discover-chip-sep" aria-hidden="true" />
                        ) : null}
                        <button
                          type="button"
                          className={`discover-chip${riverNationFilter === "all" ? " discover-chip--active" : ""}`}
                          onClick={() => setRiverNationFilter("all")}
                        >
                          All nations
                        </button>
                        {riverNations.map((nation) => (
                          <button
                            key={nation}
                            type="button"
                            className={`discover-chip${riverNationFilter === nation ? " discover-chip--active" : ""}`}
                            onClick={() => setRiverNationFilter(nation)}
                          >
                            {nation}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="discover-count">
                      {filteredSearchRivers.length} river
                      {filteredSearchRivers.length === 1 ? "" : "s"}
                    </p>
                    {filteredSearchRivers.length ? (
                      <div className="river-card-grid">
                        {filteredSearchRivers.map((river) => (
                          <RiverCard
                            key={river.id}
                            river={river}
                            isFavourite={favouriteRiverIds.includes(river.id)}
                            level={riverLevels[river.id]}
                            onToggleFavourite={toggleFavouriteRiver}
                            onVisible={requestRiverLevel}
                            onOpenPage={(riverId) =>
                              openRiverPage(riverId, {
                                label: "Discover",
                                section: "discover",
                              })
                            }
                            onOpen={(riverId) => {
                              selectCanonicalRiver(riverId, { zoom: "bounds" });
                              setActiveAppSection("map");
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="empty-state">
                        No rivers match these filters yet.
                      </p>
                    )}
                  </div>
                ) : searchMode === "waterways" ? (
                  <form
                    className="location-search-card"
                    onSubmit={(event) => void handleWatercourseSearch(event)}
                    aria-label="Search waterways"
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
                                  Suggest section
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
                ) : searchMode === "clubs" ? (
                  <div className="discover-page">
                    <div className="discover-filters">
                      <input
                        className="discover-search"
                        value={clubSearchTerm}
                        onChange={(event) =>
                          setClubSearchTerm(event.target.value)
                        }
                        placeholder="Search clubs by name or handle…"
                        aria-label="Search clubs"
                      />
                    </div>
                    {clubsLoading && !discoveredClubs.length ? (
                      <p className="source-note">Searching…</p>
                    ) : discoveredClubs.length ? (
                      <ul className="groups-grid">
                        {discoveredClubs.map((club) => (
                          <li key={club.id}>
                            <button
                              type="button"
                              className="group-card"
                              onClick={() =>
                                openGroup(club.handle ?? club.id, {
                                  label: "Discover",
                                  section: "discover",
                                  searchMode: "clubs",
                                })
                              }
                            >
                              <span className="group-card__cover">
                                {club.coverImageUrl ? (
                                  <img
                                    className="group-card__cover-img"
                                    src={club.coverImageUrl}
                                    alt=""
                                    style={{
                                      objectPosition: `${club.coverX}% ${club.coverPosition}%`,
                                      transformOrigin: `${club.coverX}% ${club.coverPosition}%`,
                                      transform: `scale(${club.coverZoom / 100})`,
                                    }}
                                  />
                                ) : (
                                  <span className="group-card__cover-empty">
                                    <UsersRound size={26} />
                                  </span>
                                )}
                                {club.myStatus === "active" ? (
                                  <span className="status-chip status-chip--muted group-card__chip">
                                    member
                                  </span>
                                ) : club.myStatus === "invited" ? (
                                  <span className="status-chip group-card__chip">
                                    invited
                                  </span>
                                ) : club.myStatus === "requested" ? (
                                  <span className="status-chip group-card__chip">
                                    request pending
                                  </span>
                                ) : null}
                              </span>
                              <span className="group-card__body">
                                <strong className="group-card__name">
                                  {club.name}
                                </strong>
                                <span className="group-card__meta">
                                  {CLUB_KIND_LABELS[club.kind] ?? club.kind}
                                  {club.discipline
                                    ? ` · ${capitalise(club.discipline)}`
                                    : ""}{" "}
                                  · {club.visibility} · {club.memberCount} member
                                  {club.memberCount === 1 ? "" : "s"}
                                </span>
                                {club.description ? (
                                  <span className="group-card__desc">
                                    {club.description}
                                  </span>
                                ) : null}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="source-note">
                        {clubSearchTerm.trim()
                          ? `No clubs match “${clubSearchTerm.trim()}”.`
                          : "No clubs yet."}
                      </p>
                    )}
                  </div>
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
                          <p>Remove this section from your favourites?</p>
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
            <PlaceholderPage section="groups" title="Clubs" wide>
              {!isSignedIn && !groupRoute ? (
                <SignedOutNotice
                  message="Sign in to create and join paddling clubs."
                  onSignIn={handleSignIn}
                />
              ) : (
                <GroupsPanel
                  isSignedIn={isSignedIn}
                  routeGroup={groupRoute}
                  onOpenGroup={openGroup}
                  onGroupBack={handleGroupBack}
                  groupBackLabel={returnTarget?.label ?? "Clubs"}
                  onOpenProfile={openProfile}
                  onSignIn={handleSignIn}
                  rivers={canonicalRivers.map((river) => ({
                    id: river.id,
                    displayName: river.displayName,
                    region: river.region,
                  }))}
                />
              )}
            </PlaceholderPage>
          ) : activeAppSection === "profile" ? (
            <PlaceholderPage section="profile" title="Profile">
              {!isSignedIn ? (
                <SignedOutNotice
                  message="Sign in to view and manage your profile."
                  onSignIn={handleSignIn}
                />
              ) : (
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
                  <button
                    className={profileMode === "history" ? "active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={profileMode === "history"}
                    onClick={() => setProfileMode("history")}
                  >
                    <Waves size={16} />
                    History
                  </button>
                  <button
                    className={profileMode === "kit" ? "active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={profileMode === "kit"}
                    onClick={() => setProfileMode("kit")}
                  >
                    <Backpack size={16} />
                    Kit
                  </button>
                  <button
                    className={profileMode === "skills" ? "active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={profileMode === "skills"}
                    onClick={() => setProfileMode("skills")}
                  >
                    <Award size={16} />
                    Skills
                  </button>
                </div>
                {profileMode === "account" ? (
                  <section className="profile-mode-panel" aria-label="My account">
                    <div className="profile-card">
                      <UserRound size={22} />
                      <div>
                        <strong>
                          {memberProfile?.displayName ??
                            authState.user?.displayName ??
                            memberProfile?.publicName ??
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
                    {isSignedIn ? (
                      <section className="profile-card profile-card--stacked">
                        <div className="block-title">
                          <div>
                            <h3>Your name</h3>
                            <span>
                              For your account and emails — not shown publicly
                            </span>
                          </div>
                        </div>
                        <div className="form-grid">
                          <label>
                            <span>Your name</span>
                            <input
                              type="text"
                              value={nameDraft}
                              onChange={(event) => setNameDraft(event.target.value)}
                              placeholder="e.g. Alex Jones"
                              maxLength={80}
                            />
                          </label>
                        </div>
                        <div className="profile-actions">
                          <button
                            className="primary-action"
                            type="button"
                            onClick={() => void saveName()}
                            disabled={isProfileSaving}
                          >
                            <UserRound size={16} />
                            {isProfileSaving ? "Saving" : "Save name"}
                          </button>
                        </div>
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
                      className="ghost-button profile-action--signout"
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
                {profileMode === "history" ? (
                  <section
                    className="profile-mode-panel"
                    aria-label="Paddle history"
                  >
                    {isSignedIn ? (
                      <PaddleHistoryPanel
                        rivers={canonicalRivers.map((river) => ({
                          id: river.id,
                          displayName: river.displayName,
                          region: river.region,
                        }))}
                      />
                    ) : (
                      <p className="profile-message">
                        Sign in to log and review your paddle history.
                      </p>
                    )}
                  </section>
                ) : null}
                {profileMode === "kit" ? (
                  <section
                    className="profile-mode-panel"
                    aria-label="Kit inventory"
                  >
                    {isSignedIn ? (
                      <KitInventoryPanel />
                    ) : (
                      <p className="profile-message">
                        Sign in to manage your kit.
                      </p>
                    )}
                  </section>
                ) : null}
                {profileMode === "skills" ? (
                  <section
                    className="profile-mode-panel"
                    aria-label="Skills and qualifications"
                  >
                    {isSignedIn ? (
                      <SkillsPanel />
                    ) : (
                      <p className="profile-message">
                        Sign in to record your skills and qualifications.
                      </p>
                    )}
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
                      <>
                      <section className="profile-card profile-card--stacked">
                        <div className="block-title">
                          <div>
                            <h3>Profile picture</h3>
                            <span>A circle headshot shown to other paddlers</span>
                          </div>
                        </div>
                        <ProfileAvatarEditor
                          profile={memberProfile}
                          onSaved={(member) => setMemberProfile(member)}
                        />
                      </section>
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
                          <p className={`profile-message${profileMessageToneClass(memberMessage)}`}>{memberMessage}</p>
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
                      <section className="profile-card profile-card--stacked">
                        <div className="block-title">
                          <div>
                            <h3>Public profile page</h3>
                            <span>
                              An opt-in page others can see at /p/your-handle
                            </span>
                          </div>
                        </div>
                        <PublicProfileControls
                          profile={memberProfile}
                          onSaved={(member) => setMemberProfile(member)}
                          onView={(token) => openProfile(token, "Profile")}
                        />
                      </section>
                      </>
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
                            future club meetups.
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
                            <span>Private ICE details for future club meetups</span>
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
                              here. In future club meetups you will choose
                              whether to share this emergency contact with the
                              organiser.
                            </p>
                            {memberMessage ? (
                              <p className={`profile-message${profileMessageToneClass(memberMessage)}`}>{memberMessage}</p>
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
                      <p className={`profile-message${profileMessageToneClass(pointMessage)}`}>{pointMessage}</p>
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
                        <h3>My suggested sections</h3>
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
                      <p className="source-note">Loading your suggested sections...</p>
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
                      <p className={`profile-message${profileMessageToneClass(photoMessage)}`}>{photoMessage}</p>
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
              )}
            </PlaceholderPage>
          ) : activeAppSection === "more" ? (
            <PlaceholderPage section="more" title="More">
              <div className="placeholder-list">
                <button
                  className="placeholder-row"
                  type="button"
                  onClick={() => navigateSection("groups")}
                >
                  <span>
                    <strong>Clubs</strong>
                    <small>Your clubs and friends, and planned meetups</small>
                  </span>
                  <UsersRound size={18} />
                </button>
                <button
                  className="placeholder-row"
                  type="button"
                  onClick={() => navigateSection("settings")}
                >
                  <span>
                    <strong>Settings</strong>
                    <small>
                      Appearance, location, offline packs, and preferences
                    </small>
                  </span>
                  <SettingsIcon size={18} />
                </button>
                <button
                  className="placeholder-row"
                  type="button"
                  onClick={() => setActiveAppSection("about")}
                >
                  <span>
                    <strong>About</strong>
                    <small>App version and info</small>
                  </span>
                  <Info size={18} />
                </button>
                <button
                  className="placeholder-row"
                  type="button"
                  onClick={() => setActiveAppSection("faqs")}
                >
                  <span>
                    <strong>FAQs</strong>
                    <small>Common questions and how things work</small>
                  </span>
                  <HelpCircle size={18} />
                </button>
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
              </div>
            </PlaceholderPage>
          ) : activeAppSection === "settings" ? (
            <PlaceholderPage section="settings" title="Settings">
              <button
                className="ghost-button ghost-button--compact"
                type="button"
                onClick={() => setActiveAppSection("more")}
              >
                <ChevronLeft size={16} />
                More
              </button>
              <div className="placeholder-list">
                <button className="placeholder-row" type="button">
                  <span>
                    <strong>Offline packs</strong>
                    <small>Saved rivers for poor signal</small>
                  </span>
                  <RefreshCw size={18} />
                </button>
              </div>
              <section className="settings-panel" aria-label="Settings">
                  <PwaInstallSettingRow />
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
                  <div className="setting-appearance">
                    <span className="setting-appearance__head">
                      <Palette size={18} />
                      <span>
                        <strong>Appearance</strong>
                        <small>Theme is saved on this device</small>
                      </span>
                    </span>
                    <div
                      className="theme-options"
                      role="radiogroup"
                      aria-label="Theme"
                    >
                      {(
                        [
                          { id: "tide", label: "Tide", hint: "Calm green" },
                          {
                            id: "daybreak",
                            label: "Daybreak",
                            hint: "Light & bright",
                          },
                          {
                            id: "surge",
                            label: "Surge",
                            hint: "Dark & electric",
                          },
                        ] as const
                      ).map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          role="radio"
                          aria-checked={theme === option.id}
                          className={`theme-option theme-option--${option.id}${
                            theme === option.id ? " theme-option--active" : ""
                          }`}
                          onClick={() => setTheme(option.id)}
                        >
                          <span
                            className="theme-option__swatch"
                            aria-hidden="true"
                          />
                          <span className="theme-option__text">
                            <strong>{option.label}</strong>
                            <small>{option.hint}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
            </PlaceholderPage>
          ) : activeAppSection === "about" ? (
            <AboutScreen onBack={() => setActiveAppSection("more")} />
          ) : activeAppSection === "faqs" ? (
            <FaqsScreen onBack={() => setActiveAppSection("more")} />
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
                            <p
                              className={`profile-message${profileMessageToneClass(
                                adminMemberDetailMessage,
                              )}`}
                            >
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
                            <p className={`profile-message${profileMessageToneClass(moderationMessage)}`}>{moderationMessage}</p>
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
                                <button
                                  className={
                                    moderationTab === "source-candidates"
                                      ? "active"
                                      : ""
                                  }
                                  type="button"
                                  role="tab"
                                  aria-selected={
                                    moderationTab === "source-candidates"
                                  }
                                  onClick={() => setModerationTab("source-candidates")}
                                >
                                  <Waves size={16} />
                                  Candidates
                                  <span>{sourceCandidatePois.length}</span>
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
                                          {suggestion.status === "approved" ? (
                                            pendingPromoteSuggestionId ===
                                            suggestion.id ? (
                                              <>
                                                <span className="moderation-row__meta">
                                                  Promote to a canonical section?
                                                  Members will see it as
                                                  community-reported, not
                                                  verified advice.
                                                </span>
                                                <button
                                                  className="ghost-button ghost-button--compact"
                                                  type="button"
                                                  disabled={
                                                    promotingSuggestionId ===
                                                    suggestion.id
                                                  }
                                                  onClick={() =>
                                                    void confirmPromoteRouteSuggestion(
                                                      suggestion,
                                                    )
                                                  }
                                                >
                                                  <CheckCircle2 size={15} />
                                                  Confirm promote
                                                </button>
                                                <button
                                                  className="ghost-button ghost-button--compact"
                                                  type="button"
                                                  onClick={() =>
                                                    setPendingPromoteSuggestionId(null)
                                                  }
                                                >
                                                  Cancel
                                                </button>
                                              </>
                                            ) : (
                                              <button
                                                className="ghost-button ghost-button--compact"
                                                type="button"
                                                onClick={() =>
                                                  setPendingPromoteSuggestionId(
                                                    suggestion.id,
                                                  )
                                                }
                                              >
                                                <Star size={15} />
                                                Promote to section
                                              </button>
                                            )
                                          ) : null}
                                          {suggestion.status === "promoted" &&
                                          suggestion.promotedRouteId ? (
                                            <>
                                              <span className="candidate-pill">
                                                Promoted
                                              </span>
                                              <button
                                                className="ghost-button ghost-button--compact"
                                                type="button"
                                                onClick={() =>
                                                  viewPromotedSection(
                                                    suggestion.promotedRouteId!,
                                                  )
                                                }
                                              >
                                                <MapIcon size={15} />
                                                View section
                                              </button>
                                            </>
                                          ) : null}
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
                              {moderationTab === "source-candidates" ? (
                                sourceCandidatePois.length ? (
                                  <>
                                    <div className="moderation-section-heading">
                                      <h3>Source candidate POIs</h3>
                                      <span>{sourceCandidatePois.length} items</span>
                                    </div>
                                    {sourceCandidatePois.map((candidate) => {
                                      const draftStatus =
                                        sourceCandidateDraftStatuses[
                                          candidate.id
                                        ] ?? "";
                                      const tagEntries = Object.entries(
                                        candidate.rawProperties ?? {},
                                      )
                                        .filter(([, value]) =>
                                          Boolean(formatSourceCandidateValue(value)),
                                        )
                                        .slice(0, 6);

                                      return (
                                        <article
                                          className="moderation-row"
                                          key={candidate.id}
                                        >
                                          <div className="moderation-row__content">
                                            <strong>{candidate.title}</strong>
                                            <span className="moderation-row__meta">
                                              {candidate.riverDisplayName ??
                                                "Unlinked river"}{" "}
                                              · {candidate.candidateType} ·{" "}
                                              {candidate.source}
                                            </span>
                                            {candidate.location ? (
                                              <p>
                                                {formatLocation(candidate.location)}
                                              </p>
                                            ) : null}
                                            {tagEntries.length ? (
                                              <dl className="source-candidate-tags">
                                                {tagEntries.map(([key, value]) => (
                                                  <div key={key}>
                                                    <dt>{key}</dt>
                                                    <dd>
                                                      {formatSourceCandidateValue(
                                                        value,
                                                      )}
                                                    </dd>
                                                  </div>
                                                ))}
                                              </dl>
                                            ) : (
                                              <p>No source tags were captured.</p>
                                            )}
                                            <small className="moderation-row__meta">
                                              {candidate.sourceId} ·{" "}
                                              {candidate.licence} · updated{" "}
                                              {formatDateTime(candidate.updatedAt)}
                                            </small>
                                            {candidate.sourceUrl ? (
                                              <a
                                                className="inline-link"
                                                href={candidate.sourceUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                              >
                                                <ExternalLink size={14} />
                                                View source
                                              </a>
                                            ) : null}
                                          </div>
                                          <div className="moderation-status">
                                            <span
                                              className={`status-chip status-chip--${candidate.status}`}
                                            >
                                              {sourceCandidateStatusLabel(
                                                candidate.status,
                                              )}
                                            </span>
                                          </div>
                                          <div className="moderation-actions">
                                            <label>
                                              <span>Status</span>
                                              <select
                                                aria-label={`Source candidate decision for ${candidate.title}`}
                                                value={draftStatus}
                                                onChange={(event) => {
                                                  setSourceCandidateDraftStatuses(
                                                    (current) => ({
                                                      ...current,
                                                      [candidate.id]: event.target
                                                        .value as SourceCandidateDraftStatus,
                                                    }),
                                                  );
                                                }}
                                              >
                                                <option value="">Choose...</option>
                                                {sourceCandidateStatusActions.map(
                                                  (action) => (
                                                    <option
                                                      key={action.status}
                                                      value={action.status}
                                                    >
                                                      {action.label}
                                                    </option>
                                                  ),
                                                )}
                                              </select>
                                            </label>
                                            <button
                                              className="ghost-button ghost-button--compact moderation-apply-button"
                                              type="button"
                                              disabled={!draftStatus}
                                              onClick={() =>
                                                void applySourceCandidateStatus(
                                                  candidate,
                                                )
                                              }
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
                                    No source-derived candidate POIs need
                                    moderation.
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
                              <p
                                className={`profile-message ${
                                  messageTone(observationJobMessage) ===
                                  "success"
                                    ? "profile-message--success"
                                    : "profile-message--neutral"
                                }`}
                              >
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
        onSelectSection={navigateSection}
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

      {isContributorOnrampOpen && isSignedIn ? (
        <ContributorOnramp
          email={authState.user?.email ?? memberProfile?.email ?? null}
          emailVerified={hasVerifiedEmail}
          requireEmailVerification={REQUIRE_EMAIL_VERIFICATION}
          publicName={memberProfile?.publicName ?? null}
          hasAcceptedTerms={hasAcceptedContributorTerms}
          onResendVerification={handleResendVerificationEmail}
          onRefreshVerification={handleRefreshEmailVerification}
          onSetPublicName={handleSetContributorPublicName}
          onAcceptTerms={handleAcceptContributorTermsAction}
          onReady={handleContributorOnrampReady}
          onClose={closeContributorOnramp}
        />
      ) : null}
    </main>
  );
}


export default App;
