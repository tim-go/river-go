# RiverLaunch.app API

This package contains the first RiverLaunch.app backend slice.

It is intentionally small:

- SQL migrations
- PostgreSQL/PostGIS access through `pg`
- `GET /api/health`
- `POST /api/sync/push`
- optional what3words coordinate/address lookup through `GET /api/locations/what3words`

The first sync operation is `contribution.create`. It is idempotent: replaying the same `operationId` returns the original accepted entity without creating a duplicate contribution.

## Local Development

Start the local RiverLaunch.app PostGIS database from the repo root:

```bash
npm run db:local:up
```

Run migrations:

```bash
npm run api:migrate
```

Start the API:

```bash
npm run api:dev
```

The root `api:dev` command loads local runtime values from `platform/.config/river-go-runtime.json`, including `DATABASE_URL`, `FIREBASE_PROJECT_ID`, `ADMIN_EMAILS`, optional `WHAT3WORDS_API_KEY`, and the API port. To run against the staging runtime block instead:

```bash
npm run api:dev:staging
```

Check health:

```bash
curl http://127.0.0.1:8080/api/health
```

Run the idempotent sync smoke test:

```bash
npm run api:sync:smoke
```

Backfill stored what3words addresses for existing point contributions:

```bash
npm run api:backfill:w3w -- --dry-run
npm run api:backfill:w3w
```

The backfill stores `payload.what3wordsAddress` on each eligible contribution row. It does not add a schema column.

Import OSM waterway geometry after running migrations:

```bash
npm run api:import:osm-waterways -- --bbox 52.90,-3.70,52.98,-3.55 --source-version overpass-tryweryn-2026-05-26
```

Overpass JSON input is also supported:

```bash
npm run api:import:osm-waterways -- --file /path/to/overpass-waterways.json --source-version overpass-export-2026-05-26
```

To refresh staging from the repo root, use:

```bash
npm run platform:import:osm-waterways:staging -- --bbox 52.90,-3.70,52.98,-3.55 --source-version overpass-tryweryn-2026-05-26 --truncate-source
```

The imported `watercourses` records are visual reference geometry for snapping and map context only. They are not paddling route data and do not indicate access, safety, grade, or runnable conditions.

## Local Database Defaults

```text
DATABASE_URL=postgresql://river_go_admin:river_go@127.0.0.1:5435/river_go
```

The runtime app user and migration user are created by the local PostGIS container init script, but this first API slice uses the local admin URL so migrations and smoke tests work without extra credential switching.

## Cloud Run

The API is packaged by `api/Dockerfile`.

When `CLOUD_SQL_CONNECTION_NAME` is set, the API connects to PostgreSQL through the Cloud Run Cloud SQL Unix socket at `/cloudsql/<connection-name>`. `DATABASE_URL` should still contain the database name, user, and password, for example:

```text
postgresql://river_go_app:<password>@localhost/river_go
```

The staging deployment script stores `DATABASE_URL` and any configured integration secrets in Secret Manager, builds the API image, deploys Cloud Run, attaches the Cloud SQL instance, and checks `/api/health`:

```bash
npm run platform:deploy-api:staging
```
