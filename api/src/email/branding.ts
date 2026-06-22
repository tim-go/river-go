import { getAppBaseUrl } from "../config.js";
import type { EmailTemplateBranding } from "./templates/common.js";

function isPublicHttpsUrl(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
      return false;
    }
    if (host === "127.0.0.1" || host === "::1") return false;
    return true;
  } catch {
    return false;
  }
}

// Always a public https URL so it renders in mail clients (and the local
// browser preview) — falls back to the deployed staging icon when APP_BASE_URL
// isn't public (e.g. local dev pointing at localhost). Real staging/prod emails
// use their own APP_BASE_URL.
const FALLBACK_LOGO_URL = "https://staging.riverlaunch.app/apple-touch-icon.png";

export function getEmailTemplateBranding(): EmailTemplateBranding {
  const base = getAppBaseUrl();
  const logoUrl = isPublicHttpsUrl(base)
    ? new URL("/apple-touch-icon.png", base).toString()
    : FALLBACK_LOGO_URL;

  return {
    brandName: "RiverLaunch.app",
    logoUrl,
    accentColor: "#2f6bff",
  };
}
