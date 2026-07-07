import { useEffect, useState } from "react";
import { ChevronLeft, Droplets, Map as MapIcon } from "lucide-react";
import {
  fetchCanonicalRiver,
  type CanonicalRiverDetail,
} from "../services/canonicalRiverApi";
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
import {
  getObservationRangeOption,
  observationRangeOptions,
  type ObservationRangeHours,
} from "../appCore";
import { ObservationCard } from "./ObservationCard";

// The standalone, deep-linkable levels & history page (/river/<id>/levels). A
// fuller, larger-chart companion to the river page's compact Levels sidebar,
// with a longer 90-day range. Self-fetches so it renders deep-linked.
export function RiverLevelsPage({
  riverId,
  onBack,
  onViewOnMap,
}: {
  riverId: string;
  onBack: () => void;
  onViewOnMap: (riverId: string) => void;
}) {
  const [river, setRiver] = useState<CanonicalRiverDetail | null>(null);
  const [levelState, setLevelState] = useState<RiverLevelState | null>(null);
  const [observations, setObservations] = useState<SectionObservationMeasure[]>(
    [],
  );
  const [range, setRange] = useState<ObservationRangeHours>(672);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchCanonicalRiver(riverId).catch(() => null),
      fetchRiverLevelStates().catch(() => [] as RiverLevelState[]),
    ]).then(([riverDetail, states]) => {
      if (!active) return;
      setRiver(riverDetail);
      setLevelState(states.find((s) => s.riverId === riverId) ?? null);
    });
    return () => {
      active = false;
    };
  }, [riverId]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetchRiverObservations(riverId, range)
      .catch(() => [] as SectionObservationMeasure[])
      .then((measures) => {
        if (!active) return;
        setObservations(measures);
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [riverId, range]);

  const levelLabel = levelState
    ? `${LEVEL_BAND_LABELS[levelState.band]}${
        levelState.value != null
          ? ` · ${levelState.value}${levelState.unit ?? ""}`
          : ""
      }`
    : null;

  return (
    <section
      className="river-levels-page"
      aria-label={`${river?.displayName ?? "River"} levels and history`}
    >
      <button
        className="ghost-button ghost-button--compact river-page__back"
        type="button"
        onClick={onBack}
      >
        <ChevronLeft size={15} />
        Back to river
      </button>

      <header className="river-levels-page__head">
        <div className="river-levels-page__heading">
          <p className="eyebrow">Levels &amp; history</p>
          <h1>{river?.displayName ?? "River levels"}</h1>
          {levelLabel ? (
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
          ) : null}
        </div>
        <button
          className="ghost-button"
          type="button"
          onClick={() => onViewOnMap(riverId)}
        >
          <MapIcon size={16} />
          View on map
        </button>
      </header>

      <div
        className="observation-range-toggle river-levels-page__range"
        role="tablist"
        aria-label="History range"
      >
        {observationRangeOptions.map((option) => (
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
      <p className="source-note">
        {getObservationRangeOption(range).chartLabel}. Gauge data is indicative —
        check locally and paddle within your own judgement.
      </p>

      {isLoading ? (
        <p className="source-note">Loading history…</p>
      ) : observations.length ? (
        <div className="river-levels-page__charts">
          {observations.map((measure) => (
            <div className="river-levels-page__chart" key={measure.id}>
              <ObservationCard measure={measure} rangeHours={range} />
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state">No linked gauge history for this river yet.</p>
      )}
    </section>
  );
}
