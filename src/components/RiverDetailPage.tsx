import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  Droplets,
  Map as MapIcon,
  MapPin,
  Waves,
} from "lucide-react";
import {
  fetchCanonicalRiver,
  type CanonicalRiverDetail,
} from "../services/canonicalRiverApi";
import {
  fetchPublicSections,
  type CommunitySection,
} from "../services/routesApi";
import { fetchRiverMapPois } from "../services/mapPoiApi";
import { fetchAmenities, type Amenity } from "../services/amenityApi";
import {
  fetchRiverObservations,
  type SectionObservationMeasure,
} from "../services/observationApi";
import {
  fetchRiverLevelStates,
  levelBandColor,
  LEVEL_BAND_LABELS,
  type RiverLevelState,
} from "../services/levelStateApi";
import type { MapPoi, PhotoLightboxItem } from "../types";
import {
  disciplineLabel,
  formatDistanceKm,
  mapPoiCategoryLabels,
  mapPoiDisplayMeta,
  observationParameterLabels,
  type ObservationRangeHours,
} from "../appCore";
import { RIVER_TAB_POI_CATEGORIES, type RiverPoiTab } from "../lib/riverPoiTabs";
import { getPrimaryObservationMeasure } from "../lib/format";
import { humanisePoiTitle, poiTypeSubtitle } from "../lib/poiSubtitle";
import { ObservationCard } from "./ObservationCard";
import { RiverPhotoGallery } from "./RiverPhotoGallery";
import { RiverPaddleHistory } from "./RiverPaddleHistory";
import { RiverLocatorMap } from "./RiverLocatorMap";

// A collapsible river-page block. Uses native <details> so it's keyboard- and
// screen-reader-friendly; the heading stays visible (with count) when collapsed.
function RiverPageBlock({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="river-page__block river-page__block--collapsible" open={defaultOpen}>
      <summary>
        <h2>{title}</h2>
      </summary>
      <div className="river-page__block-body">{children}</div>
    </details>
  );
}

const AMENITY_LABELS: Record<string, string> = {
  car_park: "Car park",
  camp_site: "Campsite",
  caravan_site: "Caravan site",
};
// Categories surfaced in the river page's "Parking & camping" block.
const PARKING_CAMPING = ["car_park", "camp_site", "caravan_site"];
const PARKING_CAMPING_LIMIT = 12;

const POI_TAB_LABELS: Record<RiverPoiTab, string> = {
  rapids: "Rapids & features",
  hazards: "Hazards & structures",
  access: "Access & gauges",
};

const RANGE_OPTIONS: Array<{ hours: ObservationRangeHours; label: string }> = [
  { hours: 48, label: "48h" },
  { hours: 168, label: "7d" },
  { hours: 672, label: "28d" },
];

// The dedicated, desktop-rich river "destination" page (RIVERDISC-F3). Distinct
// from the in-map river panel (the "glance") — same data, fuller surface. Self-
// fetches so it can render deep-linked at /river/<id> independent of the map.
export function RiverDetailPage({
  riverId,
  onBack,
  onViewOnMap,
  onViewPoiOnMap,
  onViewAmenityOnMap,
  onViewSectionOnMap,
  onViewLevels,
  onOpenPhoto,
}: {
  riverId: string;
  onBack: () => void;
  onViewOnMap: (riverId: string) => void;
  onViewPoiOnMap: (poi: MapPoi) => void;
  onViewAmenityOnMap: (amenity: Amenity) => void;
  onViewSectionOnMap: (section: CommunitySection) => void;
  onViewLevels: (riverId: string) => void;
  onOpenPhoto: (photo: PhotoLightboxItem) => void;
}) {
  const [river, setRiver] = useState<CanonicalRiverDetail | null>(null);
  const [sections, setSections] = useState<CommunitySection[]>([]);
  const [pois, setPois] = useState<MapPoi[]>([]);
  const [levelState, setLevelState] = useState<RiverLevelState | null>(null);
  const [observations, setObservations] = useState<SectionObservationMeasure[]>(
    [],
  );
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [range, setRange] = useState<ObservationRangeHours>(48);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    Promise.all([
      fetchCanonicalRiver(riverId),
      fetchPublicSections(riverId).catch(() => [] as CommunitySection[]),
      fetchRiverMapPois(riverId).catch(() => [] as MapPoi[]),
      fetchRiverLevelStates().catch(() => [] as RiverLevelState[]),
      fetchAmenities(riverId).catch(() => [] as Amenity[]),
    ])
      .then(([riverDetail, sectionList, poiList, states, amenityList]) => {
        if (!active) return;
        setRiver(riverDetail);
        setSections(sectionList);
        setPois(poiList);
        setLevelState(states.find((s) => s.riverId === riverId) ?? null);
        setAmenities(amenityList);
      })
      .catch(() => {
        if (active) setError("Could not load this river.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [riverId]);

  useEffect(() => {
    let active = true;
    fetchRiverObservations(riverId, range)
      .catch(() => [] as SectionObservationMeasure[])
      .then((measures) => {
        if (active) setObservations(measures);
      });
    return () => {
      active = false;
    };
  }, [riverId, range]);

  const poisByTab = useMemo(() => {
    const grouped: Record<RiverPoiTab, MapPoi[]> = {
      rapids: [],
      hazards: [],
      access: [],
    };
    for (const poi of pois) {
      const category = mapPoiDisplayMeta(poi).category;
      // Whitewater-*section* segments are all titled with the river name and
      // duplicate the river/sections — noise on the river page (they remain on
      // the map). Skip them here.
      if (category === "whitewater") continue;
      for (const tab of Object.keys(grouped) as RiverPoiTab[]) {
        if (RIVER_TAB_POI_CATEGORIES[tab].includes(category)) {
          grouped[tab].push(poi);
          break;
        }
      }
    }
    return grouped;
  }, [pois]);

  const parkingAndCamping = useMemo(
    () => amenities.filter((a) => PARKING_CAMPING.includes(a.category)),
    [amenities],
  );

  const primaryMeasure = getPrimaryObservationMeasure(observations);

  const dataGaps = useMemo(() => {
    if (!river) return [];
    const gaps: string[] = [];
    if (!levelState) gaps.push("No live gauge linked to this river yet.");
    if (sections.length === 0)
      gaps.push("No community sections yet — be the first to add one.");
    if (poisByTab.access.length === 0)
      gaps.push("No access points or gauges reviewed yet.");
    if (poisByTab.hazards.length === 0)
      gaps.push("No hazards or structures reviewed yet.");
    if (river.reviewNeededCandidatePoiCount > 0)
      gaps.push(
        `${river.reviewNeededCandidatePoiCount} candidate point${
          river.reviewNeededCandidatePoiCount === 1 ? "" : "s"
        } awaiting review.`,
      );
    return gaps;
  }, [river, levelState, sections, poisByTab]);

  if (isLoading) {
    return (
      <section className="river-page">
        <BackBar onBack={onBack} />
        <p className="source-note">Loading river…</p>
      </section>
    );
  }
  if (error || !river) {
    return (
      <section className="river-page">
        <BackBar onBack={onBack} />
        <p className="empty-state">{error ?? "River not found."}</p>
      </section>
    );
  }

  const where = Array.from(
    new Set([river.region, river.nation].filter(Boolean)),
  ).join(" · ");
  const levelLabel = levelState
    ? `${LEVEL_BAND_LABELS[levelState.band]}${
        levelState.value != null
          ? ` · ${levelState.value}${levelState.unit ?? ""}`
          : ""
      }`
    : "No live level";

  return (
    <section className="river-page" aria-label={`${river.displayName} river page`}>
      <BackBar onBack={onBack} />

      <header className="river-page__hero">
        <div className="river-page__heading">
          <p className="eyebrow">{river.riverType || "River"}</p>
          <h1>{river.displayName}</h1>
          {river.canonicalName && river.canonicalName !== river.displayName ? (
            <p className="river-page__alt">Also: {river.canonicalName}</p>
          ) : null}
          {where ? <p className="river-page__where">{where}</p> : null}
          <div className="river-page__chips">
            {river.grade ? (
              <span className="chip chip--grade">Grade {river.grade}</span>
            ) : null}
            {river.discipline ? (
              <span className="chip">{disciplineLabel(river.discipline)}</span>
            ) : null}
            {river.run ? <span className="chip">{river.run}</span> : null}
            <span
              className="chip chip--level"
              style={{
                borderColor: levelState
                  ? levelBandColor(levelState.band)
                  : undefined,
              }}
            >
              <Droplets size={13} /> {levelLabel}
            </span>
          </div>
        </div>
        <div className="river-page__hero-actions">
          <button
            className="ghost-button"
            type="button"
            onClick={() => onViewOnMap(riverId)}
          >
            <MapIcon size={15} />
            View on map
          </button>
        </div>
      </header>

      <div className="river-page__body">
        <main className="river-page__main">
          {river.summary ? (
            <section className="river-page__block">
              <h2>Overview</h2>
              <p>{river.summary}</p>
              <p className="source-note river-safety-note">
                Community-sourced and official information. Conditions change
                quickly — check locally and paddle within your own judgement.
              </p>
            </section>
          ) : null}

          <RiverPageBlock title={`Sections (${sections.length})`}>
            {sections.length ? (
              <ul className="river-page__list">
                {sections.map((section) => (
                  <li key={section.id} className="river-page__list-row">
                    <span>
                      <strong>{section.name}</strong>
                      <small>
                        {section.grade ?? "Needs grading"}
                        {section.distanceKm
                          ? ` · ${formatDistanceKm(section.distanceKm)}`
                          : ""}
                      </small>
                      {section.summary ? <small>{section.summary}</small> : null}
                    </span>
                    {section.route.length ? (
                      <button
                        className="ghost-button ghost-button--compact"
                        type="button"
                        aria-label={`View ${section.name} on the map`}
                        onClick={() => onViewSectionOnMap(section)}
                      >
                        <MapIcon size={14} />
                        Map
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">
                No sections yet — sections are community-added and reviewed
                before they appear.
              </p>
            )}
          </RiverPageBlock>

          {(Object.keys(poisByTab) as RiverPoiTab[]).map((tab) =>
            poisByTab[tab].length ? (
              <RiverPageBlock
                key={tab}
                title={`${POI_TAB_LABELS[tab]} (${poisByTab[tab].length})`}
                defaultOpen={tab === "rapids"}
              >
                <ul className="river-page__list">
                  {poisByTab[tab].map((poi) => (
                    <li key={poi.id} className="river-page__list-row">
                      <span>
                        <strong>{humanisePoiTitle(poi.title)}</strong>
                        <small>
                          {poiTypeSubtitle(
                            mapPoiCategoryLabels[mapPoiDisplayMeta(poi).category],
                            poi.subtitle,
                          )}
                        </small>
                      </span>
                      <button
                        className="ghost-button ghost-button--compact"
                        type="button"
                        aria-label={`View ${humanisePoiTitle(poi.title)} on the map`}
                        onClick={() => onViewPoiOnMap(poi)}
                      >
                        <MapIcon size={14} />
                        Map
                      </button>
                    </li>
                  ))}
                </ul>
              </RiverPageBlock>
            ) : null,
          )}

          {parkingAndCamping.length ? (
            <RiverPageBlock
              title={`Parking & camping (${parkingAndCamping.length})`}
              defaultOpen={false}
            >
              <ul className="river-page__list">
                {parkingAndCamping.slice(0, PARKING_CAMPING_LIMIT).map((amenity) => (
                  <li key={amenity.id} className="river-page__list-row">
                    <span>
                      <strong>
                        {amenity.name ??
                          AMENITY_LABELS[amenity.category] ??
                          amenity.category}
                      </strong>
                      <small>
                        {AMENITY_LABELS[amenity.category] ?? amenity.category}
                      </small>
                    </span>
                    <button
                      className="ghost-button ghost-button--compact"
                      type="button"
                      aria-label={`View ${
                        amenity.name ?? AMENITY_LABELS[amenity.category]
                      } on the map`}
                      onClick={() => onViewAmenityOnMap(amenity)}
                    >
                      <MapIcon size={14} />
                      Map
                    </button>
                  </li>
                ))}
              </ul>
              {parkingAndCamping.length > PARKING_CAMPING_LIMIT ? (
                <p className="source-note">
                  Showing {PARKING_CAMPING_LIMIT} of {parkingAndCamping.length}.
                  Turn on Car parks / Campsites in the map’s Layers to see them
                  all.
                </p>
              ) : null}
            </RiverPageBlock>
          ) : null}

          <RiverPageBlock title="Photos">
            <RiverPhotoGallery riverId={riverId} onOpenPhoto={onOpenPhoto} />
          </RiverPageBlock>

          <section className="river-page__block">
            <RiverPaddleHistory riverId={riverId} />
          </section>
        </main>

        <aside className="river-page__side">
          <section className="river-page__card">
            <h3>
              <MapPin size={15} /> Location
            </h3>
            <RiverLocatorMap
              riverId={riverId}
              bbox={river.bbox}
              centre={river.centre}
            />
            {where ? <p className="source-note">{where}</p> : null}
          </section>

          <section className="river-page__card">
            <h3>
              <Droplets size={15} /> Levels
            </h3>
            <div className="observation-range-toggle" role="tablist">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.hours}
                  type="button"
                  role="tab"
                  aria-selected={range === option.hours}
                  className={range === option.hours ? "active" : ""}
                  onClick={() => setRange(option.hours)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {primaryMeasure ? (
              <div className="observation-list">
                {observations.map((measure) => (
                  <ObservationCard
                    key={measure.id}
                    measure={measure}
                    rangeHours={range}
                  />
                ))}
              </div>
            ) : (
              <p className="empty-state">
                No live gauge linked to this river yet — read locally or check a
                release schedule.
              </p>
            )}
            {primaryMeasure ? (
              <button
                className="ghost-button ghost-button--compact river-page__levels-more"
                type="button"
                onClick={() => onViewLevels(riverId)}
              >
                View full history &amp; 90-day chart →
              </button>
            ) : null}
          </section>

          <section className="river-page__card">
            <h3>
              <MapPin size={15} /> Quick facts
            </h3>
            <dl className="river-page__facts">
              <Fact label="Type" value={river.riverType || "River"} />
              <Fact label="Region" value={where || "—"} />
              {river.grade ? (
                <Fact label="Grade" value={river.grade} />
              ) : null}
              {primaryMeasure ? (
                <Fact
                  label="Gauge"
                  value={`${primaryMeasure.stationName} (${
                    observationParameterLabels[primaryMeasure.parameter]
                  })`}
                />
              ) : null}
              <Fact
                label="Sections"
                value={String(sections.length)}
              />
              <Fact
                label="Source confidence"
                value={river.sourceConfidence ?? "—"}
              />
            </dl>
          </section>

          <section className="river-page__card">
            <h3>
              <Waves size={15} /> Data gaps
            </h3>
            {dataGaps.length ? (
              <ul className="river-page__gaps">
                {dataGaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            ) : (
              <p className="source-note">No obvious gaps flagged.</p>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}

function BackBar({ onBack }: { onBack: () => void }) {
  return (
    <button
      className="ghost-button ghost-button--compact river-page__back"
      type="button"
      onClick={onBack}
    >
      <ChevronLeft size={15} />
      Back
    </button>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="river-page__fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
