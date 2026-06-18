# Local Development

This runbook starts RiverLaunch.app locally with the local PostGIS database,
Cloud Run API equivalent, and Vite frontend.

Run all commands from the repository root:

```bash
cd /home/timgo/projects/personal/river-go
```

## Prerequisites

Install:

- Node.js and npm
- Docker, for the local PostGIS database
- `psql`, for database checks

Install dependencies.

The root app and API are separate npm projects. Install both on a fresh
checkout:

```bash
npm install
npm --prefix api install
```

The `platform/` package currently only uses built-in Node modules plus shell
tools, so it does not need a separate install.

## Local Config

Local runtime files live in `platform/.config/` and are ignored by git.

If they do not exist, create them from the committed templates:

```bash
mkdir -p platform/.config
cp platform/config/templates/river-go-platform.json platform/.config/river-go-platform.json
cp platform/config/templates/river-go-runtime.json platform/.config/river-go-runtime.json
```

For normal local development, the template `local` database values are already
set to:

```text
postgresql://river_go_app:river_go@localhost:5440/river_go
```

To use Firebase Auth locally, write `.env.local` from the staging Firebase
client config:

```bash
npm run env:local:staging
```

This intentionally writes `VITE_FIREBASE_AUTH_FLOW=popup` so local and LAN
development use popup sign-in while hosted staging/production use redirect
sign-in.

## Start The Local Database

```bash
npm run db:local:up
npm run db:local:check
```

The database listens on `127.0.0.1:5440` and includes PostGIS.

Run migrations:

```bash
npm run api:migrate
```

Optional local data tasks:

```bash
npm run api:seed:map-pois
npm run api:ingest:observations
```

Use the seed-data operations runbook for larger imports such as OSM waterways:

```text
docs/specs/ops/seed-data-operations.md
```

## Start The API

Open a terminal and run:

```bash
npm run api:dev
```

The API uses `platform/.config/river-go-runtime.json` and normally listens on:

```text
http://127.0.0.1:8080
```

If the frontend shows Vite proxy errors for `/api/...`, the API is probably not
running or port `8080` is already occupied.

## Start The Frontend

Open a second terminal and run:

```bash
npm run dev -- --host 127.0.0.1 --port 6173
```

Open:

```text
http://127.0.0.1:6173/
```

For LAN/mobile testing:

```bash
npm run dev:lan
```

Then open the VM's LAN address, for example:

```text
http://192.168.1.221:6173/
```

Browser OAuth origins generally require public domains, so local/LAN auth uses
popup sign-in. If auth fails locally, re-run `npm run env:local:staging` and
restart Vite.

## Stop Local Services

Stop the frontend/API terminal sessions with `Ctrl+C`.

To stop known RiverLaunch dev ports:

```bash
npm run dev:stop
```

To stop the local database:

```bash
npm run db:local:down
```

## Validation

Before handing off frontend changes:

```bash
npm run build
```

For platform config validation:

```bash
npm run platform:check
```

Useful diagnostics:

```bash
git status --short
node --version
npm --version
npm run db:local:psql
```
