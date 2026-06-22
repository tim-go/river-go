import type { IncomingHttpHeaders } from "node:http";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirebaseProjectId } from "./config.js";
import { HttpError } from "./http.js";

export interface AuthContext {
  userId: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

export async function getOptionalAuthContext(
  headers: IncomingHttpHeaders,
): Promise<AuthContext | null> {
  return getAuthContext(headers, { required: false });
}

export async function requireAuthContext(
  headers: IncomingHttpHeaders,
): Promise<AuthContext> {
  const authContext = await getAuthContext(headers, { required: true });

  if (!authContext) {
    throw new HttpError(401, "Sign-in is required.");
  }

  return authContext;
}

async function getAuthContext(
  headers: IncomingHttpHeaders,
  options: { required: boolean },
): Promise<AuthContext | null> {
  const token = getBearerToken(headers.authorization);

  if (!token) {
    if (options.required) {
      throw new HttpError(401, "Sign-in is required to sync contributions.");
    }

    return null;
  }

  try {
    const decodedToken = await getAuth(getFirebaseAdminApp()).verifyIdToken(token);
    return {
      userId: decodedToken.uid,
      email: typeof decodedToken.email === "string" ? decodedToken.email : undefined,
      emailVerified: decodedToken.email_verified === true,
      name: typeof decodedToken.name === "string" ? decodedToken.name : undefined,
      picture:
        typeof decodedToken.picture === "string" ? decodedToken.picture : undefined,
    };
  } catch {
    throw new HttpError(401, "Invalid Firebase ID token.");
  }
}

export function getFirebaseAdminApp() {
  const existingApp = getApps()[0];

  if (existingApp) {
    return existingApp;
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId: getFirebaseProjectId(),
  });
}

function getBearerToken(header: string | string[] | undefined): string | null {
  const value = Array.isArray(header) ? header[0] : header;

  if (!value) {
    return null;
  }

  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}
