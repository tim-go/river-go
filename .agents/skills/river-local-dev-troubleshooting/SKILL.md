---
name: river-local-dev-troubleshooting
description: Use when local River Go dev server, Vite, API, database, dependency install, port conflicts, Leaflet map rendering, or build checks are broken.
---

# Local Dev Troubleshooting

Work from the repo root.

## Services And Ports

Local dev runs three processes:

- Frontend (Vite): `npm run dev:lan` binds `:6173` and is LAN-exposed (`--host 0.0.0.0`); `npm run dev` uses `:5173`. Vite proxies `/api` to `127.0.0.1:8080`.
- API: `npm run api:dev` on `:8080`.
- Postgres/PostGIS: local DB on `127.0.0.1:5435` (`npm run db:local:up`, `npm run db:local:check`).

The maintainer often runs `dev:lan` and `api:dev` continuously. Do not kill or restart them to run checks — build/typecheck/test do not need a running server. If you must run a server yourself, use spare ports and leave `:6173`/`:8080`/`:5435` alone.

## Secure-Context Gotcha (LAN access)

`http://<LAN-ip>` (e.g. `http://192.168.x.x:6173`) is an **insecure context**. Browser APIs gated to secure contexts are unavailable there, causing runtime errors that do **not** reproduce on `localhost`:

- `crypto.randomUUID()` is undefined — use the `generateUuid()` helper (it falls back to `getRandomValues`).
- `navigator.geolocation`, `crypto.subtle`, and service workers are blocked.

To use these on a LAN device: open via `localhost`, add the origin under `chrome://flags` "Insecure origins treated as secure", or serve dev over HTTPS.

## Check Order

1. Confirm context and worktree:

   ```bash
   pwd
   git status --short
   node --version
   ```

2. Confirm dependencies (root and API):

   ```bash
   npm install
   npm --prefix api install
   ```

3. Run the validation gate:

   ```bash
   npm run build && npm test && npm --prefix api run test
   ```

4. If ports look stuck, inspect listeners before killing anything:

   ```bash
   lsof -iTCP:6173 -sTCP:LISTEN -n -P
   lsof -iTCP:8080 -sTCP:LISTEN -n -P
   lsof -iTCP:5435 -sTCP:LISTEN -n -P
   ```

5. If the API is failing, check it is reachable and the DB is up:

   ```bash
   curl -s http://localhost:8080/api/health
   npm run db:local:check
   ```

   Apply migrations with `npm run api:migrate`.

6. If the map is blank, check browser console errors, the Leaflet CSS import in `/src/main.tsx`, network access to OpenStreetMap tiles, and whether the map container has non-zero height.

7. If contribution/river data looks wrong: canonical rivers, POIs, and contributions come from the API/DB, not localStorage. localStorage only holds the offline contribution outbox and some UI prefs. Check the API/DB and the browser Network tab before assuming stale local state.

## Report

Report:

- command that failed
- frontend/API URLs and whether each was reachable
- Node version
- validation result
- any port conflicts
- whether the issue was a secure-context (LAN) limitation
