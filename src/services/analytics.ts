import {
  getAnalytics,
  isSupported,
  logEvent,
  setConsent,
  type Analytics,
} from "firebase/analytics";
import { getClientFirebaseApp } from "./firebaseApp";

export type AnalyticsConsent = "accepted" | "declined" | "unknown";

let analyticsPromise: Promise<Analytics | null> | null = null;
let consentState: AnalyticsConsent = "unknown";

export function setAnalyticsConsentPreference(consent: AnalyticsConsent) {
  consentState = consent;
  setConsent({
    analytics_storage: consent === "accepted" ? "granted" : "denied",
  });

  if (consent !== "accepted") {
    analyticsPromise = null;
  }
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

    if (!app || !(await isSupported())) {
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

  logEvent(analytics, eventName, params);
}
