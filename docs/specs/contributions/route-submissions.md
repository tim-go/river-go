---
roadmap_community_feature_group: Community
roadmap_community_feature_item: Route Submissions
roadmap_community_feature_phase: Now
spec_schema: 4
maturity: Draft
---

# Route Submissions

**Work state:** Active — suggestion pipeline + **promotion into canonical `routes` shipped 2026-07-02** (PRs #57/#59: `routes` table, moderator Promote-to-section, public read API, map display, Section Favs). Remaining: per-section gauge links + "On this stretch" river-POI derivation (deferred).
**Last updated:** 2026-07-03
**Scope:** Member workflow for suggesting missing river sections, moderator workflow for adjusting existing route records and rough route traces, and promotion of approved suggestions into canonical `routes` records.

> **User-facing language:** members create and see **Sections**. `route` is
> internal schema/API vocabulary only (`route_suggestions`, `routes`, …) and
> must not appear in public UI copy.

## Purpose

Route submissions let members add candidate river sections where RiverLaunch.app does not yet have good coverage.

This is essential to the community-led model. RiverLaunch.app cannot safely map all paddleable routes centrally, and map geometry alone does not prove that a river section is suitable, accessible, or current.

**Community-origin only (decided 2026-07-02):** this workflow is the *sole*
source of sections. RiverLaunch does not seed or declare paddleable sections
itself — doing so would make RiverLaunch the author of paddleability claims,
which the liability stance (`/docs/specs/principles/no-advice-and-liability-language.md`)
rules out. The retired Wye/Tryweryn fixtures are not grandfathered in; the
catalogue starts empty and grows through members.

Route maintenance lets trusted moderators adjust any existing route, regardless of whether it began as seed data, an imported/public-source candidate, or a member-submitted route. Seeded or candidate data must not become uneditable just because it is no longer in the pending submission queue.

## Product Role

- `Primary user objective:` Suggest a missing paddling section with enough evidence for local review.
- `Moderator objective:` Correct existing route geometry and route metadata while keeping an auditable review trail.
- `Classification:` Community
- `Loop step:` Report / Verify
- `Why this matters:` The route catalogue must grow through paddlers, clubs, and trusted local contributors rather than unsafe map inference.

## References

- `/docs/strategy/community-data-strategy.md`
- `/docs/strategy/data-sources-and-gaps.md`
- `/docs/specs/discovery/public-source-seeding.md`
- `/docs/specs/discovery/river-section-map.md`
- `/docs/specs/contributions/community-contributions.md`

## Requirements

Route submission must be explicit and signed-in.

The first PWA slice should support:

- starting a `Suggest route` mode from the map
- clicking map points to trace a rough candidate route
- snapping a rough route trace to known river geometry already loaded in the app as an explicit preview/assist action
- undoing the last route point before submission
- cancelling route mode without creating data
- finishing only when at least two route points exist
- entering river name, section name, difficulty/grade, summary, access notes, and evidence/source notes
- saving the suggestion locally as a pending-review candidate
- showing saved candidate routes on the map with visual styling distinct from verified sections
- keeping candidate routes separate from canonical `RiverSection` records
- listing a member's own route suggestions under Profile
- retrying local-draft route suggestions when the API becomes available
- opening a route suggestion from Profile or Moderation so the map focuses the submitted trace

The UI must make clear that a route suggestion is not published trip advice. It should ask for paddling evidence such as a recent paddle, club/local knowledge, official trail source, venue/source reference, or partner/licensed material.

Route suggestions should not use map geometry as the authority for route existence. The rough trace is only a member-drawn sketch to help reviewers understand the candidate section.

Snap-to-river is a geometry aid only. It may prevent obviously dry-land display lines where suitable river geometry is available, but it must not imply that the section is paddleable, lawful, safe, or verified.

For route creation, the main user pattern is to pin a start location, optional
midpoints, and a finish location on the visible river line. Snap should treat
those pins as control points, align them to nearby OSM waterway geometry, and
trace the route along the waterway network between them, adding intermediate
points required for the displayed route to follow the river. The user or
moderator must be able to review the snapped preview and keep the rough trace if
the snap is not visually correct.

The route editor should let users show a `Known rivers` overlay while tracing.
This overlay renders stored watercourse reference geometry in the visible map
area so the user can tell whether the river they are trying to trace is present
in the snap dataset. The overlay should show the same OSM waterway source used
for visual snapping by default. It is an editing aid, not route evidence.

Members should be able to start a route suggestion from a searched known
waterway. This should prefill the river/waterway name, open the map with the
known-rivers overlay visible, and then use the normal route-submission evidence
flow. The waterway search result is context only and must not bypass evidence or
moderation.

Future backend behaviour should:

- persist route suggestions as authenticated member submissions
- moderate route suggestions through trusted members or contribution moderators
- support attaching photos, POIs, access notes, source references, gauge candidates, and runnable-level interpretation
- promote reviewed suggestions into canonical section records only after source and community confidence is sufficient

The backend MVP should expose:

- `POST /api/route-suggestions` for signed-in members to submit candidate routes
- `GET /api/me/route-suggestions` for members to reload their own suggestions
- `GET /api/route-suggestions/approved` for public read-only candidate route display
- `GET /api/moderation/route-suggestions` for moderators/admins to review pending route suggestions
- `POST /api/moderation/route-suggestions/:id/decision` for moderation decisions

Initial moderation decisions should be limited to approving the candidate for further catalogue work, requesting more information, rejecting, or hiding. Approval does not itself promote the suggestion.

**Promotion (specified 2026-07-02, build per `/docs/development/plan-community-sections.md`):**
a separate, explicit moderator action on an *approved* suggestion creates a
canonical `routes` record. Promotion rules:

- Promotion is a deliberate second step ("Promote to section"), never automatic
  and never bundled into the approve decision.
- The `routes` record stores its origin (`source_route_suggestion_id`), the
  submitting member, and the promoting moderator. Attribution is permanent.
- Promoted sections still present as community knowledge with evidence/source
  copy — promotion raises catalogue status, it does not certify paddleability,
  access, or safety.
- The suggestion record is kept (status `promoted`) for audit; it stops
  rendering as a candidate once the canonical section exists.
- Confidence threshold is moderator judgment against the evidence notes; no
  numeric auto-threshold for the first slice (ROUTESUB-B4 resolved).

Reviewed route suggestions may be public-visible as low-confidence `Candidate` sections in Map and Search. Candidate display should use distinct styling, low-confidence source copy, and explicit warnings that the section still needs local verification before it is treated as trip advice. Pending, needs-info, hidden, and rejected route suggestions should remain private to the submitter and moderation surfaces.

Approved candidates must remain visible to admins/moderators. They are not finished data; they are candidates that may still need trace cleanup, source checking, status changes, or later promotion. Moderators should be able to move an approved or rejected suggestion back to pending review.

The moderation area should split route edits, route suggestions, point/photo contributions, and map point corrections into separate tabs. Route edits and suggestions are strategically important enough that they should not be buried below photo or point queues, and reviewed/rejected candidate sections should remain reachable for later status changes or edit creation.

Admins and contribution moderators must be able to create route adjustment records for any existing route target:

- public candidate sections (approved suggestions)
- promoted canonical `routes` records
- ~~seeded/static section fixtures~~ (retired 2026-07-02 — no seeded sections exist)

Route adjustments should capture the target type, target id, corrected route trace, edited river/section/difficulty/access/source text, evidence notes, status, moderator identity, revision, and timestamps. Route overrides were the fixture-era publishing bridge; with fixtures retired, approved adjustments to canonical `routes` records update the route's geometry/metadata directly (with revision + audit history), and the override bridge is retired with the fixtures.

Route adjustment must support metadata-only edits as well as geometry edits. Starting an edit for an existing route should prefill the current route name, section name, difficulty, summary, access notes, and route trace, then open the details form directly. Moderators should only enter trace editing when the geometry needs changing; when they do, existing route points should be editable rather than forcing the moderator to redraw the whole route.

Pending or needs-info route suggestions should be edited in place before moderation. They must not create a separate route-adjustment record, because that makes one new route appear in both `Route suggestions` and `Route edits`. Public candidate sections may use route-adjustment records because they are already visible public route data.

Route edit moderation should show a route impact review before approval. The
first implementation may calculate this in the frontend from currently loaded
route geometry, seeded points, and loaded community contributions. It should
highlight distance changes, put-in/take-out endpoint drift, known points that
may no longer sit on the route, and known points newly near the proposed route.
This is a review aid, not a safety guarantee.

## Open Questions

- What moderation status vocabulary should route submissions share with POIs and contributions?
- What additional impact review should run before approved route adjustments update public route geometry?
- When a promoted section's suggestion evidence is later disputed, what demotion path applies (back to candidate, or hidden)?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| ROUTESUB-F1 | Signed-in route suggestion mode | Map | Active | prototype | — | Member enters route mode before tracing. |
| ROUTESUB-F2 | Rough route trace capture | Map | Active | prototype | — | Member clicks multiple points to sketch candidate route geometry. |
| ROUTESUB-F3 | Route evidence form | Map | Active | prototype | — | Captures route name, difficulty, summary, access, and evidence notes. |
| ROUTESUB-F4 | Local pending route persistence | PWA | Active | prototype | — | Client keeps local-draft fallback when the API is unavailable. |
| ROUTESUB-F5 | Backend route suggestion persistence | Backend/API | Active | MVP | — | Signed-in route suggestions are saved to PostGIS-backed API records. |
| ROUTESUB-F6 | Backend route moderation | Backend/admin | Active | MVP | — | Moderators/admins can list and decide route suggestions; promotion to canonical sections is still future work. |
| ROUTESUB-F7 | Route suggestion management | Profile/map/admin | Active | MVP | — | Members can see route suggestions and retry local drafts; moderators can open submitted routes on the map. |
| ROUTESUB-F8 | Route-focused moderation tabs | Admin/moderation | Active | MVP | — | Moderation is split into routes, point/photo contributions, and map point corrections; public candidate sections remain visible. |
| ROUTESUB-F9 | Route adjustment records | Map/admin/API | Active | MVP | — | Admins/moderators can trace corrected geometry for existing seeded/candidate routes and store it as an auditable adjustment. |
| ROUTESUB-F10 | Frontend snap-to-known-river POC | Map/route editor | Active | prototype | — | Rough traces can be snapped to known in-app river route geometry before review/save. |
| ROUTESUB-F11 | Route override publishing | API/frontend | Active | MVP | — | Approved section route adjustments publish current route geometry through route overrides without rewriting seed fixtures. |
| ROUTESUB-F12 | Route edit impact review | Admin/moderation | Active | MVP | — | Route edit cards show distance change, endpoint drift, and POI corridor impact before moderation decisions. |
| ROUTESUB-F13 | Public candidate section display | Map/search/API | Active | MVP | — | Reviewed route suggestions load through a public API and appear as low-confidence candidate sections. |
| ROUTESUB-F14 | Known rivers tracing overlay | Map/route editor | Active | MVP | — | Route creators and moderators can show stored watercourse reference geometry while tracing or editing routes. |
| ROUTESUB-F15 | OSM waterway routed snap | Map/API | Active | MVP | — | Route pins are snapped to nearby OSM waterways and expanded into a routed river trace for review. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| ROUTESUB-B1 | decision | Candidate visibility | Resolved | MVP | Pending routes stay private to the submitter and moderation surfaces; approved suggestions are visible as low-confidence public candidates. |
| ROUTESUB-B2 | dependency | Backend schema | Resolved | MVP | Canonical `routes` table specified — see `/docs/development/plan-community-sections.md`. |
| ROUTESUB-B3 | enhancement | Attach POIs during route submission | Open | Later | Let submitters add put-in/take-out/hazards/photos in one guided flow. |
| ROUTESUB-B4 | validation | Promotion rules | Resolved | MVP | Promotion is an explicit moderator action on approved suggestions; moderator judgment, no numeric auto-threshold in the first slice. |
| ROUTESUB-B5 | enhancement | Retry local drafts | Resolved | MVP | Local fallback drafts now have a `Send` action in Profile. |
| ROUTESUB-B6 | enhancement | Edit public candidate sections | Active | MVP | Admin/moderator route-adjustment records now cover existing seeded routes and public candidate sections; applying them to canonical data remains separate. |
| ROUTESUB-B7 | migration | Canonical route publishing | Active | MVP | Fixture route overrides were the first bridge; the durable path is promotion into `routes` records, after which the override bridge retires (see plan doc). |
| ROUTESUB-B8 | enhancement | Store rough and snapped traces | Open | MVP | Current POC saves the reviewed trace; backend should later persist original user trace, snapped trace, snap source, and confidence warnings separately. |
| ROUTESUB-B9 | enhancement | Backend spatial impact review | Open | MVP | Move route impact calculation to PostGIS once canonical routes and full location-owned POI reads exist. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-25 | Added route submission spec for community-created candidate sections. |
| 2026-05-25 | Defined reviewed route suggestions as public low-confidence candidate sections rather than canonical route records. |
| 2026-06-05 | Adjusted public candidate wording to avoid implying approved route guidance. |
| 2026-07-02 | Locked community-origin-only sections (no seeding; Wye/Tryweryn fixtures retired), specified the promotion workflow into canonical `routes` records, and fixed user-facing language to "Section". |
