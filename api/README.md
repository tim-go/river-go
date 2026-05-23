# River Go API

This package contains the first River Go backend slice.

It is intentionally small:

- SQL migrations
- PostgreSQL/PostGIS access through `pg`
- `GET /api/health`
- `POST /api/sync/push`

The first sync operation is `contribution.create`. It is idempotent: replaying the same `operationId` returns the original accepted entity without creating a duplicate contribution.

## Local Development

Start the local River Go PostGIS database from the repo root:

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

Check health:

```bash
curl http://127.0.0.1:8080/api/health
```

Run the idempotent sync smoke test:

```bash
npm run api:sync:smoke
```

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

The staging deployment script stores `DATABASE_URL` in Secret Manager, builds the API image, deploys Cloud Run, attaches the Cloud SQL instance, and checks `/api/health`:

```bash
npm run platform:deploy-api:staging
```
