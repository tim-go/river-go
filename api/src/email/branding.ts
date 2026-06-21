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

export function getEmailTemplateBranding(): EmailTemplateBranding {
  const base = getAppBaseUrl();
  // The logo must be a public https URL to render in mail clients; otherwise the
  // shell falls back to the brand name as text.
  const logoUrl = isPublicHttpsUrl(base)
    ? new URL("/apple-touch-icon.png", base).toString()
    : null;

  return {
    brandName: "RiverLaunch.app",
    logoUrl,
    accentColor: "#2f6bff",
  };
}
