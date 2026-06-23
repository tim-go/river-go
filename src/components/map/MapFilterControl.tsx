import { useMemo, useState } from "react";
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

// Active filters live as closable pills along the top (quick "what's applied?");
// the expander reveals every filter by category. Both are views of one state.
export function MapFilterControl({
  categories,
  selected,
  onToggle,
  onClear,
}: MapFilterControlProps) {
  const [expanded, setExpanded] = useState(false);

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

  return (
    <div className={`map-filter ${expanded ? "map-filter--expanded" : ""}`}>
      <div className="map-filter__bar">
        <div className="map-filter__pills">
          {activeIds.length === 0 ? (
            <span className="map-filter__placeholder">Standard view</span>
          ) : (
            activeIds.map((id) => {
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
                    <X size={13} strokeWidth={2.5} />
                  </button>
                </span>
              );
            })
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
