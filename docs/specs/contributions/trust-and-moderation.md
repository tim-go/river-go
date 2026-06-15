---
roadmap_community_feature_group: Community
roadmap_community_feature_item: Trust and Moderation
roadmap_community_feature_phase: Soon
spec_schema: 4
maturity: Buildable
---

# Trust and Moderation

**Work state:** Active
**Last updated:** 2026-06-05
**Scope:** Contribution confidence, freshness, confirmation, community validation, role-based review, and moderation behaviour.

## Purpose

Community data is only useful if users can judge freshness, confidence, and credibility. RiverLaunch.app should make trust visible without implying that a section is safe.

Moderation should not be an admin-only publishing gate. The product should make it easy for members to add useful POIs, hazards, reports, access notes, and photos, while using trust, confidence labels, community confirmation, and lightweight moderator roles to manage risk.

## Product Role

- `Primary user objective:` Decide how much confidence to place in community river knowledge.
- `Classification:` Core
- `Loop step:` Review
- `Why this matters:` RiverLaunch.app depends on community data. If useful contributions wait behind a tiny admin gate, the community loop will fail; if risky content publishes without context, the trust layer will fail.

## References

- `/docs/strategy/community-data-strategy.md`
- `/docs/strategy/community-model.md`
- `/docs/specs/contributions/community-contributions.md`
- `/docs/specs/contributions/photo-uploads.md`
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
- admin member role/trust editing
- moderation queue for admins and contribution moderators
- moderation decisions for approve, confirm, challenge, hide, reject, and resolve
- source-derived candidate POI review for imported OSM/public-source hints

Statuses:

- active
- needs-confirmation
- confirmed
- resolved

Production should add:

- contributor identity
- contributor role
- contributor trust level
- date observed
- evidence photos
- confirmation count
- dispute count
- moderator state
- stale state
- edit history
- source/confidence metadata

## Community Trust Model

The default product pattern should be community validation, not admin approval for every item.

Core flow:

1. A signed-in member contributes local knowledge.
2. The backend records contributor, type, section, location, payload, and initial moderation/visibility state.
3. Low-risk items can become visible quickly with clear labels such as `reported`, `unverified`, or `new`.
4. Other members can confirm, challenge, update, or add evidence.
5. Trusted members and community moderators can accelerate publication, hide problematic items, and resolve disputes.
6. Admins retain platform-level control, but are not the normal path for day-to-day contribution review.

Initial roles are:

- `MEMBER` can sign in and contribute local knowledge.
- `TRUSTED_MEMBER` can have lower-friction publication for low-risk contribution types and stronger confirmation weight.
- `CONTRIB_MODERATOR` can review, approve, hide, edit, merge, and resolve community contributions in assigned scopes.
- `ADMIN` can access platform-level administration, manage users/roles, and override moderation decisions.

`TRUSTED_MEMBER` is a contribution trust role, not a platform administration role. `CONTRIB_MODERATOR` should be scoped by river, region, club, or contribution type when the backend model is ready, rather than always being global.

Permissions roll up. `ADMIN` can access all contribution moderation actions that `CONTRIB_MODERATOR` can access, plus member role/trust management and platform controls.

Trust level should remain separate from role:

- `NEW` for recently joined members
- `KNOWN` for members with accepted/confirmed activity
- `TRUSTED` for members whose contributions have a strong acceptance history or offline/community validation

Role grants permission. Trust level informs default visibility, confidence, and review priority.

## Contribution Visibility

Moderation has **two independent dimensions**: a public **visibility gate** and a **review status** reason code. Keeping them separate is what makes moderation simple — the public only ever experiences visibility; the review status is the moderator's record of why.

**Visibility** — the gate (the only thing the public experiences):

- `published` — visible to everyone.
- `removed` — hidden from the public. The author still sees their own, and the record is retained for audit.

**Review status** — the moderator's reason/record (never shown publicly):

- `pending` — not yet reviewed.
- `approved` — reviewed and kept.
- `spam`, `inaccurate`, `duplicate`, `inappropriate` — removal reasons.
- `withdrawn` — removed by the author.

### Default policy: review-first, with trusted direct-publish

New contributions are **review-first** by default. A normal member's contribution starts `removed` + `pending` — not public until a moderator approves — and the author sees it labelled "Pending review".

Members who may **publish directly** — role `TRUSTED_MEMBER`, `CONTRIB_MODERATOR`, `ADMIN`, or trust level `TRUSTED` — have their contributions start `published` + `pending`: live immediately, but still reviewable. Direct-publish is granted by promoting a member in the admin directory (TRUST-F8).

### Moderator actions

The moderator surface collapses to two actions:

- **Approve** → `published` + `approved` (clears the queue).
- **Remove ▾ <reason>** → `removed` + the chosen reason.

The queue lists anything with review status `pending` — both held normal-member contributions and live trusted ones a moderator has not yet checked. Public and POI reads filter on `visibility = 'published'`; an author always sees their own regardless of visibility.

Sensitivity (hazards, access notes, privacy-sensitive photos) informs **review priority and care**, not an extra per-type gate — the uniform review-first default already holds risky content until a human looks.

The community confirmation/correction loop (confirmation counts, suggest-correction) is a **separate** dimension answering "is this accurate?", not "should this be public?".

## Community Validation

Members should be able to:

- confirm an existing contribution
- challenge an existing contribution
- add an update or evidence photo
- mark condition reports as stale or no longer applicable
- suggest resolution of hazards
- report abuse, spam, privacy issues, or access sensitivity

Trusted members should additionally be able to:

- apply stronger confirmations
- publish low-risk feature/POI/photo contributions faster
- suggest merges for duplicate POIs
- resolve low-risk stale items where there is enough evidence

Community moderators should be able to:

- approve pending photos, access notes, and disputed items
- hide or reject spam, abuse, duplicate, misleading, or privacy-sensitive items
- edit text for clarity without changing meaning
- merge duplicate POIs or hazards
- resolve hazards when evidence supports it
- request more detail from the contributor

Admin-only actions should be limited to:

- assigning/removing roles
- platform user/member management
- global policy overrides
- handling serious abuse, legal, or safety escalation
- managing system configuration

Confirmed POIs and contributions should not need to be made unconfirmed before
minor corrections can be proposed. Public trust state and edit/review state are
separate: a confirmed item can remain visible as confirmed while a member
suggests a correction, and a moderator can approve, reject, or resolve that
correction separately. Admins and contribution moderators need an explicit
override control on POI/detail surfaces so they can mark an item `confirmed`,
`needs-confirmation`, `needs-correction`/`challenged`, `hidden`, `rejected`, or
`resolved` without forcing a normal member verification workflow.

Moderation priority should be highest for:

- safety-critical hazards
- access/legal claims
- landowner disputes
- offensive content
- spam
- privacy-sensitive photos
- duplicate or misleading pins

Access notes should receive stricter moderation than ordinary features.

Source-derived candidate POIs are moderation prompts, not public paddling facts.
Moderators should be able to inspect their raw source tags, licence, source URL,
candidate type, linked river, and location before marking them `confirmed`,
`rejected`, `merged`, or back to `review_needed`. Public river views may show
aggregate candidate counts, but candidate POIs should not appear as confirmed
map features until they are promoted or merged through an auditable workflow.
The first promotion path creates a source-backed confirmed map POI when a
moderator confirms a candidate and records the promoted map POI id in candidate
metadata.

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
| TRUST-F6 | Moderation queue | Admin/backend | Landed | MVP | — | Admins and contribution moderators can view queued contributions and apply basic decisions. |
| TRUST-F7 | Contributor roles | Auth/community | Landed | MVP | — | Supports `MEMBER`, `TRUSTED_MEMBER`, `CONTRIB_MODERATOR`, and `ADMIN`; admin permissions roll up over moderation. |
| TRUST-F8 | Member role/trust editing | Admin/backend | Landed | MVP | — | Admin member directory can update role and trust level. |
| TRUST-F9 | POI status override | POI/admin | Active | MVP | — | Admins and contribution moderators can override map POI and contribution trust/status from detail surfaces without first unconfirming an item. |
| TRUST-F10 | Source candidate review | Admin/backend | Active | MVP | — | Admins and contribution moderators can review source-derived candidate POIs and mark them confirmed, rejected, merged, or back to review. |
| TRUST-F11 | Visibility gate + review status | Backend/admin | Landed | MVP | — | Two-dimension moderation: a public `published`/`removed` visibility gate plus a `pending`/`approved`/`spam`/`inaccurate`/`duplicate`/`inappropriate`/`withdrawn` review-status reason code. Moderator surface collapses to Approve / Remove ▾ reason. |
| TRUST-F12 | Trusted direct-publish | Auth/backend | Landed | MVP | — | Review-first by default; role `TRUSTED_MEMBER`/`CONTRIB_MODERATOR`/`ADMIN` or trust `TRUSTED` publish directly (`published` + `pending`), others held (`removed` + `pending`) until approved. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| TRUST-B1 | decision | Who can resolve hazards? | Open | MVP | Likely trusted contributors/moderators, with member suggestions. |
| TRUST-B2 | decision | How stale is stale? | Triaged | v0.2 | Strategy suggests 7/30 days for reports, 90 days for hazards. |
| TRUST-B3 | enhancement | Evidence photo requirement for serious hazards | Open | MVP | Could increase trust but may add contribution friction. |
| TRUST-B4 | enhancement | Scoped moderator permissions | Open | MVP | Current `CONTRIB_MODERATOR` is global; later scope by river, region, club, or contribution type. |
| TRUST-B5 | task | Candidate promotion audit | Active | MVP | First path records promotion metadata and source-backed POI payload; richer merge/edit audit remains to define. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-21 | Migrated to spec schema v4. |
| 2026-06-15 | Simplified moderation to a two-dimension model (visibility gate + review-status reason code) with a review-first default and trusted direct-publish (TRUST-F11, TRUST-F12). |
