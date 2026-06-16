import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { RiverPaddleHistory } from "./RiverPaddleHistory";
import { ObservationCard } from "./ObservationCard";
import { useDiscovery } from "../discovery/DiscoveryContext";
import { MapPin, Maximize2, Minimize2, Route, X } from "lucide-react";
import type {
  Contribution,
  ContributionOutboxRecord,
  ContributionType,
  LatLngTuple,
  LiveLocationSnapshot,
  MapPoi,
  MarkerClickMode,
  PhotoLightboxItem,
  RiverSection,
  SelectedPoi,
} from "../types";
import type { CanonicalRiverSummary } from "../services/canonicalRiverApi";
import { fetchWatercoursesForBounds, type KnownWatercourse } from "../services/watercourseApi";
import type { RouteAdjustment } from "../services/routeAdjustmentApi";
import type { RouteSuggestion } from "../services/routeSuggestionApi";
import {
  formatObservationValue,
  formatShortDateTime,
  getObservationStats,
  getPrimaryObservationMeasure,
  readCssColourToken,
  routeEndpointBounds,
} from "../lib/format";
import {
  createLiveLocationPopup,
  createMapPopupContent,
  createRouteAdjustmentPopup,
  createRouteSuggestionPopup,
  createSearchedLocationPopup,
  markerHtml,
} from "../lib/mapPopups";
import { contributionStatusLabel } from "../lib/contributionLabels";
import {
  collectWatercourseContextPois,
  collectWatercourseContextSections,
  contributionToSelectedPoi,
  fallbackMapPoisForSection,
  focusMapOnDetailLocation,
  formatDistanceMetres,
  isCandidateSection,
  isCanonicalOverviewSection,
  mapPoiCategoryLabels,
  mapPoiDisplayMeta,
  mapPoiToSelectedPoi,
  riverMapPoiToSelectedPoi,
  routeImpactPoiLabel,
  watercourseHintRows,
  watercourseRouteDistanceKm,
  watercourseTypeLabel,
  KNOWN_RIVER_FALLBACK_COLOUR,
  LIVE_LOCATION_FOCUS_ZOOM,
  SEARCH_FOCUS_ZOOM,
  SELECTED_WATERCOURSE_FALLBACK_COLOUR,
} from "../appCore";
import type {
  MapCameraSnapshot,
  MapFocusPlacement,
  MapPoiDisplayCategory,
  OpenPoiDetailsOptions,
  RouteCreateMode,
  WatercourseContextPoi,
} from "../appCore";

export function RiverMap({
  sections,
  activeSection,
  canonicalRivers,
  selectedCanonicalRiver,
  isSelectedRiverPanelOpen,
  isSelectedRiverPanelExpanded,
  isPoiDetailsOpen,
  mapPois,
  selectedRiverMapPois,
  contributions,
  routeSuggestions,
  routeAdjustments,
  routeSuggestionFocusId,
  routeSuggestionFocusNonce,
  routeAdjustmentFocusId,
  routeAdjustmentFocusNonce,
  outboxRecords,
  selectedLocation,
  routeDraftPoints,
  liveLocation,
  liveLocationFocusNonce,
  detailFocusLocation,
  detailFocusPlacement,
  detailFocusNonce,
  detailRestoreNonce,
  searchFocusLocation,
  searchFocusLabel,
  showSearchFocusMarker,
  searchFocusNonce,
  isAddMode,
  routeCreateMode,
  markerClickMode,
  showRoutesLayer,
  showSelectedRoutePath,
  showKnownRivers,
  watercourseFocusId,
  watercourseFocusNonce,
  onMapClick,
  onMoveRouteDraftPoint,
  focusNonce,
  onOpenPoiDetails,
  onOpenRouteDetails,
  onOpenPhoto,
  onSelectSection,
  onSelectCanonicalRiver,
  onSelectCanonicalRiverContext,
  onCloseSelectedRiverPanel,
  onToggleSelectedRiverPanelExpanded,
}: {
  sections: RiverSection[];
  activeSection: RiverSection;
  canonicalRivers: CanonicalRiverSummary[];
  selectedCanonicalRiver: CanonicalRiverSummary | null;
  isSelectedRiverPanelOpen: boolean;
  isSelectedRiverPanelExpanded: boolean;
  isPoiDetailsOpen: boolean;
  mapPois: MapPoi[];
  selectedRiverMapPois: MapPoi[];
  contributions: Contribution[];
  routeSuggestions: RouteSuggestion[];
  routeAdjustments: RouteAdjustment[];
  routeSuggestionFocusId: string | null;
  routeSuggestionFocusNonce: number;
  routeAdjustmentFocusId: string | null;
  routeAdjustmentFocusNonce: number;
  outboxRecords: ContributionOutboxRecord[];
  selectedLocation: LatLngTuple | null;
  routeDraftPoints: LatLngTuple[];
  liveLocation: LiveLocationSnapshot | null;
  liveLocationFocusNonce: number;
  detailFocusLocation: LatLngTuple | null;
  detailFocusPlacement: MapFocusPlacement;
  detailFocusNonce: number;
  detailRestoreNonce: number;
  searchFocusLocation: LatLngTuple | null;
  searchFocusLabel: string;
  showSearchFocusMarker: boolean;
  searchFocusNonce: number;
  isAddMode: boolean;
  routeCreateMode: RouteCreateMode;
  markerClickMode: MarkerClickMode;
  showRoutesLayer: boolean;
  showSelectedRoutePath: boolean;
  showKnownRivers: boolean;
  watercourseFocusId: string | null;
  watercourseFocusNonce: number;
  onMapClick: (
    location: LatLngTuple,
    nextType?: ContributionType,
    label?: string,
  ) => void;
  onMoveRouteDraftPoint: (index: number, location: LatLngTuple) => void;
  focusNonce: number;
  onOpenPoiDetails: (
    poi: SelectedPoi,
    options?: OpenPoiDetailsOptions,
  ) => void;
  onOpenRouteDetails: (section: RiverSection) => void;
  onOpenPhoto: (photo: PhotoLightboxItem) => void;
  onSelectSection: (section: RiverSection) => void;
  onSelectCanonicalRiver: (riverId: string | null) => void;
  onSelectCanonicalRiverContext: (riverId: string | null) => void;
  onCloseSelectedRiverPanel: () => void;
  onToggleSelectedRiverPanelExpanded: () => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const { selectedRiver, riverObservations } = useDiscovery();
  const primaryRiverMeasure = getPrimaryObservationMeasure(riverObservations);

  // Spatial connection: selecting a river flies the map to it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedRiver) {
      return;
    }
    const [west, south, east, north] = selectedRiver.bbox;
    map.flyToBounds(
      [
        [south, west],
        [north, east],
      ],
      { padding: [48, 48], duration: 0.7, maxZoom: 14 },
    );
  }, [selectedRiver]);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const callbackRef = useRef(onSelectSection);
  const canonicalRiverSelectRef = useRef(onSelectCanonicalRiver);
  const canonicalRiverContextSelectRef = useRef(onSelectCanonicalRiverContext);
  const mapClickRef = useRef(onMapClick);
  const moveRouteDraftPointRef = useRef(onMoveRouteDraftPoint);
  const poiDetailsRef = useRef(onOpenPoiDetails);
  const routeDetailsRef = useRef(onOpenRouteDetails);
  const previousSectionIdRef = useRef(activeSection.id);
  const previousFocusNonceRef = useRef(focusNonce);
  const previousSearchFocusNonceRef = useRef(searchFocusNonce);
  const previousRouteSuggestionFocusNonceRef = useRef(routeSuggestionFocusNonce);
  const previousRouteAdjustmentFocusNonceRef = useRef(routeAdjustmentFocusNonce);
  const previousLiveLocationFocusNonceRef = useRef(liveLocationFocusNonce);
  const previousDetailFocusNonceRef = useRef(detailFocusNonce);
  const previousDetailRestoreNonceRef = useRef(detailRestoreNonce);
  const detailRestoreViewRef = useRef<MapCameraSnapshot | null>(null);
  const previousWatercourseFocusNonceRef = useRef(watercourseFocusNonce);
  const shouldFitActiveSectionRef = useRef(true);
  const knownWatercoursesRequestRef = useRef(0);
  const [knownWatercourses, setKnownWatercourses] = useState<KnownWatercourse[]>(
    [],
  );
  const [knownWatercourseStatus, setKnownWatercourseStatus] = useState("");
  const [hiddenPoiCategories, setHiddenPoiCategories] = useState<
    Set<MapPoiDisplayCategory>
  >(() => new Set());
  const [selectedWatercourseId, setSelectedWatercourseId] = useState<string | null>(
    null,
  );
  const outboxByContributionId = useMemo(
    () =>
      new Map(
        outboxRecords.map((record) => [record.contribution.id, record] as const),
      ),
    [outboxRecords],
  );
  const selectedWatercourse = useMemo(
    () =>
      selectedWatercourseId
        ? knownWatercourses.find(
            (watercourse) => watercourse.id === selectedWatercourseId,
          ) ?? null
        : null,
    [knownWatercourses, selectedWatercourseId],
  );
  const selectedWatercoursePois = useMemo(
    () =>
      selectedWatercourse
        ? collectWatercourseContextPois(
            selectedWatercourse,
            mapPois,
            contributions,
            sections,
          )
        : [],
    [contributions, mapPois, sections, selectedWatercourse],
  );
  const selectedWatercourseSections = useMemo(
    () =>
      selectedWatercourse
        ? collectWatercourseContextSections(selectedWatercourse, sections)
        : [],
    [sections, selectedWatercourse],
  );
  const selectedRiverPoiCategoryCounts = useMemo(() => {
    const counts = new Map<MapPoiDisplayCategory, number>();

    selectedRiverMapPois.forEach((poi) => {
      const category = mapPoiDisplayMeta(poi).category;
      counts.set(category, (counts.get(category) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((left, right) =>
        mapPoiCategoryLabels[left.category].localeCompare(
          mapPoiCategoryLabels[right.category],
        ),
      );
  }, [selectedRiverMapPois]);
  const visibleSelectedRiverMapPois = useMemo(
    () =>
      selectedRiverMapPois.filter(
        (poi) => !hiddenPoiCategories.has(mapPoiDisplayMeta(poi).category),
      ),
    [hiddenPoiCategories, selectedRiverMapPois],
  );

  useEffect(() => {
    callbackRef.current = onSelectSection;
  }, [onSelectSection]);

  useEffect(() => {
    canonicalRiverSelectRef.current = onSelectCanonicalRiver;
  }, [onSelectCanonicalRiver]);

  useEffect(() => {
    canonicalRiverContextSelectRef.current = onSelectCanonicalRiverContext;
  }, [onSelectCanonicalRiverContext]);

  useEffect(() => {
    mapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    moveRouteDraftPointRef.current = onMoveRouteDraftPoint;
  }, [onMoveRouteDraftPoint]);

  useEffect(() => {
    poiDetailsRef.current = onOpenPoiDetails;
  }, [onOpenPoiDetails]);

  useEffect(() => {
    routeDetailsRef.current = onOpenRouteDetails;
  }, [onOpenRouteDetails]);

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

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        if (mapRef.current === map && map.getContainer().isConnected) {
          map.invalidateSize();
        }
      });
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    if (!showKnownRivers) {
      setKnownWatercourses([]);
      setKnownWatercourseStatus("");
      setSelectedWatercourseId(null);
      return;
    }

    let isCancelled = false;
    let timeoutId = 0;

    const loadWatercourses = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        const bounds = map.getBounds();
        const requestId = knownWatercoursesRequestRef.current + 1;
        knownWatercoursesRequestRef.current = requestId;
        setKnownWatercourseStatus("Loading reference waterways...");

        void fetchWatercoursesForBounds(
          {
            minLng: bounds.getWest(),
            minLat: bounds.getSouth(),
            maxLng: bounds.getEast(),
            maxLat: bounds.getNorth(),
          },
          map.getZoom(),
        )
          .then((watercourses) => {
            if (
              isCancelled ||
              knownWatercoursesRequestRef.current !== requestId
            ) {
              return;
            }

            setKnownWatercourses(watercourses);
            setKnownWatercourseStatus(
              watercourses.length
                ? `${watercourses.length} known river lines in view`
                : "No known river lines in this view",
            );
          })
          .catch(() => {
            if (
              isCancelled ||
              knownWatercoursesRequestRef.current !== requestId
            ) {
              return;
            }

            setKnownWatercourses([]);
            setKnownWatercourseStatus("Reference waterways unavailable in this view");
          });
      }, 180);
    };

    loadWatercourses();
    map.on("moveend zoomend", loadWatercourses);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
      map.off("moveend zoomend", loadWatercourses);
    };
  }, [showKnownRivers]);

  useEffect(() => {
    if (
      selectedWatercourseId &&
      !knownWatercourses.some(
        (watercourse) => watercourse.id === selectedWatercourseId,
      )
    ) {
      setSelectedWatercourseId(null);
    }
  }, [knownWatercourses, selectedWatercourseId]);

  useEffect(() => {
    if (
      !watercourseFocusId ||
      previousWatercourseFocusNonceRef.current === watercourseFocusNonce
    ) {
      return;
    }

    const matchedWatercourse = knownWatercourses.find(
      (watercourse) => watercourse.id === watercourseFocusId,
    );

    if (!matchedWatercourse) {
      return;
    }

    previousWatercourseFocusNonceRef.current = watercourseFocusNonce;
    setSelectedWatercourseId(matchedWatercourse.id);
  }, [knownWatercourses, watercourseFocusId, watercourseFocusNonce]);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layerRef.current;

    if (!map || !layers) {
      return;
    }

    layers.clearLayers();

    canonicalRivers.forEach((river) => {
      const isSelected = selectedCanonicalRiver?.id === river.id;
      const label = river.displayName.trim().charAt(0).toUpperCase() || "R";
      const marker = L.marker(river.centre, {
        bubblingMouseEvents: false,
        icon: L.divIcon({
          className: "",
          html: markerHtml(isSelected ? "river-active" : "river", label),
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
      });
      const openRiverDetails = () => {
        map.closePopup();
        canonicalRiverSelectRef.current(river.id);
      };
      const selectRiverContext = () => {
        map.closePopup();
        canonicalRiverContextSelectRef.current(river.id);
      };

      marker.addTo(layers);
      if (markerClickMode === "info") {
        marker.bindPopup(
          createMapPopupContent({
            title: river.displayName,
            subtitle: `${river.region} · ${river.sectionCount} section${
              river.sectionCount === 1 ? "" : "s"
            }`,
            summary: river.summary,
            detailsLabel: "Details",
            onDetails: openRiverDetails,
            selectLabel: "Select river",
            onSelect: selectRiverContext,
          }),
        );
      }
      marker.on("click", (event) => {
        L.DomEvent.stop(event.originalEvent);
        if (markerClickMode === "info") {
          marker.openPopup();
          return;
        }
        openRiverDetails();
      });
    });

    if (selectedCanonicalRiver) {
      visibleSelectedRiverMapPois.forEach((poi) => {
        const displayMeta = mapPoiDisplayMeta(poi);
        const markerSize =
          displayMeta.category === "rapid" || displayMeta.category === "whitewater"
            ? 30
            : displayMeta.category === "structure" || displayMeta.category === "hazard"
              ? 30
              : 28;
        const marker = L.marker(poi.location, {
          bubblingMouseEvents: false,
          icon: L.divIcon({
            className: "",
            html: markerHtml(displayMeta.markerKind, displayMeta.markerLabel),
            iconSize: [markerSize, markerSize],
            iconAnchor: [markerSize / 2, markerSize / 2],
          }),
        });
        const openPoiDetails = () => {
          map.closePopup();
          poiDetailsRef.current(
            riverMapPoiToSelectedPoi(poi, selectedCanonicalRiver),
            { focusMap: true, focusPlacement: "mobile-top-half" },
          );
        };

        marker.addTo(layers);
        if (markerClickMode === "info") {
          marker.bindPopup(
            createMapPopupContent({
              title: poi.title,
              subtitle: `${selectedCanonicalRiver.displayName} · ${displayMeta.label}`,
              summary: poi.summary,
              navigationLocation: poi.location,
              navigationLabel: poi.kind === "access" ? "Directions" : "Maps",
              navigationMode: poi.kind === "access" ? "directions" : "map",
              onDetails: openPoiDetails,
            }),
          );
        }
        marker.on("click", (event) => {
          L.DomEvent.stop(event.originalEvent);
          if (markerClickMode === "info") {
            marker.openPopup();
            return;
          }
          openPoiDetails();
        });
      });
    }

    if (showKnownRivers) {
      const knownRiverColour = readCssColourToken(
        "--known-river",
        KNOWN_RIVER_FALLBACK_COLOUR,
      );

      knownWatercourses.forEach((watercourse) => {
        watercourse.routes.forEach((route) => {
          L.polyline(route, {
            color: knownRiverColour,
            dashArray: "4 5",
            interactive: false,
            opacity: 0.7,
            weight: 2,
          }).addTo(layers);

          const hitTarget = L.polyline(route, {
            color: "#000",
            interactive: true,
            opacity: 0,
            weight: 18,
          }).addTo(layers);

          hitTarget.on("click", (event) => {
            L.DomEvent.stop(event.originalEvent);

            if (isAddMode || routeCreateMode === "tracing") {
              mapClickRef.current(
                [event.latlng.lat, event.latlng.lng],
                undefined,
                routeCreateMode === "tracing"
                  ? "New route point"
                  : "New map contribution",
              );
              return;
            }

            setSelectedWatercourseId(watercourse.id);
          });
        });
      });

    }

    const renderedSections = showRoutesLayer
      ? sections.filter(
          (section) => section.id !== activeSection.id || showSelectedRoutePath,
        )
      : [];
    let clickedRouteLine: L.Polyline | null = null;
    const routeLineDefaults = new Map<L.Polyline, L.PolylineOptions>();

    renderedSections.forEach((section) => {
      const isActive = section.id === activeSection.id;
      const isCandidate = isCandidateSection(section);
      const color =
        isCandidate
          ? "#7c3aed"
          : section.levelBand === "good"
          ? "#1f8a70"
          : section.levelBand === "high"
            ? "#b54708"
            : section.levelBand === "too-low"
              ? "#7c5c1d"
              : "#52606d";
      const defaultRouteStyle: L.PolylineOptions = {
        color,
        weight: isActive ? 4 : 3,
        opacity: isActive ? 0.5 : 0.26,
        dashArray: isCandidate ? "8 6" : undefined,
      };
      const highlightedRouteStyle: L.PolylineOptions = {
        ...defaultRouteStyle,
        weight: 7,
        opacity: 0.95,
      };

      const routeLine = L.polyline(section.route, defaultRouteStyle).addTo(layers);
      routeLineDefaults.set(routeLine, defaultRouteStyle);
      const routePopup = createMapPopupContent({
        title: section.sectionName,
        subtitle: section.riverName,
        summary: section.summary,
        detailsLabel: "Details",
        selectLabel: "Select route",
        onDetails: () => routeDetailsRef.current(section),
        onSelect: () => callbackRef.current(section),
      });

      routeLine.bindPopup(routePopup);
      routeLine.on("mouseover", () => routeLine.setStyle(highlightedRouteStyle));
      routeLine.on("mouseout", () => {
        if (clickedRouteLine !== routeLine) {
          routeLine.setStyle(defaultRouteStyle);
        }
      });

      routeLine.on("click", (event) => {
        L.DomEvent.stop(event.originalEvent);

        if (isAddMode || routeCreateMode === "tracing") {
          mapClickRef.current(
            [event.latlng.lat, event.latlng.lng],
            undefined,
            routeCreateMode === "tracing"
              ? "New route point"
              : "New map contribution",
          );
          return;
        }

        if (clickedRouteLine && clickedRouteLine !== routeLine) {
          clickedRouteLine.setStyle(
            routeLineDefaults.get(clickedRouteLine) ?? {},
          );
        }
        clickedRouteLine = routeLine;
        routeLine.setStyle(highlightedRouteStyle);
        routeLine.openPopup(event.latlng);
      });

      routeLine.on("popupclose", () => {
        if (clickedRouteLine === routeLine) {
          clickedRouteLine = null;
          routeLine.setStyle(defaultRouteStyle);
        }
      });

      const sectionMarker = L.marker(section.centre, {
        bubblingMouseEvents: false,
        icon: L.divIcon({
          className: "",
          html: markerHtml(
            isActive && isCandidate
              ? "section-candidate-active"
              : isActive
                ? "section-active"
                : isCandidate
                  ? "section-candidate"
                  : "section",
            isCandidate ? "C" : "R",
          ),
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
      });

      sectionMarker
        .addTo(layers)
        .bindPopup(
          createMapPopupContent({
            title: section.sectionName,
            subtitle: section.riverName,
            summary: section.summary,
            detailsLabel: "Details",
            selectLabel: "Select route",
            onDetails: () => routeDetailsRef.current(section),
            onSelect: () => callbackRef.current(section),
          }),
        )
        .on("click", (event) => {
          L.DomEvent.stop(event.originalEvent);
          sectionMarker.openPopup();
        });

      mapPois
        .filter((poi) => poi.sectionId === section.id)
        .forEach((poi) => {
        const displayMeta = mapPoiDisplayMeta(poi);
        const markerSize =
          displayMeta.category === "rapid" || displayMeta.category === "whitewater"
            ? 30
            : displayMeta.category === "structure" || displayMeta.category === "hazard"
              ? 30
              : 28;
        const marker = L.marker(poi.location, {
          bubblingMouseEvents: false,
          icon: L.divIcon({
            className: "",
            html: markerHtml(displayMeta.markerKind, displayMeta.markerLabel),
            iconSize: [markerSize, markerSize],
            iconAnchor: [markerSize / 2, markerSize / 2],
          }),
        });
        const openPoiDetails = () => {
          map.closePopup();
          poiDetailsRef.current(mapPoiToSelectedPoi(poi, section), {
            focusMap: true,
            focusPlacement: "mobile-top-half",
          });
        };

        marker.addTo(layers);
        if (markerClickMode === "info") {
          marker.bindPopup(
            createMapPopupContent({
              title: poi.title,
              subtitle: displayMeta.label,
              summary: poi.summary,
              navigationLocation: poi.location,
              navigationLabel: poi.kind === "access" ? "Directions" : "Maps",
              navigationMode: poi.kind === "access" ? "directions" : "map",
              onDetails: openPoiDetails,
            }),
          );
        }
        marker.on("click", (event) => {
          L.DomEvent.stop(event.originalEvent);
          if (markerClickMode === "info") {
            marker.openPopup();
            return;
          }
          openPoiDetails();
        });
      });
    });

    routeSuggestions.forEach((suggestion) => {
      if (suggestion.status === "approved" || suggestion.route.length < 2) {
        return;
      }

      const isFocusedRouteSuggestion = suggestion.id === routeSuggestionFocusId;
      const line = L.polyline(suggestion.route, {
        color: "#7c3aed",
        dashArray: "6 6",
        opacity: isFocusedRouteSuggestion ? 0.95 : 0.78,
        weight: isFocusedRouteSuggestion ? 7 : 5,
      }).addTo(layers);

      line.bindPopup(createRouteSuggestionPopup(suggestion));

      const startMarker = L.marker(suggestion.route[0], {
        bubblingMouseEvents: false,
        icon: L.divIcon({
          className: "",
          html: markerHtml("route-draft", "S"),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(layers);
      startMarker.bindPopup(createRouteSuggestionPopup(suggestion));

      const finish = suggestion.route[suggestion.route.length - 1];
      const finishMarker = L.marker(finish, {
        bubblingMouseEvents: false,
        icon: L.divIcon({
          className: "",
          html: markerHtml("route-draft", "F"),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(layers);
      finishMarker.bindPopup(createRouteSuggestionPopup(suggestion));
    });

    routeAdjustments.forEach((adjustment) => {
      if (adjustment.route.length < 2) {
        return;
      }

      const isFocusedRouteAdjustment = adjustment.id === routeAdjustmentFocusId;
      const line = L.polyline(adjustment.route, {
        color: "#0f766e",
        dashArray: "10 5",
        opacity: isFocusedRouteAdjustment ? 0.98 : 0.82,
        weight: isFocusedRouteAdjustment ? 8 : 5,
      }).addTo(layers);

      line.bindPopup(createRouteAdjustmentPopup(adjustment));

      const startMarker = L.marker(adjustment.route[0], {
        bubblingMouseEvents: false,
        icon: L.divIcon({
          className: "",
          html: markerHtml("route-edit", "E"),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(layers);
      startMarker.bindPopup(createRouteAdjustmentPopup(adjustment));

      const finish = adjustment.route[adjustment.route.length - 1];
      const finishMarker = L.marker(finish, {
        bubblingMouseEvents: false,
        icon: L.divIcon({
          className: "",
          html: markerHtml("route-edit", "F"),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(layers);
      finishMarker.bindPopup(createRouteAdjustmentPopup(adjustment));
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
      const openContributionDetails = () => {
        map.closePopup();
        poiDetailsRef.current(
          contributionToSelectedPoi(
            contribution,
            sections.find((section) => section.id === contribution.sectionId) ??
              activeSection,
            syncStatus,
          ),
          { focusMap: true, focusPlacement: "mobile-top-half" },
        );
      };
      const popupPhoto =
        contribution.type === "photo" ? contribution.photos?.[0] : undefined;
      const popupPhotoUrl = popupPhoto?.thumbnailUrl || popupPhoto?.displayUrl;
      const popupPhotoDisplayUrl = popupPhoto?.displayUrl || popupPhotoUrl;
      const popupPhotoTitle = popupPhoto?.caption || contribution.title;

      marker.addTo(layers);
      if (markerClickMode === "info") {
        marker.bindPopup(
          createMapPopupContent({
            title: contribution.title,
            subtitle: `${contribution.type} · ${contributionStatusLabel(contribution.status)}`,
            summary: contribution.detail,
            imageUrl: popupPhotoUrl,
            imageAlt: popupPhotoTitle,
            onImageClick:
              popupPhotoDisplayUrl
                ? () =>
                    onOpenPhoto({
                      src: popupPhotoDisplayUrl,
                      title: popupPhotoTitle,
                      caption: popupPhoto?.originalName || contribution.detail,
                      alt: popupPhotoTitle,
                    })
                : undefined,
            navigationLocation: contribution.location,
            onDetails: openContributionDetails,
          }),
        );
      }
      marker.on("click", (event) => {
        L.DomEvent.stop(event.originalEvent);
        if (markerClickMode === "info") {
          marker.openPopup();
          return;
        }
        openContributionDetails();
      });
    });

    if (searchFocusLocation && showSearchFocusMarker) {
      L.marker(searchFocusLocation, {
        icon: L.divIcon({
          className: "",
          html: markerHtml("search", "S"),
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
      })
        .addTo(layers)
        .bindPopup(
          createSearchedLocationPopup(searchFocusLocation, searchFocusLabel),
        );
    }

    if (liveLocation) {
      if (liveLocation.accuracyMeters) {
        L.circle(liveLocation.location, {
          radius: liveLocation.accuracyMeters,
          color: "#277da1",
          fillColor: "#277da1",
          fillOpacity: 0.08,
          interactive: false,
          weight: 1,
        }).addTo(layers);
      }

      L.marker(liveLocation.location, {
        bubblingMouseEvents: false,
        icon: L.divIcon({
          className: "",
          html: markerHtml("user-location", ""),
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
      })
        .addTo(layers)
        .bindPopup(createLiveLocationPopup(liveLocation));
    }

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

    if (routeDraftPoints.length) {
      if (routeDraftPoints.length >= 2) {
        L.polyline(routeDraftPoints, {
          color: "#7c3aed",
          dashArray: "7 7",
          opacity: 0.95,
          weight: 5,
        }).addTo(layers);
      }

      routeDraftPoints.forEach((point, index) => {
        const isLast = index === routeDraftPoints.length - 1;
        const draftMarker = L.marker(point, {
          bubblingMouseEvents: false,
          draggable: routeCreateMode === "tracing",
          icon: L.divIcon({
            className: "",
            html: markerHtml(
              isLast ? "route-draft-active" : "route-draft",
              String(index + 1),
            ),
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          }),
        }).addTo(layers);

        draftMarker.on("dragend", () => {
          const nextLocation = draftMarker.getLatLng();
          moveRouteDraftPointRef.current(index, [
            nextLocation.lat,
            nextLocation.lng,
          ]);
        });
      });
    }

    if (showKnownRivers && selectedWatercourse) {
      const selectedColour = readCssColourToken(
        "--selected-watercourse",
        SELECTED_WATERCOURSE_FALLBACK_COLOUR,
      );

      selectedWatercourse.routes.forEach((route) => {
        L.polyline(route, {
          color: selectedColour,
          interactive: false,
          opacity: 0.98,
          weight: 6,
        }).addTo(layers);
      });
    }

    if (
      previousFocusNonceRef.current !== focusNonce ||
      previousSearchFocusNonceRef.current !== searchFocusNonce ||
      previousRouteSuggestionFocusNonceRef.current !== routeSuggestionFocusNonce ||
      previousRouteAdjustmentFocusNonceRef.current !== routeAdjustmentFocusNonce
    ) {
      shouldFitActiveSectionRef.current = true;
    }

    if (shouldFitActiveSectionRef.current) {
      const bounds = routeEndpointBounds(activeSection.route);
      let rafId = 0;
      let didFit = false;
      const timeoutIds: number[] = [];
      const fitRoute = (attempt = 0) => {
        if (mapRef.current !== map || !map.getContainer().isConnected) {
          return;
        }

        const container = map.getContainer();
        if ((container.clientWidth === 0 || container.clientHeight === 0) && attempt < 4) {
          timeoutIds.push(window.setTimeout(() => fitRoute(attempt + 1), 80));
          return;
        }

        map.invalidateSize();
        const focusedRouteSuggestion =
          routeSuggestionFocusId && previousRouteSuggestionFocusNonceRef.current !== routeSuggestionFocusNonce
            ? routeSuggestions.find(
                (suggestion) => suggestion.id === routeSuggestionFocusId,
              )
            : null;
        const focusedRouteAdjustment =
          routeAdjustmentFocusId && previousRouteAdjustmentFocusNonceRef.current !== routeAdjustmentFocusNonce
            ? routeAdjustments.find(
                (adjustment) => adjustment.id === routeAdjustmentFocusId,
              )
            : null;

        if (focusedRouteAdjustment?.route.length) {
          map.fitBounds(L.latLngBounds(focusedRouteAdjustment.route), {
            animate: false,
            maxZoom: 14,
            paddingTopLeft: [48, 84],
            paddingBottomRight: [48, 96],
          });
        } else if (focusedRouteSuggestion?.route.length) {
          map.fitBounds(L.latLngBounds(focusedRouteSuggestion.route), {
            animate: false,
            maxZoom: 14,
            paddingTopLeft: [48, 84],
            paddingBottomRight: [48, 96],
          });
        } else if (searchFocusLocation) {
          map.setView(searchFocusLocation, SEARCH_FOCUS_ZOOM, {
            animate: false,
          });
        } else {
          map.fitBounds(bounds, {
            animate: false,
            maxZoom: 13,
            paddingTopLeft: [48, 84],
            paddingBottomRight: [48, 96],
          });
        }
        didFit = true;
        shouldFitActiveSectionRef.current = false;
        previousSectionIdRef.current = activeSection.id;
        previousFocusNonceRef.current = focusNonce;
        previousSearchFocusNonceRef.current = searchFocusNonce;
        previousRouteSuggestionFocusNonceRef.current = routeSuggestionFocusNonce;
        previousRouteAdjustmentFocusNonceRef.current = routeAdjustmentFocusNonce;
      };
      rafId = window.requestAnimationFrame(fitRoute);
      [80, 180, 360].forEach((delay) => {
        timeoutIds.push(window.setTimeout(fitRoute, delay));
      });

      return () => {
        window.cancelAnimationFrame(rafId);
        timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
        if (!didFit) {
          shouldFitActiveSectionRef.current = true;
        }
      };
    }

    previousSectionIdRef.current = activeSection.id;
    previousFocusNonceRef.current = focusNonce;
    previousSearchFocusNonceRef.current = searchFocusNonce;
    previousRouteSuggestionFocusNonceRef.current = routeSuggestionFocusNonce;
    previousRouteAdjustmentFocusNonceRef.current = routeAdjustmentFocusNonce;
  }, [
    activeSection,
    canonicalRivers,
    contributions,
    focusNonce,
    liveLocation,
    markerClickMode,
    mapPois,
    knownWatercourses,
    outboxByContributionId,
    routeAdjustments,
    routeAdjustmentFocusId,
    routeAdjustmentFocusNonce,
    searchFocusLocation,
    showSearchFocusMarker,
    searchFocusNonce,
    selectedLocation,
    selectedCanonicalRiver,
    selectedWatercourse,
    visibleSelectedRiverMapPois,
    isAddMode,
    routeCreateMode,
    routeDraftPoints,
    routeSuggestionFocusId,
    routeSuggestionFocusNonce,
    routeSuggestions,
    sections,
    showRoutesLayer,
    showSelectedRoutePath,
    showKnownRivers,
    onOpenPhoto,
  ]);

  useEffect(() => {
    const map = mapRef.current;

    if (
      !map ||
      !liveLocation ||
      previousLiveLocationFocusNonceRef.current === liveLocationFocusNonce
    ) {
      return;
    }

    previousLiveLocationFocusNonceRef.current = liveLocationFocusNonce;
    map.invalidateSize();
    map.setView(liveLocation.location, LIVE_LOCATION_FOCUS_ZOOM, {
      animate: false,
    });
  }, [liveLocationFocusNonce, liveLocation]);

  useEffect(() => {
    const map = mapRef.current;

    if (
      !map ||
      !detailFocusLocation ||
      previousDetailFocusNonceRef.current === detailFocusNonce
    ) {
      return;
    }

    previousDetailFocusNonceRef.current = detailFocusNonce;
    const centre = map.getCenter();
    detailRestoreViewRef.current = {
      centre: [centre.lat, centre.lng],
      zoom: map.getZoom(),
    };
    focusMapOnDetailLocation(map, detailFocusLocation, detailFocusPlacement);
  }, [detailFocusLocation, detailFocusPlacement, detailFocusNonce]);

  useEffect(() => {
    const map = mapRef.current;

    if (
      !map ||
      previousDetailRestoreNonceRef.current === detailRestoreNonce
    ) {
      return;
    }

    previousDetailRestoreNonceRef.current = detailRestoreNonce;
    const restoreView = detailRestoreViewRef.current;

    if (!restoreView) {
      return;
    }

    map.invalidateSize();
    map.setView(restoreView.centre, restoreView.zoom, { animate: false });
    detailRestoreViewRef.current = null;
  }, [detailRestoreNonce]);

  function openWatercoursePoi(poi: WatercourseContextPoi) {
    if (poi.kind === "contribution") {
      const contribution = contributions.find((item) => item.id === poi.id);

      if (!contribution) {
        return;
      }

      poiDetailsRef.current(
        contributionToSelectedPoi(
          contribution,
          poi.section,
          outboxByContributionId.get(contribution.id)?.syncStatus,
        ),
        { focusMap: true, focusPlacement: "mobile-top-half-or-center" },
      );
      return;
    }

    const mapPoi =
      mapPois.find((item) => item.id === poi.id) ??
      fallbackMapPoisForSection(poi.section).find((item) => item.id === poi.id);

    if (!mapPoi) {
      return;
    }

    poiDetailsRef.current(mapPoiToSelectedPoi(mapPoi, poi.section), {
      focusMap: true,
      focusPlacement: "mobile-top-half-or-center",
    });
  }

  function togglePoiCategoryFilter(category: MapPoiDisplayCategory) {
    setHiddenPoiCategories((current) => {
      const next = new Set(current);

      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }

      return next;
    });
  }

  function showAllPoiCategories() {
    setHiddenPoiCategories(new Set());
  }

  const selectedWatercourseHintRows = selectedWatercourse
    ? watercourseHintRows(selectedWatercourse)
    : [];
  const selectedCanonicalRiverSections = selectedCanonicalRiver
    ? sections.filter((section) => {
        if (isCanonicalOverviewSection(section)) {
          return false;
        }

        const sectionRiverName = section.riverName.toLowerCase();
        const displayName = selectedCanonicalRiver.displayName.toLowerCase();
        const canonicalName = selectedCanonicalRiver.canonicalName.toLowerCase();

        return (
          sectionRiverName === displayName ||
          sectionRiverName.includes(canonicalName) ||
          displayName.includes(sectionRiverName)
        );
      })
    : [];

  return (
    <section
      className={`map-stage ${isAddMode ? "map-stage--placing" : ""}`}
      aria-label="River map"
    >
      <div className="map-canvas" ref={mapContainerRef} />
      {selectedCanonicalRiver && isSelectedRiverPanelOpen && !isPoiDetailsOpen ? (
        <aside
          className={`watercourse-panel ${
            isSelectedRiverPanelExpanded ? "watercourse-panel--expanded" : ""
          }`}
          aria-label="Selected river"
        >
          <div className="watercourse-panel__header">
            <div>
              <p className="eyebrow">River</p>
              <h2>{selectedCanonicalRiver.displayName}</h2>
            </div>
            <div className="panel-icon-actions">
              <button
                className="icon-button icon-button--compact"
                type="button"
                aria-label={
                  isSelectedRiverPanelExpanded
                    ? "Collapse river details"
                    : "Expand river details"
                }
                title={isSelectedRiverPanelExpanded ? "Collapse" : "Expand"}
                onClick={onToggleSelectedRiverPanelExpanded}
              >
                {isSelectedRiverPanelExpanded ? (
                  <Minimize2 size={16} />
                ) : (
                  <Maximize2 size={16} />
                )}
              </button>
              <button
                className="icon-button icon-button--compact"
                type="button"
                aria-label="Close river details"
                title="Close"
                onClick={onCloseSelectedRiverPanel}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="watercourse-panel__summary">
            <span>{selectedCanonicalRiver.region}</span>
            <span>
              {selectedCanonicalRiver.sectionCount} linked section
              {selectedCanonicalRiver.sectionCount === 1 ? "" : "s"}
            </span>
            <span>{selectedCanonicalRiver.sourceConfidence}</span>
          </div>

          <p className="source-note">
            Community-sourced and official information. Conditions change quickly
            — check locally and paddle within your own judgement.
          </p>

          <RiverPaddleHistory riverId={selectedCanonicalRiver.id} />

          <div className="watercourse-context">
            <h3>Today</h3>
            {primaryRiverMeasure && primaryRiverMeasure.latest ? (
              isSelectedRiverPanelExpanded ? (
                <div className="observation-list">
                  {riverObservations.map((measure) => (
                    <ObservationCard
                      key={measure.id}
                      measure={measure}
                      rangeHours={48}
                    />
                  ))}
                </div>
              ) : (
                <div className="river-card__level">
                  <strong>
                    {formatObservationValue(
                      primaryRiverMeasure.latest.value,
                      primaryRiverMeasure.unit,
                    )}
                  </strong>
                  <span className="river-card__trend">
                    {getObservationStats(primaryRiverMeasure).trend}
                  </span>
                  <small>
                    {primaryRiverMeasure.stationName} ·{" "}
                    {formatShortDateTime(primaryRiverMeasure.latest.observedAt)}
                    {primaryRiverMeasure.latest.state !== "live"
                      ? " · may be out of date"
                      : ""}
                  </small>
                </div>
              )
            ) : (
              <p className="empty-state">
                No live gauge linked to this river yet.
              </p>
            )}
          </div>

          <div className="watercourse-context">
            <h3>On this river</h3>
            {selectedRiverPoiCategoryCounts.length ? (
              <div className="poi-filter-strip" aria-label="Filter reviewed points">
                <button
                  className={`poi-filter-chip ${
                    hiddenPoiCategories.size === 0 ? "poi-filter-chip--active" : ""
                  }`}
                  type="button"
                  onClick={showAllPoiCategories}
                >
                  All
                </button>
                {selectedRiverPoiCategoryCounts.map(({ category, count }) => (
                  <button
                    className={`poi-filter-chip ${
                      hiddenPoiCategories.has(category)
                        ? ""
                        : "poi-filter-chip--active"
                    }`}
                    key={category}
                    type="button"
                    onClick={() => togglePoiCategoryFilter(category)}
                  >
                    {mapPoiCategoryLabels[category]} {count}
                  </button>
                ))}
              </div>
            ) : null}
            {visibleSelectedRiverMapPois.length ? (
              <div className="watercourse-list">
                {visibleSelectedRiverMapPois.slice(0, 8).map((poi) => {
                  const displayMeta = mapPoiDisplayMeta(poi);
                  return (
                  <button
                    className="watercourse-list-row"
                    key={poi.id}
                    type="button"
                    onClick={() =>
                      poiDetailsRef.current(
                        riverMapPoiToSelectedPoi(poi, selectedCanonicalRiver),
                        {
                          focusMap: true,
                          focusPlacement: "mobile-top-half-or-center",
                        },
                      )
                    }
                  >
                    <span>
                      <strong>{poi.title}</strong>
                      <small>
                        {displayMeta.label} · {poi.source?.label ?? "source confirmed"}
                      </small>
                    </span>
                    <MapPin size={15} />
                  </button>
                  );
                })}
              </div>
            ) : selectedRiverMapPois.length ? (
              <p className="empty-state">
                All reviewed points are hidden by the current filters.
              </p>
            ) : (
              <p className="empty-state">
                No reviewed source candidates have been promoted for this river yet.
              </p>
            )}
          </div>

          <div className="watercourse-context">
            <h3>Sections on this river</h3>
            {selectedCanonicalRiverSections.length ? (
              <div className="watercourse-list">
                {selectedCanonicalRiverSections.map((section) => (
                  <button
                    className="watercourse-list-row"
                    key={section.id}
                    type="button"
                    onClick={() => callbackRef.current(section)}
                  >
                    <span>
                      <strong>{section.sectionName}</strong>
                      <small>
                        {section.difficulty} · {section.distanceKm} km
                      </small>
                    </span>
                    <Route size={15} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-state">
                {selectedCanonicalRiver.sectionCount} paddling section
                {selectedCanonicalRiver.sectionCount === 1 ? "" : "s"} on this
                river.
              </p>
            )}
          </div>
        </aside>
      ) : null}
      {selectedWatercourse && !selectedCanonicalRiver && !isPoiDetailsOpen ? (
        <aside
          className="watercourse-panel"
          aria-label="Selected waterway stretch"
        >
          <div className="watercourse-panel__header">
            <div>
              <p className="eyebrow">Local stretch</p>
              <h2>{selectedWatercourse.name ?? "Unnamed waterway"}</h2>
            </div>
            <button
              className="icon-button icon-button--compact"
              type="button"
              aria-label="Close waterway details"
              title="Close"
              onClick={() => setSelectedWatercourseId(null)}
            >
              <X size={16} />
            </button>
          </div>

          <div className="watercourse-panel__summary">
            <span>{watercourseTypeLabel(selectedWatercourse.watercourseType)}</span>
            <span>
              {watercourseRouteDistanceKm(selectedWatercourse).toFixed(1)} km in view
            </span>
            <span>{selectedWatercourse.source.sourceVersion}</span>
          </div>

          <p className="source-note">
            OSM waterway geometry is local map context only. It does not confirm
            paddleability, access, grade, hazards, or current conditions.
          </p>

          {selectedWatercourseHintRows.length ? (
            <dl className="watercourse-hints">
              {selectedWatercourseHintRows.slice(0, 6).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="watercourse-context">
            <h3>Routes near this stretch</h3>
            {selectedWatercourseSections.length ? (
              <div className="watercourse-list">
                {selectedWatercourseSections.map(({ section, distanceM }) => (
                  <button
                    className="watercourse-list-row"
                    key={section.id}
                    type="button"
                    onClick={() => callbackRef.current(section)}
                  >
                    <span>
                      <strong>{section.sectionName}</strong>
                      <small>
                        {section.riverName} · {formatDistanceMetres(distanceM)}
                      </small>
                    </span>
                    <Route size={15} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-state">No RiverLaunch routes near this visible stretch yet.</p>
            )}
          </div>

          <div className="watercourse-context">
            <h3>Points near this stretch</h3>
            {selectedWatercoursePois.length ? (
              <div className="watercourse-list">
                {selectedWatercoursePois.map((poi) => (
                  <button
                    className="watercourse-list-row"
                    key={`${poi.kind}:${poi.id}`}
                    type="button"
                    onClick={() => openWatercoursePoi(poi)}
                  >
                    <span>
                      <strong>{poi.title}</strong>
                      <small>
                        {routeImpactPoiLabel(poi.kind)} ·{" "}
                        {formatDistanceMetres(poi.distanceM)}
                      </small>
                    </span>
                    <MapPin size={15} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-state">No POIs close to this visible stretch yet.</p>
            )}
          </div>
        </aside>
      ) : null}
      <div className="map-legend" aria-label="Map legend">
        {showKnownRivers ? (
          <span title={knownWatercourseStatus || undefined}>
            <i className="legend-line legend-line--known-river" /> Waterways
            {knownWatercourseStatus ? (
              <small className="map-legend__status">
                {knownWatercourseStatus}
              </small>
            ) : null}
          </span>
        ) : null}
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
