---
roadmap_community_feature_group: Community
roadmap_community_feature_item: Photo Uploads
roadmap_community_feature_phase: Soon
spec_schema: 4
maturity: Draft
---

# Photo Uploads

**Work state:** Active
**Last updated:** 2026-06-05
**Scope:** The signed-in workflow, storage model, moderation state, and offline handling for member-uploaded river photos.

## Purpose

Photos are a core part of RiverLaunch.app community knowledge. They help paddlers recognise access points, hazards, river features, water-level references, and recent conditions before they travel.

Photo upload must be structured. A photo should attach to a river, section, POI, feature, or contribution, not exist as a loose gallery item.

## Product Role

- `Primary user objective:` Add useful visual evidence for a river section, access point, hazard, feature, or condition report.
- `Classification:` Core
- `Loop step:` Report / Review
- `Why this matters:` Community photos make local knowledge inspectable and trustworthy, especially where official data does not explain what a level or hazard means for paddling.

## References

- `/docs/strategy/community-data-strategy.md`
- `/docs/specs/contributions/community-contributions.md`
- `/docs/specs/contributions/trust-and-moderation.md`
- `/docs/specs/foundations/offline-mode.md`
- `/docs/specs/foundations/service-api.md`
- `/docs/specs/foundations/data-and-sync-model.md`
- `/docs/specs/foundations/platform-configuration.md`

## Requirements

Photo upload is a signed-in action. Signed-out users may view public photos, but they cannot save photo contributions.

Photos should be accepted through three product surfaces:

- river or section detail: `Add photo` for broad river/section context, access, or level reference images
- POI detail: `Add photo` for a specific hazard, access point, bridge, feature, or gauge location
- contribution flow: `photo` contribution type for a new map-located observation

The user flow should be:

1. Signed-in user opens a section, POI, or add-info flow.
2. User chooses or captures a photo.
3. Client strips sensitive EXIF metadata through browser canvas re-encoding and compresses/resizes the image before upload.
4. Client uploads display and thumbnail derivatives to Firebase Storage under a signed-in-user path.
5. Client stores uploaded photo metadata in the contribution sync payload.
6. Backend verifies Firebase Auth during contribution sync and persists contribution-scoped photo metadata.
7. Backend marks the photo metadata `pending` for moderation.
8. UI shows the photo on the related contribution and section photo grid with contributor, caption, source, date, and moderation state where relevant.

Feature-specific photos should live inside the same POI/feature detail surface as the feature description. Each feature should support one pinned/main image for quick recognition plus a chronological photo list. Members should be able to add a new photo from the feature detail surface without creating a duplicate feature marker.

Photo capture date should be preferred over upload date when available and safe. The UI should clearly distinguish `taken` from `uploaded` so historic photos do not look like fresh observations.

Where a photo can be linked to a relevant observation station, release source, or stored level reading, the backend should store the nearest known water level/release context at or near the photo's `taken_at` time. The app may then display context such as `River Dee - Town Falls, taken 2026-01-01, level 0.57 m` when the source and match confidence are clear.

Users should eventually be able to filter feature/river photos by river level bands, for example a target value with tolerance such as `0.5 m +/- 0.2 m`. This is a planning aid and must show source, timestamp, and uncertainty.

Video uploads may be useful for features, hazards, playspots, and training venues, but they are parked until still-photo upload, moderation, storage cost, transcoding, and privacy workflows are stable.

The first implementation uses contribution sync as the metadata persistence path rather than a separate upload-intent endpoint. Separate upload-intent and completion endpoints remain the target shape before wider public launch.

Required photo metadata:

- authenticated member
- river section ID
- optional river/watercourse ID
- optional POI ID
- optional feature ID when features become first-class POIs
- optional contribution ID
- storage path
- thumbnail or derivative path
- caption
- taken/observed date where available
- upload date
- optional linked level/release context and match confidence
- optional map location
- moderation status
- original filename and client media metadata only when needed for diagnostics

Storage rules:

- binary images live in Firebase Storage or a compatible Google Cloud Storage bucket
- PostgreSQL stores photo metadata, relationships, moderation state, and audit data
- photos are never stored directly in PostgreSQL
- storage paths should avoid exposing user email addresses or original filenames
- generated derivatives should include at least a thumbnail and a display-sized image before public launch

Moderation rules:

- moderation queues must show attached photo thumbnails or previews before a moderator can approve, confirm, challenge, hide, or reject the contribution
- contribution-level moderation decisions must update attached photo visibility metadata so an approved photo contribution becomes visible in route, section, and POI details
- signed-in members must be able to list their own uploaded photos, return to the related map section, and delete photos they uploaded
- admins and contribution moderators must have an override delete/hide action for any uploaded photo during review or later operational cleanup
- public and member-visible photo thumbnails, including map popup thumbnails, should open an in-app image viewer: full-screen on mobile and a large contained viewer on desktop
- photo deletion should be a soft delete in the MVP: hide public metadata and retain audit/storage references until a separate retention/deletion policy exists
- when the only photo on a `photo` contribution is deleted, the parent contribution should also be hidden from public section/POI views
- access-point photos and hazard evidence can become public after light moderation or trusted-member promotion
- privacy-sensitive images, faces, number plates, private land, signage, and disputed access locations need stricter review
- rejected photos should remain auditable but not public
- users should be able to request deletion of their own uploads
- admins should be able to hide/remove public photos and inspect metadata

Offline rules:

- photo metadata can be queued with the contribution outbox while offline
- the image binary should be stored locally only as a pending upload, subject to PWA storage limits
- the contribution remains partially synced until required photos finish uploading
- failed uploads must be retryable without creating duplicate photo metadata
- the PWA should warn users before relying on offline media storage for long periods

The MVP browser implementation requires network connectivity for photo binary upload. Offline binary queueing remains queued because it needs IndexedDB blob retention, retry UX, and storage quota warnings.

## API Shape

Initial backend endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/photos/upload-intent` | Create an authenticated photo record and return a controlled upload target. |
| `POST` | `/api/photos/:id/complete` | Mark an uploaded photo complete and attach it to the relevant section, POI, or contribution. |
| `GET` | `/api/sections/:sectionId/photos` | Return public and member-visible photos for a section. |
| `GET` | `/api/pois/:poiId/photos` | Return public and member-visible photos for a POI. |
| `GET` | `/api/me/photos` | Return the signed-in member's uploaded photos with contribution and section context. |
| `DELETE` | `/api/photos/:photoId` | Soft-delete a photo when requested by its owner, an admin, or a contribution moderator. |
| `POST` | `/api/photos/:id/moderation` | Admin/moderator decision for photo visibility. |

The first implementation may fold section/POI photo retrieval into section detail responses if separate endpoints are premature.

## Data Shape

Photo metadata should extend the existing `contribution_photos` idea into a general media table or related tables before public launch.

Minimum table shape:

| Column | Purpose |
| --- | --- |
| `id` | Photo metadata ID. |
| `member_id` | Authenticated uploader. |
| `section_id` | Related section. |
| `river_id` | Related river/watercourse when available. |
| `poi_id` | Related POI when the photo is marker-specific. |
| `contribution_id` | Related contribution when uploaded as evidence. |
| `pinned_for_poi` | Whether this is the selected main photo for the linked POI/feature. |
| `storage_path` | Private/original storage object path. |
| `thumbnail_path` | Thumbnail storage object path. |
| `display_path` | Display-sized storage object path. |
| `display_url` | Download URL for the display derivative in the Firebase Storage MVP. |
| `thumbnail_url` | Download URL for the thumbnail derivative in the Firebase Storage MVP. |
| `width`, `height` | Display derivative dimensions. |
| `thumbnail_width`, `thumbnail_height` | Thumbnail derivative dimensions. |
| `size_bytes`, `thumbnail_size_bytes` | Derivative object sizes. |
| `mime_type` | Browser-generated derivative content type. |
| `caption` | User-provided description. |
| `geometry` | Optional map location. |
| `taken_at` | Date/time photo was taken when available and safe. |
| `level_context` | Optional JSON/source fields for linked level, release, station, timestamp, tolerance, and confidence. |
| `created_at` | Server upload record time. |
| `moderation_status` | `pending-upload`, `uploaded`, `moderation-pending`, `visible`, `rejected`, or `hidden`. |
| `payload` | JSON metadata for client hints, dimensions, mime type, moderation notes, and processing state. |

Soft-deleted photos should keep their storage paths and audit metadata but move to `hidden` moderation state. Physical deletion from Firebase Storage needs a later retention and audit policy.

## Open Questions

- Should the first public launch use pre-moderation for all photos, or allow trusted members to publish immediately?
- Should POIs become first-class backend records before photo upload, or should first upload attach only to sections and contributions?
- What maximum upload size and client-side compression target should be used for mobile users?
- Should photo thumbnails be generated client-side first, server-side later, or through a storage trigger?
- What contributor licence text is required before accepting real public photos?
- How close in time must a level/release reading be before it can be shown beside a photo?
- Should members or moderators choose pinned/main feature photos, or should the app use trust/moderation rules?
- When should video upload become worth the storage, transcoding, and moderation complexity?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| PHOTO-F1 | Signed-in photo action | Section/POI/detail | Landed | MVP | v0.4 | Photo contribution save requires signed-in user. |
| PHOTO-F2 | Controlled upload intent | Backend/storage | Queued | MVP | — | Separate upload intent remains queued; MVP controls Storage path client-side with Firebase Auth rules and persists metadata during contribution sync. |
| PHOTO-F3 | Photo metadata persistence | Backend/data | Landed | MVP | v0.4 | PostgreSQL stores contribution-scoped photo paths, URLs, dimensions, sizes, contributor, status, and metadata. |
| PHOTO-F4 | Firebase Storage binary upload | Storage | Landed | MVP | v0.4 | Browser uploads resized display and thumbnail objects to Firebase Storage. |
| PHOTO-F5 | Photo display in details | UI | Landed | MVP | v0.4 | Section updates, section photo grid, and POI detail panels show uploaded contribution photos. |
| PHOTO-F6 | Photo moderation | Admin | Landed | MVP | v0.4 | Moderation queue shows attached photo previews before decision, and decisions update contribution and photo visibility metadata. |
| PHOTO-F7 | Offline photo queue | PWA/mobile | Queued | MVP | — | Queue metadata and pending binary upload when the user is offline. |
| PHOTO-F8 | Browser image processing | PWA | Landed | MVP | v0.4 | Browser resizes selected photos to display and thumbnail JPEG derivatives before upload. |
| PHOTO-F9 | Member photo management | Profile/backend | Active | MVP | — | Members can list uploaded photos, jump to the map section, and soft-delete their own uploads. |
| PHOTO-F10 | Moderator photo delete override | Admin/backend | Active | MVP | — | Admins and contribution moderators can soft-delete uploaded photos during review. |
| PHOTO-F11 | Feature photo sets | POI/detail | Queued | MVP | — | Feature/POI details support pinned main image plus chronological photo list and add-photo action. |
| PHOTO-F12 | Level-linked photo metadata | Backend/media | Queued | Later | — | Store linked level/release context near photo taken time for useful river-condition comparison. |
| PHOTO-F13 | Photo level filtering | River/POI detail | Queued | Later | — | Filter river/feature photos by target level with tolerance and source-confidence display. |
| PHOTO-F14 | Video uploads | Media | Parked | Later | — | Revisit after photo storage, moderation, costs, and privacy are stable. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| PHOTO-B1 | decision | Moderation default | Open | MVP | Decide pre-moderation vs trusted-member instant publish. |
| PHOTO-B2 | decision | Image derivatives | Resolved | MVP | MVP generates display and thumbnail derivatives in the browser; server-side generation remains a later hardening option. |
| PHOTO-B3 | risk | Privacy-sensitive media | Open | MVP | Need admin guidance and contributor copy for people, plates, private land, and access disputes. |
| PHOTO-B4 | dependency | Contributor licence | Open | MVP | Required before accepting real public uploads. |
| PHOTO-B5 | dependency | POI backend model | Open | MVP | Needed for clean POI-specific photo attachment. |
| PHOTO-B6 | decision | Physical storage deletion | Open | MVP | Define retention/audit rules before deleting Firebase Storage objects. |
| PHOTO-B7 | decision | Level match tolerance | Open | Later | Decide station relevance and time-window rules for photo-level context. |
| PHOTO-B8 | decision | Pinned photo ownership | Open | MVP | Decide who can choose a main feature photo and how disputes/moderation work. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-23 | Created photo upload workflow, storage, moderation, and offline spec. |
| 2026-06-05 | Added feature photo sets, pinned photos, taken-date/level context, level filtering, and parked video uploads from Joe feedback. |
