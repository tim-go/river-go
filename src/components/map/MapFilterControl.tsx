import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import "./map-filter-control.css";

export interface FilterOption {
  id: string;
  label: string;
}

export interface FilterCategory {
  id: string;
  label: string;
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

// Active filters live as compact closable pills along the top; when they don't all
// fit, the overflow collapses to a "+N" chip (tap → opens the panel). The expander
// reveals every filter by category. Both are views of one state.
export function MapFilterControl({
  categories,
  selected,
  onToggle,
  onClear,
}: MapFilterControlProps) {
  const [expanded, setExpanded] = useState(false);
  const pillsRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  const optionById = useMemo(() => {
    const map = new Map<string, FilterOption>();
    for (const category of categories) {
      for (const option of category.options) {
        map.set(option.id, option);
      }
    }
    return map;
  }, [categories]);

  const activeIds = [...selected].filter((id) => optionById.has(id));
  const activeKey = activeIds.join("|");

  const [visibleCount, setVisibleCount] = useState(activeIds.length);

  // Measure (off-flow copy) how many pills fit, reserving room for the +N chip.
  useLayoutEffect(() => {
    const container = pillsRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const compute = () => {
      const available = container.clientWidth;
      const items = Array.from(measure.children) as HTMLElement[];
      let used = 0;
      let count = 0;
      for (let i = 0; i < items.length; i += 1) {
        const next = used + (count > 0 ? PILL_GAP : 0) + items[i].offsetWidth;
        const reserve = i < items.length - 1 ? PILL_GAP + MORE_CHIP_RESERVE : 0;
        if (next + reserve <= available) {
          used = next;
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

  return (
    <div className={`map-filter ${expanded ? "map-filter--expanded" : ""}`}>
      <div className="map-filter__bar">
        <div className="map-filter__pills" ref={pillsRef}>
          {activeIds.length === 0 ? (
            <span className="map-filter__placeholder">Standard view</span>
          ) : (
            <>
              {visibleIds.map((id) => {
                const option = optionById.get(id);
                if (!option) return null;
                return (
                  <span className="map-filter__pill" key={id}>
                    {option.label}
                    <button
                      type="button"
                      className="map-filter__pill-close"
                      onClick={() => onToggle(id)}
                      aria-label={`Remove ${option.label}`}
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  </span>
                );
              })}
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
              {/* Off-flow copy of every pill, used only to measure widths. */}
              <div className="map-filter__measure" ref={measureRef} aria-hidden="true">
                {activeIds.map((id) => {
                  const option = optionById.get(id);
                  if (!option) return null;
                  return (
                    <span className="map-filter__pill" key={id}>
                      {option.label}
                      <span className="map-filter__pill-close">
                        <X size={12} strokeWidth={2.5} />
                      </span>
                    </span>
                  );
                })}
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
          <span>Filters</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded ? (
        <div className="map-filter__panel" role="group" aria-label="Map filters">
          <div className="map-filter__panel-head">
            <strong>Filters</strong>
            {activeIds.length > 0 ? (
              <button type="button" className="map-filter__clear" onClick={onClear}>
                Clear all
              </button>
            ) : null}
          </div>
          {categories.map((category) => (
            <div className="map-filter__category" key={category.id}>
              <span className="map-filter__category-label">{category.label}</span>
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
                      onClick={() => onToggle(option.id)}
                      aria-pressed={on}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
