import { useState } from "react";
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
    options: [
      { id: "ww", label: "Whitewater" },
      { id: "touring", label: "Touring" },
      { id: "sea", label: "Sea / surf" },
      { id: "sup", label: "SUP" },
    ],
  },
  {
    id: "paddling",
    label: "Paddling",
    options: [
      { id: "access", label: "Access" },
      { id: "hazards", label: "Hazards" },
      { id: "rapids", label: "Rapids" },
      { id: "photos", label: "Photos" },
      { id: "routes", label: "Routes" },
    ],
  },
  {
    id: "stations",
    label: "Stations",
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
    options: [
      { id: "rain", label: "Rain radar" },
      { id: "wind", label: "Wind" },
      { id: "cloud", label: "Cloud" },
    ],
  },
];

export function MapFilterPrototype() {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(["ww", "access", "rain"]),
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
        />
      </div>
      <p className="map-proto__note">
        Prototype — filter pills + expander · static data, no map wiring
      </p>
    </div>
  );
}
