import {
  AlertTriangle,
  Camera,
  ChevronDown,
  Clock3,
  Droplets,
  Eye,
  Flag,
  MapPin,
  MessageSquare,
  Navigation,
  Plus,
  RefreshCw,
  ShieldAlert,
  Star,
  Waves,
  X,
} from "lucide-react";
import L from "leaflet";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { riverSections } from "./data/demoData";
import type {
  Contribution,
  ContributionType,
  HazardSeverity,
  LatLngTuple,
  RiverSection,
} from "./types";

const STORAGE_KEY = "river-go-demo-contributions";

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
}> = [
  { type: "hazard", label: "Hazard", icon: AlertTriangle },
  { type: "report", label: "Report", icon: MessageSquare },
  { type: "photo", label: "Photo", icon: Camera },
  { type: "feature", label: "Feature", icon: MapPin },
];

function loadContributions(): Contribution[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Contribution[]) : [];
  } catch {
    return [];
  }
}

function markerHtml(kind: string, label: string) {
  return `<span class="map-marker map-marker--${kind}" aria-hidden="true">${label}</span>`;
}

function midpoint(route: LatLngTuple[]): LatLngTuple {
  return route[Math.floor(route.length / 2)];
}

function jitterLocation(base: LatLngTuple, count: number): LatLngTuple {
  const offset = (count % 5) * 0.004;
  return [base[0] + offset, base[1] + offset];
}

function App() {
  const [activeSectionId, setActiveSectionId] = useState(riverSections[0].id);
  const [contributions, setContributions] = useState<Contribution[]>(() =>
    loadContributions(),
  );
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [contributionType, setContributionType] =
    useState<ContributionType>("hazard");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [category, setCategory] = useState("weir");
  const [severity, setSeverity] = useState<HazardSeverity>("caution");

  const activeSection = useMemo(
    () =>
      riverSections.find((section) => section.id === activeSectionId) ??
      riverSections[0],
    [activeSectionId],
  );

  const sectionContributions = contributions.filter(
    (contribution) => contribution.sectionId === activeSection.id,
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contributions));
  }, [contributions]);

  function submitContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const safeTitle = title.trim();
    const safeDetail = detail.trim();

    if (!safeTitle || !safeDetail) {
      return;
    }

    const base = midpoint(activeSection.route);
    const nextContribution: Contribution = {
      id: crypto.randomUUID(),
      sectionId: activeSection.id,
      type: contributionType,
      title: safeTitle,
      detail: safeDetail,
      category,
      severity: contributionType === "hazard" ? severity : undefined,
      createdAt: "Just now",
      location:
        contributionType === "report"
          ? undefined
          : jitterLocation(base, sectionContributions.length + 1),
    };

    setContributions((current) => [nextContribution, ...current]);
    setTitle("");
    setDetail("");
    setIsFormOpen(false);
  }

  function resetDemoContributions() {
    setContributions([]);
  }

  return (
    <main className="app-shell">
      <section className="topbar" aria-label="River Go navigation">
        <div className="brand-lockup">
          <span className="brand-mark">
            <Waves size={22} strokeWidth={2.3} />
          </span>
          <div>
            <p className="eyebrow">UK community river intelligence</p>
            <h1>River Go</h1>
          </div>
        </div>
        <div className="topbar-actions">
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
            onClick={() => {
              setIsPanelOpen(true);
              setIsFormOpen(true);
            }}
          >
            <Plus size={18} />
            Add local knowledge
          </button>
        </div>
      </section>

      <section className="workspace">
        <aside className="section-list" aria-label="River sections">
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
              onClick={() => {
                setActiveSectionId(section.id);
                setIsPanelOpen(true);
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
        </aside>

        <RiverMap
          activeSection={activeSection}
          contributions={contributions}
          onSelectSection={(section) => {
            setActiveSectionId(section.id);
            setIsPanelOpen(true);
          }}
        />

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

            <section className="info-block">
              <h3>Gauge</h3>
              <div className="gauge-card">
                <div>
                  <strong>{activeSection.gauge.name}</strong>
                  <span>{activeSection.gauge.observedAt}</span>
                </div>
                <div>
                  <strong>{activeSection.gauge.value}</strong>
                  <span>{activeSection.gauge.trend}</span>
                </div>
              </div>
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
              {activeSection.hazards.map((hazard) => (
                <div className="hazard-item" key={hazard.id}>
                  <AlertTriangle size={17} />
                  <div>
                    <strong>{hazard.title}</strong>
                    <span>
                      {hazard.severity} · {hazard.status} · confirmed{" "}
                      {hazard.lastConfirmed}
                    </span>
                    <p>{hazard.description}</p>
                  </div>
                </div>
              ))}
            </section>

            <section className="info-block">
              <div className="block-title">
                <h3>Community Updates</h3>
                <span>{sectionContributions.length} demo</span>
              </div>
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
                    ) : (
                      <MessageSquare size={16} />
                    )}
                    <div>
                      <strong>{contribution.title}</strong>
                      <span>
                        {contribution.type} · {contribution.createdAt}
                      </span>
                      <p>{contribution.detail}</p>
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

            <section className="contribution-box">
              <button
                className="primary-action primary-action--full"
                type="button"
                onClick={() => setIsFormOpen((current) => !current)}
              >
                <Plus size={18} />
                Add contribution
              </button>

              {isFormOpen ? (
                <form className="contribution-form" onSubmit={submitContribution}>
                  <div className="segmented-control" role="tablist">
                    {contributionOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          className={
                            contributionType === option.type ? "active" : ""
                          }
                          key={option.type}
                          type="button"
                          title={`Add ${option.label.toLowerCase()}`}
                          onClick={() => {
                            setContributionType(option.type);
                            setCategory(
                              option.type === "hazard"
                                ? "weir"
                                : option.type === "photo"
                                  ? "river view"
                                  : option.type,
                            );
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
                      placeholder="Fallen tree below bridge"
                    />
                  </label>

                  <label>
                    Category
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                    >
                      <option value="weir">Weir</option>
                      <option value="strainer">Strainer</option>
                      <option value="access">Access</option>
                      <option value="portage">Portage</option>
                      <option value="level">Level</option>
                      <option value="river view">River view</option>
                      <option value="feature">Feature</option>
                    </select>
                  </label>

                  {contributionType === "hazard" ? (
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
                  ) : null}

                  <label>
                    Detail
                    <textarea
                      value={detail}
                      onChange={(event) => setDetail(event.target.value)}
                      placeholder="Add a short, factual note with when you observed it."
                      rows={4}
                    />
                  </label>

                  <div className="form-actions">
                    <button className="ghost-button" type="button">
                      <Eye size={16} />
                      Preview
                    </button>
                    <button className="submit-button" type="submit">
                      <Flag size={16} />
                      Save
                    </button>
                  </div>
                </form>
              ) : null}
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
  onSelectSection,
}: {
  activeSection: RiverSection;
  contributions: Contribution[];
  onSelectSection: (section: RiverSection) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const callbackRef = useRef(onSelectSection);

  useEffect(() => {
    callbackRef.current = onSelectSection;
  }, [onSelectSection]);

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

      L.polyline(section.route, {
        color,
        weight: isActive ? 7 : 4,
        opacity: isActive ? 0.95 : 0.7,
      })
        .addTo(layers)
        .on("click", () => callbackRef.current(section));

      L.marker(section.centre, {
        icon: L.divIcon({
          className: "",
          html: markerHtml(isActive ? "section-active" : "section", "R"),
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
      })
        .addTo(layers)
        .on("click", () => callbackRef.current(section));

      section.accessPoints.forEach((accessPoint) => {
        L.marker(accessPoint.location, {
          icon: L.divIcon({
            className: "",
            html: markerHtml("access", accessPoint.type === "put-in" ? "I" : "O"),
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        })
          .addTo(layers)
          .bindTooltip(accessPoint.name);
      });

      section.hazards.forEach((hazard) => {
        L.marker(hazard.location, {
          icon: L.divIcon({
            className: "",
            html: markerHtml("hazard", "!"),
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          }),
        })
          .addTo(layers)
          .bindTooltip(hazard.title);
      });

      section.features.forEach((feature) => {
        L.marker(feature.location, {
          icon: L.divIcon({
            className: "",
            html: markerHtml("feature", "*"),
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          }),
        })
          .addTo(layers)
          .bindTooltip(feature.title);
      });

      L.marker(section.gauge.location, {
        icon: L.divIcon({
          className: "",
          html: markerHtml("gauge", "~"),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      })
        .addTo(layers)
        .bindTooltip(`${section.gauge.name}: ${section.gauge.value}`);
    });

    contributions.forEach((contribution) => {
      if (!contribution.location) {
        return;
      }

      const kind = contribution.type === "hazard" ? "hazard" : "community";
      const label =
        contribution.type === "hazard"
          ? "!"
          : contribution.type === "photo"
            ? "P"
            : contribution.type === "feature"
              ? "*"
              : "N";

      L.marker(contribution.location, {
        icon: L.divIcon({
          className: "",
          html: markerHtml(kind, label),
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
      })
        .addTo(layers)
        .bindTooltip(contribution.title);
    });

    map.flyTo(activeSection.centre, activeSection.id === "dart-loop" ? 12 : 11, {
      animate: true,
      duration: 0.7,
    });
  }, [activeSection, contributions]);

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
