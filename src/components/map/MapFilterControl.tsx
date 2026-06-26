import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Filter, X } from "lucide-react";
import "./map-filter-control.css";

export interface FilterOption {
  id: string;
  label: string;
}

export interface FilterCategory {
  id: string;
  label: string;
  /** Colour for this category's pills and active options. */
  color: string;
  /**
   * "filter" narrows what's shown (e.g. discipline) — empty means "all".
   * "display" is a show/hide toggle — empty means "none". Defaults to display.
   */
  kind?: "filter" | "display";
  options: FilterOption[];
}

interface MapFilterControlProps {
  categories: FilterCategory[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
}

const PILL_GAP = 5;
const MORE_CHIP_RESERVE = 42;
const MAX_PILL_ROWS = 2;

// Active filters live as compact, category-coloured pills along the top; the
// expander reveals everything by category, split into "Filter" (narrows what's
// shown — e.g. discipline) and "Show on map" (display toggles). Both are views of
// one state.
export function MapFilterControl({
  categories,
  selected,
  onToggle,
  onClear,
}: MapFilterControlProps) {
  const [expanded, setExpanded] = useState(false);
  const pillsRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  const { optionById, colorByOptionId, filterOptionIds } = useMemo(() => {
    const byId = new Map<string, FilterOption>();
    const colorById = new Map<string, string>();
    const filterIds = new Set<string>();
    for (const category of categories) {
      for (const option of category.options) {
        byId.set(option.id, option);
        colorById.set(option.id, category.color);
        if (category.kind === "filter") filterIds.add(option.id);
      }
    }
    return {
      optionById: byId,
      colorByOptionId: colorById,
      filterOptionIds: filterIds,
    };
  }, [categories]);

  const activeIds = [...selected].filter((id) => optionById.has(id));
  const activeKey = activeIds.join("|");

  const [visibleCount, setVisibleCount] = useState(activeIds.length);

  useLayoutEffect(() => {
    const container = pillsRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    // Pack pills into up to MAX_PILL_ROWS rows; reserve room for the +N chip on
    // the last row when more pills remain.
    const compute = () => {
      const available = container.clientWidth;
      const items = Array.from(measure.children) as HTMLElement[];
      const total = items.length;
      let row = 0;
      let rowWidth = 0;
      let count = 0;
      for (let i = 0; i < total; i += 1) {
        const width = items[i].offsetWidth;
        const gap = rowWidth > 0 ? PILL_GAP : 0;
        const onLastRow = row === MAX_PILL_ROWS - 1;
        const reserve =
          onLastRow && i < total - 1 ? PILL_GAP + MORE_CHIP_RESERVE : 0;
        if (rowWidth + gap + width + reserve <= available) {
          rowWidth += gap + width;
          count += 1;
        } else if (!onLastRow) {
          row += 1;
          rowWidth = width;
          count += 1;
        } else {
          break;
        }
      }
      setVisibleCount(count);
    };

    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(container);
    return () => observer.disconnect();
  }, [activeKey]);

  const visibleIds = activeIds.slice(0, visibleCount);
  const hiddenCount = activeIds.length - visibleIds.length;

  const renderPill = (id: string, forMeasure: boolean) => {
    const option = optionById.get(id);
    if (!option) return null;
    const isFilter = filterOptionIds.has(id);
    const close = forMeasure ? (
      <span className="map-filter__pill-close">
        <X size={12} strokeWidth={2.5} />
      </span>
    ) : (
      <button
        type="button"
        className="map-filter__pill-close"
        onClick={() => onToggle(id)}
        aria-label={`Remove ${option.label}`}
      >
        <X size={12} strokeWidth={2.5} />
      </button>
    );
    return (
      <span
        className="map-filter__pill"
        key={id}
        style={{ backgroundColor: colorByOptionId.get(id) }}
      >
        {isFilter ? <Filter size={11} strokeWidth={2.5} /> : null}
        {option.label}
        {close}
      </span>
    );
  };

  const renderCategory = (category: FilterCategory) => (
    <div className="map-filter__category" key={category.id}>
      <span className="map-filter__category-label">
        <span
          className="map-filter__category-dot"
          style={{ backgroundColor: category.color }}
          aria-hidden="true"
        />
        {category.label}
      </span>
      <div className="map-filter__options">
        {category.options.map((option) => {
          const on = selected.has(option.id);
          return (
            <button
              type="button"
              key={option.id}
              className={`map-filter__option ${
                on ? "map-filter__option--on" : ""
              }`}
              style={
                on
                  ? { backgroundColor: category.color, borderColor: category.color }
                  : undefined
              }
              onClick={() => onToggle(option.id)}
              aria-pressed={on}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  const filterCategories = categories.filter((c) => c.kind === "filter");
  const displayCategories = categories.filter((c) => c.kind !== "filter");

  return (
    <div className={`map-filter ${expanded ? "map-filter--expanded" : ""}`}>
      <div className="map-filter__bar">
        <div className="map-filter__pills" ref={pillsRef}>
          {activeIds.length === 0 ? (
            <span className="map-filter__placeholder">No layers shown</span>
          ) : (
            <>
              {visibleIds.map((id) => renderPill(id, false))}
              {hiddenCount > 0 ? (
                <button
                  type="button"
                  className="map-filter__more"
                  onClick={() => setExpanded(true)}
                  aria-label={`${hiddenCount} more active filters`}
                >
                  +{hiddenCount}
                </button>
              ) : null}
              <div className="map-filter__measure" ref={measureRef} aria-hidden="true">
                {activeIds.map((id) => renderPill(id, true))}
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          className="map-filter__expander"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          <span>Layers</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded ? (
        <div className="map-filter__panel" role="group" aria-label="Map layers">
          <div className="map-filter__panel-head">
            <strong>Layers</strong>
            {activeIds.length > 0 ? (
              <button type="button" className="map-filter__clear" onClick={onClear}>
                Clear all
              </button>
            ) : null}
          </div>
          {filterCategories.length > 0 ? (
            <div className="map-filter__section map-filter__section--filter">
              <span className="map-filter__section-head">
                <Filter size={12} strokeWidth={2.5} />
                Filter — narrows what's shown
              </span>
              {filterCategories.map(renderCategory)}
            </div>
          ) : null}
          <div className="map-filter__section">
            <span className="map-filter__section-head">Show on map</span>
            {displayCategories.map(renderCategory)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
