---
roadmap_community_feature_group: Members
roadmap_community_feature_item: Member Profiles And Paddle History
roadmap_community_feature_phase: Later
spec_schema: 4
maturity: Sketch
---

# Member Profiles And Paddle History

**Work state:** Queued
**Last updated:** 2026-06-05
**Scope:** Member-owned paddling history, profile stats, skills, kit inventory, public links, and personal river memories.

## Purpose

Member profiles should eventually make RiverLaunch useful after a paddle, not only before one.

The near-term profile remains account, public contributor identity, ICE, sync, points, and photos. This spec captures later member value: paddled-river history, personal notes, uploaded media, kit lists, skills, club identity, and yearly summaries.

## Product Role

- `Primary user objective:` Track rivers paddled, personal notes, photos, kit, skills, and personal progress without exposing sensitive data by default.
- `Classification:` Member experience
- `Loop step:` Remember / Contribute / Plan
- `Why this matters:` Personal history gives members a reason to return and creates structured context for future group/session planning.

## References

- `/docs/specs/identity/app-shell-navigation.md`
- `/docs/specs/contributions/photo-uploads.md`
- `/docs/specs/contributions/community-contributions.md`
- `/docs/specs/group-tools/group-paddle-sessions.md`
- `/docs/specs/foundations/data-and-sync-model.md`
- `/docs/strategy/community-model.md`

## Requirements

### Paddle History

Members should be able to record that they paddled a river, section, venue, or training ground on a date.

History records may include:

- river or venue
- section or lap area
- date and optional time
- water level or release value at the time
- craft type
- paddling partners or group/session link
- notes
- uploaded photos and videos when media support expands

Personal history should be private by default. Members may later choose to share selected activities with friends, groups, clubs, or public profile surfaces.

Example profile summaries:

- rivers paddled in Wales
- countries paddled
- most paddled river
- most paddled venue
- new rivers this year
- repeat rivers this year
- photos uploaded for a river

Annual recap or `wrapped`-style summaries may be added later. They should be opt-in, privacy-aware, and based on data the member knowingly saved or imported.

### Skills And Qualifications

Members may record paddling skills or qualifications, such as:

- first aid
- whitewater safety/rescue
- leadership/course attendance
- venue completions
- years of experience
- international paddling experience

These records should not become automated claims that a paddler is safe, competent, or suitable to lead a group. They are self-declared unless verified by a club, coach, organisation, or manual moderator workflow.

### Kit Inventory

Members may maintain a private kit list.

Example kit categories:

- boat
- paddle
- spare paddle
- buoyancy aid
- helmet
- throw line
- knife
- first aid kit
- pin kit
- shelter
- warm kit
- food/lunch
- carabiners

Custom kit entries should support name, notes, optional purchase/replacement date, optional serial/barcode/marking, and reminder dates. The app should avoid storing unnecessary high-value item identifiers publicly.

Kit data may later support group-session coverage checks, but those checks must be advisory only and based on member-confirmed sharing.

### Public Profile

The public profile surface should remain modest until moderation and privacy controls are ready.

Possible public fields:

- public contributor name
- avatar or profile image
- trusted/club contributor badges
- public contribution count or accepted contribution count
- optional Instagram, YouTube, website, or club link

Public profile links need abuse, spam, and impersonation controls before broad launch.

AI-generated avatars or headshots are parked until there is a clear privacy, consent, and moderation policy.

### Training Grounds

Training grounds such as Cardiff International White Water, HPP, Lee Valley, Tryweryn, and club bases should be recordable as venue-style activity targets.

Training-ground sessions may track:

- laps or completions
- duration
- skills practiced
- subjective notes
- water/release context where available

Training grounds may overlap with rivers. The data model should allow a session to link to either a river, route/section, venue, or multiple objects.

## Open Questions

- Should paddle history be manual-only first, or imported from GPS/Strava-style files later?
- What is the privacy model for sharing activity history with friends, clubs, and public profiles?
- Which skills or qualifications can be verified, and by whom?
- Should kit inventory remain entirely private until group-session sharing exists?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| PROFILE-F1 | Paddle history log | Profile | Queued | Later | — | Member records paddled rivers, sections, levels, dates, notes, and media. |
| PROFILE-F2 | Personal river history | Profile/river detail | Queued | Later | — | River detail can show the member's private history on that river. |
| PROFILE-F3 | Member stats and recap | Profile | Queued | Later | — | Counts, most-paddled rivers, countries, annual summaries, and progress views. |
| PROFILE-F4 | Kit inventory | Profile/groups | Queued | Later | — | Private kit list with optional reminders and future group-session sharing. |
| PROFILE-F5 | Skills and qualifications | Profile/groups | Queued | Later | — | Self-declared or verified capability icons without implying safety certification. |
| PROFILE-F6 | Public profile links/avatar | Profile/community | Parked | Later | — | Needs privacy, abuse, spam, and impersonation controls first. |
| PROFILE-F7 | Training-ground activity | Profile/venues | Queued | Later | — | Track laps, duration, skills practiced, and venue/river context. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| PROFILE-B1 | decision | Activity privacy model | Open | Later | Decide defaults and per-activity sharing before social history ships. |
| PROFILE-B2 | decision | Verification of skills | Open | Later | Distinguish self-declared skills from club/coach/organisation verification. |
| PROFILE-B3 | risk | Sensitive kit identifiers | Open | Later | Avoid exposing theft-useful serial/barcode details. |
| PROFILE-B4 | dependency | Group-session model | Open | Later | Required before kit/skills can drive group advisory checks. |
| PROFILE-B5 | risk | AI avatar moderation | Parked | Later | Needs image privacy, consent, and abuse policy before implementation. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-06-05 | Created member profile and paddle-history spec from Joe feedback. |
