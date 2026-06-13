---
roadmap_core_feature_group: Core Experience
roadmap_core_feature_item: Offline Mode
roadmap_core_feature_phase: Soon
spec_schema: 4
maturity: Draft
---

# Offline Mode

**Work state:** Active
**Last updated:** 2026-05-22
**Scope:** Offline-first behaviour for reading river intelligence, capturing contributions, and syncing safely when connectivity returns.

## Purpose

RiverLaunch.app will often be used near rivers, on rural roads, at access points, and on the water where mobile signal may be weak or absent.

Offline mode is therefore a core product requirement, not a later convenience. Users must be able to take useful river information with them and capture observations while disconnected.

## Product Role

- `Primary user objective:` Use RiverLaunch.app before, during, and after a paddle even when signal disappears.
- `Classification:` Core
- `Loop step:` Choose / Navigate / Report / Sync
- `Why this matters:` The app's community-data model depends on users capturing fresh knowledge in the field; if the app fails without signal, the data loop breaks at the moment observations are most valuable.

## References

- `/docs/specs/discovery/river-section-map.md`
- `/docs/specs/contributions/community-contributions.md`
- `/docs/specs/contributions/trust-and-moderation.md`
- `/docs/specs/discovery/river-level-providers.md`
- `/docs/specs/foundations/service-api.md`
- `/docs/specs/foundations/platform-configuration.md`
- `/docs/strategy/community-data-strategy.md`

## Requirements

Offline mode should be designed in layers.

### Offline Reading

Users should be able to open previously saved river areas without connectivity.

Offline-readable data should include:

- river and section names
- route geometry
- access points
- known hazards and river features
- recent community reports that were included in the last sync
- source/confidence labels
- cached river-level readings with clear observed time and stale-state labels
- locally saved notes/contributions

River levels must never appear as live when offline. Cached readings must show the observed timestamp and an explicit stale/offline state.

### Offline Capture

Users should be able to create field observations offline.

Offline-capturable data should include:

- hazards
- access notes
- river features
- condition reports
- photos and captions
- confirmation/resolution actions against known hazards

Every offline-created object must have:

- client-generated ID
- observed timestamp
- created timestamp
- location where relevant
- associated river/section if known
- contributor identity state, if signed in before going offline
- sync status
- validation status
- local error state if sync fails

The UI must make it clear when a contribution is stored locally but not yet synced.

### Offline Map Data

The first PWA should support a modest offline data pack for selected river pilots rather than attempting national-scale offline maps.

Initial offline pack scope:

- selected river sections
- route traces
- RiverLaunch.app marker/features data
- lightweight base-map cache only where provider terms allow it

Future mobile apps should support explicit `Save for offline` flows for rivers, sections, and trips.

OpenStreetMap-derived and third-party map tiles must be treated carefully. Offline tile caching depends on provider terms, rate limits, and attribution requirements. RiverLaunch.app should prefer owning or licensing offline-friendly vector/tiles before offering large-scale offline map downloads.

### Sync

Offline data should sync when connectivity returns.

The sync model should:

- be idempotent
- tolerate repeated retries
- support partial success
- preserve local drafts after failed sync
- upload photos separately from contribution metadata
- mark server-accepted records distinctly from local drafts
- return moderation/trust state after sync
- detect stale base records where the user edited an object that changed on the server

Conflicts should be rare in the first model because most contributions append observations rather than overwrite shared records. Where conflicts happen, prefer append/merge workflows over destructive replacement.

### PWA Behaviour

The PWA should use:

- service worker caching for the app shell
- IndexedDB for structured offline data and outbox entries
- background sync where supported
- explicit foreground sync fallback where browser support is missing
- local media storage for pending photo uploads, subject to browser storage limits

The PWA should communicate storage limits and avoid promising permanent offline media storage before native mobile support exists.

### Future Native Mobile Behaviour

The native mobile app should treat offline mode as a first-class architecture:

- local durable database, likely SQLite with spatial helpers where useful
- explicit offline packs
- reliable background/foreground sync queue
- resumable photo uploads
- OS-level network awareness
- map package management
- user-visible sync history and retry controls

## Architecture Implications

Offline mode changes the backend and client architecture.

### Local-First Data Model

The client should not treat the backend as the only source of truth for in-progress work.

The app needs a local domain store for:

- cached river/section data
- cached contributions
- draft contributions
- outbox operations
- queued media uploads
- sync metadata

For the PWA, this points to IndexedDB. For native mobile, this points to SQLite or an equivalent local store.

### IDs And Mutations

Backend APIs should accept client-generated IDs for new contributions and idempotency keys for mutation requests.

This avoids duplicate contributions when a sync retry is replayed after a timeout.

Server records should track:

- `id`
- `client_id`
- `created_by`
- `created_at`
- `observed_at`
- `updated_at`
- `sync_source`
- `moderation_status`
- `revision` or equivalent version marker

### API Shape

The backend should eventually expose sync-oriented endpoints in addition to simple CRUD endpoints.

Candidate endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/offline/packs/:riverId` | Download a compact river/section data pack. |
| `GET` | `/api/sync/pull?since=...` | Pull changed river/community records since last sync. |
| `POST` | `/api/sync/push` | Submit queued offline operations idempotently. |
| `POST` | `/api/photos/upload-intent` | Create upload targets for queued photos. |
| `POST` | `/api/photos/:id/complete` | Attach uploaded media to a synced contribution. |

The first backend slice can still expose simple contribution endpoints, but request/response models should not prevent later sync endpoints.

### Media Uploads

Photos should sync in two phases:

1. Contribution metadata syncs with local photo references.
2. Photo binary upload completes through Firebase Storage or a signed upload target.

The contribution should remain pending or partially synced until required photos finish uploading.

### River-Level Freshness

River-level provider data must include:

- observed time
- fetched time
- source/provider
- freshness state
- stale/offline labels

Offline clients should render cached river levels as historical context only.

### Moderation And Trust

Offline contributions should enter the same moderation/trust pipeline as online contributions after sync.

The UI should distinguish:

- local draft
- queued for sync
- synced and pending moderation
- accepted/visible
- rejected/needs changes
- sync failed

### Product And Safety Framing

Offline mode must avoid implying safety guarantees.

The product should frame offline data as planning and community context, not a substitute for judgement, current conditions, local signage, or official warnings.

## Open Questions

- What is the smallest useful offline pack for the River Wye pilot?
- Which map tile/vector provider can RiverLaunch.app legally cache for offline use?
- Should offline packs be automatic for recently viewed sections or explicit user action only?
- How long should cached river-level data remain visible before being hidden or strongly degraded?
- How should anonymous/offline contributions work if a user signs in after creating them?
- What storage limit warnings are needed in the PWA before native mobile exists?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| OFF-F1 | Offline product requirement | Product/spec | Landed | v0.3 | — | Defines offline use as a core requirement rather than a mobile-only future feature. |
| OFF-F2 | App-shell cache | PWA | Queued | MVP | — | Cache the app shell so the PWA can reopen without connectivity. |
| OFF-F3 | Offline river data pack | Map/data | Queued | MVP | — | Save selected river/section geometry and RiverLaunch.app features for offline reading. |
| OFF-F4 | Offline contribution outbox | Community | Active | MVP | — | Add form saves queued contribution operations locally and exposes a manual sync trigger. |
| OFF-F5 | Offline photo queue | Media | Queued | MVP | — | Queue media locally and upload separately when connectivity returns. |
| OFF-F6 | Sync API model | Backend | Active | MVP | — | Idempotent push endpoint exists and frontend can manually push queued outbox operations. |
| OFF-F7 | Native offline architecture | Mobile | Parked | Mobile | — | Use this spec to guide the later native app storage/sync design. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| OFF-B1 | decision | Offline map provider/licensing | Open | MVP | Need legal and technical path for offline basemap/vector data. |
| OFF-B2 | decision | Automatic vs explicit offline packs | Open | MVP | Explicit `Save offline` is safer for storage and user expectations. |
| OFF-B3 | dependency | IndexedDB storage model | Active | MVP | First contribution outbox service uses IndexedDB with localStorage fallback. |
| OFF-B4 | dependency | Idempotent sync contracts | Open | MVP | Backend schema/API must accept client IDs and retries. |
| OFF-B5 | risk | Stale data safety | Open | MVP | Cached levels and hazards must be labelled clearly. |
| OFF-B6 | question | Anonymous offline contributions | Open | MVP | Decide whether offline drafts require prior sign-in before sync. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-22 | Created offline mode spec and architecture implications. |
| 2026-05-22 | Added first contribution outbox storage service. |
| 2026-05-22 | Wired contribution form saves into the local outbox and exposed queued status in the UI. |
| 2026-05-22 | Added manual outbox sync trigger to push queued operations to the API. |
