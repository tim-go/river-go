---
roadmap_ops_area: Platform
roadmap_ops_group: Observability
roadmap_ops_item: Analytics And Consent
roadmap_ops_phase: Now
spec_schema: 4
maturity: Draft
---

# Analytics And Consent

**Work state:** Active
**Last updated:** 2026-05-25
**Scope:** Browser analytics, consent gating, and product event tracking for the PWA.

## Purpose

RiverLaunch.app needs lightweight product analytics so we can understand which
routes, map tools, contribution workflows, and account flows are useful during
beta.

Because the app is UK/EU-facing, browser analytics must be consent-gated.
Analytics should never be required for core use of the app.

## Product Role

- `Primary user objective:` Browse and contribute without unwanted tracking.
- `Classification:` Ops / product telemetry
- `Loop step:` Learn / Improve
- `Why this matters:` Beta decisions need evidence, but community trust depends on consent and restraint.

## References

- `/docs/specs/core/app-shell-navigation.md`
- `/docs/specs/ops/platform-configuration.md`
- `/src/services/analytics.ts`

## Requirements

Firebase Analytics is the browser analytics provider.

Analytics must:

- default to disabled/denied until the user accepts
- use `isSupported()` before initialising Firebase Analytics
- be safe in storage-restricted browsers and PWA contexts
- persist the consent decision locally
- allow users to browse as normal if they decline
- track SPA page views manually when app sections or subpages change

Initial events:

- `page_view` for Map, Search, Groups, Profile, More, and Admin surfaces
- `login`
- `sign_up`
- `select_content` for route and POI opens
- `search`
- `add_to_favorites`
- `poi_created`
- `route_suggested`
- `photo_uploaded`
- `route_level_viewed`

Backend behaviour should not be pushed through GA. Cloud Run logs, Error
Reporting, Cloud Monitoring, and later BigQuery exports should own backend
observability.

## Open Questions

- Where should a permanent analytics preference live once the app has a fuller Settings surface?
- Should production use a separate GA property from staging before public launch?

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| ANALYTICS-F1 | Firebase Analytics setup | Frontend/platform | Active | Beta | — | Browser SDK config includes measurement ID and initialises only when supported. |
| ANALYTICS-F2 | Consent-gated analytics | Frontend/privacy | Active | Beta | — | Consent defaults to denied and a banner allows users to accept or decline. |
| ANALYTICS-F3 | SPA page views | Frontend/app shell | Active | Beta | — | App-section and subpage changes emit manual `page_view` events after consent. |
| ANALYTICS-F4 | Product events | Frontend/product | Active | Beta | — | Key auth, search, route, POI, favourite, photo, and contribution events are tracked after consent. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| ANALYTICS-B1 | enhancement | Settings preference | Open | Beta | Add a persistent Settings control to review/change analytics consent. |
| ANALYTICS-B2 | task | Production GA split | Open | Launch | Confirm whether prod uses a separate Firebase/GA property before public launch. |
| ANALYTICS-B3 | validation | Event taxonomy review | Open | Beta | Review event names/params after first staging data appears in GA DebugView/Realtime. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-05-25 | Created Firebase Analytics and consent spec. |
