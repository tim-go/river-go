# RiverLaunch.app Platform

This subproject owns RiverLaunch.app platform configuration inside the main application repository. Internal repo and cloud resource IDs remain `river-go`.

It is intentionally not a separate repo. The goal is to keep product specs, application code, and platform intent together while still separating cloud setup concerns from the frontend app.

## Scope

The platform subproject covers:

- GCP and Firebase environment configuration
- Cloud Run service naming and deployment targets
- Firebase Auth and Storage configuration intent
- Cloud SQL/PostgreSQL configuration intent
- Artifact Registry naming
- GitHub environment and secret naming
- read-only validation and resource planning scripts

It does not yet create cloud resources. The first version is deliberately a configuration and planning layer so we can review names, environments, and service boundaries before provisioning.

## Structure

```text
platform/
  config/templates/       Starter config files that are safe to commit
  docs/                   Platform architecture and setup notes
  scripts/                Local validation and planning utilities
  .config/                Local private config, ignored by git
```

## Quick Start

Create local config from the committed templates:

```bash
mkdir -p platform/.config
cp platform/config/templates/river-go-platform.json platform/.config/river-go-platform.json
cp platform/config/templates/river-go-runtime.json platform/.config/river-go-runtime.json
```

Then edit the local files with real project IDs, billing account, Firebase client config, and secret values.

Run validation:

```bash
npm run platform:check
```

Print the intended resource plan:

```bash
npm run platform:plan:staging
npm run platform:plan:prod
```

If local config files do not exist, the scripts fall back to the templates and mark the output as template-backed.

## Provisioning

Provisioning scripts require local config in `platform/.config`.

Preview staging setup:

```bash
platform/scripts/infra/setup.sh staging --dry-run
```

Create or update staging resources:

```bash
platform/scripts/infra/setup.sh staging --create-resources
```

Root package shortcuts are available for normal setup runs:

```bash
npm run platform:setup:staging -- --dry-run
npm run platform:setup:staging -- --create-resources
npm run platform:setup:prod -- --create-resources
```

The setup script is idempotent. It verifies or creates the GCP project, adds Firebase, registers a Firebase web app, creates the Firebase Hosting site, exports the Firebase web SDK config, enables required APIs, creates Storage/Artifact Registry/Cloud SQL targets, prepares service accounts, and creates the GitHub environment when `gh` is authenticated.

Cloud SQL passwords, PostGIS extension setup, custom domains, and deployment secrets remain explicit follow-up steps.

## Local Database

RiverLaunch.app uses a separate local PostGIS database so it does not disturb the shared Kinetiq `kinetiq-db` container on `localhost:5432`.

Start the local RiverLaunch.app database:

```bash
npm run db:local:up
```

Check PostGIS:

```bash
npm run db:local:check
```

Open `psql` as the local admin user:

```bash
npm run db:local:psql
```

Local connection defaults:

- admin URL: `postgresql://river_go_admin:river_go@localhost:5435/river_go`
- app URL: `postgresql://river_go_app:river_go@localhost:5435/river_go`
- migrations URL: `postgresql://github_ci:river_go@localhost:5435/river_go`

PostGIS is PostgreSQL's geospatial extension. RiverLaunch.app needs it to store and query river routes, sections, hazards, access points, and nearby map contributions as real geometry rather than plain latitude/longitude text.

## Health Checks

While publishing is blocked, use the read-only health check to see what is ready:

```bash
npm run platform:health:staging
```

The health check reports project, billing, API, Firebase, Artifact Registry, Cloud SQL, and Cloud Run state. It does not create or mutate resources.

## End-To-End Staging Rollout

Use the preview-first rollout when connecting Firebase Hosting to Cloud Run and Cloud SQL. This keeps the existing live Hosting site serving until the final live deploy step.

Prerequisites:

- `platform/.config/river-go-runtime.json` has real `staging.database.url` and `staging.database.migrationsUrl` values from the vault.
- `gcloud auth login` has a fresh token for an account with access to `river-go-staging`.
- Cloud SQL users, grants, and PostGIS are already configured.

Run database migrations through Cloud SQL Auth Proxy:

```bash
npm run platform:migrate:staging
```

Backfill stored what3words addresses for existing point contributions when needed:

```bash
npm run platform:backfill:w3w:staging -- --dry-run
npm run platform:backfill:w3w:staging
```

The backfill connects through Cloud SQL Auth Proxy, finds visible point contributions without `payload.what3wordsAddress`, and stores the generated address in the existing JSONB payload.

Deploy the API to Cloud Run without changing Firebase Hosting traffic:

```bash
npm run platform:deploy-api:staging
```

The staging deploy uses Cloud Run's `--no-invoker-iam-check` public access mode because the organisation policy blocks `allUsers` IAM bindings.

Deploy Hosting to a preview channel first:

```bash
npm run platform:deploy-web-preview:staging
```

Smoke-test the preview URL printed by Firebase:

```bash
platform/scripts/infra/check-e2e.sh https://<preview-url>
```

Only after the preview passes, deploy live Hosting:

```bash
npm run platform:deploy-web:staging
```

The staging Hosting rewrite for `/api/**` points to `river-go-api-staging`. The catch-all app rewrite stays below it, so the map app remains static and should continue loading even if the API has a runtime problem.

## Preferred Stack

RiverLaunch.app should use the same service family as the Kinetiq platform pattern, but contained in this repo:

- Firebase Hosting for the public web entry point
- Firebase Auth for contributor identity
- Firebase Storage for uploaded photos
- Cloud Run for the backend API and provider ingestion jobs
- Cloud SQL PostgreSQL, with PostGIS when the backend starts storing real route and hazard geometry
- Artifact Registry for Cloud Run images
- Secret Manager for runtime secrets
- GitHub Actions environments for staging and production deployment

## Config Files

Committed templates:

- `platform/config/templates/river-go-platform.json`
- `platform/config/templates/river-go-runtime.json`

Private local files:

- `platform/.config/river-go-platform.json`
- `platform/.config/river-go-runtime.json`

Use the same split as the Kinetiq platform:

- `river-go-platform.json` is for provisioning and naming cloud resources.
- `river-go-runtime.json` is for runtime execution values and secrets that need to be synced to Secret Manager or GitHub environments.

The runtime file is a local convenience copy. Keep the durable secret source in your vault and copy values into `platform/.config/river-go-runtime.json` only when local scripts need them.

Do not commit files under `platform/.config/`.
