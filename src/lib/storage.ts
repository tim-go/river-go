import type {
  Contribution,
  MarkerClickMode,
  SyncBannerDismissal,
} from "../types";
import type { RouteSuggestion } from "../services/routeSuggestionApi";
import type { AnalyticsConsent } from "../services/analytics";

export const STORAGE_KEY = "river-go-demo-contributions";
export const FAVOURITES_STORAGE_KEY = "river-go-demo-favourite-sections";
export const FAVOURITE_RIVERS_STORAGE_KEY = "river-go-favourite-rivers";
export const ROUTE_SUGGESTIONS_STORAGE_KEY = "riverlaunch-route-suggestions-v1";
const ANALYTICS_CONSENT_STORAGE_KEY = "riverlaunch-analytics-consent-v1";
const WELCOME_SESSION_STORAGE_KEY = "riverlaunch-welcome-dismissed-session";
const SYNC_BANNER_DISMISSAL_STORAGE_KEY = "riverlaunch-sync-banner-dismissal";
const LIVE_LOCATION_STORAGE_KEY = "riverlaunch-live-location-enabled";
const MARKER_CLICK_MODE_STORAGE_KEY = "riverlaunch-marker-click-mode";

export function loadContributions(): Contribution[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  } catch {
    return [];
  }
}

// Favourite sections (routes.id, community sections). Re-enabled once real
// (community-promoted) sections exist to favourite — mirrors
// loadFavouriteRiverIds just below.
export function loadFavouriteSectionIds(): string[] {
  try {
    const stored = localStorage.getItem(FAVOURITES_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const value = JSON.parse(stored);
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

// Favourite canonical rivers (the active "favourite" model — sections are
// parked). Unlike the legacy section favourites above, these persist.
export function loadFavouriteRiverIds(): string[] {
  try {
    const stored = localStorage.getItem(FAVOURITE_RIVERS_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const value = JSON.parse(stored);
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function saveFavouriteRiverIds(riverIds: string[]) {
  try {
    localStorage.setItem(FAVOURITE_RIVERS_STORAGE_KEY, JSON.stringify(riverIds));
  } catch {
    // Non-critical; favourites persist only for the current session.
  }
}

export function loadRouteSuggestions(): RouteSuggestion[] {
  try {
    localStorage.removeItem(ROUTE_SUGGESTIONS_STORAGE_KEY);
    return [];
  } catch {
    return [];
  }
}

export function loadAnalyticsConsent(): AnalyticsConsent {
  try {
    const stored = localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    return stored === "accepted" || stored === "declined" ? stored : "unknown";
  } catch {
    return "unknown";
  }
}

export function saveAnalyticsConsent(consent: AnalyticsConsent) {
  try {
    if (consent === "unknown") {
      localStorage.removeItem(ANALYTICS_CONSENT_STORAGE_KEY);
      return;
    }

    localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, consent);
  } catch {
    // Non-critical; analytics remains consent-gated for the current session.
  }
}

export function hasDismissedWelcomeForSession() {
  try {
    return sessionStorage.getItem(WELCOME_SESSION_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function rememberWelcomeDismissedForSession() {
  try {
    sessionStorage.setItem(WELCOME_SESSION_STORAGE_KEY, "true");
  } catch {
    // Non-critical; the welcome sheet can reappear if session storage is unavailable.
  }
}

export function loadLiveLocationEnabled() {
  try {
    return localStorage.getItem(LIVE_LOCATION_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveLiveLocationEnabled(enabled: boolean) {
  try {
    localStorage.setItem(LIVE_LOCATION_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // Non-critical; live location can still run for the current session.
  }
}

export function loadMarkerClickMode(): MarkerClickMode {
  try {
    const stored = localStorage.getItem(MARKER_CLICK_MODE_STORAGE_KEY);
    return stored === "detail" ? "detail" : "info";
  } catch {
    return "info";
  }
}

export function saveMarkerClickMode(mode: MarkerClickMode) {
  try {
    localStorage.setItem(MARKER_CLICK_MODE_STORAGE_KEY, mode);
  } catch {
    // Non-critical; the current session setting still applies.
  }
}

export function loadSyncBannerDismissal(): SyncBannerDismissal | null {
  try {
    const stored = sessionStorage.getItem(SYNC_BANNER_DISMISSAL_STORAGE_KEY);
    if (!stored) return null;

    const value = JSON.parse(stored) as Partial<SyncBannerDismissal>;
    return typeof value.queuedOutboxCount === "number" &&
      typeof value.failedOutboxCount === "number" &&
      typeof value.expiresAt === "number"
      ? {
          queuedOutboxCount: value.queuedOutboxCount,
          failedOutboxCount: value.failedOutboxCount,
          expiresAt: value.expiresAt,
        }
      : null;
  } catch {
    return null;
  }
}

export function saveSyncBannerDismissal(dismissal: SyncBannerDismissal | null) {
  try {
    if (!dismissal) {
      sessionStorage.removeItem(SYNC_BANNER_DISMISSAL_STORAGE_KEY);
      return;
    }

    sessionStorage.setItem(
      SYNC_BANNER_DISMISSAL_STORAGE_KEY,
      JSON.stringify(dismissal),
    );
  } catch {
    // Non-critical; the sync banner can reappear if session storage is unavailable.
  }
}
