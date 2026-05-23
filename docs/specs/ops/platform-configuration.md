---
roadmap_ops_area: Platform
roadmap_ops_group: Publishing
roadmap_ops_item: In-repo Platform Configuration
roadmap_ops_phase: Now
spec_schema: 4
maturity: Draft
---

# Platform Configuration

**Work state:** Active
**Last updated:** 2026-05-23
**Scope:** In-repository platform configuration for publishing RiverLaunch.app with Firebase and GCP.

## Purpose

RiverLaunch.app needs a publishing path without creating a separate platform repository.

Platform configuration should live in this repository under `/platform`, close to the specs and app code, while remaining clearly separated from frontend source files.

## Product Role

- `Primary user objective:` Publish RiverLaunch.app for pilot users and later production users without losing deployment repeatability.
- `Classification:` Enabler
- `Loop step:` Publish / Operate
- `Why this matters:` Community contribution features only become useful when RiverLaunch.app is available outside a local demo.

## References

- `/docs/strategy/delivery-plan.md`
- `/docs/specs/release/demo-prototype.md`
- `/docs/specs/data/river-level-providers.md`
- `/platform/README.md`
- `/platform/docs/architecture.md`
- `/platform/docs/setup.md`

## Requirements

The platform configuration must:

- live inside this repository
- keep private environment config out of git
- define staging and production separately
- prefer Firebase and GCP services
- support Firebase Hosting for the web app
- support Firebase Auth for contributor identity
- support Firebase Storage for uploaded photos
- support Cloud Run for the backend API and future ingestion services
- support Cloud SQL PostgreSQL with PostGIS for durable river/community data
- support an isolated local PostGIS database for backend development without modifying the shared Kinetiq local database
- support Artifact Registry for Cloud Run images
- support Secret Manager and GitHub environment secrets
- provide read-only validation/planning before provisioning
- provide idempotent setup scripts for GCP/Firebase resource creation
- provide build-only CI and deploy configuration without publishing while billing is blocked
- provide read-only health checks that make billing/API/deployment blockers visible
- prefer keyless GCP authentication over downloaded service account keys
- use a Kinetiq-style two-file local config split: platform config for provisioning facts, runtime config for execution values and deployable secrets
- load local API development values from ignored runtime config so local admin roles, Firebase project ID, database URL, and API port match the selected environment
- deploy staging end-to-end using a backend-first, Firebase Hosting preview-channel-first workflow so the live staging site remains available until the final cutover
- support Cloud Run public access through `--no-invoker-iam-check` when organisation policy blocks `allUsers` IAM bindings

The first implementation should include:

- committed templates
- ignored local config location
- ignored local runtime config for URLs, DB URLs, Firebase runtime config, auth/session values, and storage targets
- validation script
- resource-plan script
- setup and architecture notes
- setup script for staging/prod GCP and Firebase resources
- Cloud Run API deployment script
- Cloud SQL migration script using Cloud SQL Auth Proxy
- Firebase Hosting preview/live deployment script
- end-to-end HTTP smoke script for `/api/health` and idempotent sync push
- local LAN preview on port `6173` by default, avoiding Kinetiq Engine's `50xxx` worktree port range

The setup script should support `--dry-run` and require `--create-resources` before creating missing GCP projects or paid resources.

When creating GCP projects, the setup script should guide the operator to use a human Google account unless a GCP folder or organisation parent is configured for service-account project creation.

Project creation should tolerate transient Cloud Resource Manager write-rate limits by retrying with backoff.

Billing must be verified before enabling paid or billing-gated APIs. If billing is missing or cannot be linked, setup should stop with an actionable billing-link message rather than continuing into API enablement.

Staging rollout order:

1. Run migrations through Cloud SQL Auth Proxy.
2. Deploy `river-go-api-staging` to Cloud Run.
3. Check the Cloud Run `/api/health` endpoint directly.
4. Deploy Firebase Hosting to a preview channel.
5. Smoke-test the preview URL.
6. Deploy live Firebase Hosting only after preview passes.

## Open Questions

- Should the public brand remain RiverLaunch.app while keeping repo/project IDs as `river-go`?
- Should production use `europe-west2` for UK locality or match Kinetiq's existing `europe-west1` convention?
- What production domain cutover sequence should be used for `riverlaunch.app`?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| PLATFORM-F1 | In-repo platform subproject | Ops | Landed | v0.2 | — | Adds `/platform` as the operational configuration boundary. |
| PLATFORM-F2 | Platform/runtime config templates | Ops/config | Landed | v0.2 | — | Adds Kinetiq-style platform and runtime templates for provisioning facts and execution/secrets values. |
| PLATFORM-F3 | Config validation script | Ops/tooling | Landed | v0.2 | — | Validates structural config shape without provisioning. |
| PLATFORM-F4 | Resource plan script | Ops/tooling | Landed | v0.2 | — | Prints staging/prod target resources for review. |
| PLATFORM-F5 | Provisioning scripts | Ops/tooling | Landed | v0.3 | — | Adds idempotent GCP/Firebase setup script with dry-run support. |
| PLATFORM-F6 | Deployment workflow | Ops/CI | Active | v0.3 | — | Build-only GitHub Actions workflow exists; deploy remains blocked until billing is linked. |
| PLATFORM-F7 | Firebase Hosting config | Ops/config | Landed | v0.3 | — | Staging Hosting includes `/api/**` Cloud Run rewrite; live deploy waits until API preview passes. |
| PLATFORM-F8 | Platform health check | Ops/tooling | Landed | v0.3 | — | Read-only health check reports billing/API/resource state. |
| PLATFORM-F9 | Local PostGIS database | Ops/local-dev | Landed | v0.3 | — | Adds isolated RiverLaunch.app PostGIS container on `127.0.0.1:5435` with local app and migration users. |
| PLATFORM-F10 | Cloud Run API deployment script | Ops/deploy | Active | v0.3 | — | Builds API Docker image, writes `DATABASE_URL` to Secret Manager, deploys Cloud Run with invoker IAM check disabled for public staging access, and checks health. |
| PLATFORM-F11 | Preview-first Hosting deployment | Ops/deploy | Active | v0.3 | — | Deploys API rewrite to a Firebase preview channel before live Hosting cutover. |
| PLATFORM-F12 | Cloud SQL migration script | Ops/deploy | Active | v0.3 | — | Runs SQL migrations through Cloud SQL Auth Proxy using the migration DB URL. |
| PLATFORM-F13 | Custom-domain Firebase Auth redirect | Ops/auth | Landed | v0.3 | — | Hosted web builds use the public Hosting domain as Firebase `authDomain` so redirect sign-in restores auth state on custom domains. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| PLATFORM-B1 | decision | Confirm domains | Active | v0.2 | RiverLaunch.app uses `riverlaunch.app`; staging is available at `staging.riverlaunch.app`; repo/project IDs remain `river-go`. |
| PLATFORM-B2 | decision | Confirm GCP region | Open | v0.2 | Template uses `europe-west2`; can switch before provisioning. |
| PLATFORM-B3 | decision | Choose first publish shape | Resolved | v0.2 | Use Firebase Hosting plus Cloud Run, deployed backend-first and preview-first. |
| PLATFORM-B4 | dependency | Create or select GCP/Firebase projects | Active | v0.3 | Setup script can create projects with `--create-resources` once billing config is set. |
| PLATFORM-B5 | task | Add health checks | Active | v0.3 | Read-only first pass checks billing, APIs, Firebase visibility, Cloud Run, Artifact Registry, and Cloud SQL. |
| PLATFORM-B6 | task | Add secret sync script | Open | v0.3 | Sync values from ignored runtime config into Secret Manager/GitHub without making the repo-local file the source of truth. |
| PLATFORM-B7 | validation | Detect service-account project creation failure | Resolved | v0.3 | Setup script now reports the active account and required parent/account fix before calling project creation. |
| PLATFORM-B8 | validation | Retry project creation rate limits | Resolved | v0.3 | Setup script retries transient Cloud Resource Manager 429s with backoff. |
| PLATFORM-B9 | validation | Stop on missing or failed billing link | Resolved | v0.3 | Setup script now verifies billing and stops before API enablement when billing cannot be linked. |
| PLATFORM-B10 | validation | Treat GitHub environment 403 as manual setup | Resolved | v0.3 | Setup script now reports missing repo admin rights as a manual step instead of an operational failure. |
| PLATFORM-B11 | validation | Handle disabled service account key creation | Resolved | v0.3 | Setup defaults to keyless auth and reports Workload Identity Federation follow-up when org policy blocks keys. |
| PLATFORM-B12 | validation | Keep Hosting deployable before API exists | Resolved | v0.3 | Live Hosting remains unchanged until Cloud Run exists and preview-channel smoke tests pass. |
| PLATFORM-B13 | task | Refresh local GCP auth before staging deploy | Active | v0.3 | Current shell cannot access `river-go-staging` until `gcloud auth login` is refreshed. |
| PLATFORM-B14 | task | Populate staging runtime database URLs | Active | v0.3 | `platform/.config/river-go-runtime.json` must contain real staging DB URLs before migration/API deploy. |
| PLATFORM-B15 | validation | Org policy blocks `allUsers` invoker binding | Resolved | v0.3 | Use Cloud Run `--no-invoker-iam-check` instead of adding `allUsers` IAM where organisation policy blocks domain-external principals. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-21 | Added build-only CI, Firebase Hosting config, and platform health check. |
| 2026-05-21 | Added hard billing verification before API enablement. |
| 2026-05-21 | Added retry/backoff for Cloud Resource Manager project creation rate limits. |
| 2026-05-21 | Added service-account project creation guard and optional resource parent support. |
| 2026-05-22 | Improved GitHub environment permission handling. |
| 2026-05-22 | Defaulted platform auth to keyless Workload Identity Federation. |
| 2026-05-22 | Made Firebase Hosting config static-only until Cloud Run API exists. |
| 2026-05-22 | Expanded runtime config template to follow the Kinetiq platform/runtime split. |
| 2026-05-22 | Added isolated local PostGIS database configuration for backend development. |
| 2026-05-23 | Added Cloud Run API deploy, Cloud SQL migration, Firebase preview/live deploy, and end-to-end smoke scripts. |
| 2026-05-23 | Updated Cloud Run deploy path for organisation policy that blocks `allUsers` IAM bindings. |
| 2026-05-23 | Updated public brand/domain notes to RiverLaunch.app and `staging.riverlaunch.app`. |
| 2026-05-21 | Added initial GCP/Firebase provisioning script. |
| 2026-05-21 | Added initial in-repo platform configuration spec. |
