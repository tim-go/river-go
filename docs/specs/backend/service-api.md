---
roadmap_backend_group: Backend
roadmap_backend_item: Service API
roadmap_backend_phase: Soon
spec_schema: 4
maturity: Draft
---

# Service API

**Work state:** Queued
**Last updated:** 2026-05-23
**Scope:** Backend API, auth, storage, and persistence design for River Go's community river intelligence service.

## Purpose

River Go needs a backend before it can collect real community data.

The backend should preserve the current prototype's section-first map and contribution model while moving identity, persistence, moderation, media, and provider ingestion out of the browser.

## Product Role

- `Primary user objective:` Save, review, and trust community river knowledge across sessions and devices.
- `Classification:` Core
- `Loop step:` Choose / Report / Review / Moderate
- `Why this matters:` The app's moat depends on first-party community data, which requires durable storage, identity, audit trails, and moderation.

## References

- `/docs/specs/community/community-contributions.md`
- `/docs/specs/community/trust-and-moderation.md`
- `/docs/specs/core/offline-mode.md`
- `/docs/specs/backend/data-and-sync-model.md`
- `/docs/specs/data/river-level-providers.md`
- `/docs/specs/ops/platform-configuration.md`
- `/docs/strategy/community-data-strategy.md`
- `/platform/docs/architecture.md`

## Requirements

The backend should run on Cloud Run and expose a versioned HTTP API under `/api`.

The first deployable API slice is packaged by `/api/Dockerfile`, deployed to Cloud Run by `/platform/scripts/infra/deploy-api.sh`, and connected to Cloud SQL through `CLOUD_SQL_CONNECTION_NAME` plus a Secret Manager-backed `DATABASE_URL`.

Initial endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Runtime health check. |
| `GET` | `/api/rivers` | River list. |
| `GET` | `/api/rivers/:riverId/sections` | Section list with route summaries. |
| `GET` | `/api/sections/:sectionId` | Section detail, hazards, access, features, reports, photos, and current gauge context. |
| `POST` | `/api/sections/:sectionId/contributions` | Create hazard/report/access/photo/feature contribution. |
| `POST` | `/api/contributions/:id/confirmations` | Confirm existing contribution or seeded hazard. |
| `POST` | `/api/contributions/:id/resolution` | Mark contribution resolved with evidence. |
| `POST` | `/api/photos/upload-intent` | Create controlled upload target for Firebase Storage. |
| `GET` | `/api/moderation/queue` | Moderator review queue. |
| `POST` | `/api/moderation/:id/decision` | Approve, reject, merge, or request clarification. |

Offline-aware endpoints should be added before the first serious mobile/offline release:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/offline/packs/:riverId` | Download compact river/section data for offline reading. |
| `GET` | `/api/sync/pull?since=...` | Pull changed public/community records since the client last synced. |
| `POST` | `/api/sync/push` | Push queued offline contribution operations idempotently. |
| `POST` | `/api/photos/:id/complete` | Complete a queued photo upload and attach it to a contribution. |

Auth:

- Firebase Auth verifies signed-in contributors.
- Anonymous read access is allowed for public river/section data.
- Write access requires a verified Firebase user.
- The first sync endpoint accepts Firebase bearer tokens and records the verified user as the operation actor when present.
- Backend hard enforcement of signed writes can be enabled with `REQUIRE_AUTH_FOR_WRITES=true` after staging smoke tests can provide an auth token.
- Moderator endpoints require a role claim or backend role table.

Storage:

- PostgreSQL stores rivers, sections, route geometries, access points, hazards, features, reports, moderation state, provider readings, and audit history.
- PostGIS stores and queries route and point geometry.
- Contribution tables should support client-generated IDs, idempotency keys, sync status, and revision/version metadata so offline retries do not create duplicate records.
- Firebase Storage stores uploaded photos.
- Photo metadata and moderation status live in PostgreSQL.

Provider ingestion:

- Environment Agency lookup can remain client-side for prototype only.
- Production provider adapters run server-side and cache latest readings.
- Provider records keep source URL, observed time, provider station/measure IDs, and fetch status.
- Cached provider records must expose observed/fetched timestamps and freshness state so offline clients never present stale river levels as live readings.

Moderation:

- New community hazards start as `needs-confirmation`.
- Photos and access changes require moderation before public promotion.
- Confirm/resolved actions are audited, not destructive.
- Seed data remains labelled until verified by local contributors.

## Open Questions

- Should the first backend be a single Node/Express package or a separate `api/` package in this repo?
- Which ORM or migration tool should be used for PostgreSQL/PostGIS?
- Should read endpoints serve only approved data, or include unverified data with explicit confidence labels?
- How should Firebase custom claims be managed for moderators?
- What is the first sync API slice: contribution outbox only, or full offline pack pull/push?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| API-F1 | API contract | Backend | Landed | v0.2 | — | Defines first backend endpoints and boundaries. |
| API-F2 | Firebase Auth integration | Backend/auth | Active | MVP | — | Sync endpoint can verify Firebase ID tokens and attach the verified user ID as actor; hard write enforcement is feature-flagged. |
| API-F3 | PostgreSQL/PostGIS persistence | Backend/data | Queued | MVP | — | Durable storage for river/community data. |
| API-F4 | Firebase Storage photo flow | Backend/media | Queued | MVP | — | Controlled upload intent and photo moderation. |
| API-F5 | Moderation queue | Backend/admin | Queued | MVP | — | Review and promote community data. |
| API-F6 | Provider ingestion cache | Backend/data | Queued | MVP | — | Move live river-level ingestion server-side. |
| API-F7 | Offline sync contracts | Backend/sync | Queued | MVP | — | Support client-generated IDs, idempotent pushes, pull tokens, and offline pack downloads. |
| API-F8 | Initial sync push implementation | Backend/sync | Landed | v0.3 | — | First backend slice proves `GET /api/health` and idempotent `POST /api/sync/push`. |
| API-F9 | Cloud Run deploy package | Backend/ops | Active | v0.3 | — | Adds Dockerfile and deployment support for Cloud Run plus Cloud SQL. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| API-B1 | decision | Backend package shape | Resolved | v0.3 | Use a separate in-repo `api/` package. |
| API-B2 | decision | Migration/ORM tool | Resolved | v0.3 | Use SQL migrations and `pg` first; avoid a heavy ORM until schema stabilises. |
| API-B3 | risk | Trust and liability wording | Open | MVP | Public API responses must avoid safety guarantees. |
| API-B4 | task | Define initial schema | Open | v0.3 | Create DB schema spec before migrations. |
| API-B5 | decision | Offline-friendly IDs and revisions | Open | v0.3 | Decide UUID/idempotency/revision model before first contribution persistence implementation. |
| API-B6 | task | Deploy staging API | Active | v0.3 | Blocked in current shell until `gcloud auth login` is refreshed and staging runtime DB URLs are populated. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-21 | Created backend service API spec. |
| 2026-05-22 | Added offline sync API and persistence implications. |
| 2026-05-22 | Linked initial data/sync model and backend package decisions. |
| 2026-05-23 | Added Cloud Run packaging and deployment path for the first API slice. |
| 2026-05-23 | Started Firebase Auth verification path for sync writes. |
