import { useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  MapFilterControl,
  type FilterCategory,
} from "../components/map/MapFilterControl";
import "./map-filter-prototype.css";

// Static stand-in for the eventual filter config (paddling vs amenities tiers,
// discipline, stations, weather). No map wiring yet — this is to feel the control.
const CATEGORIES: FilterCategory[] = [
  {
    id: "discipline",
    label: "Discipline",
    color: "#6ed7a6",
    kind: "filter",
    options: [
      { id: "ww", label: "Whitewater" },
      { id: "touring", label: "Touring" },
      { id: "sea", label: "Sea / surf" },
      { id: "sup", label: "SUP" },
    ],
  },
  {
    id: "layers",
    label: "Layers",
    color: "#7db8f5",
    options: [
      { id: "rivers", label: "Rivers" },
      { id: "waterways", label: "Waterways" },
      { id: "sections", label: "Sections" },
      { id: "routes", label: "Routes" },
    ],
  },
  {
    id: "pois",
    label: "POIs",
    color: "#ffce4d",
    options: [
      { id: "access", label: "Access" },
      { id: "hazards", label: "Hazards" },
      { id: "rapids", label: "Rapids" },
      { id: "photos", label: "Photos" },
    ],
  },
  {
    id: "stations",
    label: "Stations",
    color: "#5fd0d9",
    options: [
      { id: "gauges", label: "Paddler gauges" },
      { id: "up", label: "Up now" },
      { id: "rainfall", label: "Rainfall" },
      { id: "all-stations", label: "All stations" },
    ],
  },
  {
    id: "amenities",
    label: "Amenities",
    color: "#e8b079",
    options: [
      { id: "pubs", label: "Pubs" },
      { id: "carparks", label: "Car parks" },
      { id: "toilets", label: "Toilets" },
      { id: "shops", label: "Shops" },
    ],
  },
  {
    id: "weather",
    label: "Weather",
    color: "#b9a6ee",
    options: [
      { id: "rain", label: "Rain radar" },
      { id: "wind", label: "Wind" },
      { id: "cloud", label: "Cloud" },
    ],
  },
];

export function MapFilterPrototype() {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(["rivers", "ww", "access", "rain"]),
  );

  function toggle(id: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="map-proto">
      <div className="map-proto__map" aria-hidden="true" />
      <div className="map-proto__control">
        <MapFilterControl
          categories={CATEGORIES}
          selected={selected}
          onToggle={toggle}
          onClear={() => setSelected(new Set())}
          actions={
            <button
              type="button"
              className="map-filter-action"
              aria-label="Sync now"
              title="Sync now"
            >
              <RefreshCw size={17} />
            </button>
          }
        />
      </div>
      <p className="map-proto__note">
        Prototype — filter pills + expander · static data, no map wiring
      </p>
    </div>
  );
}
