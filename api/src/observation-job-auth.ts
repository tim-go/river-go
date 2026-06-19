import type { IncomingHttpHeaders } from "node:http";
import { OAuth2Client, type TokenPayload } from "google-auth-library";
import {
  getObservationJobOidcAudience,
  getObservationJobServiceAccount,
} from "./config.js";

// Reused across requests so Google's token-signing certs are fetched and cached
// once, not per call.
const oidcClient = new OAuth2Client();

// Pure predicate: a verified Google OIDC token is accepted only when it carries
// a verified email equal to the configured Cloud Scheduler service account.
// Kept separate from the network verification so it can be unit-tested.
export function isAcceptedSchedulerIdentity(
  payload: Pick<TokenPayload, "email" | "email_verified"> | undefined,
  expectedServiceAccount: string | undefined,
): boolean {
  return Boolean(
    expectedServiceAccount &&
      payload?.email_verified === true &&
      payload.email === expectedServiceAccount,
  );
}

function readBearerToken(headers: IncomingHttpHeaders): string | undefined {
  const raw = headers["authorization"];
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header?.startsWith("Bearer ")) {
    return undefined;
  }
  return header.slice("Bearer ".length).trim() || undefined;
}

// True only for a request carrying a Google-signed OIDC token whose signature,
// issuer, audience, and expiry are valid AND whose identity is the configured
// scheduler service account. Returns false (never throws) when OIDC isn't
// configured, no bearer token is present, or verification fails — callers then
// fall back to interactive moderator auth.
export async function isAuthorizedSchedulerOidc(
  headers: IncomingHttpHeaders,
): Promise<boolean> {
  const audience = getObservationJobOidcAudience();
  const serviceAccount = getObservationJobServiceAccount();
  if (!audience || !serviceAccount) {
    return false;
  }

  const idToken = readBearerToken(headers);
  if (!idToken) {
    return false;
  }

  try {
    const ticket = await oidcClient.verifyIdToken({ idToken, audience });
    return isAcceptedSchedulerIdentity(ticket.getPayload(), serviceAccount);
  } catch {
    return false;
  }
}
