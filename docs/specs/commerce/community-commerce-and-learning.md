---
spec_schema: 4
maturity: Sketch
---

# Community Commerce And Learning

**Work state:** Queued
**Last updated:** 2026-06-05
**Scope:** Later-phase community discovery, recommendations, marketplace, local businesses, monetisation, and beginner learning content.

## Purpose

Joe's feedback includes useful long-term product ideas that should be captured without pulling the MVP away from river data quality.

This spec parks broad community, commercial, and learning surfaces until RiverLaunch has proven its core river knowledge loop, auth, contributions, media, moderation, and river-first discovery.

## Product Role

- `Primary user objective:` Find trusted paddling people, places, kit, services, and beginner guidance once the core river intelligence product is reliable.
- `Classification:` Future expansion
- `Loop step:` Learn / Connect / Buy / Recover
- `Why this matters:` These features may create retention and revenue, but they add moderation, safety, privacy, and commercial risk.

## References

- `/docs/strategy/market-analysis.md`
- `/docs/strategy/community-data-strategy.md`
- `/docs/strategy/strategic-positioning.md`
- `/docs/specs/group-tools/group-paddle-sessions.md`
- `/docs/specs/member-tools/member-profiles-and-history.md`
- `/docs/specs/discovery/river-first-discovery.md`

## Requirements

### Community Discovery

Possible future features:

- friends list or paddler contacts
- friend activity visibility, for example currently paddling a river
- opt-in aggregate river busyness
- invite a previous paddling partner to connect
- community paddle discovery
- private messaging
- river comment/chat areas
- lost-and-found posts linked to a river

These features are high-moderation surfaces. Open chat, community ratings, and public friend-finder mechanics should not ship until abuse handling, reporting, blocking, privacy controls, and safety language are designed.

Paddler ratings or `community score` are especially risky because they can be unfair, gamed, exclusionary, or mistaken for competence certification. Keep this parked unless there is a clear trust-and-safety design.

### Recommendations

River detail pages may later recommend:

- cafes, pubs, and restaurants near take-out points
- accommodation
- instructors and coaches
- shops
- clubs and venues
- paddler-recommended services

Recommendations should be labelled by source: community recommendation, paid listing, partner offer, or editorial/curated listing. Paid placement must not look like safety or quality endorsement.

### Marketplace

A paddling-specific marketplace may be useful because generic marketplaces contain poor-fit or unsafe kit listings.

A marketplace would need:

- listing categories tailored to paddling kit
- seller identity controls
- prohibited/unsafe listing rules
- scam reporting
- moderation
- condition descriptions
- buyer/seller messaging or contact flow
- clear no-warranty/no-safety-certification language

This is not part of the MVP.

### Monetisation

Possible revenue models:

- paid premium features
- local business listings
- instructor/coach directory
- accommodation, cafe, shop, or venue partnerships
- limited advertising
- affiliate links
- club or organisation tools

Monetisation must not compromise trust in safety-relevant river data. Paid listings and ads should be visually distinct from community evidence, hazards, access notes, and river condition data.

### Beginner Learning

Beginner content may cover:

- what kit to buy first
- what to avoid buying
- types of boats and paddles
- basic river jargon such as eddy, spate, hole, line, tongue, and portage
- what to expect on a river
- how to find clubs, coaching, and introductory sessions

Learning content should steer beginners toward clubs, coaches, and appropriate supervision rather than presenting RiverLaunch as a substitute for training.

## Open Questions

- Which, if any, community discovery features are valuable without public open chat?
- What paid placement policy preserves user trust?
- Should beginner learning be editorial content, partner content, or structured community content?
- What marketplace liability and moderation model would be required?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| FUTURE-F1 | Friend/paddler list | Community/profile | Parked | Later | — | Needs privacy, blocking, and reporting controls. |
| FUTURE-F2 | Community presence | River detail/map | Parked | Later | — | Aggregate river busyness or friend activity only after opt-in location/privacy design. |
| FUTURE-F3 | River comments/chat | River detail | Parked | Later | — | High abuse/moderation risk; prefer structured reports first. |
| FUTURE-F4 | Lost and found | River detail/community | Queued | Later | — | River-linked lost kit/boat posts with contact/privacy controls. |
| FUTURE-F5 | Local recommendations | River detail | Queued | Later | — | Cafes, pubs, accommodation, instructors, shops, and clubs with clear source/paid labels. |
| FUTURE-F6 | Paddling marketplace | Marketplace | Parked | Later | — | Requires scam, safety, seller, and moderation policy. |
| FUTURE-F7 | Monetisation experiments | Product/business | Parked | Later | — | Premium features, ads, listings, partnerships, and affiliate models. |
| FUTURE-F8 | Beginner learning content | More/search | Queued | Later | — | Kit, jargon, river basics, boat types, clubs, coaching, and first steps. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| FUTURE-B1 | risk | Open community abuse | Open | Later | Chat, ratings, and public friend-finding need strong moderation and blocking. |
| FUTURE-B2 | risk | Paid placement trust | Open | Later | Paid listings must never look like safety recommendations. |
| FUTURE-B3 | decision | Beginner content ownership | Open | Later | Decide editorial vs partner vs community model. |
| FUTURE-B4 | risk | Marketplace liability | Open | Later | Define prohibited items, unsafe kit handling, and dispute boundaries. |
| FUTURE-B5 | decision | Paddler ratings | Parked | Later | Do not build until there is a defensible fairness and safety model. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-06-05 | Created future community, commerce, and learning spec from Joe feedback. |
