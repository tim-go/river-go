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
**Last updated:** 2026-05-21
**Scope:** In-repository platform configuration for publishing River Go with Firebase and GCP.

## Purpose

River Go needs a publishing path without creating a separate platform repository.

Platform configuration should live in this repository under `/platform`, close to the specs and app code, while remaining clearly separated from frontend source files.

## Product Role

- `Primary user objective:` Publish River Go for pilot users and later production users without losing deployment repeatability.
- `Classification:` Enabler
- `Loop step:` Publish / Operate
- `Why this matters:` Community contribution features only become useful when River Go is available outside a local demo.

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
- support Artifact Registry for Cloud Run images
- support Secret Manager and GitHub environment secrets
- provide read-only validation/planning before provisioning
- provide idempotent setup scripts for GCP/Firebase resource creation
- provide build-only CI and deploy configuration without publishing while billing is blocked
- provide read-only health checks that make billing/API/deployment blockers visible

The first implementation should include:

- committed templates
- ignored local config location
- validation script
- resource-plan script
- setup and architecture notes
- setup script for staging/prod GCP and Firebase resources

The setup script should support `--dry-run` and require `--create-resources` before creating missing GCP projects or paid resources.

When creating GCP projects, the setup script should guide the operator to use a human Google account unless a GCP folder or organisation parent is configured for service-account project creation.

Project creation should tolerate transient Cloud Resource Manager write-rate limits by retrying with backoff.

Billing must be verified before enabling paid or billing-gated APIs. If billing is missing or cannot be linked, setup should stop with an actionable billing-link message rather than continuing into API enablement.

## Open Questions

- What final public domain should River Go use?
- Should production use `europe-west2` for UK locality or match Kinetiq's existing `europe-west1` convention?
- Should the first public publish be Firebase Hosting-only, or Cloud Run-backed from the start?
- Will the backend live in the same Node package as the frontend or as a separate `api/` package in this repo?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| PLATFORM-F1 | In-repo platform subproject | Ops | Landed | v0.2 | — | Adds `/platform` as the operational configuration boundary. |
| PLATFORM-F2 | Platform config templates | Ops/config | Landed | v0.2 | — | Adds staging/prod Firebase and GCP target templates. |
| PLATFORM-F3 | Config validation script | Ops/tooling | Landed | v0.2 | — | Validates structural config shape without provisioning. |
| PLATFORM-F4 | Resource plan script | Ops/tooling | Landed | v0.2 | — | Prints staging/prod target resources for review. |
| PLATFORM-F5 | Provisioning scripts | Ops/tooling | Landed | v0.3 | — | Adds idempotent GCP/Firebase setup script with dry-run support. |
| PLATFORM-F6 | Deployment workflow | Ops/CI | Active | v0.3 | — | Build-only GitHub Actions workflow exists; deploy remains blocked until billing is linked. |
| PLATFORM-F7 | Firebase Hosting config | Ops/config | Landed | v0.3 | — | Adds Firebase Hosting targets and future `/api` Cloud Run rewrites without deploying. |
| PLATFORM-F8 | Platform health check | Ops/tooling | Landed | v0.3 | — | Read-only health check reports billing/API/resource state. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| PLATFORM-B1 | decision | Confirm domains | Open | v0.2 | Templates use placeholder domains. |
| PLATFORM-B2 | decision | Confirm GCP region | Open | v0.2 | Template uses `europe-west2`; can switch before provisioning. |
| PLATFORM-B3 | decision | Choose first publish shape | Open | v0.2 | Firebase Hosting-only is fastest; Hosting plus Cloud Run is closer to MVP architecture. |
| PLATFORM-B4 | dependency | Create or select GCP/Firebase projects | Active | v0.3 | Setup script can create projects with `--create-resources` once billing config is set. |
| PLATFORM-B5 | task | Add health checks | Active | v0.3 | Read-only first pass checks billing, APIs, Firebase visibility, Cloud Run, Artifact Registry, and Cloud SQL. |
| PLATFORM-B6 | task | Add secret sync script | Open | v0.3 | Sync `DATABASE_URL`, Firebase Admin credentials, and deploy secrets to Secret Manager/GitHub. |
| PLATFORM-B7 | validation | Detect service-account project creation failure | Resolved | v0.3 | Setup script now reports the active account and required parent/account fix before calling project creation. |
| PLATFORM-B8 | validation | Retry project creation rate limits | Resolved | v0.3 | Setup script retries transient Cloud Resource Manager 429s with backoff. |
| PLATFORM-B9 | validation | Stop on missing or failed billing link | Resolved | v0.3 | Setup script now verifies billing and stops before API enablement when billing cannot be linked. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-21 | Added build-only CI, Firebase Hosting config, and platform health check. |
| 2026-05-21 | Added hard billing verification before API enablement. |
| 2026-05-21 | Added retry/backoff for Cloud Resource Manager project creation rate limits. |
| 2026-05-21 | Added service-account project creation guard and optional resource parent support. |
| 2026-05-21 | Added initial GCP/Firebase provisioning script. |
| 2026-05-21 | Added initial in-repo platform configuration spec. |
