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
  UserRound,
  Waves,
  X,
} from "lucide-react";
import L from "leaflet";
import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { riverSections } from "./data/demoData";
import { fetchSectionContributions } from "./services/contributionApi";
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
  type MemberProfile,
} from "./services/memberApi";
import { fetchEnvironmentAgencyGaugeReading } from "./services/riverLevels";
import type {
  Contribution,
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
const WELCOME_SESSION_STORAGE_KEY = "rifflemap-welcome-dismissed-session";

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
  hazard: ["weir", "strainer", "bridge", "shallow water", "navigation conflict"],
  access: ["put-in", "take-out", "parking", "portage", "restriction"],
  photo: ["access photo", "hazard photo", "river view", "level reference"],
  feature: ["landing", "facility", "bridge", "rest stop", "navigation"],
};

type AppSection = "search" | "map" | "favourites" | "profile" | "more" | "admin";
type AdminPage = "index" | "members" | "moderation" | "system";
type AuthSheetMode = "welcome" | "save-required";

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
  syncStatus?: ContributionSyncStatus;
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

function markerHtml(kind: string, label: string) {
  return `<span class="map-marker map-marker--${kind}" aria-hidden="true">${label}</span>`;
}

function createMapPopupContent({
  title,
  subtitle,
  summary,
  detailsLabel = "Details",
  navigationLocation,
  onDetails,
}: {
  title: string;
  subtitle: string;
  summary: string;
  detailsLabel?: string;
  navigationLocation?: LatLngTuple;
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
    link.href = navigationUrl(navigationLocation);
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "Navigate";
  }

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

function navigationUrl(location: LatLngTuple) {
  return `https://www.google.com/maps/dir/?api=1&destination=${location[0]},${location[1]}`;
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
        <div className="app-nav__brand" title="RiffleMap.com">
          <span className="brand-mark brand-mark--nav">
            <Waves size={20} strokeWidth={2.3} />
          </span>
          <span>
            <strong>RiffleMap.com</strong>
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
        <strong>RiffleMap.com</strong>
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
        aria-label={isWelcome ? "Welcome to RiffleMap.com" : "Sign in required"}
      >
        <div className="auth-sheet__image">
          <img src="/images/river-tryweryn.jpeg" alt="" />
        </div>
        <div className="auth-sheet__content">
          <div className="auth-sheet__brand">
            <span className="brand-mark">
              <Waves size={22} strokeWidth={2.3} />
            </span>
            <span>RiffleMap.com</span>
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
              account. Sign in when you want RiffleMap.com to save something for you or
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
        {poi.sourceLabel ? (
          <section className="info-block">
            <h3>Source</h3>
            <p>{poi.sourceLabel}</p>
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
        <div className="form-actions">
          {poi.navigationLocation ? (
            <a
              className="compact-nav-link compact-nav-link--panel"
              href={navigationUrl(poi.navigationLocation)}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={14} />
              Navigate
            </a>
          ) : null}
          <button className="ghost-button" type="button" onClick={onAddPhoto}>
            <Camera size={16} />
            Add photo
          </button>
        </div>
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
  const [selectedLocation, setSelectedLocation] =
    useState<LatLngTuple | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<SelectedPoi | null>(null);
  const [selectedTargetLabel, setSelectedTargetLabel] = useState(
    "Selected map location",
  );
  const [isAddMode, setIsAddMode] = useState(false);
  const [isSyncingOutbox, setIsSyncingOutbox] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [authState, setAuthState] = useState<AuthState>({
    status: "loading",
    user: null,
    error: null,
  });
  const [authMessage, setAuthMessage] = useState("");
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [memberMessage, setMemberMessage] = useState("");
  const [adminMembers, setAdminMembers] = useState<MemberProfile[]>([]);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [liveGauge, setLiveGauge] = useState<LiveGaugeReading | null>(null);
  const [isGaugeLoading, setIsGaugeLoading] = useState(false);
  const [isSectionListOpen, setIsSectionListOpen] = useState(false);
  const [authSheetMode, setAuthSheetMode] = useState<AuthSheetMode | null>(null);
  const [isWelcomeDismissedForSession, setIsWelcomeDismissedForSession] =
    useState(() => hasDismissedWelcomeForSession());

  const activeSection = useMemo(
    () =>
      riverSections.find((section) => section.id === activeSectionId) ??
      riverSections[0],
    [activeSectionId],
  );

  const sectionContributions = contributions.filter(
    (contribution) => contribution.sectionId === activeSection.id,
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
  const isAuthConfigured = authState.status !== "unconfigured";
  const isSignedIn = Boolean(authState.user);
  const canSyncOutbox =
    queuedOutboxCount > 0 &&
    !isSyncingOutbox &&
    isSignedIn;
  const favouriteSections = riverSections.filter((section) =>
    favouriteSectionIds.includes(section.id),
  );
  const isActiveSectionFavourite =
    isSignedIn && favouriteSectionIds.includes(activeSection.id);

  useEffect(() => subscribeToAuthState(setAuthState), []);

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
      memberProfile?.role === "ADMIN"
    ) {
      void openAdminPanel();
    }
  }, [activeAppSection, activeAdminPage, memberProfile?.role]);

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

    const location = currentContributionOption.locationRequired
      ? selectedLocation!
      : (selectedLocation ?? undefined);

    const nextContribution: Contribution = {
      id: crypto.randomUUID(),
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
    };

    const outboxRecord = createContributionOutboxRecord(nextContribution);

    setContributions((current) => [nextContribution, ...current]);
    setOutboxRecords((current) => [
      outboxRecord,
      ...current.filter((record) => record.id !== outboxRecord.id),
    ]);

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
    setFormError("");
    setSelectedLocation(null);
    setIsFormOpen(false);
    if (!authState.user && isAuthConfigured) {
      setSyncMessage("Saved locally. Sign in to sync this contribution.");
    }
  }

  function resetDemoContributions() {
    setContributions([]);
    outboxRecords.forEach((record) => {
      void outboxStore.remove(record.id);
    });
    setOutboxRecords([]);
    setHazardReviews({});
    setSyncMessage("");
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
  }

  function chooseContributionType(nextType: ContributionType) {
    setContributionType(nextType);
    setCategory(categoryOptions[nextType][0]);
    setFormError("");
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
          isAdmin={memberProfile?.role === "ADMIN"}
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
                <button className="submit-button" type="submit">
                  <Flag size={16} />
                  Save
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
                {sectionContributions
                  .filter((contribution) => contribution.type === "photo")
                  .map((photo) => (
                    <figure key={photo.id}>
                      <div className="photo-placeholder">
                        <Camera size={24} />
                      </div>
                      <figcaption>
                        <strong>{photo.title}</strong>
                        <span>{photo.detail}</span>
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
                <label>
                  River or place
                  <input placeholder="Tryweryn, Wye, Dee" />
                </label>
                <div className="filter-row">
                  <span className="status-chip">Grade I-II</span>
                  <span className="status-chip">Grade III-IV</span>
                  <span className="status-chip">Running now</span>
                  <span className="status-chip">Open canoe</span>
                </div>
                <div className="placeholder-list">
                  {riverSections.map((section) => (
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
                </div>
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
                      RiffleMap.com treats favourites as account-only saved routes, so
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
                        photos, and sync need a RiffleMap.com account.
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
              </div>
            </PlaceholderPage>
          ) : activeAppSection === "more" ? (
            <PlaceholderPage section="more" title="More">
              <AppBrandPanel />
              <div className="placeholder-list">
                {memberProfile?.role === "ADMIN" ? (
                  <button
                    className="placeholder-row"
                    type="button"
                    onClick={() => {
                      setActiveAdminPage("index");
                      setActiveAppSection("admin");
                    }}
                  >
                    <span>
                      <strong>Admin</strong>
                      <small>Members, moderation, and platform controls</small>
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
              {memberProfile?.role === "ADMIN" ? (
                <div className="admin-workspace">
                  {activeAdminPage === "index" ? (
                    <div className="placeholder-list">
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
                      <button
                        className="placeholder-row"
                        type="button"
                        onClick={() => setActiveAdminPage("moderation")}
                      >
                        <span>
                          <strong>Moderation</strong>
                          <small>Contribution queue, reports, and disputes</small>
                        </span>
                        <Flag size={18} />
                      </button>
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
                      {activeAdminPage === "members" ? (
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
                            <div className="member-list member-list--full">
                              {adminMembers.map((member) => (
                                <div className="member-row" key={member.id}>
                                  <div>
                                    <strong>
                                      {member.displayName ?? member.email ?? member.firebaseUid}
                                    </strong>
                                    <span>{member.email ?? "No email"}</span>
                                  </div>
                                  <span className="status-chip">{member.role}</span>
                                </div>
                              ))}
                              {adminMembers.length === 0 ? (
                                <p className="source-note">No members found.</p>
                              ) : null}
                            </div>
                          )}
                        </>
                      ) : activeAdminPage === "moderation" ? (
                        <div className="placeholder-list">
                          <div className="placeholder-row">
                            <span>
                              <strong>Moderation</strong>
                              <small>Contribution queue and reporting tools will live here.</small>
                            </span>
                            <Flag size={18} />
                          </div>
                        </div>
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
                syncStatus,
              }),
          }),
        )
        .on("click", (event) => {
          L.DomEvent.stop(event.originalEvent);
          marker.openPopup();
        });
    });

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
      previousFocusNonceRef.current !== focusNonce
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
        map.fitBounds(bounds, {
          animate: false,
          maxZoom: 13,
          paddingTopLeft: [48, 84],
          paddingBottomRight: [48, 96],
        });
        didFit = true;
        shouldFitActiveSectionRef.current = false;
        previousSectionIdRef.current = activeSection.id;
        previousFocusNonceRef.current = focusNonce;
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
  }, [
    activeSection,
    contributions,
    focusNonce,
    outboxByContributionId,
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
