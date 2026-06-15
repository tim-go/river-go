import { HttpError } from "./http.js";

/**
 * Validates and normalises a public contributor name: 2-40 chars;
 * letters/numbers/spaces/.'- only; no contact details or links; and no terms
 * implying staff or organisation status. Throws HttpError(400) on rejection.
 *
 * Pure (no DB/auth deps) so it can be unit-tested directly.
 */
export function normalisePublicName(value: string): string {
  const cleaned = value.replace(/\s+/g, " ").trim();

  if (cleaned.length < 2 || cleaned.length > 40) {
    throw new HttpError(400, "Public name must be 2-40 characters.");
  }

  if (/[<>{}[\]\\/@]|https?:|www\.|\.com\b/i.test(cleaned)) {
    throw new HttpError(
      400,
      "Public name cannot include contact details or links.",
    );
  }

  if (!/^[\p{L}\p{N} .'-]+$/u.test(cleaned)) {
    throw new HttpError(
      400,
      "Public name can use letters, numbers, spaces, apostrophes, hyphens, and full stops.",
    );
  }

  const lower = cleaned.toLowerCase();
  const blockedTerms = [
    "admin",
    "moderator",
    "riverlaunch",
    "paddle uk",
    "paddleuk",
    "fuck",
    "shit",
    "cunt",
    "nazi",
  ];

  if (blockedTerms.some((term) => lower.includes(term))) {
    throw new HttpError(
      400,
      "Choose a public name that does not imply staff or organisation status.",
    );
  }

  return cleaned;
}

/**
 * A safe default public name. It must itself pass normalisePublicName — the
 * fallback used to be "RiverLaunch member N", which the validator rejected (the
 * brand word is blocked), trapping members on their own default name.
 */
export function defaultPublicName(displayName: string | undefined): string {
  try {
    return normalisePublicName(displayName ?? "");
  } catch {
    return `Paddler ${Math.floor(1000 + Math.random() * 9000)}`;
  }
}
