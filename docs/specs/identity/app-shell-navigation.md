---
roadmap_core_feature_group: Core App
roadmap_core_feature_item: App Shell Navigation
roadmap_core_feature_phase: Now
spec_schema: 4
maturity: Draft
---

# App Shell Navigation

**Work state:** Active
**Last updated:** 2026-05-25
**Scope:** Primary app-section navigation across web, PWA, and future mobile app shells.

## Purpose

RiverLaunch.app needs a consistent app information architecture that works on desktop web, mobile web/PWA, and a later native mobile app.

The app should keep the map as the primary working surface while making search, saved places, profile, and secondary tools reachable from a stable navigation model.

## Product Role

- `Primary user objective:` Move between the main app sections without losing the river map workflow.
- `Classification:` Core
- `Loop step:` Browse / Choose / Contribute
- `Why this matters:` A community river app needs repeatable navigation before it can expand beyond a single map demo.

## References

- `/docs/specs/discovery/river-section-map.md`
- `/docs/specs/contributions/community-contributions.md`
- `/docs/specs/foundations/service-api.md`
- `/src/App.tsx`

## Requirements

Primary app sections:

- `Map`
- `Search`
- `Groups`
- `Profile`
- `More`

Admins should also see a role-gated `Admin` section on desktop. On mobile/PWA, admin should be reached from `More` rather than taking a primary bottom-tab slot.

Desktop and larger tablet layouts should use a persistent left navigation rail/sidebar. The sidebar may collapse to icon-only form.

Mobile and PWA layouts should use a bottom tab bar for the same primary sections. `Map` should be the first bottom-tab item because browsing the river map is the primary entry point; `Search` remains a helper for targeted lookup.

Branding should be present without delaying startup. When auth resolves and no user is signed in, the app should show a single shared account sheet with explicit `Create account`, `Sign in`, and `Continue as guest` paths. The same sheet should be used when signed-out users try account-only actions, with a brief contextual note explaining that the attempted action needs an account while browsing can continue as guest. On mobile/PWA viewports, this account sheet should cover the full viewport rather than appearing as a small centered modal. Continuing as guest dismisses the startup sheet for the current browser/PWA session using session storage, so refreshes and sign-out in the same session do not immediately re-show it. The desktop nav and secondary mobile surfaces such as `Profile` and `More` should carry compact RiverLaunch.app branding while the map header stays contextual.

Account creation and sign-in should be separate mental models in the UI. Both paths should support Google and email/password Firebase Auth. Account creation should explain that accounts enable favourites, local knowledge, photo uploads, and sync. Sign-in should include email/password, Google, and password reset. Email/password account creation should align with Firebase password policy, with a minimum 12-character client-side check and plain-language guidance that three unrelated words are easier to remember and harder to guess.

Anonymous users may browse the map, search, route details, POIs, photos, levels, and navigation links. Savable actions require sign-in, including favourites, add local knowledge, add photo, sync, admin, and future offline packs.

Production builds, including staging and production hosting, should use Firebase redirect sign-in so browser popup blockers do not prevent Google OAuth. Local development on localhost or private LAN hosts should use popup sign-in even when the copied staging Firebase config uses redirect for hosted builds.

Desktop navigation should include a compact account footer. Signed-in users should see their account label, role, and a route to `Profile`; signed-out users should see `Guest` state and a sign-in action. The account footer should collapse to an icon-only affordance with the desktop nav rail.

The `Map` section remains the default first view and contains the river map, section list, selected-section panel, contribution workflow, and map-specific controls. Over time, the map should behave as a browse-first surface: users can pan and zoom around the wider catalogue, then selecting a visible river/section enters section-detail context.

The existing river section list is contextual map content, not global app navigation. Section context means a selected working river stretch for detail, contributions, photos, offline packs, and moderation; it should be entered by selecting a river/section from map or search, not treated as a prerequisite for simply browsing the map.

Global header actions should be minimal. Map-specific actions such as compact sync state, watch section, and add local knowledge should only appear while the `Map` section is active. Demo reset tools belong in the admin `System` area so they are not confused with personal account controls.

Transient success feedback, such as profile saves, should use a dismissible app-level notification that auto-expires. Form/API errors should stay close to the form or admin surface that needs user attention rather than being reused as global status messages.

The map action strip should remain compact. Sync should be represented as an icon/status button with a badge when local changes are queued, not as persistent explanatory text. Manual sync should only matter when local changes exist or a sync retry is needed.

`Search` should include a `Favourites` subpage/tab for signed-in saved routes. Favourites are a discovery shortcut, not a primary bottom-nav section.

`Groups` should be a placeholder primary section for future group activity planning. The placeholder should make clear that it will be used for arranging paddling activities, including trip plans, member coordination, meeting points, and activity updates.

`Profile` should show signed-in member state, role, trust level, local contribution counts, and sync controls as soon as member identity exists. Profile should be split into focused subpages/tabs so account identity, public contributor identity, emergency contact, sync state, and member-owned content management do not become one long account page.

Initial Profile subpages:

- `Account`
- `Public`
- `ICE`
- `Sync`
- `Points`
- `Photos`

`My Account` should distinguish between:

- private account identity from Firebase/Auth, such as verified email and provider display name
- public contributor identity shown beside public contributions
- private emergency information for future group-session use

The public contributor name should be editable by the member and used for publicly visible contributions instead of real name or email. It should be treated as moderated profile content: unique enough to reduce confusion, screened for profanity/offensive terms, rate-limited for changes, and reviewable/reportable by moderators. Until the moderation model is implemented, default public names should be conservative, for example `RiverLaunch member` plus a short generated suffix rather than an email-derived name.

When a member creates an account with an explicit display name, the backend may use that as the initial public contributor name if it passes the public-name validation rules. Existing member rows with a missing public name should be backfilled on the next authenticated profile load.

ICE / in-case-of-emergency data should live in `Profile` as private, explicit opt-in data. V1 ICE data should be limited to emergency contact name, phone, and relationship. The app should not collect medical conditions, allergies, medication, disabilities, fitness notes, or free-text health/support notes in V1. ICE data should not be public and should not appear on contributions. Future `Groups` features may allow a member to share selected emergency-contact fields with confirmed participants or group leaders for a specific trip/session. Sharing must be consent-based, revocable, auditable, and clearly labelled with who can see it.

Member identity should not be persistently shown in the global header because it consumes high-value map and mobile space. Identity and sign-in/out controls belong in `Profile`.

`More` should contain secondary tools such as admin entry, settings, offline packs, and future support/feedback surfaces.

Settings should include explicit map preferences, starting with an opt-in live-location toggle. The map may also expose a compact location button that enables live location or recentres to the latest browser location when the setting is already active.

`Search` should support both river/section discovery and location-reference lookup using explicit modes/tabs so mobile users are not forced through a long mixed workflow. Location-reference lookup should accept coordinates and what3words addresses, resolve them to a map point, show a direct open-point action, and show clearly labelled nearby points of interest only when they are plausibly nearby in the current catalogue. Opening a nearby POI from Search should zoom to that existing POI on the map rather than creating a separate searched-location marker. Search should not silently switch map context or start contribution capture without a user action on the map.

Admin tools should remain role-gated and should not appear for ordinary members. Admin should be its own section with an index of admin options. Each option should open a separate full-page admin surface with breadcrumb navigation back to the Admin index, starting with `Members` and later expanding to moderation, reports, data quality, and system status.

The member directory should support search plus role/trust filtering. Directory rows should behave like a scannable list with identity, role/trust summary, and a `View` action only. Role, trust, approval/status controls, signup dates, activity counts, contribution lists, and photo lists belong on a separate member-detail admin page.

Member-detail admin pages should allow admins to inspect account metadata, update role/trust controls, review contribution and photo counts, and jump from a contribution or photo row to the related map object where the item has a known section/location.

## Open Questions

- Should favourites include watched rivers only, or also offline packs and recently viewed sections?
- Should `Search` become a full discovery map/filter surface or a list-first river finder?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| NAV-F1 | Desktop app navigation | Web shell | Active | prototype | — | Persistent left nav with collapsible icon rail. |
| NAV-F2 | Mobile bottom tabs | PWA/mobile shell | Active | prototype | — | Bottom tabs mirror primary app sections. |
| NAV-F3 | Profile section | Member shell | Active | prototype | — | Uses focused tabs for Account, Public, ICE, Sync, Points, and Photos so account state is separate from owned content. |
| NAV-F4 | Placeholder sections | Search/groups/more | Active | prototype | — | Lightweight placeholders preserve the final information architecture, including future Groups. |
| NAV-F5 | Account-gated favourite sections | Search/favourites | Active | prototype | — | Star prompts signed-out users to sign in; signed-in favourites remain local in the prototype until backend persistence exists. |
| NAV-F6 | Shared account and guest sheet | App shell/auth | Active | prototype | — | Signed-out startup and protected-action prompts use the same sheet with create account, sign in, and continue as guest paths. |
| NAV-F7 | Desktop account footer | Desktop shell/auth | Active | prototype | — | Desktop nav shows signed-in account context or signed-out sign-in affordance without using map header space. |
| NAV-F13 | Account creation and sign-in flow | App shell/auth | Active | MVP | — | Auth sheet separates Create account and Sign in paths, with Google and email/password options plus password reset. |
| NAV-F8 | Location-reference search | Search/map | Active | prototype | — | Search accepts coordinates or what3words, shows nearby points of interest, and opens map context by explicit action. |
| NAV-F9 | Live-location setting | More/map shell | Active | prototype | — | More exposes an opt-in live-location setting; Map exposes a compact enable/recentre action. |
| NAV-F10 | Groups primary section | Groups | Active | future placeholder | — | Bottom nav includes Groups as the future activity-planning surface. |
| NAV-F11 | Admin member detail pages | Admin/members | Active | MVP | — | Member directory is a simple list; detailed member metadata, access controls, contributions, and photos live on a per-member admin page. |
| NAV-F12 | Profile safety and public identity | Profile/groups | Active | MVP | — | Profile exposes Strava-style public contributor name and private V1 emergency contact fields; future group sharing remains queued. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| NAV-B1 | decision | Top bar responsibility | Resolved | v0.3 | Keep identity in `Profile`; show map-specific action strip only on `Map`. |
| NAV-B2 | enhancement | Durable favourites model | Open | MVP | Move signed-in favourites from browser localStorage into member-backed backend data. |
| NAV-B3 | enhancement | Search and discovery | Open | MVP | Connect search to river/section discovery, filters, and grade/runnability state. |
| NAV-B4 | decision | ICE sharing consent model | Open | MVP | V1 stores emergency contact only; decide who can see it during a group activity and how consent/revocation/audit should work. |
| NAV-B5 | risk | Public-name moderation | Open | MVP | Need profanity/offensive-name controls, reporting, change limits, and moderator override before relying on user-chosen public names. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-23 | Added initial app shell navigation spec. |
| 2026-05-23 | Added signed-out startup welcome sheet and sign-in requirement for savable actions. |
| 2026-05-24 | Added opt-in browser live-location setting and map action. |
| 2026-05-24 | Moved favourites into Search, added Groups nav placeholder, and split Profile into tabs. |
| 2026-05-24 | Added Profile public contributor name and V1 emergency-contact-only ICE model. |
| 2026-05-25 | Added account creation and sign-in flow requirements for Google and email/password Firebase Auth. |
