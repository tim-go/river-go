import type { Analytics } from "firebase/analytics";
import { getClientFirebaseApp } from "./firebaseApp";

export type AnalyticsConsent = "accepted" | "declined" | "unknown";

let analyticsPromise: Promise<Analytics | null> | null = null;
let consentState: AnalyticsConsent = "unknown";

export function setAnalyticsConsentPreference(consent: AnalyticsConsent) {
  consentState = consent;

  if (consent !== "accepted") {
    analyticsPromise = null;
    return;
  }

  // Tell GA the user opted in. Loading firebase/analytics here is fine — we
  // only reach this branch on an explicit accept, which is also the only case
  // where we go on to initialise analytics.
  void import("firebase/analytics").then(({ setConsent }) => {
    setConsent({ analytics_storage: "granted" });
  });
}

export async function initAnalytics(): Promise<Analytics | null> {
  if (consentState !== "accepted") {
    return null;
  }

  if (analyticsPromise) {
    return analyticsPromise;
  }

  analyticsPromise = (async () => {
    const app = getClientFirebaseApp();

    if (!app) {
      return null;
    }

    // Lazy-loaded so the heavy firebase/analytics SDK only downloads once a
    // user has actually accepted analytics — never on first paint.
    const { getAnalytics, isSupported } = await import("firebase/analytics");

    if (!(await isSupported())) {
      return null;
    }

    return getAnalytics(app);
  })();

  return analyticsPromise;
}

export async function trackPageView(params: {
  title: string;
  path: string;
}) {
  const analytics = await initAnalytics();

  if (!analytics || typeof window === "undefined") {
    return;
  }

  // Module already resolved by initAnalytics above, so this import is a cache hit.
  const { logEvent } = await import("firebase/analytics");
  logEvent(analytics, "page_view", {
    page_title: params.title,
    page_location: window.location.href,
    page_path: params.path,
  });
}

export async function trackProductEvent(
  eventName: string,
  params: Record<string, string | number | boolean | null | undefined> = {},
) {
  const analytics = await initAnalytics();

  if (!analytics) {
    return;
  }

  const { logEvent } = await import("firebase/analytics");
  logEvent(analytics, eventName, params);
}
