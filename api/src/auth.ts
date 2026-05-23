import type { IncomingHttpHeaders } from "node:http";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirebaseProjectId, isWriteAuthRequired } from "./config.js";
import { HttpError } from "./http.js";

export interface AuthContext {
  userId: string;
  email?: string;
  name?: string;
}

export async function getWriteAuthContext(
  headers: IncomingHttpHeaders,
): Promise<AuthContext | null> {
  const token = getBearerToken(headers.authorization);

  if (!token) {
    if (isWriteAuthRequired()) {
      throw new HttpError(401, "Sign-in is required to sync contributions.");
    }

    return null;
  }

  try {
    const decodedToken = await getAuth(getFirebaseAdminApp()).verifyIdToken(token);
    return {
      userId: decodedToken.uid,
      email: typeof decodedToken.email === "string" ? decodedToken.email : undefined,
      name: typeof decodedToken.name === "string" ? decodedToken.name : undefined,
    };
  } catch {
    throw new HttpError(401, "Invalid Firebase ID token.");
  }
}

function getFirebaseAdminApp() {
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
