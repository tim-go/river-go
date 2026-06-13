---
roadmap_community_feature_group: Groups
roadmap_community_feature_item: Group Paddle Sessions
roadmap_community_feature_phase: Later
spec_schema: 4
maturity: Sketch
---

# Group Paddle Sessions

**Work state:** Queued
**Last updated:** 2026-06-05
**Scope:** Clubs, friend groups, planned paddles, check-in/out, optional location sharing, ICE sharing, kit coverage, and session history.

## Purpose

Groups and sessions should help paddlers coordinate real trips without turning RiverLaunch into a safety-certification or emergency-service product.

The app can make planning, attendance, meeting points, river context, and post-paddle history easier. Any safety-related feature must be opt-in, consent-based, auditable, and clearly advisory.

## Product Role

- `Primary user objective:` Plan a paddle with known people, share relevant context, check participants in/out, and preserve useful session history.
- `Classification:` Community planning
- `Loop step:` Plan / Paddle / Remember
- `Why this matters:` Clubs and repeat paddling groups are likely to create and maintain the most valuable local river knowledge.

## References

- `/docs/specs/identity/app-shell-navigation.md`
- `/docs/specs/foundations/geospatial-domain-model.md`
- `/docs/specs/member-tools/member-profiles-and-history.md`
- `/docs/specs/foundations/data-and-sync-model.md`
- `/docs/strategy/community-model.md`

## Requirements

### Clubs And Groups

Members should eventually be able to create or join:

- clubs
- club subgroups, for example whitewater or touring
- friend groups
- temporary trip groups

Club membership should support roles such as owner, organiser, trip leader, member, and invited guest. Club affiliation shown publicly should be verified or clearly self-declared.

Club pages may later show member lists, activity level, past trips, and future trips. Public visibility should be configurable because some clubs and groups will not want open member directories or trip details.

### Trip Planning

A group/session should capture:

- title
- river, section, venue, or training ground target
- date/time
- meeting point
- planned paddle start time
- organiser/leader
- invited participants
- participant availability by day/session
- notes, parking, shuttle, accommodation, or food plans
- related river level context

Temporary trip groups can be created from club trips or friend paddles so per-trip details do not pollute the permanent club space.

Commercial booking integrations such as accommodation discounts are not part of the group-session MVP and belong in future commerce policy.

### Check-In, Check-Out, And ICE

Sessions may support participant check-in and check-out.

Expected flow:

1. Organiser creates a planned paddle.
2. Participants join or accept invite.
3. Participants explicitly share any selected emergency contact fields for this session.
4. At the meeting point or start time, participants check in.
5. The organiser may manually check a participant in/out when the participant has no phone, signal, or battery.
6. At the end, participants check out.
7. When the session ends, session-scoped ICE visibility closes.

ICE data must remain private by default. Sharing must be explicit, scoped to a trip/session, revocable before the session where practical, and auditable. V1 should not collect medical notes or health data.

### Location Sharing And SOS

Live location is sensitive and should be later than basic group planning.

Possible future modes:

- share location with active trip group only
- show last known point and timestamp
- share coordinates and what3words on an explicit help/SOS action
- show approximate paddler count on a river when users opt into community presence

The app must not silently track or broadcast member location. It should not promise rescue response, emergency dispatch, or reliable location delivery in poor-signal areas.

### Kit And Skills Advisory Checks

Group sessions may optionally use member-shared kit and skills to show advisory coverage.

Examples:

- no first aid kit shared by the group
- no throw line shared by the group
- no participant has declared first aid training
- no participant has declared whitewater safety/rescue training
- no spare paddle declared

The UI must not say a group is safe. It may say `No shared first aid kit recorded` or `Kit coverage incomplete`. Participants and leaders remain responsible for decisions.

### Session Completion

At the end of a session, members may save:

- duration
- distance where telemetry exists
- descent where reliable data exists
- rivers/sections paddled
- level/release context at time of paddle
- notes
- photos/videos
- who they paddled with
- club trip association

Telemetry and live tracking are later-phase. Manual session completion should be useful first.

## Open Questions

- Should clubs be private by default, invitation-only by default, or public with private trip details?
- Who can see session participant lists before, during, and after a trip?
- What exact consent event grants temporary ICE visibility?
- Should location sharing be group-only, organiser-only, or spectator-shareable?
- What language is needed to keep kit/skills checks clearly advisory?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GROUP-F1 | Clubs and subgroups | Groups | Queued | Later | — | Club membership, roles, activity, and optional subgroup structure. |
| GROUP-F2 | Friend and temporary groups | Groups/profile | Queued | Later | — | Private repeat groups and trip-specific temporary groups. |
| GROUP-F3 | Planned paddle sessions | Groups/map | Queued | Later | — | River/venue target, meeting point, invitees, timing, and notes. |
| GROUP-F4 | Participant availability | Groups | Queued | Later | — | Members can indicate which days/sessions they can attend. |
| GROUP-F5 | Check-in/check-out | Groups/mobile | Queued | Later | — | Participant and organiser check-in/out with session lifecycle. |
| GROUP-F6 | Session-scoped ICE sharing | Groups/profile | Queued | Later | — | Explicit consent controls temporary emergency-contact visibility. |
| GROUP-F7 | Kit and skills advisory checks | Groups/profile | Queued | Later | — | Advisory coverage prompts based on participant-shared kit/skills. |
| GROUP-F8 | Optional group location sharing | Groups/mobile | Parked | Later | — | Requires privacy design, consent, retention, and poor-signal caveats. |
| GROUP-F9 | Session completion/history | Groups/profile | Queued | Later | — | Save river, level, duration, notes, media, and club-trip association after a paddle. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| GROUP-B1 | decision | Club privacy model | Open | Later | Decide public/private defaults for clubs, member lists, trips, and activity. |
| GROUP-B2 | risk | Emergency-data consent | Open | Later | Needs explicit consent, audit, expiry, and admin access boundaries. |
| GROUP-B3 | risk | SOS expectations | Open | Later | Must not imply emergency-service monitoring or guaranteed delivery. |
| GROUP-B4 | dependency | Member profile kit/skills | Open | Later | Required before advisory coverage checks. |
| GROUP-B5 | decision | Presence visibility | Open | Later | Decide aggregate river-busy indicators vs friend/group-specific visibility. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-06-05 | Created group paddle sessions spec from Joe feedback. |
