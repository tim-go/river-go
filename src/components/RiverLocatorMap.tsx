import { useEffect, useRef } from "react";
import L from "leaflet";
import {
  fetchRiverLevelLines,
  levelBandColor,
} from "../services/levelStateApi";
import type { LatLngTuple } from "../types";

// A small, non-interactive "where is this river" locator map for the river page.
// Region-level context: OSM tiles fit to the river's bbox, with the river's own
// geometry drawn on top (coloured by live level band where known).
export function RiverLocatorMap({
  riverId,
  bbox,
  centre,
}: {
  riverId: string;
  bbox: [number, number, number, number];
  centre: LatLngTuple;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, {
      // Locator, not a tool — no interaction, no chrome.
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
    }).addTo(map);

    const [west, south, east, north] = bbox;
    const hasBounds =
      Number.isFinite(west) && west !== east && south !== north;
    if (hasBounds) {
      map.fitBounds(
        [
          [south, west],
          [north, east],
        ],
        { padding: [18, 18], maxZoom: 12 },
      );
    } else {
      map.setView(centre, 10);
    }

    let cancelled = false;
    fetchRiverLevelLines()
      .then((all) => {
        if (cancelled) return;
        const mine = all.find((line) => line.riverId === riverId);
        if (mine && mine.lines.length) {
          const colour = levelBandColor(mine.band);
          for (const points of mine.lines) {
            L.polyline(points, {
              color: colour,
              weight: 4,
              opacity: 0.9,
            }).addTo(map);
          }
        } else {
          L.circleMarker(centre, {
            radius: 7,
            color: "#1f6f8b",
            fillColor: "#1f6f8b",
            fillOpacity: 0.9,
            weight: 2,
          }).addTo(map);
        }
      })
      .catch(() => {
        /* no geometry → the tiles alone still show the area */
      });

    // Tiles can lay out before the container has its final size.
    const invalidate = () => map.invalidateSize();
    const raf = requestAnimationFrame(invalidate);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      map.remove();
    };
  }, [riverId, bbox, centre]);

  return (
    <div
      ref={containerRef}
      className="river-locator-map"
      aria-label="River location map"
    />
  );
}
