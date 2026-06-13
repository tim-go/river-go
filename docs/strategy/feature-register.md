# Feature Register

**Last updated:** 2026-06-13
**Scope:** Product-level inventory of RiverLaunch.app features, grouped by the tiered product model. Complements `feature-taxonomy.md` (object/contribution *types*), `spec-consolidation-map.md` (owning *specs*), `roadmap.md` (phasing), and `delivery-plan.md` (current state). This register groups by *product tier and user value*, not by engineering layer.

## The Tiered Model

RiverLaunch.app is a funnel with two gates: an **identity gate** (anonymity ends — you must be a known member to contribute) and a **monetization line** (free ends — depth is paid).

```
  TIER 1 · DISCOVERY (the maps)        anonymous · no account     ← get everyone IN
  ──────────────────────────────────────────────────────────────
   ⟱  IDENTITY GATE: become a known member to contribute
      (email-verified · public contributor name · accepted contributor terms)
  ──────────────────────────────────────────────────────────────
  TIER 2 · COMMUNITY CONTRIBUTIONS     known members · free       ← everyone CONTRIBUTES
  add/confirm hazards · photos · access · trust & moderation         (accountable)
  ══════════════════════════════════════════════════════════════  ← monetization line
  TIER 3 · DEPTH (paid)                committed members          ← the ones who STAY
    • MEMBER TOOLS  (the individual)   history · stats · kit · skills · training
    • GROUP TOOLS   (private sharing)  clubs · trips · availability · check-in · messaging · ICE-share
```

**Strategic logic:** maximise the top of funnel (free, anonymous browsing of the maps), require known accountable identity to write to shared safety data, and monetise the committed depth. Contributions must never depend on Tier-3 objects — being a known member is the only gate on contributing.

**Cross-cutting principle — no advice.** RiverLaunch.app presents facts (grades, gauge readings, community reports, source/freshness) and never makes or endorses a go/no-go decision. No "safe", "suitable for your ability", or "good for you today". This governs every Discovery and Contribution surface. Owning spec: `/docs/specs/principles/no-advice-and-liability-language.md`.

**Lens A / feed** (deferred, per IA decision): a Tier-3 surface — it only has content once a member has groups/history. Default home stays Discovery (Lens B); feed is an opt-in, per-user mode for later.

Status legend: ✅ Landed · 🔨 Active · ⬜ Queued · 🅿️ Parked

---

## Tier 1 · Discovery

### 1A — River-first discovery
| Feature | Status | Owning spec(s) |
|---|---|---|
| River overview markers (canonical pins + list) | 🔨 | river-first-discovery, river-section-map |
| Selected-river context (summary, counts, source caveat) | 🔨 | river-first-discovery, river-section-map |
| River detail page (paddling-critical facts, sources, gaps) | ⬜ | river-first-discovery |
| Nearby river list (rank by distance; filter by grade/conditions) | ⬜ | river-first-discovery |
| River-first copy migration (de-emphasise "routes") | ⬜ | river-first-discovery, river-section-map |
| Whole-river grouping model | ⬜ | geospatial-domain-model |

### 1B — Map & POI surface
| Feature | Status | Owning spec(s) |
|---|---|---|
| Map shell (Leaflet/OSM, fit-to-bounds) · markers · popups | ✅ | river-section-map, demo-prototype |
| POI detail panel (facts, location actions, what3words) | 🔨 | river-section-map |
| Known-rivers overlay + local stretch selection | 🔨 | geospatial-domain-model, river-section-map |
| Layer filters (hazards/access/photos/stale) | ⬜ | river-section-map |
| Grade & runnability filters ("grade III–IV running now") | ⬜ | river-section-map |
| UK discovery overview (level-coloured at wide zoom) | ⬜ | river-section-map |
| Distinct access/parking markers · feature-density controls | ⬜ | river-section-map, river-first-discovery |
| Opt-in live location | 🔨 | river-section-map |
| Nearby amenities & emergency points (toilets, defibs, hospitals; proximity-filtered) | ⬜ | nearby-amenities-and-emergency-points |

### 1C — Live data (context, never advice)
| Feature | Status | Owning spec(s) |
|---|---|---|
| Observation schema (stations/measures/readings/cache) | 🔨 | observation-ingestion |
| EA + NRW provider adapters | 🔨 | observation-ingestion, river-level-providers |
| Level read API + chart (latest/range/trend) | 🔨 | observation-ingestion |
| Ingestion + backfill jobs | 🔨 | observation-ingestion, seed-data-operations |
| Gauge display (live reading + fallback) | ✅ | river-level-providers |
| Offline/stale level labelling | ⬜ | river-level-providers, offline-mode |
| Rainfall / tide / dam-release context | 🔨 | observation-ingestion, river-level-providers |

### 1D — Discovery data foundation
| Feature | Status | Owning spec(s) |
|---|---|---|
| Canonical rivers model + table + read API (`/api/rivers`) | 🔨 | canonical-river-database, service-api |
| OSM feature → candidate POI extraction → promotion | 🔨 | canonical-river-database, public-source-seeding |
| Public source register + licence classification | 🔨 | public-source-seeding |
| OSM waterway import (snap/overlay layer) | 🔨 | public-source-seeding, geospatial-domain-model, service-api |
| Location-owned POI model (`pois` + `poi_route_links`) | 🔨 | geospatial-domain-model, data-and-sync-model |
| Pilot seed datasets (Wye, Tryweryn, UK catalogue) | ✅/🔨 | river-wye-seed-data, river-tryweryn-seed-data, uk-kayaking-sample-catalogue |

---

## Identity (the contribution on-ramp)

Sits between Discovery and Contributions. Establishing a **known, attributable member** is the only gate on contributing.

| Feature | Status | Owning spec(s) |
|---|---|---|
| Create account / sign-in (Google + email/password, reset) | 🔨 | app-shell-navigation |
| Guest browse + account-gated actions (shared auth sheet) | 🔨 | app-shell-navigation, community-contributions |
| **Contribution identity gate** (email-verified · public name · contributor terms) | ⬜ | app-shell-navigation, community-contributions (CON-B2) |
| Public contributor name | 🔨 | app-shell-navigation |
| Member identity schema + API (`/api/me`, upsert) | 🔨 | data-and-sync-model, service-api |
| ICE store (private emergency-contact profile) — *storage only* | 🔨 | app-shell-navigation, data-and-sync-model |
| Account/Sync surface (your synced state) | 🔨 | app-shell-navigation |

---

## Tier 2 · Community Contributions (free, known members)

### 2A — Contributions
| Feature | Status | Owning spec(s) |
|---|---|---|
| Add mode + map placement + floating form | ✅ | community-contributions |
| Typed contributions (hazard/report/access/feature/photo) | ✅ | community-contributions |
| Rich feature + access/parking categories | ⬜ | community-contributions |
| Add update/photo to existing POI (no duplicate markers) | ⬜ | community-contributions |
| Seed-POI confirm / suggest correction | 🔨 | community-contributions |
| Backend-persisted loop (save/sync/readback/merge) | ✅ | community-contributions, data-and-sync-model |
| Offline outbox + prominent sync state | 🔨 | community-contributions, offline-mode |
| Member point management (list/delete your own) | 🔨 | community-contributions |

### 2B — Photos / media
| Feature | Status | Owning spec(s) |
|---|---|---|
| Signed-in upload (resize → storage → metadata) · display · moderation | ✅ | photo-uploads |
| Feature photo sets (pinned + chronological) | ⬜ | photo-uploads |
| Level-linked photo metadata + filtering | ⬜ | photo-uploads |
| Offline photo queue | ⬜ | photo-uploads, offline-mode |
| Video uploads | 🅿️ | photo-uploads |

### 2C — Trust & moderation
| Feature | Status | Owning spec(s) |
|---|---|---|
| Hazard confirm/resolve + status display | ✅ | trust-and-moderation |
| Contributor roles (member/trusted/moderator/admin) | ✅ | trust-and-moderation, data-and-sync-model |
| Moderation queue + decisions · member role/trust editing | ✅ | trust-and-moderation, service-api |
| POI status override · source-candidate review/promotion | 🔨 | trust-and-moderation, canonical-river-database |
| Staleness rules (7/30/90-day) | ⬜ | trust-and-moderation |

### 2D — Community-sourced sections (demoted route submissions)
*Reframed from "routes as the product" to "a contribution type." De-prioritised; kept for put-in/take-out/grade context.*
| Feature | Status | Owning spec(s) |
|---|---|---|
| Section/route suggestion (trace + evidence form) | 🔨 | route-submissions |
| Backend persistence + moderation + management | 🔨 | route-submissions |
| Route adjustment records + impact review | 🔨 | route-submissions, geospatial-domain-model |
| Snap-to-known-river + OSM routed snap | 🔨 | route-submissions, geospatial-domain-model |
| Public candidate section display · route override publishing | 🔨 | route-submissions, river-section-map |

---

## Tier 3a · Member Tools (the individual — paid depth)
| Feature | Status | Owning spec(s) |
|---|---|---|
| Paddle history log | ⬜ | member-profiles-and-history |
| Personal river history (on river detail) | ⬜ | member-profiles-and-history |
| Member stats & recap | ⬜ | member-profiles-and-history |
| Kit inventory | ⬜ | member-profiles-and-history |
| Skills & qualifications (no safety certification implied) | ⬜ | member-profiles-and-history |
| Training-ground activity (laps, venues) | ⬜ | member-profiles-and-history |
| Rich public profile page / avatar / links | 🅿️ | member-profiles-and-history |

## Tier 3b · Group Tools (private sharing — paid depth)
*Defining property: private sharing among a known group. Consumes member + identity data where present.*
| Feature | Status | Owning spec(s) |
|---|---|---|
| Clubs & subgroups · friend / temporary groups | ⬜ | group-paddle-sessions |
| Planned paddle sessions (target/meet/invite/timing) | ⬜ | group-paddle-sessions |
| Participant availability | ⬜ | group-paddle-sessions |
| Check-in / check-out (session lifecycle) | ⬜ | group-paddle-sessions |
| Session-scoped ICE *sharing* (consented, time-boxed) | ⬜ | group-paddle-sessions |
| Kit & skills advisory checks (uses member data) | ⬜ | group-paddle-sessions |
| Session completion / history (also feeds member history) | ⬜ | group-paddle-sessions |
| Private group messaging | ⬜ | *(moved from future/community-commerce-and-learning)* |
| Optional group location sharing | 🅿️ | group-paddle-sessions |

---

## Foundations (cross-cutting; serve all tiers)
| Area | Count | Status | Owning spec |
|---|---|---|---|
| Backend API (auth, persistence, sync, media, moderation, observation, canonical-river, snap) | 24 | 🔨 | service-api |
| Data & sync model (hybrid schema, sync envelope, POI shadow, route overrides) | 13 | ✅/🔨 | data-and-sync-model |
| Geospatial domain model (decoupled model, location-owned POIs, snap, river grouping) | 11 | 🔨 | geospatial-domain-model |
| Offline & PWA (shell cache, data packs, outbox, photo queue, sync) | 7 | mixed | offline-mode |
| Platform / ops (GCP/Firebase, Cloud Run/SQL, deploy, seed runbooks) | 22 | ✅/🔨 | platform-configuration, seed-data-operations |
| Analytics (consent-gated GA) | 4 | 🔨 | analytics-and-consent |
| Release shell (Vite/Leaflet, localStorage) | 8 | ✅ | demo-prototype |

## Commerce (later monetization)
| Area | Owning spec |
|---|---|
| Recommendations · marketplace · monetisation experiments · beginner learning · public chat/comments · presence · lost-&-found | commerce/community-commerce-and-learning |

*Bundled sketch; split when items are scheduled. Private group messaging moves to group-tools; public chat/comments stay here (different abuse profile). Amenities & emergency points moved to discovery.*

*Timing note: every spec now lives in its product-tier folder; "when to build" is tracked by feature status (⬜/🔨) and roadmap phase, not by a `future/` folder.*

---

## Spec Structure (implemented 2026-06-13)

Spec folders now match the tiers; the `future/` folder is gone (timing is tracked by status, not folder):

```
specs/
  discovery/        rivers · map · POI facts · live-data · search · discovery-data · amenities   (anonymous)
  identity/         account · known member · public profile · ICE store              (contribution on-ramp)
  contributions/    typed contributions · photos · trust & moderation · community-sourced sections
  member-tools/     history · stats · kit · skills · training-ground                 (individual; paid)
  group-tools/      clubs · sessions/meetups · availability · check-in · messaging · ICE-share (private sharing; paid)
  commerce/         recommendations · marketplace · monetisation · learning          (later monetization)
  foundations/      api · data-model · geospatial · offline · platform · ops · analytics · release shell
  principles/       no-advice-and-liability-language   (referenced by discovery + contributions)
```

Reclassifications applied: route-submissions → contributions (demoted); identity pulled out as the contribution on-ramp; member vs group split on individual-vs-private-sharing; amenities → discovery; community-commerce-and-learning → commerce (private messaging will move to group-tools on split). The no-advice `principles` spec is now authored as the single enforceable home. See `/docs/specs/spec-consolidation-map.md` for owning-spec paths.

## Change Log
| Date | Change |
|---|---|
| 2026-06-13 | Created from feature extraction across all specs; grouped into the tiered model (Discovery / Identity / Contributions / Member / Group / Foundations) with identity gate and monetization line. |
| 2026-06-13 | Restructured spec folders to match tiers; removed `future/` (amenities → discovery, commerce-learning → commerce); reindexed the consolidation map. |
