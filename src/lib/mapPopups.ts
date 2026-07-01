import L from "leaflet";
import type { LatLngTuple, LiveLocationSnapshot } from "../types";
import type { RouteSuggestion } from "../services/routeSuggestionApi";
import type { RouteAdjustment } from "../services/routeAdjustmentApi";
import {
  googleMapsDirectionsUrl,
  googleMapsSearchUrl,
} from "../services/locationReferences";
import { formatLocation } from "./format";

export function markerHtml(
  kind: string,
  label: string,
  styleOverride = "",
  extra = "",
) {
  const style = styleOverride ? ` style="${styleOverride}"` : "";
  return `<span class="map-marker map-marker--${kind}"${style} aria-hidden="true">${label}${extra}</span>`;
}

export function createMapPopupContent({
  title,
  subtitle,
  summary,
  imageUrl,
  imageAlt,
  onImageClick,
  openDetailsLabel = "Details",
  onOpenDetails,
  detailsLabel = "Details",
  navigationLocation,
  navigationLabel = "Maps",
  navigationMode = "map",
  onDetails,
  selectLabel,
  onSelect,
}: {
  title: string;
  subtitle: string;
  summary: string;
  imageUrl?: string;
  imageAlt?: string;
  onImageClick?: () => void;
  // Opens the detail panel without moving the map (rendered first).
  openDetailsLabel?: string;
  onOpenDetails?: () => void;
  detailsLabel?: string;
  navigationLocation?: LatLngTuple;
  navigationLabel?: string;
  navigationMode?: "directions" | "map";
  onDetails?: () => void;
  selectLabel?: string;
  onSelect?: () => void;
}) {
  const container = L.DomUtil.create("div", "map-popup-card");
  L.DomEvent.disableClickPropagation(container);

  const heading = L.DomUtil.create("strong", "", container);
  heading.textContent = title;

  const meta = L.DomUtil.create("span", "", container);
  meta.textContent = subtitle;

  if (imageUrl) {
    const imageParent = onImageClick
      ? L.DomUtil.create("button", "map-popup-card__image-button", container)
      : container;
    if (onImageClick && imageParent instanceof HTMLButtonElement) {
      imageParent.type = "button";
      imageParent.title = "Open photo";
      L.DomEvent.on(imageParent, "click", (event) => {
        L.DomEvent.stop(event);
        container
          .closest(".leaflet-popup")
          ?.querySelector<HTMLAnchorElement>(".leaflet-popup-close-button")
          ?.click();
        onImageClick();
      });
    }

    const image = L.DomUtil.create(
      "img",
      "map-popup-card__image",
      imageParent,
    );
    image.src = imageUrl;
    image.alt = imageAlt ?? "";
  }

  const body = L.DomUtil.create("p", "", container);
  body.textContent = summary;

  const actions = L.DomUtil.create("div", "map-popup-actions", container);
  if (onOpenDetails) {
    const openButton = L.DomUtil.create("button", "", actions);
    openButton.type = "button";
    openButton.textContent = openDetailsLabel;
    L.DomEvent.on(openButton, "click", (event) => {
      L.DomEvent.stop(event);
      container
        .closest(".leaflet-popup")
        ?.querySelector<HTMLAnchorElement>(".leaflet-popup-close-button")
        ?.click();
      onOpenDetails();
    });
  }

  if (onDetails) {
    const detailsButton = L.DomUtil.create("button", "", actions);
    detailsButton.type = "button";
    detailsButton.textContent = detailsLabel;
    L.DomEvent.on(detailsButton, "click", (event) => {
      L.DomEvent.stop(event);
      container
        .closest(".leaflet-popup")
        ?.querySelector<HTMLAnchorElement>(".leaflet-popup-close-button")
        ?.click();
      onDetails();
    });
  }

  if (onSelect) {
    const selectButton = L.DomUtil.create("button", "", actions);
    selectButton.type = "button";
    selectButton.textContent = selectLabel ?? "Select";
    L.DomEvent.on(selectButton, "click", (event) => {
      L.DomEvent.stop(event);
      container
        .closest(".leaflet-popup")
        ?.querySelector<HTMLAnchorElement>(".leaflet-popup-close-button")
        ?.click();
      onSelect();
    });
  }

  if (navigationLocation) {
    const link = L.DomUtil.create("a", "", actions);
    link.href =
      navigationMode === "directions"
        ? googleMapsDirectionsUrl(navigationLocation)
        : googleMapsSearchUrl(navigationLocation);
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = navigationLabel;
  }

  return container;
}

export function createSearchedLocationPopup(
  location: LatLngTuple,
  title: string,
) {
  const container = L.DomUtil.create("div", "map-popup-card");
  L.DomEvent.disableClickPropagation(container);

  const heading = L.DomUtil.create("strong", "", container);
  heading.textContent = title;

  const meta = L.DomUtil.create("span", "", container);
  meta.textContent = formatLocation(location);

  const body = L.DomUtil.create("p", "", container);
  body.textContent = "Opened from Search.";

  const actions = L.DomUtil.create("div", "map-popup-actions", container);
  const link = L.DomUtil.create("a", "", actions);
  link.href = googleMapsSearchUrl(location);
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = "Maps";

  return container;
}

export function createLiveLocationPopup(location: LiveLocationSnapshot) {
  const container = L.DomUtil.create("div", "map-popup-card");
  L.DomEvent.disableClickPropagation(container);

  const heading = L.DomUtil.create("strong", "", container);
  heading.textContent = "Your location";

  const meta = L.DomUtil.create("span", "", container);
  meta.textContent = formatLocation(location.location);

  const body = L.DomUtil.create("p", "", container);
  body.textContent = location.accuracyMeters
    ? `Accuracy about ${Math.round(location.accuracyMeters)} m.`
    : "Accuracy unavailable.";

  return container;
}

export function createRouteSuggestionPopup(suggestion: RouteSuggestion) {
  const container = L.DomUtil.create("div", "map-popup-card");
  L.DomEvent.disableClickPropagation(container);

  const heading = L.DomUtil.create("strong", "", container);
  heading.textContent = suggestion.sectionName;

  const meta = L.DomUtil.create("span", "", container);
  meta.textContent = `${suggestion.riverName} · ${suggestion.difficulty}`;

  const body = L.DomUtil.create("p", "", container);
  body.textContent = suggestion.summary;

  const actions = L.DomUtil.create("div", "map-popup-actions", container);
  const status = L.DomUtil.create("span", "status-chip", actions);
  status.textContent =
    suggestion.status === "pending-review" ? "Pending review" : "Local draft";

  return container;
}

export function createRouteAdjustmentPopup(adjustment: RouteAdjustment) {
  const container = L.DomUtil.create("div", "map-popup-card");
  L.DomEvent.disableClickPropagation(container);

  const heading = L.DomUtil.create("strong", "", container);
  heading.textContent = `Edit: ${adjustment.sectionName}`;

  const meta = L.DomUtil.create("span", "", container);
  meta.textContent = `${adjustment.riverName} · ${adjustment.difficulty}`;

  const body = L.DomUtil.create("p", "", container);
  body.textContent = adjustment.summary;

  const actions = L.DomUtil.create("div", "map-popup-actions", container);
  const status = L.DomUtil.create("span", "status-chip", actions);
  status.textContent = routeAdjustmentStatusLabel(adjustment.status);

  return container;
}

export function routeSuggestionStatusLabel(status: RouteSuggestion["status"]) {
  if (status === "pending-review") return "Pending review";
  if (status === "needs-info") return "Needs more info";
  if (status === "approved") return "Approved candidate";
  if (status === "rejected") return "Rejected";
  if (status === "hidden") return "Hidden";
  return "Local draft";
}

export function routeAdjustmentStatusLabel(status: RouteAdjustment["status"]) {
  if (status === "pending-review") return "Pending review";
  if (status === "needs-info") return "Needs more info";
  if (status === "approved") return "Approved adjustment";
  if (status === "rejected") return "Rejected";
  return "Hidden";
}
