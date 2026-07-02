# Spec Consolidation Map

## Purpose

This map helps locate the owning spec for RiverLaunch.app work. If a durable change does not fit one of these specs, create or update the nearest owning spec before implementation.

Specs are grouped by the product tier model (see `/docs/strategy/feature-register.md`), not by engineering layer.

## Current Specs

### Discovery

| Area | Owning Spec | Notes |
| --- | --- | --- |
| River-first discovery | `/docs/specs/discovery/river-first-discovery.md` | River-led overview markers, selected-river context, river pages, nearby river lists, and route/section wording migration. |
| River section map | `/docs/specs/discovery/river-section-map.md` | Map, river/section list, route traces, markers, selected-river context, and section panel. |
| Canonical river database | `/docs/specs/discovery/canonical-river-database.md` | Multi-source canonical river identities, source-owned imports, source links, and candidate POI extraction. |
| Public source seeding | `/docs/specs/discovery/public-source-seeding.md` | Source register, licence/permission classification, public reference handling, and candidate route seeding workflow. |
| River level providers | `/docs/specs/discovery/river-level-providers.md` | EA-first provider model and future backend ingestion. |
| Water quality | `/docs/specs/discovery/water-quality.md` | Sewage-spill status (National Storm Overflow Hub) and bathing-water classifications tied to put-ins/reaches, presented as risk context under the no-advice principle. |
| River Wye seed data | `/docs/specs/discovery/river-wye-seed-data.md` | Wye pilot sections, seed geometry, and validation status. |
| River Tryweryn seed data | `/docs/specs/discovery/river-tryweryn-seed-data.md` | Tryweryn dam-release demo sections, route geometry, release context, and validation status. |
| UK kayaking sample catalogue | `/docs/specs/discovery/uk-kayaking-sample-catalogue.md` | Prototype catalogue of well-known UK paddling rivers for discovery, search, favourites, and map browsing. |
| Nearby amenities and emergency points | `/docs/specs/discovery/nearby-amenities-and-emergency-points.md` | Later-phase toilets/facilities and emergency points (defibrillators, hospitals, payphones) near paddleable rivers, with proximity filtering and source/freshness labelling. |

### Identity

| Area | Owning Spec | Notes |
| --- | --- | --- |
| App shell navigation | `/docs/specs/identity/app-shell-navigation.md` | Desktop sidebar, mobile bottom tabs, primary app sections, account/sign-in, public name, and ICE store. The contribution on-ramp (known-member identity) lives here. |

### Contributions

| Area | Owning Spec | Notes |
| --- | --- | --- |
| Community contributions | `/docs/specs/contributions/community-contributions.md` | Add mode, saved contributions, status, and contribution UX. |
| Photo uploads | `/docs/specs/contributions/photo-uploads.md` | Signed-in photo upload workflow, media storage, metadata, moderation, and offline upload queue. |
| Trust and moderation | `/docs/specs/contributions/trust-and-moderation.md` | Confirmation, resolution, staleness, moderation rules. |
| Community-sourced sections (route submissions) | `/docs/specs/contributions/route-submissions.md` | Member-created candidate river sections, rough route traces, evidence capture, and moderation/promotion. Demoted: a contribution type, not a primary surface. |

### Member tools

| Area | Owning Spec | Notes |
| --- | --- | --- |
| Member profiles and paddle history | `/docs/specs/member-tools/member-profiles-and-history.md` | Paddled-river history, member stats, kit, skills, training grounds, public links, and profile privacy. |

### Group tools

| Area | Owning Spec | Notes |
| --- | --- | --- |
| Group paddle sessions | `/docs/specs/group-tools/group-paddle-sessions.md` | Clubs, friend groups, planned paddles, check-in/out, session-scoped ICE, advisory kit/skills checks, private messaging, and session history. |

### Commerce

| Area | Owning Spec | Notes |
| --- | --- | --- |
| Community, commerce, and learning | `/docs/specs/commerce/community-commerce-and-learning.md` | Recommendations, marketplace, monetisation, local business, and beginner education. Bundles social + commerce + learning; split when items are scheduled (private messaging → group tools). |

### Foundations

| Area | Owning Spec | Notes |
| --- | --- | --- |
| Backend service API | `/docs/specs/foundations/service-api.md` | Cloud Run API, Firebase Auth, PostGIS persistence, media, and moderation boundaries. |
| Backend data and sync model | `/docs/specs/foundations/data-and-sync-model.md` | Hybrid relational/JSONB schema, offline sync envelope, idempotency, and initial contribution persistence. |
| Observation ingestion | `/docs/specs/foundations/observation-ingestion.md` | Generic provider-backed stations, measures, readings, scheduled ingestion, and monitoring for levels, flow, rainfall, tide/sea, and release data. |
| Core geospatial domain model | `/docs/specs/foundations/geospatial-domain-model.md` | Decoupled model for watercourses, routes, POIs, observations, photos, reports, groups/sessions, and relationships. |
| Offline mode | `/docs/specs/foundations/offline-mode.md` | Offline reading, offline contribution capture, local storage, sync, and future mobile offline architecture. |
| Platform configuration | `/docs/specs/foundations/platform-configuration.md` | In-repo Firebase/GCP configuration, publishing targets, and operational scripts. |
| Analytics and consent | `/docs/specs/foundations/analytics-and-consent.md` | Firebase Analytics, consent gating, SPA page views, and product event tracking. |
| Seed data operations | `/docs/specs/foundations/seed-data-operations.md` | Operator runbook for required seed datasets, refresh cadence, staging validation, and recovery. |
| Prototype delivery state | `/docs/specs/foundations/demo-prototype.md` | Current demo scope and delivery log. |

### Principles

| Area | Owning Spec | Notes |
| --- | --- | --- |
| No-advice and liability language | `/docs/specs/principles/no-advice-and-liability-language.md` | Canonical no-advice / no-safety-guarantee wording rules; referenced by discovery and contribution specs. |

## Strategy References

| Topic | Strategy Doc |
| --- | --- |
| Feature register (tiered inventory) | `/docs/strategy/feature-register.md` |
| Product concept | `/docs/strategy/product-brief.md` |
| Market position | `/docs/strategy/market-analysis.md` |
| Community model | `/docs/strategy/community-model.md` |
| Community data strategy | `/docs/strategy/community-data-strategy.md` |
| Data sources and gaps | `/docs/strategy/data-sources-and-gaps.md` |
| Public seed source register | `/docs/strategy/public-seed-source-register.md` |
| River Wye pilot | `/docs/strategy/river-wye-pilot-plan.md` |
| Wye seed dataset | `/docs/strategy/river-wye-seed-dataset.md` |
| Roadmap | `/docs/strategy/roadmap.md` |
| Delivery plan | `/docs/strategy/delivery-plan.md` |
| Wye feedback template | `/docs/product/wye-pilot-feedback-template.md` |

## When To Add A New Spec

Add a new spec when:

- the feature has its own user workflow
- the feature introduces a new data model or external integration
- multiple implementation tasks will depend on the same behaviour
- the decision needs to survive a future rewrite

Do not add a new spec for a tiny visual tweak unless it belongs to a broader surface spec.
