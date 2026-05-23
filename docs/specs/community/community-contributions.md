---
roadmap_community_feature_group: Community
roadmap_community_feature_item: Community Contributions
roadmap_community_feature_phase: Now
spec_schema: 4
maturity: Trial
---

# Community Contributions

**Work state:** Active
**Last updated:** 2026-05-23
**Scope:** The user workflow for adding first-party community river knowledge to a section or map location.

## Purpose

Community contributions are the core product workflow. Users should be able to add fresh local knowledge to a specific river section and, where relevant, a specific map location.

The contribution model should collect structured data, not loose comments.

## Product Role

- `Primary user objective:` Add useful local river knowledge after scouting, paddling, or reviewing a section.
- `Classification:` Core
- `Loop step:` Report
- `Why this matters:` River Go's defensible value is first-party community river intelligence. If contribution is confusing or too slow, the product thesis fails.

## References

- `/docs/strategy/community-data-strategy.md`
- `/docs/strategy/community-model.md`
- `/docs/specs/community/trust-and-moderation.md`
- `/docs/specs/core/river-section-map.md`
- `/docs/specs/core/offline-mode.md`
- `/src/App.tsx`
- `/src/types.ts`

## Requirements

The prototype must support:

- explicit add mode
- map click to place a contribution
- marker click to inspect an existing map object without placing a new contribution marker
- floating contribution form
- contribution type selection with distinct prompts for condition, hazard, access, photo, and feature contributions
- title
- category
- date observed
- craft type for reports/hazards
- severity for hazards
- detail text
- saved marker display
- saved marker popup
- localStorage persistence
- member sign-in status before public sync

Contribution types:

- hazard
- report
- photo
- feature
- access

Expected user flow:

1. User clicks `Add local knowledge`.
2. App enters add mode.
3. User clicks an open part of the route or map.
4. App opens a floating contribution form.
5. User chooses contribution type and fills required fields.
6. User saves.
7. Saved contribution appears on the map and section update list.

Existing seeded and saved information markers remain inspect-only, even while add mode is active. A future explicit `Add update here` action can be added inside marker popups if updating existing map objects becomes a priority.

Required fields:

- title
- detail
- date observed

Map location is required for all contribution types except section-level reports. The prototype currently allows a section midpoint fallback for demo convenience.

Offline requirements:

- users should be able to create contribution drafts without network access
- offline drafts should be visible on the map with a local/queued status
- when Firebase Auth is configured, users must sign in before syncing queued contributions
- contribution IDs should be generated client-side before sync
- sync should be retryable without duplicating the contribution
- photos should be queued separately from contribution metadata
- saved local observations should not be lost if the browser/app closes before sync

## Open Questions

- Should reports require a map location, or can they remain section-level?
- Should users choose contribution type before or after map placement?
- What contributor agreement is needed before accepting real data?
- Should serious hazards require a photo?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CON-F1 | Explicit add mode | Map/top bar | Landed | prototype | — | User must intentionally enter add mode before placing new map items. |
| CON-F2 | Map placement | Map | Landed | prototype | — | Map click selects draft contribution location. |
| CON-F3 | Marker inspection | Map | Active | prototype | — | Clicking existing seeded or saved markers opens details and does not place new draft markers. |
| CON-F4 | Floating contribution form | Map | Landed | prototype | — | Form appears over map after placement. |
| CON-F5 | Saved contribution markers | Map | Landed | prototype | — | Saved demo items persist in localStorage and render on map. |
| CON-F6 | Saved marker popups | Map | Landed | prototype | — | Saved markers show saved detail on click. |
| CON-F7 | Validation feedback | Form | Landed | prototype | — | Required fields and inline error avoid silent save failure. |
| CON-F8 | Separate contribution flows | UX | Landed | v0.2 | — | Panel actions and form prompts now separate condition, hazard, access, photo, and feature contributions. |
| CON-F9 | Authenticated contributors | Backend/auth | Active | MVP | — | Frontend Firebase Google sign-in is being introduced before real community data collection; backend enforcement remains staged. |
| CON-F10 | Photo upload | Media | Queued | MVP | — | Requires storage and moderation. |
| CON-F11 | Offline contribution outbox | PWA/mobile | Active | MVP | — | Form save writes queued sync operations locally and a manual sync action pushes them to the backend. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| CON-B1 | decision | Require map location for reports? | Open | v0.2 | Some reports are section-level; hazards/features/access should be map-specific. |
| CON-B2 | decision | Contributor agreement | Open | MVP | Need terms for first-party community data. |
| CON-B3 | enhancement | Prompt after viewing/watching a section | Open | v0.2 | Could ask users to confirm hazards or report recent conditions. |
| CON-B4 | decision | Offline sign-in requirement | Open | MVP | Decide whether users must sign in before going offline to submit later. |
| CON-B5 | enhancement | Explicit marker update action | Open | v0.2 | Add an `Add update here` action inside marker popups if users need to contribute against existing objects. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-21 | Added clearer contribution type actions and prompts for Wye pilot readiness. |
| 2026-05-22 | Added offline contribution outbox requirements. |
| 2026-05-22 | Added initial local contribution outbox storage service. |
| 2026-05-22 | Wired add-local-knowledge saves into queued local outbox records. |
| 2026-05-22 | Added manual sync for queued outbox records. |
| 2026-05-23 | Changed existing marker clicks to inspect-only; contribution placement now uses open route/map clicks. |
| 2026-05-23 | Started authenticated contributor workflow with Firebase sign-in and signed sync requests. |
| 2026-05-21 | Migrated to spec schema v4. |
