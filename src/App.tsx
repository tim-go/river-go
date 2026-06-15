import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
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
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  setAnalyticsConsentPreference,
  trackPageView,
  trackProductEvent,
  type AnalyticsConsent,
} from "./services/analytics";
import {
  fetchCanonicalRivers,
  fetchSourceCandidatePois,
  updateSourceCandidatePoiStatus,
  type CanonicalRiverSummary,
  type SourceCandidatePoi,
} from "./services/canonicalRiverApi";
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
  type ObservationJobRun,
  type SectionObservationMeasure,
} from "./services/observationApi";
import { formatLocation, formatDateTime, formatObservationValue, formatObservationRange, getObservationStats, getPrimaryObservationMeasure, formatShortDateTime, buildObservationChartPoints, parseCoordinateSearch, looksLikeWhat3Words, normaliseWhat3WordsSearch, routeDistanceKm } from "./lib/format";
import {
  deletePhoto,
  fetchMyPhotos,
  type MemberPhoto,
} from "./services/photoApi";
import {
  fetchModerationMapPoiReviews,
  fetchRiverMapPois,
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
} from "./services/locationReferences";
import { routeSuggestionStatusLabel, routeAdjustmentStatusLabel } from "./lib/mapPopups";
import { loadContributions, loadFavouriteSectionIds, loadRouteSuggestions, loadAnalyticsConsent, saveAnalyticsConsent, hasDismissedWelcomeForSession, rememberWelcomeDismissedForSession, loadLiveLocationEnabled, saveLiveLocationEnabled, loadMarkerClickMode, saveMarkerClickMode, loadSyncBannerDismissal, saveSyncBannerDismissal, STORAGE_KEY, FAVOURITES_STORAGE_KEY, ROUTE_SUGGESTIONS_STORAGE_KEY } from "./lib/storage";
import { SyncOutboxBanner } from "./components/SyncOutboxBanner";
import { AnalyticsConsentBanner } from "./components/AnalyticsConsentBanner";
import { AppNavigation, MobileBottomNav } from "./components/AppNavigation";
import { AppBrandPanel } from "./components/AppBrandPanel";
import { AppNotificationBanner } from "./components/AppNotificationBanner";
import { PlaceholderPage } from "./components/PlaceholderPage";
import { PhotoLightbox } from "./components/PhotoLightbox";
import { AuthPromptSheet } from "./components/AuthPromptSheet";
import {
  ContributorOnramp,
  type ContributorActionResult,
} from "./components/ContributorOnramp";
import { PoiDetailPanel } from "./components/PoiDetailPanel";
import { RiverMap } from "./components/RiverMap";
import { useDiscovery } from "./discovery/DiscoveryContext";
import { RouteAdjustmentImpactPanel } from "./components/RouteAdjustmentImpactPanel";
import { Metric } from "./components/Metric";
import { contributionStatusLabel, moderationActions, syncStatusLabel } from "./lib/contributionLabels";
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
  LiveGaugeReading,
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
} from "./types";
import {
  AdminPage,
  bandLabels,
  calculateRouteAdjustmentImpact,
  candidateRouteSuggestionId,
  canonicalRiverOverviewSectionId,
  canonicalRiverToOverviewSection,
  categoryOptions,
  COMPACT_MAP_CONTROLS_QUERY,
  contributionOptions,
  defaultObservedDate,
  emptyCanonicalOverviewSection,
  fallbackMapPoisForSection,
  formatDistanceKm,
  formatSourceCandidateValue,
  getObservationRangeOption,
  hasAdminAccess,
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
  navigationUrl,
  nearbyPoisForLocation,
  nearestSectionsForLocation,
  observationParameterLabels,
  ObservationRangeHours,
  observationRangeOptions,
  OpenPoiDetailsOptions,
  optionForType,
  PendingPhotoDelete,
  PendingPointDelete,
  ProfileMode,
  routeAdjustmentActions,
  RouteAdjustmentDraftDecision,
  RouteCreateMode,
  RouteDetailsTab,
  routeDetailsTabs,
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

function App() {
  const outboxStore = useMemo(() => createContributionOutboxStore(), []);
  const [activeAppSection, setActiveAppSection] =
    useState<AppSection>("map");
  const [activeAdminPage, setActiveAdminPage] = useState<AdminPage>("index");
  const [isAppNavCollapsed, setIsAppNavCollapsed] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState("");
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
  const [, setApprovedRouteSuggestions] = useState<
    RouteSuggestion[]
  >([]);
  const [routeAdjustments, setRouteAdjustments] = useState<RouteAdjustment[]>([]);
  const [, setRouteOverrides] = useState<RouteOverride[]>([]);
  const [canonicalRivers, setCanonicalRivers] = useState<CanonicalRiverSummary[]>(
    [],
  );
  const [selectedCanonicalRiverId, setSelectedCanonicalRiverId] =
    useState<string | null>(null);
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
  const [markerClickMode, setMarkerClickMode] = useState<MarkerClickMode>(
    loadMarkerClickMode,
  );
  const [showRoutesLayer, setShowRoutesLayer] = useState(false);
  const [showSelectedRoutePath, setShowSelectedRoutePath] = useState(false);
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
  const [poiContributions, setPoiContributions] = useState<Contribution[]>([]);
  const [isPoiDetailExpanded, setIsPoiDetailExpanded] = useState(false);
  const [detailFocusLocation, setDetailFocusLocation] =
    useState<LatLngTuple | null>(null);
  const [detailFocusPlacement, setDetailFocusPlacement] =
    useState<MapFocusPlacement>("center");
  const [detailFocusNonce, setDetailFocusNonce] = useState(0);
  const [detailRestoreNonce, setDetailRestoreNonce] = useState(0);
  const [selectedTargetLabel, setSelectedTargetLabel] = useState(
    "Selected map location",
  );
  const [isAddMode, setIsAddMode] = useState(false);
  const [addModeTargetPoiId, setAddModeTargetPoiId] = useState<string | null>(
    null,
  );
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
  const [selectedRiverMapPois, setSelectedRiverMapPois] = useState<MapPoi[]>([]);
  const [mapPoiReviewMessage, setMapPoiReviewMessage] = useState("");
  const [isMapPoiReviewSaving, setIsMapPoiReviewSaving] = useState(false);
  const [isPoiStatusSaving, setIsPoiStatusSaving] = useState(false);
  const [isSectionListOpen, setIsSectionListOpen] = useState(false);
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
    () => canonicalRivers.map(canonicalRiverToOverviewSection),
    [canonicalRivers],
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
  const observationSectionIdRef = useRef(activeSection.id);

  const sectionContributions = contributions.filter(
    (contribution) => contribution.sectionId === activeSection.id,
  );
  const fallbackSectionMapPois = useMemo(
    () => fallbackMapPoisForSection(activeSection),
    [activeSection],
  );
  const visibleSectionMapPois = isSectionMapPoisLoaded
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
  }, []);

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

    if (isCanonicalOverviewSection(activeSection)) {
      if (isNewSection) {
        observationSectionIdRef.current = activeSection.id;
      }
      setLiveGauge(null);
      setSectionObservations([]);
      setIsGaugeLoading(false);
      setIsSectionObservationsLoading(false);
      setSectionObservationMessage("");

      return () => {
        isMounted = false;
      };
    }

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

    const nextContribution: Contribution = {
      id: contributionId,
      sectionId: activeSection.id,
      mapPoiId: addModeTargetPoiId ?? undefined,
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
      id: generateUuid(),
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
    setShowSelectedRoutePath(!isRiverOverview);
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

  function selectCanonicalRiver(riverId: string | null) {
    setSelectedCanonicalRiverId(riverId);
    setIsSelectedRiverPanelOpen(Boolean(riverId));
    setIsSelectedRiverPanelExpanded(false);
    const river = riverId
      ? canonicalRivers.find((item) => item.id === riverId)
      : null;
    if (river) {
      focusDetailLocation(river.centre, "mobile-top-half");
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

  function selectCanonicalRiverContext(riverId: string | null) {
    setSelectedCanonicalRiverId(riverId);
    setIsSelectedRiverPanelOpen(false);
    setIsSelectedRiverPanelExpanded(false);
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

  function closeSelectedRiverPanel() {
    restoreDetailMapView();
    setIsSelectedRiverPanelOpen(false);
    setIsSelectedRiverPanelExpanded(false);
  }

  function reopenSelectedRiverPanel(river: CanonicalRiverSummary) {
    setIsSelectedRiverPanelOpen(true);
    setIsSelectedRiverPanelExpanded(false);
    focusDetailLocation(river.centre, "mobile-top-half");
  }

  function focusDetailLocation(
    location: LatLngTuple,
    placement: MapFocusPlacement,
  ) {
    setDetailFocusLocation(location);
    setDetailFocusPlacement(placement);
    setDetailFocusNonce((current) => current + 1);
  }

  function restoreDetailMapView() {
    setDetailRestoreNonce((current) => current + 1);
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

  function openPoiDetails(
    poi: SelectedPoi,
    options: OpenPoiDetailsOptions = {},
  ) {
    setSelectedPoi(poi);
    setIsPoiDetailExpanded(false);
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
    restoreDetailMapView();
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

  function toggleMarkerClickMode() {
    setMarkerClickMode((current) => {
      const next = current === "info" ? "detail" : "info";
      saveMarkerClickMode(next);
      return next;
    });
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
              title="Rivers"
              aria-label="Rivers"
              aria-pressed={isSectionListOpen}
            >
              <Waves size={16} />
              Rivers
            </button>
            {!isCanonicalRiverOverviewActive ? (
              <>
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
              </>
            ) : null}
            <button
              className={`ghost-button map-panel-toggle topbar-secondary-control ${
                showKnownRivers ? "map-panel-toggle--active" : ""
              }`}
              type="button"
              onClick={() => setShowKnownRivers((current) => !current)}
              title="Show reference waterways"
              aria-label="Show reference waterways"
              aria-pressed={showKnownRivers}
            >
              <Waves size={16} />
              Waterways
            </button>
            <button
              className={`ghost-button map-panel-toggle topbar-secondary-control ${
                markerClickMode === "detail" ? "map-panel-toggle--active" : ""
              }`}
              type="button"
              onClick={toggleMarkerClickMode}
              title={
                markerClickMode === "info"
                  ? "Marker clicks show quick info first"
                  : "Marker clicks open details directly"
              }
              aria-label={
                markerClickMode === "info"
                  ? "Marker clicks show quick info first"
                  : "Marker clicks open details directly"
              }
              aria-pressed={markerClickMode === "detail"}
            >
              <MessageSquare size={16} />
              Click: {markerClickMode === "info" ? "Info" : "Detail"}
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
            {!isCanonicalRiverOverviewActive ? (
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
            ) : null}
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
            {canAccessAdminTools && !isCanonicalRiverOverviewActive ? (
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
            {!isCanonicalRiverOverviewActive ? (
              <>
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
                  onClick={() => requestAddContribution()}
                >
                  <Plus size={18} />
                  Add info
                </button>
              </>
            ) : null}
            {isCanonicalRiverOverviewActive ? (
              <button
                className="primary-action topbar-secondary-control"
                type="button"
                title="Add local knowledge"
                onClick={() => requestAddContribution()}
              >
                <Plus size={18} />
                Add info
              </button>
            ) : null}
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
            <span>Rivers</span>
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
          {canonicalRivers.length ? (
            <div className="canonical-river-list">
              {canonicalRivers.map((river) => (
                <button
                  className={`canonical-river-row ${
                    river.id === selectedCanonicalRiverId
                      ? "canonical-river-row--active"
                      : ""
                  }`}
                  key={river.id}
                  type="button"
                  onClick={() =>
                    selectedCanonicalRiverId === river.id
                      ? reopenSelectedRiverPanel(river)
                      : selectCanonicalRiver(river.id)
                  }
                >
                  <span>
                    <strong>{river.displayName}</strong>
                    <small>
                      {river.region} · {river.sectionCount} section
                      {river.sectionCount === 1 ? "" : "s"}
                    </small>
                  </span>
                  {river.reviewNeededCandidatePoiCount ? (
                    <span className="candidate-pill">
                      {river.reviewNeededCandidatePoiCount} candidates
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <p className="source-note source-note--section-list">
              River records unavailable.
            </p>
          )}
        </aside>

        <RiverMap
          sections={appRiverSections}
          activeSection={activeSection}
          canonicalRivers={canonicalRivers}
          selectedCanonicalRiver={selectedCanonicalRiver}
          isSelectedRiverPanelOpen={isSelectedRiverPanelOpen}
          isSelectedRiverPanelExpanded={isSelectedRiverPanelExpanded}
          isPoiDetailsOpen={Boolean(selectedPoi)}
          mapPois={visibleSectionMapPois}
          selectedRiverMapPois={selectedRiverMapPois}
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
          detailRestoreNonce={detailRestoreNonce}
          searchFocusLocation={searchFocusLocation}
          searchFocusLabel={searchFocusLabel}
          showSearchFocusMarker={showSearchFocusMarker}
          searchFocusNonce={searchFocusNonce}
          isAddMode={isAddMode}
          routeCreateMode={routeCreateMode}
          markerClickMode={markerClickMode}
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
          onSelectCanonicalRiver={selectCanonicalRiver}
          onSelectCanonicalRiverContext={selectCanonicalRiverContext}
          onCloseSelectedRiverPanel={closeSelectedRiverPanel}
          onToggleSelectedRiverPanelExpanded={() =>
            setIsSelectedRiverPanelExpanded((current) => !current)
          }
        />

        {!isCanonicalRiverOverviewActive && isRouteStatusCardVisible ? (
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
        ) : !isCanonicalRiverOverviewActive ? (
          <button
            className="route-status-toggle"
            type="button"
            onClick={() => setIsRouteStatusCardVisible(true)}
          >
            <Droplets size={15} />
            Show levels
          </button>
        ) : null}

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

        {!isCanonicalRiverOverviewActive ? (
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
                          : "No gauge linked yet"}
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
                        ? "Gauge readings shown for context — interpret conditions locally."
                        : liveGauge?.message ??
                          "No confirmed gauge for this section yet.")}
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
                    <span>{visibleHazardPois.length}</span>
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
                          onClick={() => requestAddContribution(option.type)}
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
        ) : null}
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
