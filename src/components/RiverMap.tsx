import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { RiverPaddleHistory } from "./RiverPaddleHistory";
import { ObservationCard } from "./ObservationCard";
import { RiverPhotoGallery } from "./RiverPhotoGallery";
import { useDiscovery } from "../discovery/DiscoveryContext";
import {
  LEVEL_BAND_LABELS,
  levelBandColor,
  type RiverLevelLine,
  type RiverLevelState,
  type SectionLevelState,
  type Station,
} from "../services/levelStateApi";
import type { Amenity } from "../services/amenityApi";
import {
  AlertTriangle,
  MapPin,
  Route,
  Star,
} from "lucide-react";
import { DetailPanel } from "./DetailPanel";
import { MapLevelLegend } from "./map/MapLevelLegend";
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
import { fetchRiverPhotos, type RiverPhoto } from "../services/riverPhotoApi";
import { getApiBaseUrl } from "../services/apiConfig";
import type { RouteAdjustment } from "../services/routeAdjustmentApi";
import type { RouteSuggestion } from "../services/routeSuggestionApi";
import {
  getPrimaryObservationMeasure,
  readCssColourToken,
  routeEndpointBounds,
} from "../lib/format";
import { riverMarkerInitial } from "../lib/riverName";
import {
  segmentIntersectsBounds,
  simplifyPath,
  toleranceForZoom,
} from "../lib/riverGeometry";
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
  disciplineLabel,
  watercourseHintRows,
  watercourseRouteDistanceKm,
  watercourseTypeLabel,
  KNOWN_RIVER_FALLBACK_COLOUR,
  LIVE_LOCATION_FOCUS_ZOOM,
  SEARCH_FOCUS_ZOOM,
  SELECTED_WATERCOURSE_FALLBACK_COLOUR,
} from "../appCore";
import type {
  MapFocusPlacement,
  MapPoiDisplayCategory,
  OpenPoiDetailsOptions,
  RouteCreateMode,
  WatercourseContextPoi,
} from "../appCore";
import {
  RIVER_TAB_POI_CATEGORIES,
  type RiverPoiTab,
} from "../lib/riverPoiTabs";

// A camera SVG path, reused by the standalone photo pin (large) and the photo
// attachment badge (small).
const CAMERA_SVG_PATH =
  '<path d="M9 4l-1.2 1.6H4.5A1.5 1.5 0 0 0 3 7.1v10.4A1.5 1.5 0 0 0 4.5 19h15a1.5 1.5 0 0 0 1.5-1.5V7.1a1.5 1.5 0 0 0-1.5-1.5h-3.3L15 4H9zm3 3.8a4.4 4.4 0 1 1 0 8.8 4.4 4.4 0 0 1 0-8.8zm0 2a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8z"/>';

// A small camera glyph so standalone photo pins read at a glance and don't
// compete with the lettered contribution markers. Injected as the marker label
// (innerHTML) and inherits the marker's white text colour.
const PHOTO_MARKER_GLYPH = `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">${CAMERA_SVG_PATH}</svg>`;

const PHOTO_BADGE_HTML = `<span class="map-marker__badge map-marker__badge--photo"><svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor" aria-hidden="true">${CAMERA_SVG_PATH}</svg></span>`;

// A corner badge row flagging which attachments a point carries (photos now,
// notes/levels later) without turning it into a dedicated pin — "the attachment
// is an addition to the point". Returns "" when the point carries nothing.
function attachmentBadgesHtml(opts: { photo?: boolean }): string {
  const badges = opts.photo ? PHOTO_BADGE_HTML : "";
  return badges ? `<span class="map-marker__badges">${badges}</span>` : "";
}

type RiverDetailTab =
  | "levels"
  | "rapids"
  | "hazards"
  | "access"
  | "photos"
  | "about";

const RIVER_DETAIL_TABS: { id: RiverDetailTab; label: string }[] = [
  { id: "levels", label: "Levels" },
  { id: "rapids", label: "Rapids" },
  { id: "hazards", label: "Hazards" },
  { id: "access", label: "Access" },
  { id: "photos", label: "Photos" },
  { id: "about", label: "About" },
];

const RIVER_TAB_EMPTY_MESSAGE: Record<RiverPoiTab, string> = {
  rapids:
    "No rapids or whitewater features have been reviewed for this river yet.",
  hazards:
    "No weirs, dams or other structures have been reviewed for this river yet.",
  access: "No access points have been reviewed for this river yet.",
};

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
  favouriteRiverIds,
  onToggleFavouriteRiver,
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
  searchFocusLocation,
  searchFocusLabel,
  showSearchFocusMarker,
  searchFocusNonce,
  isAddMode,
  routeCreateMode,
  markerClickMode,
  showRoutesLayer,
  showPublicRoutes,
  approvedRouteSuggestions,
  showRiverLayer,
  sectionLevelStates,
  riverLevelLines,
  riverLevelStates,
  showRain,
  rainTs,
  globalPois,
  activePoiKinds,
  showPhotoLayer,
  stations,
  amenities,
  showSelectedRoutePath,
  showKnownRivers,
  isLevelLegendOpen,
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
  favouriteRiverIds: string[];
  onToggleFavouriteRiver: (riverId: string) => void;
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
  searchFocusLocation: LatLngTuple | null;
  searchFocusLabel: string;
  showSearchFocusMarker: boolean;
  searchFocusNonce: number;
  isAddMode: boolean;
  routeCreateMode: RouteCreateMode;
  markerClickMode: MarkerClickMode;
  showRoutesLayer: boolean;
  showPublicRoutes: boolean;
  approvedRouteSuggestions: RouteSuggestion[];
  showRiverLayer: boolean;
  sectionLevelStates?: Map<string, SectionLevelState>;
  riverLevelLines?: RiverLevelLine[];
  riverLevelStates?: Map<string, RiverLevelState>;
  showRain?: boolean;
  rainTs?: number;
  globalPois?: MapPoi[];
  activePoiKinds: Set<string>;
  showPhotoLayer: boolean;
  stations?: Station[];
  amenities?: Amenity[];
  showSelectedRoutePath: boolean;
  showKnownRivers: boolean;
  isLevelLegendOpen: boolean;
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
  onSelectCanonicalRiver: (
    riverId: string | null,
    options?: { expand?: boolean; snap?: boolean },
  ) => void;
  onCloseSelectedRiverPanel: () => void;
  onToggleSelectedRiverPanelExpanded: () => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const {
    selectedRiver,
    riverObservations,
    riverObservationRange,
    setRiverObservationRange,
  } = useDiscovery();
  const primaryRiverMeasure = getPrimaryObservationMeasure(riverObservations);
  // riverObservations is flattened across all of the river's sections, so a gauge
  // linked to several sections (multi-section rivers like the Wye/Tryweryn) appears
  // more than once. Dedupe by measure id for the per-gauge cards.
  const uniqueRiverObservations = useMemo(() => {
    const seen = new Set<string>();
    return riverObservations.filter((measure) => {
      if (seen.has(measure.id)) {
        return false;
      }
      seen.add(measure.id);
      return true;
    });
  }, [riverObservations]);

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
  // The river-level-lines are the heaviest vector layer, so they get their own
  // layer group + canvas renderer and are redrawn (viewport-culled, zoom-
  // simplified) independently of the marker layer — see the dedicated effect
  // below. Keeping them out of the main layer group means a GPS tick or a POI
  // toggle no longer tears down and rebuilds every river polyline.
  const riverLinesLayerRef = useRef<L.LayerGroup | null>(null);
  const riverRendererRef = useRef<L.Canvas | null>(null);
  // The high-volume marker sets (global POIs, riverside amenities — thousands of
  // pins nationally) get their own layer group + viewport-culled effect, so only
  // on-screen pins become DOM nodes and a GPS tick can't rebuild them all.
  const poiLayerRef = useRef<L.LayerGroup | null>(null);
  // Live location lives in its own layer so GPS ticks only redraw the "you are
  // here" marker — not the whole marker set (which would also tear down any
  // popup the user has open). See the dedicated effect below.
  const liveLocationLayerRef = useRef<L.LayerGroup | null>(null);

  // Met Office precipitation overlay — kept outside the main layer group (which
  // is cleared on every render) so toggling it doesn't rebuild the map.
  const rainOverlayRef = useRef<L.ImageOverlay | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showRain) {
      return;
    }
    const overlay = L.imageOverlay(
      `${getApiBaseUrl()}/api/weather/rain.png?ts=${rainTs ?? 0}`,
      [
        [45, -25],
        [63, 15],
      ],
      { opacity: 0.65, interactive: false },
    ).addTo(map);
    rainOverlayRef.current = overlay;
    return () => {
      overlay.remove();
      rainOverlayRef.current = null;
    };
    // rainTs intentionally omitted: frame changes go through setUrl below so the
    // overlay isn't torn down and recreated on every scrub.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRain]);
  useEffect(() => {
    if (rainOverlayRef.current) {
      rainOverlayRef.current.setUrl(
        `${getApiBaseUrl()}/api/weather/rain.png?ts=${rainTs ?? 0}`,
      );
    }
  }, [rainTs]);
  const callbackRef = useRef(onSelectSection);
  const canonicalRiverSelectRef = useRef(onSelectCanonicalRiver);
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
  const previousWatercourseFocusNonceRef = useRef(watercourseFocusNonce);
  const shouldFitActiveSectionRef = useRef(true);
  // True while a view restored from storage should win over the load-time
  // auto-fit; cleared on the first user gesture or focus action.
  const restoredViewActiveRef = useRef(false);
  const knownWatercoursesRequestRef = useRef(0);
  const [knownWatercourses, setKnownWatercourses] = useState<KnownWatercourse[]>(
    [],
  );
  const POI_MIN_ZOOM = 9;
  const [poiZoomVisible, setPoiZoomVisible] = useState(false);
  const [hiddenPoiCategories, setHiddenPoiCategories] = useState<
    Set<MapPoiDisplayCategory>
  >(() => new Set());
  const [riverTab, setRiverTab] = useState<RiverDetailTab>("levels");
  const [showSafetyNote, setShowSafetyNote] = useState(false);
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
  const tabPoiCategories = useMemo<Set<MapPoiDisplayCategory> | null>(() => {
    if (
      riverTab === "rapids" ||
      riverTab === "hazards" ||
      riverTab === "access"
    ) {
      return new Set(RIVER_TAB_POI_CATEGORIES[riverTab]);
    }
    return null;
  }, [riverTab]);
  // Both the map markers and the panel list follow the active POI tab: on
  // Rapids/Hazards/Access we show only that group (minus categories hidden via
  // the chips); on Levels/Photos/About every reviewed point stays visible.
  // On the Photos tab, show only points that actually carry photos — the same
  // "focus the map on what the tab is about" behaviour as Rapids/Hazards/Access,
  // but filtered on photo presence rather than category. Photos live on
  // contributions (linked to a source point via mapPoiId), so build the set of
  // point ids that have at least one photo.
  const tabPhotosOnly = riverTab === "photos";
  const poiIdsWithPhotos = useMemo(
    () =>
      new Set(
        contributions
          .filter((contribution) => contribution.photos?.length)
          .map((contribution) => contribution.mapPoiId)
          .filter((id): id is string => Boolean(id)),
      ),
    [contributions],
  );
  const visibleSelectedRiverMapPois = useMemo(
    () =>
      selectedRiverMapPois.filter((poi) => {
        // Layers control stays authoritative even while a river is selected.
        if (!activePoiKinds.has(poi.kind)) {
          return false;
        }
        const category = mapPoiDisplayMeta(poi).category;
        if (hiddenPoiCategories.has(category)) {
          return false;
        }
        if (tabPoiCategories && !tabPoiCategories.has(category)) {
          return false;
        }
        if (
          tabPhotosOnly &&
          !poi.hasPhotos &&
          !poiIdsWithPhotos.has(poi.id)
        ) {
          return false;
        }
        return true;
      }),
    [
      activePoiKinds,
      hiddenPoiCategories,
      selectedRiverMapPois,
      tabPoiCategories,
      tabPhotosOnly,
      poiIdsWithPhotos,
    ],
  );
  // The POI ids this component will actually draw markers for in the current
  // view — section POIs always, plus the focused river's POIs when focused, else
  // the global POI set. A photo attached to one of these is represented by that
  // POI's camera badge, so its own pin is suppressed; a photo whose POI isn't
  // drawn here keeps its standalone pin so it never vanishes.
  const renderedPoiIds = useMemo(() => {
    const ids = new Set<string>();
    for (const poi of mapPois) ids.add(poi.id);
    if (selectedCanonicalRiver) {
      for (const poi of visibleSelectedRiverMapPois) ids.add(poi.id);
    } else {
      for (const poi of globalPois ?? []) ids.add(poi.id);
    }
    return ids;
  }, [mapPois, selectedCanonicalRiver, visibleSelectedRiverMapPois, globalPois]);
  const tabPoiCounts = useMemo(
    () =>
      tabPoiCategories
        ? selectedRiverPoiCategoryCounts.filter(({ category }) =>
            tabPoiCategories.has(category),
          )
        : [],
    [selectedRiverPoiCategoryCounts, tabPoiCategories],
  );
  // Total reviewed points per points-style tab, so the tab labels can advertise
  // what's inside before the user clicks (avoids hunting through empty tabs).
  const riverTabPoiTotals = useMemo(() => {
    const totals: Record<RiverPoiTab, number> = {
      rapids: 0,
      hazards: 0,
      access: 0,
    };
    selectedRiverPoiCategoryCounts.forEach(({ category, count }) => {
      (Object.keys(totals) as Array<keyof typeof totals>).forEach((tab) => {
        if (RIVER_TAB_POI_CATEGORIES[tab].includes(category)) {
          totals[tab] += count;
        }
      });
    });
    return totals;
  }, [selectedRiverPoiCategoryCounts]);
  // Points that carry at least one photo — advertised on the Photos tab label and
  // used to filter the map when that tab is active.
  // A focused river's published photos (rolled up by river_id). Drives both the
  // Photos tab count and the map's standalone photo pins — the loaded section
  // contributions exclude POI- and river-overview-attached photos, so they can't
  // be the source for either.
  const [riverPhotos, setRiverPhotos] = useState<RiverPhoto[]>([]);
  useEffect(() => {
    const riverId = selectedCanonicalRiver?.id;
    if (!riverId) {
      setRiverPhotos([]);
      return;
    }
    let active = true;
    fetchRiverPhotos(riverId)
      .then((photos) => {
        if (active) setRiverPhotos(photos);
      })
      .catch(() => {
        if (active) setRiverPhotos([]);
      });
    return () => {
      active = false;
    };
  }, [selectedCanonicalRiver?.id]);
  const riverPhotoCount = riverPhotos.length;

  useEffect(() => {
    setRiverTab("levels");
    setShowSafetyNote(false);
  }, [selectedCanonicalRiver?.id]);

  useEffect(() => {
    callbackRef.current = onSelectSection;
  }, [onSelectSection]);

  useEffect(() => {
    canonicalRiverSelectRef.current = onSelectCanonicalRiver;
  }, [onSelectCanonicalRiver]);

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

    let savedView: { lat: number; lng: number; zoom: number } | null = null;
    try {
      const parsed = JSON.parse(
        window.localStorage.getItem("rl-map-view") ?? "null",
      );
      if (
        parsed &&
        Number.isFinite(parsed.lat) &&
        Number.isFinite(parsed.lng) &&
        Number.isFinite(parsed.zoom)
      ) {
        savedView = { lat: parsed.lat, lng: parsed.lng, zoom: parsed.zoom };
      }
    } catch {
      // ignore unavailable / corrupt storage
    }

    const map = L.map(mapContainerRef.current, {
      center: savedView ? [savedView.lat, savedView.lng] : [52.6, -2.9],
      zoom: savedView ? savedView.zoom : 6,
      zoomControl: false,
      // Render vector layers (river lines, routes, gauge circles) to a <canvas>
      // instead of one SVG <path> per line. The river network alone is ~370
      // polylines; as SVG that's 370 DOM nodes reprojected on every pan/zoom,
      // which is what makes the Rivers layer crawl on mobile.
      preferCanvas: true,
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
    // Dedicated renderer + group for the river-level-lines. A wider padding than
    // the default (0.1) means a short pan reuses already-drawn canvas instead of
    // re-culling immediately; the moveend handler re-culls once the pan settles.
    const riverRenderer = L.canvas({ padding: 0.5 });
    const riverLines = L.layerGroup().addTo(map);
    const poiMarkers = L.layerGroup().addTo(map);
    const liveLocationLayer = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerRef.current = layers;
    riverRendererRef.current = riverRenderer;
    riverLinesLayerRef.current = riverLines;
    poiLayerRef.current = poiMarkers;
    liveLocationLayerRef.current = liveLocationLayer;

    if (savedView) {
      // Honor the restored view over the load-time auto-fit-to-active-section,
      // until the user's first interaction. The page always loads before any
      // input, so this reliably blocks only the on-load fit.
      shouldFitActiveSectionRef.current = false;
      restoredViewActiveRef.current = true;
      const releaseRestoredView = () => {
        restoredViewActiveRef.current = false;
        document.removeEventListener("pointerdown", releaseRestoredView, true);
        document.removeEventListener("keydown", releaseRestoredView, true);
      };
      document.addEventListener("pointerdown", releaseRestoredView, true);
      document.addEventListener("keydown", releaseRestoredView, true);
    }

    // Only persist after a genuine user gesture, so programmatic auto-fits on
    // load can't overwrite the stored view; the first gesture also releases the
    // restored-view lock so normal fits resume.
    let userHasGesturedMap = false;
    const enablePersist = () => {
      userHasGesturedMap = true;
      restoredViewActiveRef.current = false;
    };
    const mapEl = map.getContainer();
    mapEl.addEventListener("pointerdown", enablePersist);
    mapEl.addEventListener("wheel", enablePersist, { passive: true });

    const persistMapView = () => {
      if (!userHasGesturedMap) {
        return;
      }
      try {
        const centre = map.getCenter();
        const view = { lat: centre.lat, lng: centre.lng, zoom: map.getZoom() };
        window.localStorage.setItem("rl-map-view", JSON.stringify(view));
      } catch {
        // ignore unavailable storage (private mode, quota, etc.)
      }
    };
    map.on("moveend zoomend", persistMapView);
    const updatePoiZoom = () => {
      const visible = map.getZoom() >= POI_MIN_ZOOM;
      setPoiZoomVisible((previous) => (previous === visible ? previous : visible));
    };
    updatePoiZoom();
    map.on("zoomend", updatePoiZoom);

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        if (mapRef.current === map && map.getContainer().isConnected) {
          map.invalidateSize();
        }
      });
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      mapEl.removeEventListener("pointerdown", enablePersist);
      mapEl.removeEventListener("wheel", enablePersist);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      riverLinesLayerRef.current = null;
      riverRendererRef.current = null;
      poiLayerRef.current = null;
      liveLocationLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    if (!showKnownRivers) {
      setKnownWatercourses([]);
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
          })
          .catch(() => {
            if (
              isCancelled ||
              knownWatercoursesRequestRef.current !== requestId
            ) {
              return;
            }

            setKnownWatercourses([]);
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

  // River-level-lines layer — the heaviest vector content, kept on its own
  // canvas group. It's redrawn only when the river data/visibility changes or
  // the map settles after a pan/zoom (moveend/zoomend), at which point each
  // segment is culled to the padded viewport and simplified to the zoom. This
  // is deliberately decoupled from the marker effect below, whose ~35 deps
  // (live location, POI zoom, drafts…) otherwise rebuilt every river line.
  useEffect(() => {
    const map = mapRef.current;
    const riverLines = riverLinesLayerRef.current;
    const renderer = riverRendererRef.current;

    if (!map || !riverLines) {
      return;
    }

    const displayedRiverIds = new Set(canonicalRivers.map((river) => river.id));
    const riverNameById = new Map(
      canonicalRivers.map((river) => [river.id, river.displayName]),
    );
    const visibleRivers = (showRiverLayer ? (riverLevelLines ?? []) : []).filter(
      (river) => displayedRiverIds.has(river.riverId),
    );

    const draw = () => {
      riverLines.clearLayers();
      if (visibleRivers.length === 0) {
        return;
      }

      const mapBounds = map.getBounds().pad(0.25);
      const viewport = {
        minLat: mapBounds.getSouth(),
        minLng: mapBounds.getWest(),
        maxLat: mapBounds.getNorth(),
        maxLng: mapBounds.getEast(),
      };
      const tolerance = toleranceForZoom(map.getZoom());

      visibleRivers.forEach((river) => {
        const bandLabel = LEVEL_BAND_LABELS[river.band];
        const valueText =
          river.value != null ? ` · ${river.value}${river.unit ?? ""}` : "";
        const riverName = riverNameById.get(river.riverId) ?? river.riverId;
        river.lines.forEach((segment) => {
          if (segment.length < 2) {
            return;
          }
          // Skip whole segments outside the view, then thin the survivors to the
          // detail the current zoom can actually show.
          if (!segmentIntersectsBounds(segment, viewport)) {
            return;
          }
          const points = simplifyPath(segment, tolerance);
          if (points.length < 2) {
            return;
          }
          const line = L.polyline(points, {
            color: levelBandColor(river.band),
            weight: 5,
            opacity: 0.9,
            interactive: true,
            renderer: renderer ?? undefined,
          }).addTo(riverLines);
          line.bindTooltip(`${riverName} — ${bandLabel}${valueText}`, {
            sticky: true,
          });
        });
      });
    };

    draw();
    map.on("moveend zoomend", draw);

    return () => {
      map.off("moveend zoomend", draw);
      riverLines.clearLayers();
    };
  }, [showRiverLayer, riverLevelLines, canonicalRivers]);

  // High-volume marker layer — global POIs (~800) plus riverside amenities
  // (~6,000+ nationally). Like the river lines, these get their own group and
  // are redrawn once the map settles after a pan/zoom; only pins inside the
  // padded viewport become DOM nodes, keeping the live count to what's on screen
  // and out of the GPS-tick rebuild churn.
  //
  // The redraw is incremental — it keeps markers already in view, adds ones that
  // scrolled in, and removes ones that scrolled out. A wholesale clear-and-
  // rebuild would also destroy the marker whose popup the user just opened:
  // opening a popup autoPans the map, which fires moveend → redraw. Keeping
  // still-visible markers untouched lets the open popup survive.
  useEffect(() => {
    const map = mapRef.current;
    const poiMarkers = poiLayerRef.current;

    if (!map || !poiMarkers) {
      return;
    }

    // Build the section/river lookups once, rather than an O(n) find per POI.
    const sectionById = new Map(
      sections.map((section) => [section.id, section]),
    );
    const riverByName = new Map(
      canonicalRivers.map((river) => [river.displayName, river]),
    );
    // A selected river's own POIs are owned by the selected-river path (its
    // panel tabs/chips), so don't double-render them here.
    const selectedRiverPoiIds = selectedCanonicalRiver
      ? new Set(selectedRiverMapPois.map((poi) => poi.id))
      : null;

    const amenityLetter: Record<string, string> = {
      pub: "P",
      car_park: "C",
      toilets: "T",
      cafe: "F",
      drinking_water: "W",
      shop: "S",
    };
    const amenityName: Record<string, string> = {
      pub: "Pub",
      car_park: "Car park",
      toilets: "Toilets",
      cafe: "Café",
      drinking_water: "Drinking water",
      shop: "Shop",
    };

    // Markers currently on the map, keyed by a stable id, so a redraw can diff
    // against the previous view instead of rebuilding everything.
    const rendered = new Map<string, L.Marker>();

    const draw = () => {
      const next = new Set<string>();

      // Zoom-gated so the national view isn't flooded with pins — EXCEPT when a
      // river is focused: it's already a narrow scope, so show its pins at any
      // zoom (the selection flies the map to the river).
      if (poiZoomVisible || selectedCanonicalRiver) {
        const bounds = map.getBounds().pad(0.25);

        // When a river is focused, the global paddling-feature layer steps aside:
        // the focused river's own features render via the selected-river path
        // (panel), and other rivers' features are filtered out of focus.
        (selectedCanonicalRiver ? [] : (globalPois ?? [])).forEach((poi) => {
          if (selectedRiverPoiIds?.has(poi.id)) {
            return;
          }
          if (!bounds.contains(poi.location)) {
            return;
          }
          const key = `poi:${poi.id}`;
          next.add(key);
          if (rendered.has(key)) {
            return;
          }
          const displayMeta = mapPoiDisplayMeta(poi);
          const poiMarker = L.marker(poi.location, {
            bubblingMouseEvents: false,
            icon: L.divIcon({
              className: "",
              html: markerHtml(
                displayMeta.markerKind,
                displayMeta.markerLabel,
                "",
                attachmentBadgesHtml({
                  photo: showPhotoLayer && poiIdsWithPhotos.has(poi.id),
                }),
              ),
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            }),
          });
          // Resolve the POI's river (via its section) so the popup can open
          // details, matching the selected-river POI markers rather than a bare
          // hover tooltip.
          const poiSection = poi.sectionId
            ? sectionById.get(poi.sectionId)
            : undefined;
          const poiRiver = poiSection
            ? riverByName.get(poiSection.riverName)
            : undefined;
          // Details works for every POI, river-selected or not — the river is
          // just context (its name when we can resolve it, else the section).
          const openGlobalPoiDetails = (options?: OpenPoiDetailsOptions) => {
            map.closePopup();
            poiDetailsRef.current(
              riverMapPoiToSelectedPoi(poi, poiRiver, poiSection?.riverName),
              options ?? { focusMap: true, focusPlacement: "mobile-top-half" },
            );
          };

          poiMarker.addTo(poiMarkers);
          if (markerClickMode === "info") {
            poiMarker.bindPopup(
              createMapPopupContent({
                title: poi.title,
                subtitle: displayMeta.label,
                summary: poi.summary,
                onOpenDetails: () =>
                  openGlobalPoiDetails({ focusMap: false, expand: true }),
                detailsLabel: "Snap view",
                onDetails: () => openGlobalPoiDetails(),
              }),
            );
          }
          poiMarker.on("click", (event) => {
            L.DomEvent.stop(event.originalEvent);
            if (markerClickMode === "info") {
              poiMarker.openPopup();
              return;
            }
            openGlobalPoiDetails();
          });
          rendered.set(key, poiMarker);
        });

        (amenities ?? []).forEach((amenity) => {
          // Focused river: show only its amenities (pre-derived riverId, §5).
          if (
            selectedCanonicalRiver &&
            amenity.riverId !== selectedCanonicalRiver.id
          ) {
            return;
          }
          if (!bounds.contains([amenity.lat, amenity.lng])) {
            return;
          }
          const key = `amenity:${amenity.id}`;
          next.add(key);
          if (rendered.has(key)) {
            return;
          }
          const amenityMarker = L.marker([amenity.lat, amenity.lng], {
            bubblingMouseEvents: false,
            icon: L.divIcon({
              className: "",
              html: markerHtml(
                "amenity",
                amenityLetter[amenity.category] ?? "•",
                "background:#e8b079;border-color:#e8b079;color:#3a2613;",
              ),
              iconSize: [22, 22],
              iconAnchor: [11, 11],
            }),
          });
          amenityMarker.addTo(poiMarkers);
          const label = amenityName[amenity.category] ?? amenity.category;
          amenityMarker.bindPopup(
            createMapPopupContent({
              title: amenity.name ?? label,
              subtitle: label,
              summary: "From OpenStreetMap.",
              navigationLocation: [amenity.lat, amenity.lng],
              navigationLabel: "Directions",
              navigationMode: "directions",
            }),
          );
          rendered.set(key, amenityMarker);
        });
      }

      // Drop markers that scrolled out of view (or all of them when zoomed
      // out). Markers still in view are left in place so an open popup isn't
      // torn down by the moveend that autoPan fired when it opened.
      rendered.forEach((marker, key) => {
        if (!next.has(key)) {
          poiMarkers.removeLayer(marker);
          rendered.delete(key);
        }
      });
    };

    draw();
    map.on("moveend zoomend", draw);

    return () => {
      map.off("moveend zoomend", draw);
      poiMarkers.clearLayers();
      rendered.clear();
    };
  }, [
    poiZoomVisible,
    globalPois,
    amenities,
    showPhotoLayer,
    poiIdsWithPhotos,
    selectedCanonicalRiver,
    selectedRiverMapPois,
    markerClickMode,
    sections,
    canonicalRivers,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layerRef.current;

    if (!map || !layers) {
      return;
    }

    layers.clearLayers();

    // The river-level-lines are drawn by their own effect (canvas-rendered,
    // viewport-culled, zoom-simplified) so they're not rebuilt on every marker/
    // GPS/POI change that re-runs this effect.

    // Global POIs and riverside amenities — the high-volume marker sets — are
    // drawn by their own viewport-culled effect (see below), so this effect no
    // longer rebuilds thousands of pins on every GPS/marker change.

    (stations ?? []).forEach((station) => {
      const bandColor = levelBandColor(station.band);
      const stationMarker = L.marker([station.lat, station.lng], {
        bubblingMouseEvents: false,
        icon: L.divIcon({
          className: "",
          html: markerHtml(
            "gauge",
            "",
            `background:${bandColor};border-color:${bandColor};`,
          ),
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      });
      stationMarker.addTo(layers);
      const valueText =
        station.value != null
          ? `${station.value}${station.unit ?? ""}`
          : "No recent reading";
      stationMarker.bindPopup(
        createMapPopupContent({
          title: station.name,
          subtitle: `${station.provider} · ${LEVEL_BAND_LABELS[station.band]}`,
          summary: valueText,
          navigationLocation: [station.lat, station.lng],
        }),
      );
    });


    (showRiverLayer ? canonicalRivers : []).forEach((river) => {
      const label = riverMarkerInitial(river.displayName);
      // Colour pins by discipline using the same --discipline-* tokens as the
      // search chips, so the map and Search read with one colour language.
      const disciplineKind =
        river.discipline === "whitewater"
          ? "river-whitewater"
          : river.discipline === "touring"
            ? "river-touring"
            : river.discipline === "both"
              ? "river-both"
              : "river";
      // Pins read by live level state — grey where there's no gauge, matching
      // the grey river line; gauged rivers show their band colour. The colour
      // stays the same when selected (the opened panel is the selection cue), so
      // the pin doesn't jump to a different colour on tap.
      const riverBand = riverLevelStates?.get(river.id)?.band ?? "unknown";
      const levelStyle = `background:${levelBandColor(
        riverBand,
      )};border-color:${levelBandColor(riverBand)};color:#102a43;`;
      const marker = L.marker(river.centre, {
        bubblingMouseEvents: false,
        icon: L.divIcon({
          className: "",
          html: markerHtml(disciplineKind, label, levelStyle),
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
      });
      // Details: open the river panel expanded (full), without moving the map.
      const openRiverDetails = () => {
        map.closePopup();
        canonicalRiverSelectRef.current(river.id, {
          expand: true,
          snap: false,
        });
      };
      // Snap: centre the map on the river and open its panel in the small state.
      const snapToRiver = () => {
        map.closePopup();
        canonicalRiverSelectRef.current(river.id, {
          expand: false,
          snap: true,
        });
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
            selectLabel: "Snap view",
            onSelect: snapToRiver,
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
            html: markerHtml(
              displayMeta.markerKind,
              displayMeta.markerLabel,
              "",
              attachmentBadgesHtml({
                photo:
                  showPhotoLayer &&
                  (poi.hasPhotos || poiIdsWithPhotos.has(poi.id)),
              }),
            ),
            iconSize: [markerSize, markerSize],
            iconAnchor: [markerSize / 2, markerSize / 2],
          }),
        });
        const openPoiDetails = (options?: OpenPoiDetailsOptions) => {
          map.closePopup();
          poiDetailsRef.current(
            riverMapPoiToSelectedPoi(poi, selectedCanonicalRiver),
            options ?? { focusMap: true, focusPlacement: "mobile-top-half" },
          );
        };

        marker.addTo(layers);
        if (markerClickMode === "info") {
          marker.bindPopup(
            createMapPopupContent({
              title: poi.title,
              subtitle: `${selectedCanonicalRiver.displayName} · ${displayMeta.label}`,
              summary: poi.summary,
              onOpenDetails: () =>
                openPoiDetails({ focusMap: false, expand: true }),
              detailsLabel: "Snap view",
              onDetails: () => openPoiDetails(),
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

            // Clear any selected curated river so the waterway info panel
            // (which is hidden while a river is selected) can show.
            canonicalRiverSelectRef.current(null);
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
      const levelBand = sectionLevelStates?.get(section.id)?.band;
      const color = isCandidate ? "#7c3aed" : levelBandColor(levelBand);
      const defaultRouteStyle: L.PolylineOptions = {
        color,
        weight: isActive ? (isCandidate ? 4 : 5) : isCandidate ? 3 : 4,
        opacity: isCandidate
          ? isActive
            ? 0.5
            : 0.26
          : isActive
            ? 0.95
            : 0.7,
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
            html: markerHtml(
              displayMeta.markerKind,
              displayMeta.markerLabel,
              "",
              attachmentBadgesHtml({
                photo:
                  showPhotoLayer &&
                  (poi.hasPhotos || poiIdsWithPhotos.has(poi.id)),
              }),
            ),
            iconSize: [markerSize, markerSize],
            iconAnchor: [markerSize / 2, markerSize / 2],
          }),
        });
        const openPoiDetails = (options?: OpenPoiDetailsOptions) => {
          map.closePopup();
          poiDetailsRef.current(
            mapPoiToSelectedPoi(poi, section),
            options ?? { focusMap: true, focusPlacement: "mobile-top-half" },
          );
        };

        marker.addTo(layers);
        if (markerClickMode === "info") {
          marker.bindPopup(
            createMapPopupContent({
              title: poi.title,
              subtitle: displayMeta.label,
              summary: poi.summary,
              onOpenDetails: () =>
                openPoiDetails({ focusMap: false, expand: true }),
              detailsLabel: "Snap view",
              onDetails: () => openPoiDetails(),
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

    // Approved public routes (community-contributed, moderator-approved) — solid
    // green polylines, distinct from the dashed pending suggestions/adjustments.
    if (showPublicRoutes) {
      approvedRouteSuggestions.forEach((suggestion) => {
        if (suggestion.route.length < 2) {
          return;
        }
        const routeSection = sections.find(
          (section) =>
            section.sectionName === suggestion.sectionName &&
            section.riverName === suggestion.riverName,
        );
        L.polyline(suggestion.route, {
          color: "#059669",
          weight: 4,
          opacity: 0.85,
        })
          .addTo(layers)
          .bindPopup(
            createMapPopupContent({
              title: suggestion.riverName || "Route",
              subtitle: suggestion.sectionName,
              summary: suggestion.summary ?? "",
              navigationLocation: suggestion.route[0],
              onDetails: routeSection
                ? () => {
                    map.closePopup();
                    routeDetailsRef.current(routeSection);
                  }
                : undefined,
            }),
          );
      });
    }

    contributions.forEach((contribution) => {
      if (!contribution.location) {
        return;
      }
      const isPhoto = contribution.type === "photo";
      // A photo attached to a POI that's drawn in this view is surfaced as a
      // camera badge on that POI (see the POI render paths), so drop its
      // overlapping pin. If the linked POI isn't drawn here (e.g. a focused
      // river whose POI set doesn't include it), keep the pin so the photo never
      // disappears from the map.
      if (
        isPhoto &&
        contribution.mapPoiId &&
        renderedPoiIds.has(contribution.mapPoiId)
      ) {
        return;
      }
      // The Photos layer toggle hides/shows standalone photo pins; the river
      // "Photos" tab always shows them (an explicit focus overriding the toggle).
      if (isPhoto && !tabPhotosOnly && !showPhotoLayer) {
        return;
      }
      // Photos tab: keep only contributions that carry photos, so the map shows
      // just the photo points (matching the Rapids/Hazards/Access focus pattern).
      if (tabPhotosOnly && !contribution.photos?.length) {
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
              : isPhoto
                ? "photo"
                : "community";
      // A settled photo gets the camera glyph; a still-syncing/failed one keeps
      // the "P" letter so the outbox colour reads clearly.
      const label =
        contribution.type === "hazard"
          ? "!"
          : isPhoto
            ? kind === "photo"
              ? PHOTO_MARKER_GLYPH
              : "P"
            : contribution.type === "feature"
              ? "*"
              : contribution.type === "access"
                ? "A"
                : "N";
      // A non-photo point that carries photos (e.g. a hazard report with a
      // photo) gets a camera badge so the Photos layer surfaces it for clicking,
      // without turning it into a photo pin.
      const badges = attachmentBadgesHtml({
        photo: showPhotoLayer && !isPhoto && Boolean(contribution.photos?.length),
      });
      const marker = L.marker(contribution.location, {
        bubblingMouseEvents: false,
        icon: L.divIcon({
          className: "",
          html: markerHtml(kind, label, "", badges),
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
      });
      const openContributionDetails = (options?: OpenPoiDetailsOptions) => {
        map.closePopup();
        poiDetailsRef.current(
          contributionToSelectedPoi(
            contribution,
            sections.find((section) => section.id === contribution.sectionId) ??
              activeSection,
            syncStatus,
          ),
          options ?? { focusMap: true, focusPlacement: "mobile-top-half" },
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
            onOpenDetails: () =>
              openContributionDetails({ focusMap: false, expand: true }),
            detailsLabel: "Snap view",
            onDetails: () => openContributionDetails(),
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

    // A focused river's standalone photos (no POI, so no badge) draw as camera
    // pins at their location — this is the only path that surfaces photos added
    // from the river overview, which never load into the section contributions.
    // POI-linked photos are skipped here (their POI carries the badge), as are
    // any already drawn above from the loaded contributions.
    if (selectedCanonicalRiver && showPhotoLayer) {
      const loadedContributionIds = new Set(
        contributions.map((contribution) => contribution.id),
      );
      riverPhotos.forEach((photo) => {
        if (
          photo.mapPoiId ||
          !photo.location ||
          loadedContributionIds.has(photo.contributionId)
        ) {
          return;
        }
        const thumb = photo.thumbnailUrl || photo.displayUrl;
        const full = photo.displayUrl || thumb;
        const title = photo.caption || "River photo";
        const openPhoto = full
          ? () =>
              onOpenPhoto({
                src: full,
                title,
                caption: photo.originalName || "",
                alt: title,
              })
          : undefined;
        const photoMarker = L.marker(photo.location, {
          bubblingMouseEvents: false,
          icon: L.divIcon({
            className: "",
            html: markerHtml("photo", PHOTO_MARKER_GLYPH),
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          }),
        });
        photoMarker.addTo(layers);
        if (markerClickMode === "info") {
          photoMarker.bindPopup(
            createMapPopupContent({
              title,
              subtitle: "Photo",
              summary: "",
              imageUrl: thumb ?? undefined,
              imageAlt: title,
              onImageClick: openPhoto,
              navigationLocation: photo.location,
            }),
          );
        }
        photoMarker.on("click", (event) => {
          L.DomEvent.stop(event.originalEvent);
          if (markerClickMode === "info") {
            photoMarker.openPopup();
            return;
          }
          openPhoto?.();
        });
      });
    }

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

    // The live-location marker is rendered by its own effect (keyed on
    // liveLocation) into liveLocationLayerRef, so frequent GPS ticks don't
    // rebuild every marker here and tear down an open popup.

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

    if (restoredViewActiveRef.current) {
      // While honoring a restored view, consume any pending auto-fit so a stale
      // shouldFit can't fire to the wrong section when the lock releases on the
      // first click (e.g. opening a river's Details).
      shouldFitActiveSectionRef.current = false;
    }

    if (shouldFitActiveSectionRef.current && !restoredViewActiveRef.current) {
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
    tabPhotosOnly,
    showPhotoLayer,
    poiIdsWithPhotos,
    renderedPoiIds,
    riverPhotos,
    focusNonce,
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
    selectedRiverMapPois,
    visibleSelectedRiverMapPois,
    isAddMode,
    routeCreateMode,
    routeDraftPoints,
    routeSuggestionFocusId,
    routeSuggestionFocusNonce,
    routeSuggestions,
    sections,
    showRoutesLayer,
    showRiverLayer,
    sectionLevelStates,
    riverLevelStates,
    stations,
    showSelectedRoutePath,
    showKnownRivers,
    onOpenPhoto,
  ]);

  // Live location renders into its own layer so a GPS tick only redraws the
  // "you are here" marker. (When it lived in the big effect above, every tick
  // cleared and rebuilt all markers — closing whatever popup was open.)
  useEffect(() => {
    const layer = liveLocationLayerRef.current;
    if (!layer) {
      return;
    }
    layer.clearLayers();
    if (!liveLocation) {
      return;
    }
    if (liveLocation.accuracyMeters) {
      L.circle(liveLocation.location, {
        radius: liveLocation.accuracyMeters,
        color: "#277da1",
        fillColor: "#277da1",
        fillOpacity: 0.08,
        interactive: false,
        weight: 1,
      }).addTo(layer);
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
      .addTo(layer)
      .bindPopup(createLiveLocationPopup(liveLocation));
  }, [liveLocation]);

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
    focusMapOnDetailLocation(map, detailFocusLocation, detailFocusPlacement);
  }, [detailFocusLocation, detailFocusPlacement, detailFocusNonce]);

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
        <DetailPanel
          ariaLabel="Selected river"
          className="detail-panel--river"
          eyebrow="River"
          title={selectedCanonicalRiver.displayName}
          subtitle={selectedCanonicalRiver.run || undefined}
          expanded={isSelectedRiverPanelExpanded}
          onToggleExpand={onToggleSelectedRiverPanelExpanded}
          onClose={onCloseSelectedRiverPanel}
          actions={
            <>
              <button
                className={`icon-button icon-button--compact${
                  favouriteRiverIds.includes(selectedCanonicalRiver.id)
                    ? " icon-button--favourite"
                    : ""
                }`}
                type="button"
                aria-pressed={favouriteRiverIds.includes(
                  selectedCanonicalRiver.id,
                )}
                aria-label={
                  favouriteRiverIds.includes(selectedCanonicalRiver.id)
                    ? "Remove from favourites"
                    : "Add to favourites"
                }
                title={
                  favouriteRiverIds.includes(selectedCanonicalRiver.id)
                    ? "Favourited"
                    : "Favourite this river"
                }
                onClick={() => onToggleFavouriteRiver(selectedCanonicalRiver.id)}
              >
                <Star
                  size={16}
                  fill={
                    favouriteRiverIds.includes(selectedCanonicalRiver.id)
                      ? "currentColor"
                      : "none"
                  }
                />
              </button>
              <button
                className="icon-button icon-button--compact river-safety-toggle"
                type="button"
                aria-label="Conditions and safety note"
                aria-expanded={showSafetyNote}
                title="Conditions & safety"
                onClick={() => setShowSafetyNote((value) => !value)}
              >
                <AlertTriangle size={16} />
              </button>
            </>
          }
        >
          <div className="watercourse-body">
          <div className="watercourse-panel__summary">
            {selectedCanonicalRiver.grade ? (
              <span>Grade {selectedCanonicalRiver.grade}</span>
            ) : null}
            {selectedCanonicalRiver.discipline ? (
              <span>{disciplineLabel(selectedCanonicalRiver.discipline)}</span>
            ) : null}
            <span>{selectedCanonicalRiver.region}</span>
            <span>
              {selectedCanonicalRiver.sectionCount} linked section
              {selectedCanonicalRiver.sectionCount === 1 ? "" : "s"}
            </span>
          </div>

          {showSafetyNote ? (
            <p className="source-note river-safety-note">
              Community-sourced and official information. Conditions change
              quickly — check locally and paddle within your own judgement.
            </p>
          ) : null}

          <div
            className="segmented-control river-detail-tabs"
            role="tablist"
            aria-label="River detail sections"
          >
            {RIVER_DETAIL_TABS.map((tab) => {
              const poiTotal =
                tab.id === "rapids" ||
                tab.id === "hazards" ||
                tab.id === "access"
                  ? riverTabPoiTotals[tab.id]
                  : tab.id === "photos"
                    ? riverPhotoCount
                    : null;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={riverTab === tab.id}
                  className={riverTab === tab.id ? "active" : ""}
                  onClick={() => setRiverTab(tab.id)}
                >
                  {tab.label}
                  {poiTotal !== null ? (
                    <span className="river-detail-tab-count">{poiTotal}</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {riverTab === "about" ? (
            <RiverPaddleHistory riverId={selectedCanonicalRiver.id} />
          ) : null}

          {riverTab === "levels" ? (
            <div className="watercourse-context">
              {primaryRiverMeasure && primaryRiverMeasure.latest ? (
                <>
                  <div className="observation-range-toggle" role="tablist">
                    {([48, 168, 672] as const).map((hours) => (
                      <button
                        key={hours}
                        type="button"
                        role="tab"
                        aria-selected={riverObservationRange === hours}
                        className={
                          riverObservationRange === hours ? "active" : ""
                        }
                        onClick={() => setRiverObservationRange(hours)}
                      >
                        {hours === 48 ? "48h" : hours === 168 ? "7d" : "28d"}
                      </button>
                    ))}
                  </div>
                  <div className="observation-list">
                    {uniqueRiverObservations.map((measure) => (
                      <ObservationCard
                        key={measure.id}
                        measure={measure}
                        rangeHours={riverObservationRange}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <p className="empty-state">
                  No live gauge linked to this river yet — read locally or check
                  a release schedule.
                </p>
              )}
            </div>
          ) : null}

          {riverTab === "about" ? (
            <div className="watercourse-context">
              <h3>Sources &amp; gaps</h3>
              <ul className="river-sources">
                <li>
                  Level:{" "}
                  {primaryRiverMeasure
                    ? `${primaryRiverMeasure.stationName} — ${primaryRiverMeasure.confidence.replaceAll(
                        "-",
                        " ",
                      )}`
                    : "no online gauge — read locally or check a release schedule"}
                </li>
                <li>
                  Points: {selectedCanonicalRiver.candidatePoiCount}{" "}
                  source-derived (OpenStreetMap), needs confirmation
                </li>
                <li>Access &amp; hazards: not yet reviewed by paddlers</li>
              </ul>
            </div>
          ) : null}

          {riverTab === "photos" ? (
            <RiverPhotoGallery
              riverId={selectedCanonicalRiver.id}
              onOpenPhoto={onOpenPhoto}
            />
          ) : null}

          {riverTab === "rapids" ||
          riverTab === "hazards" ||
          riverTab === "access" ? (
            <div className="watercourse-context">
              {tabPoiCounts.length > 1 ? (
                <div className="poi-filter-strip" aria-label="Filter points">
                  <button
                    className={`poi-filter-chip ${
                      tabPoiCounts.every(
                        ({ category }) => !hiddenPoiCategories.has(category),
                      )
                        ? "poi-filter-chip--active"
                        : ""
                    }`}
                    type="button"
                    onClick={showAllPoiCategories}
                  >
                    All
                  </button>
                  {tabPoiCounts.map(({ category, count }) => (
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
                  {visibleSelectedRiverMapPois.slice(0, 12).map((poi) => {
                    const displayMeta = mapPoiDisplayMeta(poi);
                    return (
                      <button
                        className="watercourse-list-row"
                        key={poi.id}
                        type="button"
                        onClick={() =>
                          poiDetailsRef.current(
                            riverMapPoiToSelectedPoi(
                              poi,
                              selectedCanonicalRiver,
                            ),
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
                            {displayMeta.label} ·{" "}
                            {poi.source?.label ?? "source confirmed"}
                          </small>
                        </span>
                        <MapPin size={15} />
                      </button>
                    );
                  })}
                </div>
              ) : tabPoiCounts.length ? (
                <p className="empty-state">
                  All points in this tab are hidden by the current filter.
                </p>
              ) : (
                <p className="empty-state">
                  {RIVER_TAB_EMPTY_MESSAGE[riverTab]}
                </p>
              )}
            </div>
          ) : null}

          {riverTab === "about" ? (
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
          ) : null}
          </div>
        </DetailPanel>
      ) : null}
      {selectedWatercourse && !selectedCanonicalRiver && !isPoiDetailsOpen ? (
        <DetailPanel
          ariaLabel="Selected waterway stretch"
          className="detail-panel--stretch"
          eyebrow="Local stretch"
          title={selectedWatercourse.name ?? "Unnamed waterway"}
          onClose={() => setSelectedWatercourseId(null)}
        >
          <div className="watercourse-body">
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
          </div>
        </DetailPanel>
      ) : null}
      {isLevelLegendOpen ? (
        <MapLevelLegend />
      ) : null}
    </section>
  );
}
