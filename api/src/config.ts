export const DEFAULT_DATABASE_URL =
  "postgresql://river_go_admin:river_go@127.0.0.1:5435/river_go";

export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
}

export function getPort(): number {
  const rawPort = process.env.PORT || "8080";
  const port = Number.parseInt(rawPort, 10);

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid PORT: ${rawPort}`);
  }

  return port;
}
