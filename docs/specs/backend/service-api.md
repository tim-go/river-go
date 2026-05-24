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
**Scope:** Backend API, auth, storage, and persistence design for RiverLaunch.app's community river intelligence service.

## Purpose

RiverLaunch.app needs a backend before it can collect real community data.

The backend should preserve the current prototype's section-first map and contribution model while moving identity, persistence, moderation, media, and provider ingestion out of the browser.

## Product Role

- `Primary user objective:` Save, review, and trust community river knowledge across sessions and devices.
- `Classification:` Core
- `Loop step:` Choose / Report / Review / Moderate
- `Why this matters:` The app's moat depends on first-party community data, which requires durable storage, identity, audit trails, and moderation.

## References

- `/docs/specs/community/community-contributions.md`
- `/docs/specs/community/photo-uploads.md`
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
| `GET` | `/api/me` | Upsert and return the authenticated member profile. |
| `GET` | `/api/locations/what3words?lat=...&lng=...` | Convert coordinates to a what3words address when the integration key is configured. |
| `GET` | `/api/locations/what3words?words=...` | Convert a what3words address back to coordinates for future search/share flows. |
| `GET` | `/api/me/contributions` | List the signed-in member's synced contributions with section, moderation, and photo context. |
| `GET` | `/api/me/photos` | List the signed-in member's uploaded photos with section and contribution context. |
| `GET` | `/api/admin/members` | List member profiles for admins. |
| `GET` | `/api/admin/members/:memberId` | Admin-only member detail with profile metadata, activity counts, contributions, and photos. |
| `POST` | `/api/admin/members/:memberId/access` | Admin-only update of member role and trust level. |
| `GET` | `/api/rivers` | River list. |
| `GET` | `/api/rivers/:riverId/sections` | Section list with route summaries. |
| `GET` | `/api/sections/:sectionId` | Section detail, hazards, access, features, reports, photos, and current gauge context. |
| `GET` | `/api/sections/:sectionId/contributions` | List backend-persisted community contributions for a section, including contributor summary and moderation/sync state. |
| `POST` | `/api/sections/:sectionId/contributions` | Create hazard/report/access/photo/feature contribution. |
| `POST` | `/api/contributions/:id/confirmations` | Confirm existing contribution or seeded hazard. |
| `POST` | `/api/contributions/:id/resolution` | Mark contribution resolved with evidence. |
| `DELETE` | `/api/contributions/:id` | Soft-delete a contribution when requested by its owner, an admin, or a contribution moderator. |
| `POST` | `/api/photos/upload-intent` | Create controlled upload target for Firebase Storage. |
| `DELETE` | `/api/photos/:photoId` | Soft-delete a photo when requested by its owner, an admin, or a contribution moderator. |
| `GET` | `/api/moderation/queue` | Moderator review queue. |
| `POST` | `/api/moderation/:id/decision` | Approve, reject, merge, or request clarification. |
| `GET` | `/api/moderation/contributions` | Admin/moderator contribution review queue. |
| `POST` | `/api/moderation/contributions/:id/decision` | Admin/moderator decision for contribution visibility/status. |

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
- The sync push endpoint requires a Firebase bearer token and records the verified user as the operation actor.
- Authenticated calls upsert a `members` record keyed by Firebase UID.
- Roles start with `MEMBER`, `TRUSTED_MEMBER`, `CONTRIB_MODERATOR`, and `ADMIN`; contribution moderation should not depend on platform admins for normal day-to-day review.
- `ADMIN` is assigned from the environment's `ADMIN_EMAILS` allowlist, sourced from runtime config during Cloud Run deployment.
- Moderator endpoints require a role claim or backend role table.

Storage:

- PostgreSQL stores rivers, sections, route geometries, access points, hazards, features, reports, moderation state, provider readings, and audit history.
- PostGIS stores and queries route and point geometry.
- Contribution tables should support client-generated IDs, idempotency keys, sync status, and revision/version metadata so offline retries do not create duplicate records.
- Firebase Storage stores uploaded photo binaries and generated derivatives.
- Photo metadata, relationships, moderation status, and audit fields live in PostgreSQL.
- Photo uploads should use a backend-created upload intent so Firebase Storage paths, contributor identity, section/POI/contribution attachment, and moderation state are controlled server-side.

Provider ingestion:

- Environment Agency lookup can remain client-side for prototype only.
- Production provider adapters run server-side and cache latest readings.
- Provider records keep source URL, observed time, provider station/measure IDs, and fetch status.
- Cached provider records must expose observed/fetched timestamps and freshness state so offline clients never present stale river levels as live readings.

Location references:

- Google Maps outbound links are generated client-side from latitude/longitude and do not require a server key.
- what3words lookups run server-side through `/api/locations/what3words` so the API key is not exposed in the browser build.
- Contribution sync may enrich point payloads with `what3wordsAddress` when the integration key is configured; lookup failure must not block contribution persistence.
- Existing point contributions can be enriched by an operator-run backfill. The backfill stores `what3wordsAddress` in the existing contribution JSONB payload and should be run with `--dry-run` first against staging/prod.

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
| API-F4 | Firebase Storage photo flow | Backend/media | Active | MVP | v0.4 | MVP persists photo metadata during contribution sync after browser-side Firebase Storage upload; separate upload intent/completion endpoints remain queued. |
| API-F5 | Moderation queue | Backend/admin | Landed | MVP | — | Admins and contribution moderators can list queued contributions and apply approve/confirm/challenge/hide/reject/resolve decisions. |
| API-F6 | Provider ingestion cache | Backend/data | Queued | MVP | — | Move live river-level ingestion server-side. |
| API-F7 | Offline sync contracts | Backend/sync | Queued | MVP | — | Support client-generated IDs, idempotent pushes, pull tokens, and offline pack downloads. |
| API-F8 | Initial sync push implementation | Backend/sync | Landed | v0.3 | — | First backend slice proves `GET /api/health` and idempotent `POST /api/sync/push`. |
| API-F9 | Cloud Run deploy package | Backend/ops | Active | v0.3 | — | Adds Dockerfile and deployment support for Cloud Run plus Cloud SQL. |
| API-F10 | Member identity API | Backend/auth | Active | MVP | — | Adds `/api/me`, member upsert, and admin member list endpoint. |
| API-F11 | Contribution readback API | Backend/API | Landed | MVP | — | Implements `GET /api/sections/:sectionId/contributions` for the persisted contribution loop. |
| API-F12 | Member access management API | Backend/admin | Landed | MVP | — | Admins can update member role and trust level. |
| API-F13 | Photo management API | Backend/media | Active | MVP | — | Supports member photo listing and owner/moderator soft-delete. |
| API-F14 | Member contribution management API | Backend/community | Active | MVP | — | Supports member contribution listing and owner/moderator soft-delete. |
| API-F15 | what3words location API | Backend/integration | Active | MVP | — | Server-side coordinate/address conversion with optional sync-time contribution enrichment. |

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
