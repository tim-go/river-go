---
roadmap_backend_group: Backend
roadmap_backend_item: Data And Sync Model
roadmap_backend_phase: Soon
spec_schema: 4
maturity: Draft
---

# Data And Sync Model

**Work state:** Active
**Last updated:** 2026-05-23
**Scope:** Backend persistence and offline sync data model for community contributions, media metadata, and idempotent client operations.

## Purpose

RiverLaunch.app needs a data model that supports offline-first contribution capture without losing the benefits of PostgreSQL/PostGIS queries.

The model should combine structured relational columns for identity, sync, moderation, timestamps, and geometry with JSONB payloads for contribution-type-specific data that will evolve as the community model matures.

## Product Role

- `Primary user objective:` Capture river knowledge in the field, sync it safely later, and see trustworthy moderation state.
- `Classification:` Core
- `Loop step:` Report / Sync / Review
- `Why this matters:` Offline observations are only useful if retries do not duplicate data and if the backend can still query, moderate, and map the records reliably.

## References

- `/docs/specs/core/offline-mode.md`
- `/docs/specs/backend/service-api.md`
- `/docs/specs/backend/observation-ingestion.md`
- `/docs/specs/community/community-contributions.md`
- `/docs/specs/community/photo-uploads.md`
- `/docs/specs/community/trust-and-moderation.md`
- `/docs/specs/ops/platform-configuration.md`

## Requirements

The persistence model should use:

- PostgreSQL for durable records
- PostGIS for spatial fields and river/location queries
- JSONB for contribution-specific payloads
- SQL migrations for schema changes
- client-generated UUIDs for offline-created entities
- operation IDs for idempotent sync retries
- durable member records keyed by Firebase UID before public contribution collection

## Contribution Object

The client contribution object should remain JSON-shaped so the PWA IndexedDB model and later native SQLite model can share the same envelope.

```json
{
  "id": "client-generated-uuid",
  "type": "hazard",
  "sectionId": "wye-hay-to-hereford",
  "geometry": {
    "type": "Point",
    "coordinates": [-2.7123, 52.0521]
  },
  "observedAt": "2026-05-22T10:30:00Z",
  "payload": {
    "title": "Tree across river right",
    "detail": "Passable river left at medium levels",
    "severity": "medium",
    "craftTypes": ["canoe", "kayak"]
  },
  "client": {
    "deviceId": "local-device-id",
    "createdOffline": true,
    "appVersion": "0.1.0"
  }
}
```

Relational columns should be used for fields that the backend must query, index, moderate, or use for sync.

JSONB payloads should be used for flexible, type-specific contribution detail.

## Sync Operation Envelope

Clients should push changes as operation envelopes rather than raw row inserts.

```json
{
  "operationId": "client-generated-operation-uuid",
  "operationType": "contribution.create",
  "entityType": "contribution",
  "entityId": "client-generated-contribution-uuid",
  "createdAt": "2026-05-22T10:35:00Z",
  "baseRevision": null,
  "payload": {
    "id": "client-generated-contribution-uuid",
    "type": "hazard",
    "sectionId": "wye-hay-to-hereford",
    "geometry": {
      "type": "Point",
      "coordinates": [-2.7123, 52.0521]
    },
    "observedAt": "2026-05-22T10:30:00Z",
    "payload": {
      "title": "Tree across river right",
      "detail": "Passable river left at medium levels"
    }
  }
}
```

The backend must treat `operationId` as an idempotency key. Replaying the same operation must return the same accepted result without creating another contribution.

## Initial Tables

### `members`

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid primary key` | Internal member ID used by RiverLaunch.app records. |
| `firebase_uid` | `text unique not null` | Stable Firebase Auth user identifier. |
| `email` | `text` | Latest verified email from Firebase token claims. |
| `display_name` | `text` | Latest display name from Firebase token claims. |
| `public_name` | `text` | Member-chosen public contributor name used on public contributions instead of real name or email. |
| `public_name_status` | `text` | Moderation state for public name, for example `pending`, `active`, `rejected`, or `admin-set`. |
| `photo_url` | `text` | Latest profile photo URL from Firebase token claims. |
| `role` | `text` | `MEMBER`, `TRUSTED_MEMBER`, `CONTRIB_MODERATOR`, or `ADMIN`. |
| `trust_level` | `text` | Contribution trust state such as `NEW`, `KNOWN`, or `TRUSTED`. |
| `created_at` | `timestamptz` | First time the member was seen. |
| `updated_at` | `timestamptz` | Last profile update time. |
| `last_seen_at` | `timestamptz` | Last authenticated API call. |

### `member_emergency_profiles`

Emergency profile data is sensitive and should be separated from ordinary public profile fields.

V1 should store emergency contact details only. Do not collect health or medical information in this table until there is a specific legal, privacy, consent, and operational reason to do so.

| Column | Type | Purpose |
| --- | --- | --- |
| `member_id` | `uuid primary key references members(id)` | Owner member. |
| `emergency_contact_name` | `text` | Primary ICE contact name. |
| `emergency_contact_phone` | `text` | Primary ICE contact phone. |
| `emergency_contact_relationship` | `text` | Relationship to the member. |
| `visibility_default` | `text` | Default sharing posture, initially `private`; future group-session sharing must be explicit. |
| `updated_at` | `timestamptz` | Last profile edit time. |

ICE data must not be returned in public member summaries or public contribution responses. It should only be returned to the owner, admins with a defined support need, or future authorised group/session participants according to an explicit consent record.

### `contributions`

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid primary key` | Server-visible contribution ID, generated by client for offline records. |
| `client_id` | `text` | Optional client/device scoped ID for diagnostics. |
| `section_id` | `text` | River section association when known. |
| `type` | `text` | Contribution type: hazard, report, photo, feature, access. |
| `geometry` | `geometry(Geometry, 4326)` | Point/line/polygon location for map and proximity queries. |
| `observed_at` | `timestamptz` | When the observation happened. |
| `created_at` | `timestamptz` | Server creation time or supplied client creation time where safe. |
| `created_by` | `text` | Contributor identity, nullable until Firebase Auth is wired. |
| `member_id` | `uuid` | Authenticated member reference when available. |
| `moderation_status` | `text` | `reported`, `pending`, `needs-confirmation`, `confirmed`, `challenged`, `hidden`, `rejected`, `resolved`, or later states. Moderator decisions include an explicit return-to-`needs-confirmation` path so a confirmed item does not need a destructive edit workflow before review. |
| `sync_status` | `text` | Server-side sync acceptance state. |
| `sync_source` | `text` | `online`, `offline-pwa`, `offline-mobile`, or similar. |
| `revision` | `bigint` | Monotonic revision for later pull sync/conflict detection. |
| `payload` | `jsonb` | Type-specific contribution detail. |

### `sync_operations`

| Column | Type | Purpose |
| --- | --- | --- |
| `operation_id` | `uuid primary key` | Idempotency key. |
| `operation_type` | `text` | Operation kind, starting with `contribution.create`. |
| `entity_type` | `text` | Target entity type. |
| `entity_id` | `uuid` | Target entity ID. |
| `actor_id` | `text` | Authenticated user or null for pre-auth prototype. |
| `actor_member_id` | `uuid` | Authenticated RiverLaunch.app member ID when available. |
| `base_revision` | `bigint` | Revision the client acted on, null for creates. |
| `received_at` | `timestamptz` | Server receive time. |
| `payload` | `jsonb` | Original operation payload. |
| `result_status` | `text` | `accepted`, `duplicate`, `failed`, or later states. |
| `result_payload` | `jsonb` | Stable response payload for idempotent replay. |

### `contribution_photos`

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid primary key` | Photo metadata ID. |
| `contribution_id` | `uuid` | Parent contribution. |
| `storage_path` | `text` | Firebase Storage path or future media store path. |
| `thumbnail_path` | `text` | Thumbnail storage path when generated. |
| `display_path` | `text` | Display-sized storage path when generated. |
| `display_url` | `text` | Download URL for display derivative in the current Firebase Storage MVP. |
| `thumbnail_url` | `text` | Download URL for thumbnail derivative in the current Firebase Storage MVP. |
| `mime_type` | `text` | Browser-generated derivative content type. |
| `width`, `height` | `integer` | Display derivative dimensions. |
| `thumbnail_width`, `thumbnail_height` | `integer` | Thumbnail derivative dimensions. |
| `size_bytes`, `thumbnail_size_bytes` | `bigint` | Derivative object sizes. |
| `caption` | `text` | User caption. |
| `status` | `text` | `pending-upload`, `uploaded`, `moderation-pending`, `accepted`, `rejected`. |
| `payload` | `jsonb` | Flexible media metadata. |

The first public photo implementation may replace or extend this contribution-scoped table with a more general photo metadata table if section-level and POI-level photos need to exist without a parent contribution. The durable product workflow is defined in `/docs/specs/community/photo-uploads.md`.

### `map_pois`

Seeded and curated map points should be stored separately from community contributions. They are catalogue objects that users can verify, correct, or discuss; they are not themselves first-party observations by a member.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `text primary key` | Stable seed/catalogue POI ID, usually scoped as `section-id:source-id`. |
| `section_id` | `text not null` | River section association. |
| `kind` | `text` | `access`, `hazard`, `feature`, or `gauge`. |
| `geometry` | `geometry(Point, 4326)` | Map location. |
| `title` | `text` | Display title. |
| `subtitle` | `text` | Short type/metadata label. |
| `summary` | `text` | Display summary. |
| `source_*` | `text` | Seed/provider/source metadata and confidence. |
| `verification_status` | `text` | `needs-confirmation`, `confirmed`, `needs-correction`, or `resolved`. |
| `payload` | `jsonb` | Type-specific seed metadata, including what3words when available. |
| `revision` | `bigint` | Monotonic revision for client refreshes. |

### `map_poi_reviews`

Member review actions for seed/catalogue POIs should be audited separately from the source POI record.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid primary key` | Review action ID. |
| `poi_id` | `text references map_pois(id)` | Reviewed POI. |
| `member_id` | `uuid references members(id)` | Reviewing member. |
| `decision` | `text` | `confirm` or `correction`. |
| `note` | `text` | Optional correction context. |
| `created_at` | `timestamptz` | Review time. |

Observation provider tables are defined in `/docs/specs/backend/observation-ingestion.md`.
They deliberately sit outside the contribution sync tables because provider
readings are scheduled backend imports rather than user-authored offline
operations.

### `route_suggestions`

Route suggestions are member-authored candidate sections. They are not canonical
river sections and should not be mixed into the trusted section catalogue until
moderation, source checks, and local/community review are complete.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid primary key` | Route suggestion ID. |
| `member_id` | `uuid references members(id)` | Submitting member. |
| `status` | `text` | `pending_review`, `needs_info`, `approved`, `rejected`, or `hidden`; approved candidates remain admin-visible until promoted or hidden. |
| `river_name` | `text` | Submitted river name. |
| `section_name` | `text` | Submitted section name, normally put-in to take-out. |
| `difficulty` | `text` | Submitted grade/difficulty text pending review. |
| `summary` | `text` | Submitted route summary. |
| `access_notes` | `text` | Submitted access/parking/portage notes. |
| `evidence` | `text` | Paddling, club, official source, venue, or local knowledge evidence. |
| `route` | `geometry(LineString, 4326)` | Member-sketched rough route trace for review. |
| `payload` | `jsonb` | Flexible route-submission metadata. |
| `created_at`, `updated_at`, `revision` | timestamps/bigint | Audit and future sync state. |

### `route_adjustments`

Route adjustments are moderator-authored edits against an existing route target.
They allow seeded/static sections, imported/public-source candidates, approved
route suggestions, and future canonical route records to be corrected without
silently overwriting the source record.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid primary key` | Route adjustment ID. |
| `member_id` | `uuid references members(id)` | Admin or contribution moderator who created the edit. |
| `target_type` | `text` | Existing route target kind, initially `section` or `route_suggestion`. |
| `target_id` | `text` | Stable ID of the route being adjusted. |
| `status` | `text` | `pending_review`, `needs_info`, `approved`, `rejected`, or `hidden`. |
| `river_name`, `section_name`, `difficulty` | `text` | Edited display/grade metadata proposed for the target route. |
| `summary`, `access_notes`, `evidence` | `text` | Edited route summary, access notes, and source/evidence notes. |
| `route` | `geometry(LineString, 4326)` | Corrected route trace for review or later publishing. |
| `payload` | `jsonb` | Flexible route-edit metadata. |
| `created_at`, `updated_at`, `revision` | timestamps/bigint | Audit and future sync state. |

## Initial API Behaviour

The first implementation should include:

- `GET /api/health`
- `POST /api/sync/push`
- SQL migration runner
- local PostGIS support through `npm run db:local:up`

`POST /api/sync/push` should accept a batch of operations:

```json
{
  "operations": []
}
```

The first supported operation is `contribution.create`.

The response should report accepted and failed operations separately:

```json
{
  "accepted": [
    {
      "operationId": "uuid",
      "entityId": "uuid",
      "status": "accepted",
      "revision": 1
    }
  ],
  "failed": []
}
```

## Implementation Plan

The next implementation slice should persist member contributions across sessions and devices before adding photo upload or richer moderation tools.

### Phase 1: Backend-Persisted Contributions

Goal: a signed-in member can add local knowledge, sync it to the backend, refresh the app or use another device, and still see the contribution.

Tasks:

1. Extend API serialization so contribution rows can be returned to the frontend with `id`, `sectionId`, `type`, `geometry`, `payload`, `observedAt`, `createdAt`, `moderationStatus`, `syncStatus`, `revision`, and contributor summary.
2. Add a read endpoint for backend contributions, initially scoped by section:
   - `GET /api/sections/:sectionId/contributions`
3. Ensure `POST /api/sync/push` requires Firebase Auth for real writes and always links accepted contributions to the authenticated member.
4. Apply initial moderation defaults by contribution type:
   - `report`: `reported`
   - `feature`: `reported`
   - `hazard`: `needs-confirmation`
   - `access`: `pending`
   - `photo`: `pending`
5. Return accepted contribution state from sync so the frontend can replace local queued status with backend state.
6. Update frontend load/merge behaviour:
   - load backend contributions for the active section
   - merge with local queued/failed records
   - avoid duplicate display when a local outbox record has synced
   - show state labels such as `Queued`, `Reported`, `Needs confirmation`, and `Pending review`
7. Add backend/API tests or smoke checks proving idempotent create, authenticated member linkage, section readback, and duplicate retry behaviour.

This phase deliberately does not include photo binary upload, admin moderation screens, or full pull-sync/offline-pack support.

### Phase 2: Trust Roles And Review Controls

Goal: avoid an admin-only bottleneck while keeping sensitive content controlled.

Tasks:

1. Migrate member role constraints to support `MEMBER`, `TRUSTED_MEMBER`, `CONTRIB_MODERATOR`, and `ADMIN`.
2. Keep `trust_level` separate from role and support at least `NEW`, `KNOWN`, and `TRUSTED`.
3. Add admin-only member role/trust editing in the existing admin member area.
4. Add moderator read permissions for pending/challenged contribution queues.
5. Add approve, hide, reject, challenge, and confirm actions for moderators/admins.

### Phase 3: Photo Upload

Goal: support signed-in photo evidence once normal contribution persistence works.

Tasks:

1. Extend `contribution_photos` to support contribution-scoped display/thumbnail metadata.
2. Upload display and thumbnail binaries to Firebase Storage from the PWA.
3. Persist uploaded photo metadata through contribution sync.
4. Add separate `POST /api/photos/upload-intent` and `POST /api/photos/:id/complete` endpoints before wider public launch if Storage path control needs to move fully server-side.
5. Display photo thumbnails in section and POI details.
6. Add photo moderation states and admin/moderator actions.

### Phase 4: Pull Sync And Offline Packs

Goal: support poor-signal usage beyond manual outbox push.

Tasks:

1. Add revision-based `GET /api/sync/pull`.
2. Add compact offline pack downloads.
3. Reconcile local queued, synced, hidden, rejected, and changed records.
4. Add storage warnings and retry UX for large offline media uploads.

## Open Questions

- Which validation library should own runtime API validation as the schema grows?
- Should contribution `type` become an enum table or remain constrained text for the first MVP?
- What exact revision model should pull sync use once updates/deletes exist?
- Should rejected offline contributions remain visible locally after moderation feedback?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| SYNC-F1 | Hybrid contribution schema | Backend/data | Landed | v0.3 | — | Relational identity/query fields plus JSONB payload. |
| SYNC-F2 | Sync operation envelope | Backend/sync | Landed | v0.3 | — | Idempotent operation model for offline retries. |
| SYNC-F3 | Initial SQL migrations | Backend/data | Landed | v0.3 | — | PostGIS-backed schema plus app-user grants for contribution sync. |
| SYNC-F4 | Sync push endpoint | Backend/API | Landed | v0.3 | — | Accepts authenticated `contribution.create` operations, stores member linkage, and is called by manual frontend sync. |
| SYNC-F5 | Photo metadata schema | Backend/media | Queued | MVP | — | Metadata table exists before binary upload flow is implemented; must support section, POI, and contribution attachment. |
| SYNC-F6 | Member identity schema | Backend/auth | Active | MVP | — | Members are keyed by Firebase UID and linked to synced contributions. |
| SYNC-F7 | Community trust roles | Backend/auth | Landed | MVP | — | Extends member role/trust model for `TRUSTED_MEMBER` and `CONTRIB_MODERATOR` without relying on `ADMIN` for normal contribution review. |
| SYNC-F8 | Contribution readback API | Backend/API | Landed | MVP | — | Phase 1 read endpoint returns backend contributions by section for frontend load/merge. |
| SYNC-F9 | Frontend backend contribution merge | Frontend/sync | Landed | MVP | — | Phase 1 frontend merges backend contributions with local queued outbox records and shows moderation/sync labels. |
| SYNC-F10 | Public identity and ICE schema | Backend/profile | Active | MVP | — | Adds member public-name fields and a private emergency-contact-only profile table. |
| SYNC-F11 | Route adjustment schema | Backend/data | Active | MVP | — | Adds auditable route-edit records for seeded/current routes before canonical publishing is automated. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| SYNC-B1 | decision | Runtime validation library | Open | v0.3 | Hand-written validation is acceptable for first slice; revisit before API expands. |
| SYNC-B2 | decision | Pull sync revision model | Open | MVP | Required before offline packs can incrementally update. |
| SYNC-B3 | task | Firebase Auth actor binding | Resolved | MVP | HTTP sync writes require Firebase Auth and link accepted contributions to member rows. |
| SYNC-B4 | task | IndexedDB outbox implementation | Open | MVP | Client-side peer to the sync operation envelope. |
| SYNC-B5 | task | Phase 1 persisted contribution loop | Resolved | MVP | Backend section readback, authenticated sync writes, moderation defaults, smoke readback, and frontend merge are implemented. |
| SYNC-B6 | task | Phase 2 trust roles and moderation controls | Resolved | MVP | Migration, admin role/trust editing, moderation queue, and basic moderation decisions are implemented. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-23 | Added app-user table and sequence grants for deployed sync API runtime. |
| 2026-05-23 | Added implementation plan for backend-persisted contributions, trust roles, photo upload, and pull sync sequencing. |
| 2026-05-23 | Implemented Phase 1 backend-persisted contribution loop. |
| 2026-05-22 | Created backend data and sync model spec. |
| 2026-05-22 | Added first API package, SQL migration, and idempotent sync push smoke test. |
| 2026-05-22 | Wired frontend manual sync to the sync push endpoint. |
| 2026-05-24 | Added public contributor name and emergency-contact-only ICE schema. |
