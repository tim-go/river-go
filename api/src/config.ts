import type { PoolConfig } from "pg";

export const DEFAULT_DATABASE_URL =
  "postgresql://river_go_admin:river_go@127.0.0.1:5435/river_go";

export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
}

export function getDatabaseConfig(): PoolConfig {
  const databaseUrl = new URL(getDatabaseUrl());
  const cloudSqlConnectionName = process.env.CLOUD_SQL_CONNECTION_NAME;

  if (!cloudSqlConnectionName) {
    return {
      connectionString: databaseUrl.toString(),
    };
  }

  return {
    database: databaseUrl.pathname.replace(/^\//, ""),
    host: `/cloudsql/${cloudSqlConnectionName}`,
    password: decodeURIComponent(databaseUrl.password),
    port: Number.parseInt(databaseUrl.port || "5432", 10),
    user: decodeURIComponent(databaseUrl.username),
  };
}

export function getPort(): number {
  const rawPort = process.env.PORT || "8080";
  const port = Number.parseInt(rawPort, 10);

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid PORT: ${rawPort}`);
  }

  return port;
}

export function getFirebaseProjectId(): string | undefined {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT
  );
}

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(/[;,]/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function getWhat3WordsApiKey(): string | undefined {
  return process.env.WHAT3WORDS_API_KEY?.trim() || undefined;
}

export function getObservationJobToken(): string | undefined {
  return process.env.OBSERVATION_JOB_TOKEN?.trim() || undefined;
}

export function isEmailVerificationRequired(): boolean {
  // Relaxed by default while transactional email (Resend) is being set up;
  // Firebase's default verification emails aren't being delivered. Set
  // REQUIRE_EMAIL_VERIFICATION=true to enforce once Resend is live.
  return process.env.REQUIRE_EMAIL_VERIFICATION === "true";
}
