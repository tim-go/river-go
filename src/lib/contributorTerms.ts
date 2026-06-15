/**
 * Contributor terms shown in the "Become a contributor" on-ramp. Bumping the
 * version re-prompts members to re-accept, so change it whenever the terms
 * change materially.
 */
export const CONTRIBUTOR_TERMS_VERSION = "2026-06-14";

/**
 * Whether contributors must verify their email before contributing. Relaxed by
 * default while transactional email (Resend) is being set up — Firebase's
 * default verification emails aren't being delivered. Set
 * VITE_REQUIRE_EMAIL_VERIFICATION=true to enforce once Resend is live; mirror it
 * server-side with REQUIRE_EMAIL_VERIFICATION.
 */
export const REQUIRE_EMAIL_VERIFICATION =
  (import.meta.env.VITE_REQUIRE_EMAIL_VERIFICATION as string | undefined) ===
  "true";

export const CONTRIBUTOR_TERMS_POINTS = [
  "Share accurate, first-hand local knowledge — facts and observations, not advice on whether anyone should paddle.",
  "Your public contributor name (not your email) is shown on what you add.",
  "Don't post other people's private details, or photos and content you don't have the right to share.",
  "Moderators may edit, hide, or remove contributions that are inaccurate or break these terms.",
];

/**
 * Whether a member has accepted the current contributor terms. A stale accepted
 * version counts as not accepted, so a terms bump re-prompts.
 */
export function hasAcceptedCurrentContributorTerms(
  acceptedVersion: string | null | undefined,
): boolean {
  return acceptedVersion === CONTRIBUTOR_TERMS_VERSION;
}
