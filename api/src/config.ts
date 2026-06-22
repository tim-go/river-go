import type { PoolConfig } from "pg";

export const DEFAULT_DATABASE_URL =
  "postgresql://river_go_admin:river_go@127.0.0.1:5440/river_go";

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

export function getObservationJobOidcAudience(): string | undefined {
  return process.env.OBSERVATION_JOB_OIDC_AUDIENCE?.trim() || undefined;
}

export function getObservationJobServiceAccount(): string | undefined {
  return process.env.OBSERVATION_JOB_SERVICE_ACCOUNT?.trim() || undefined;
}

export function getAppBaseUrl(): string | undefined {
  return process.env.APP_BASE_URL?.trim() || undefined;
}

export function isEmailVerificationRequired(): boolean {
  // Enforced by default now that Resend delivers verification emails. Set
  // REQUIRE_EMAIL_VERIFICATION=false only to relax it (e.g. a throwaway env).
  return process.env.REQUIRE_EMAIL_VERIFICATION !== "false";
}
