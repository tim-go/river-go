# River Go Platform

This subproject owns River Go platform configuration inside the main application repository.

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

## Preferred Stack

River Go should use the same service family as the Kinetiq platform pattern, but contained in this repo:

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

Do not commit files under `platform/.config/`.
