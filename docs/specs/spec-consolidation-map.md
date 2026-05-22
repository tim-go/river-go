# Spec Consolidation Map

## Purpose

This map helps locate the owning spec for River Go work. If a durable change does not fit one of these specs, create or update the nearest owning spec before implementation.

## Current Specs

| Area | Owning Spec | Notes |
| --- | --- | --- |
| Prototype delivery state | `/docs/specs/release/demo-prototype.md` | Current demo scope and delivery log. |
| River section map | `/docs/specs/core/river-section-map.md` | Map, section list, route traces, markers, and section panel. |
| Offline mode | `/docs/specs/core/offline-mode.md` | Offline reading, offline contribution capture, local storage, sync, and future mobile offline architecture. |
| Community contributions | `/docs/specs/community/community-contributions.md` | Add mode, saved contributions, status, and contribution UX. |
| Trust and moderation | `/docs/specs/community/trust-and-moderation.md` | Confirmation, resolution, staleness, moderation rules. |
| River Wye seed data | `/docs/specs/data/river-wye-seed-data.md` | Wye pilot sections, seed geometry, and validation status. |
| River level providers | `/docs/specs/data/river-level-providers.md` | EA-first provider model and future backend ingestion. |
| Platform configuration | `/docs/specs/ops/platform-configuration.md` | In-repo Firebase/GCP configuration, publishing targets, and operational scripts. |
| Backend service API | `/docs/specs/backend/service-api.md` | Cloud Run API, Firebase Auth, PostGIS persistence, media, and moderation boundaries. |
| Backend data and sync model | `/docs/specs/backend/data-and-sync-model.md` | Hybrid relational/JSONB schema, offline sync envelope, idempotency, and initial contribution persistence. |

## Strategy References

| Topic | Strategy Doc |
| --- | --- |
| Product concept | `/docs/strategy/product-brief.md` |
| Market position | `/docs/strategy/market-analysis.md` |
| Community model | `/docs/strategy/community-model.md` |
| Community data strategy | `/docs/strategy/community-data-strategy.md` |
| Data sources and gaps | `/docs/strategy/data-sources-and-gaps.md` |
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
