---
roadmap_core_feature_group: Core App
roadmap_core_feature_item: App Shell Navigation
roadmap_core_feature_phase: Now
spec_schema: 4
maturity: Draft
---

# App Shell Navigation

**Work state:** Active
**Last updated:** 2026-05-23
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

- `/docs/specs/core/river-section-map.md`
- `/docs/specs/community/community-contributions.md`
- `/docs/specs/backend/service-api.md`
- `/src/App.tsx`

## Requirements

Primary app sections:

- `Search`
- `Map`
- `Favourites`
- `Profile`
- `More`

Admins should also see a role-gated `Admin` section on desktop. On mobile/PWA, admin should be reached from `More` rather than taking a primary bottom-tab slot.

Desktop and larger tablet layouts should use a persistent left navigation rail/sidebar. The sidebar may collapse to icon-only form.

Mobile and PWA layouts should use a bottom tab bar for the same primary sections.

Branding should be present without delaying startup. When auth resolves and no user is signed in, the app should show a welcome sheet with `Sign in` and `Continue as guest`. Continuing as guest dismisses the sheet for the current browser/PWA session using session storage, so refreshes and sign-out in the same session do not immediately re-show it. The desktop nav and secondary mobile surfaces such as `Profile` and `More` should carry compact RiverLaunch.app branding while the map header stays contextual.

Anonymous users may browse the map, search, route details, POIs, photos, levels, and navigation links. Savable actions require sign-in, including favourites, add local knowledge, add photo, sync, admin, and future offline packs.

Production builds, including staging and production hosting, should use Firebase redirect sign-in so browser popup blockers do not prevent Google OAuth. Development builds may use popup sign-in for faster testing unless explicitly configured to use redirect.

Desktop navigation should include a compact account footer. Signed-in users should see their account label, role, and a route to `Profile`; signed-out users should see `Guest` state and a sign-in action. The account footer should collapse to an icon-only affordance with the desktop nav rail.

The `Map` section remains the default first view and contains the river map, section list, selected-section panel, contribution workflow, and map-specific controls.

The existing river section list is contextual map content, not global app navigation.

Global header actions should be minimal. Map-specific actions such as compact sync state, watch section, reset demo data, and add local knowledge should only appear while the `Map` section is active.

The map action strip should remain compact. Sync should be represented as an icon/status button with a badge when local changes are queued, not as persistent explanatory text. Manual sync should only matter when local changes exist or a sync retry is needed.

`Profile` should show signed-in member state, role, trust level, local contribution counts, and sync controls as soon as member identity exists.

Member identity should not be persistently shown in the global header because it consumes high-value map and mobile space. Identity and sign-in/out controls belong in `Profile`.

`More` should contain secondary tools such as admin entry, settings, offline packs, and future support/feedback surfaces.

`Search` should support both river/section discovery and location-reference lookup using explicit modes/tabs so mobile users are not forced through a long mixed workflow. Location-reference lookup should accept coordinates and what3words addresses, resolve them to a map point, show a direct open-point action, and show clearly labelled nearby points of interest only when they are plausibly nearby in the current catalogue. Opening a nearby POI from Search should zoom to that existing POI on the map rather than creating a separate searched-location marker. Search should not silently switch map context or start contribution capture without a user action on the map.

Admin tools should remain role-gated and should not appear for ordinary members. Admin should be its own section with an index of admin options. Each option should open a separate full-page admin surface with a link back to the Admin index, starting with `Members` and later expanding to moderation, reports, data quality, and system status.

The member directory should support search plus role/trust filtering. Member rows should keep identity, role, trust, and access controls visually grouped so role/trust editing remains clear on desktop and mobile.

## Open Questions

- Should `Favourites` include watched rivers only, or also offline packs and recently viewed sections?
- Should `Search` become a full discovery map/filter surface or a list-first river finder?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| NAV-F1 | Desktop app navigation | Web shell | Active | prototype | — | Persistent left nav with collapsible icon rail. |
| NAV-F2 | Mobile bottom tabs | PWA/mobile shell | Active | prototype | — | Bottom tabs mirror primary app sections. |
| NAV-F3 | Profile section | Member shell | Active | prototype | — | Shows member identity, role, trust, local contribution count, and sync state. |
| NAV-F4 | Placeholder sections | Search/more | Active | prototype | — | Lightweight placeholders preserve the final information architecture. |
| NAV-F5 | Account-gated favourite sections | Map/favourites | Active | prototype | — | Star prompts signed-out users to sign in; signed-in favourites remain local in the prototype until backend persistence exists. |
| NAV-F6 | Signed-out welcome sheet | App shell/auth | Active | prototype | — | Welcome sheet appears on signed-out startup and explains guest browsing versus account-backed save/contribute actions. |
| NAV-F7 | Desktop account footer | Desktop shell/auth | Active | prototype | — | Desktop nav shows signed-in account context or signed-out sign-in affordance without using map header space. |
| NAV-F8 | Location-reference search | Search/map | Active | prototype | — | Search accepts coordinates or what3words, shows nearby sections, and opens a searched-location marker on the map by explicit action. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| NAV-B1 | decision | Top bar responsibility | Resolved | v0.3 | Keep identity in `Profile`; show map-specific action strip only on `Map`. |
| NAV-B2 | enhancement | Durable favourites model | Open | MVP | Move signed-in favourites from browser localStorage into member-backed backend data. |
| NAV-B3 | enhancement | Search and discovery | Open | MVP | Connect search to river/section discovery, filters, and grade/runnability state. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-23 | Added initial app shell navigation spec. |
| 2026-05-23 | Added signed-out startup welcome sheet and sign-in requirement for savable actions. |
