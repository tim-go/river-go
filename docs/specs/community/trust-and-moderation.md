---
roadmap_community_feature_group: Community
roadmap_community_feature_item: Trust and Moderation
roadmap_community_feature_phase: Soon
spec_schema: 4
maturity: Draft
---

# Trust and Moderation

**Work state:** Active
**Last updated:** 2026-05-21
**Scope:** Contribution confidence, freshness, confirmation, resolution, and moderation behaviour.

## Purpose

Community data is only useful if users can judge freshness, confidence, and credibility. River Go should make trust visible without implying that a section is safe.

## Product Role

- `Primary user objective:` Decide how much confidence to place in community river knowledge.
- `Classification:` Core
- `Loop step:` Review
- `Why this matters:` River Go depends on community data. Without visible trust and moderation, the data layer will decay or become risky.

## References

- `/docs/strategy/community-data-strategy.md`
- `/docs/strategy/community-model.md`
- `/docs/specs/community/community-contributions.md`
- `/src/types.ts`
- `/src/App.tsx`

## Requirements

The prototype supports lightweight trust actions:

- confirm seeded hazard
- resolve seeded hazard
- confirm user-added hazard
- resolve user-added hazard
- status display
- confirmation count
- last confirmed text

Statuses:

- active
- needs-confirmation
- confirmed
- resolved

Production should add:

- contributor identity
- contributor role
- date observed
- evidence photos
- confirmation count
- dispute count
- moderator state
- stale state
- edit history
- source/confidence metadata

Initial roles:

- `MEMBER` can sign in and contribute local knowledge.
- `ADMIN` can access the admin area and view/manage platform-level user/member data.
- `CONTRIB_ADMIN` is reserved for future contribution moderation workflows, such as reviewing hazards, access notes, disputes, and stale content.

Moderation priority should be highest for:

- safety-critical hazards
- access/legal claims
- landowner disputes
- offensive content
- spam
- privacy-sensitive photos
- duplicate or misleading pins

Access notes should receive stricter moderation than ordinary features.

## Open Questions

- Who can resolve hazards?
- What status changes require moderator review?
- Should serious hazards require photo evidence?
- How should stale reports be calculated and displayed?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| TRUST-F1 | Hazard status display | Section panel | Landed | prototype | — | Shows status, confirmation count, and last confirmed text. |
| TRUST-F2 | Confirm seeded hazard | Section panel | Landed | prototype | — | Stored in localStorage. |
| TRUST-F3 | Resolve seeded hazard | Section panel | Landed | prototype | — | Stored in localStorage. |
| TRUST-F4 | Confirm/resolve user hazard | Section panel | Landed | prototype | — | Supports localStorage demo contributions. |
| TRUST-F5 | Staleness rules | Data/model | Queued | v0.2 | — | Use current community strategy defaults. |
| TRUST-F6 | Moderation queue | Admin/backend | Queued | MVP | — | Required before public community launch. |
| TRUST-F7 | Contributor roles | Auth/community | Active | MVP | — | Start with `MEMBER` and `ADMIN`; reserve `CONTRIB_ADMIN` for contribution moderation. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| TRUST-B1 | decision | Who can resolve hazards? | Open | MVP | Likely trusted contributors/moderators, with member suggestions. |
| TRUST-B2 | decision | How stale is stale? | Triaged | v0.2 | Strategy suggests 7/30 days for reports, 90 days for hazards. |
| TRUST-B3 | enhancement | Evidence photo requirement for serious hazards | Open | MVP | Could increase trust but may add contribution friction. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-21 | Migrated to spec schema v4. |
