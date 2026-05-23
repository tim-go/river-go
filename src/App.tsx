import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Droplets,
  ExternalLink,
  Flag,
  LogIn,
  LogOut,
  MapPinned,
  MapPin,
  MessageSquare,
  Navigation,
  Plus,
  RefreshCw,
  Route,
  ShieldAlert,
  ShieldCheck,
  Star,
  Waves,
  X,
} from "lucide-react";
import L from "leaflet";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { riverSections } from "./data/demoData";
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

function markerHtml(kind: string, label: string) {
  return `<span class="map-marker map-marker--${kind}" aria-hidden="true">${label}</span>`;
}

function midpoint(route: LatLngTuple[]): LatLngTuple {
  return route[Math.floor(route.length / 2)];
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
    return "local demo";
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

function App() {
  const outboxStore = useMemo(() => createContributionOutboxStore(), []);
  const [activeSectionId, setActiveSectionId] = useState(riverSections[0].id);
  const [contributions, setContributions] = useState<Contribution[]>(() =>
    loadContributions(),
  );
  const [outboxRecords, setOutboxRecords] = useState<ContributionOutboxRecord[]>(
    [],
  );
  const [hazardReviews, setHazardReviews] = useState<
    Record<string, HazardReview>
  >(() => loadHazardReviews());
  const [isPanelOpen, setIsPanelOpen] = useState(
    () => !window.matchMedia("(max-width: 720px)").matches,
  );
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
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminMembers, setAdminMembers] = useState<MemberProfile[]>([]);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [liveGauge, setLiveGauge] = useState<LiveGaugeReading | null>(null);
  const [isGaugeLoading, setIsGaugeLoading] = useState(false);
  const [isSectionListOpen, setIsSectionListOpen] = useState(false);

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
  const canSyncOutbox =
    queuedOutboxCount > 0 &&
    !isSyncingOutbox &&
    (!isAuthConfigured || Boolean(authState.user));

  useEffect(() => subscribeToAuthState(setAuthState), []);

  useEffect(() => {
    let isMounted = true;

    if (!authState.user) {
      setMemberProfile(null);
      setMemberMessage("");
      setAdminMembers([]);
      setIsAdminPanelOpen(false);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contributions));
  }, [contributions]);

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

    if (isAuthConfigured && !authState.user) {
      setSyncMessage("Sign in before syncing local contributions.");
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
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Could not sign in.");
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

  async function openAdminPanel() {
    setIsAdminPanelOpen(true);
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
    setIsPanelOpen(true);
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
    setIsPanelOpen(true);
    setIsSectionListOpen(false);
  }

  return (
    <main className="app-shell">
      <section className="topbar" aria-label="RiffleMap navigation">
        <div className="brand-lockup">
          <span className="brand-mark">
            <Waves size={22} strokeWidth={2.3} />
          </span>
          <div>
            <p className="eyebrow">UK community river intelligence</p>
            <h1>RiffleMap</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="member-status" title="Contributor sign-in">
            <span>
              {authState.status === "loading"
                ? "Checking sign-in"
                : authState.user
                  ? memberProfile
                    ? `${memberProfile.displayName ?? authState.user.displayName} · ${
                        memberProfile.role
                      }`
                    : authState.user.displayName
                  : isAuthConfigured
                    ? "Signed out"
                    : "Auth not configured"}
            </span>
            {authState.user ? (
              <button
                className="ghost-button ghost-button--compact"
                type="button"
                onClick={handleSignOut}
              >
                <LogOut size={15} />
                Sign out
              </button>
            ) : (
              <button
                className="ghost-button ghost-button--compact"
                type="button"
                onClick={handleSignIn}
                disabled={!isAuthConfigured}
              >
                <LogIn size={15} />
                Sign in
              </button>
            )}
          </div>
          {memberProfile?.role === "ADMIN" ? (
            <button
              className="ghost-button sync-action"
              type="button"
              onClick={openAdminPanel}
            >
              <ShieldCheck size={16} />
              Admin
            </button>
          ) : null}
          <span
            className={`sync-pill ${
              queuedOutboxCount > 0 ? "sync-pill--queued" : ""
            }`}
            title="Local contribution outbox"
          >
            {queuedOutboxCount > 0
              ? `${queuedOutboxCount} offline change${
                  queuedOutboxCount === 1 ? "" : "s"
                }`
              : "No offline changes"}
          </span>
          <button
            className="ghost-button sync-action"
            type="button"
            onClick={syncOutboxNow}
            disabled={!canSyncOutbox}
            title="Sync local contributions"
          >
            <RefreshCw size={16} />
            {isSyncingOutbox
              ? "Syncing"
              : isAuthConfigured && !authState.user && queuedOutboxCount > 0
                ? "Sign in to sync"
                : "Sync now"}
          </button>
          <button
            className="icon-button"
            type="button"
            title="Watch selected section"
            aria-label="Watch selected section"
          >
            <Star size={18} />
          </button>
          <button
            className="icon-button"
            type="button"
            title="Reset demo contributions"
            aria-label="Reset demo contributions"
            onClick={resetDemoContributions}
          >
            <RefreshCw size={18} />
          </button>
          <button
            className="primary-action"
            type="button"
            onClick={() => startAddMode()}
          >
            <Plus size={18} />
            Add local knowledge
          </button>
          {authMessage || authState.error || memberMessage ? (
            <p className="topbar-message">
              {authMessage || authState.error || memberMessage}
            </p>
          ) : null}
        </div>
      </section>

      <section className="workspace">
        <div className="mobile-map-controls" aria-label="Map panels">
          <button
            className="ghost-button"
            type="button"
            onClick={() => setIsSectionListOpen((current) => !current)}
          >
            <Route size={16} />
            Sections
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => setIsPanelOpen((current) => !current)}
          >
            <MapPinned size={16} />
            Details
          </button>
        </div>

        <aside
          className={`section-list ${
            isSectionListOpen ? "section-list--mobile-open" : ""
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
          onSelectSection={selectSection}
        />

        {isFormOpen ? (
          <section className="quick-add-panel" aria-label="Add contribution">
            <div className="quick-add-panel__header">
              <div>
                <p className="eyebrow">Add local knowledge</p>
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
                  onClick={() => setSelectedLocation(midpoint(activeSection.route))}
                >
                  <MapPinned size={16} />
                  Use midpoint
                </button>
                <button className="submit-button" type="submit">
                  <Flag size={16} />
                  Save contribution
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

        {isAdminPanelOpen ? (
          <section className="admin-panel" aria-label="Admin members">
            <div className="quick-add-panel__header">
              <div>
                <p className="eyebrow">Admin</p>
                <h2>Members</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Close admin panel"
                title="Close"
                onClick={() => setIsAdminPanelOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            {isAdminLoading ? (
              <p className="source-note">Loading members...</p>
            ) : (
              <div className="member-list">
                {adminMembers.map((member) => (
                  <div className="member-row" key={member.id}>
                    <div>
                      <strong>{member.displayName ?? member.email ?? member.firebaseUid}</strong>
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
          </section>
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
                <h3>Add local knowledge</h3>
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
                          {contribution.status ?? "confirmed"}
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
  onSelectSection: (section: RiverSection) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const callbackRef = useRef(onSelectSection);
  const mapClickRef = useRef(onMapClick);
  const previousSectionIdRef = useRef(activeSection.id);
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

    return () => {
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
          `<strong>${section.sectionName}</strong><br/>${section.summary}`,
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
            `<strong>${accessPoint.name}</strong><br/>${accessPoint.type}<br/>${accessPoint.notes}<br/><a href="${navigationUrl(accessPoint.location)}" target="_blank" rel="noreferrer">Navigate with Google Maps</a>`,
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
            `<strong>${hazard.title}</strong><br/>${hazard.type} · ${hazard.severity}<br/>${hazard.description}`,
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
            `<strong>${feature.title}</strong><br/>${feature.type}<br/>${feature.description}`,
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
          `<strong>${section.gauge.name}</strong><br/>${section.gauge.value}<br/>${section.gauge.observedAt}`,
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
          `<strong>${contribution.title}</strong><br/>${contribution.type} · ${contribution.status}<br/>${syncStatusLabel(syncStatus)}<br/>${contribution.detail}`,
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

    if (previousSectionIdRef.current !== activeSection.id) {
      shouldFitActiveSectionRef.current = true;
    }

    if (shouldFitActiveSectionRef.current) {
      const bounds = L.latLngBounds(activeSection.route);
      map.fitBounds(bounds, {
        animate: true,
        duration: 0.7,
        maxZoom: 13,
        paddingTopLeft: [24, 84],
        paddingBottomRight: [460, 48],
      });
      shouldFitActiveSectionRef.current = false;
    }

    previousSectionIdRef.current = activeSection.id;
  }, [
    activeSection,
    contributions,
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
