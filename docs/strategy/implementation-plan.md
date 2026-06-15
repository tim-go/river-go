# Implementation Plan

**Last updated:** 2026-06-13
**Scope:** The actionable build plan for the next phase of RiverLaunch.app, led by the discovery UI rework. Complements `roadmap.md` (phased view), `delivery-plan.md` (current state), and `feature-register.md` (feature inventory by tier).

## How to read this

This plan sequences the work to build the app described by the tiered model in `feature-register.md`. It is deliberately **deep on Phase 1 (Discovery)** — the near-term focus — and lighter on later phases, which will get their own detailed plans when we reach them. It assumes the spec restructure and strategy tidy already completed.

## Guiding constraints (decisions already locked)

- **Tiered product model.** Discovery (anonymous) → Identity (on-ramp) → Contributions (free, known members) → Member tools + Group tools (paid depth). See `feature-register.md`.
- **Discovery first.** More work on river discovery before re-exposing contributions.
- **Map-first, Lens B now; Lens A (feed) later, per-user switchable.** The home is a swappable lens over a shared substrate. Build discovery as the default front door, but lay the app frame so a feed lens and the tool tiers slot in without a rebuild ("plan for the final implementation, not the first slice").
- **No advice — ever.** Present facts; never a go/no-go verdict. Governed by `/docs/specs/principles/no-advice-and-liability-language.md`.
- **Identity gate for contributions.** Email-verified + public contributor name + accepted contributor terms. Browsing stays anonymous.
- **Early development, no live users.** We can change anything; favour the clean end-state over backwards-compatibility.

## Current reality we are building from

- **The app is hollowed out.** Old route/section fixtures were removed; the canonical model is not yet backfilled, so discovery shows mostly empty states ("0 seeded", "Section routes… removed from the active frontend"). Backend/data for discovery is largely built; the *surface* and the *content* are the gap.
- **`src/App.tsx` is ~12,650 lines.** A single-file monolith is the main obstacle to any clean UI rework.
- **Contribution is unreachable on the river-first view** (gated behind `!isCanonicalRiverOverviewActive`).
- **The UI shows its construction to users** and the desktop layout is four competing columns (nav rail · river list · map · detail panel).
- **Route machinery still dominates the code** (suggest/edit/adjust/snap/override), now demoted by the pivot.

---

## Phase 1 · Discovery rework (near-term focus)

**Goal:** a map-first, fact-first discovery experience that answers a paddler's real questions about a river — without giving advice — on a frame that already has seams for contributions, member/group tools, and a future feed.

Four workstreams. A–C run largely in parallel; D follows once the card and data exist.

### WS-1A · App frame & decomposition

The monolith must come apart before the UI can be reshaped, and the frame must hold all tiers.

- Extract `App.tsx` into a component tree (incrementally, preserving behaviour at each step):
  ```
  App
    AppShell                 nav (rail / bottom tabs) · account menu · hosts every tier destination
      HomeLens               swappable: DiscoveryLens now; FeedLens later (per-user)
        DiscoveryLens
          MapCanvas          full-bleed map · markers · fly-to/highlight · live location
          SearchBar          floating "find a river / near me"
          RiverCard          the docked/bottom-sheet fact panel (WS-1B)
      (ContributeFlow)       Phase 2 seam
      (Trips / Me)           Phase 3–4 seams
    data/                    per-domain hooks over existing services (rivers, observations, pois, …)
  ```
- Introduce a thin client data layer (hooks over the existing `services/*` APIs) so components don't reach into a god-object.
- Make the home surface a **lens** chosen by a single setting (default `discovery`), so Lens A is a later addition, not a rewrite.

**Owning specs:** `identity/app-shell-navigation.md` (likely split a foundations app-shell spec out during this work). **Done when:** the discovery experience renders entirely from extracted components; `App.tsx` is a thin composition root; adding a new top-level destination or swapping the home lens is a local change.

### WS-1B · Map-first discovery UI (the rework)

Turn the river page from a database readout into an answer to *"what's here, and what do I need to know?"* — strictly as facts.

- **One canvas, not four columns.** Full-bleed map; a floating search/locate pill; a single **RiverCard** docked left (desktop) / bottom-sheet peek→expand (mobile). Collapse the nav to a thin rail / bottom tabs.
- **Spatial connection.** Selecting a river flies to it and highlights its course and key POIs; selecting a POI centres it. The map always shows *where* the thing is.
- **RiverCard content, in priority order (no verdicts):**
  1. River name · grade (community-graded, sourced/dated) · length.
  2. **Today:** current level + trend, against the *community-reported* range, with recency ("0.82m ↑ · range paddlers report ~0.6–1.1m · confirmed 6 days ago"). No "good"/"runnable now".
  3. **The paddle:** put-in → hazards/portages → take-out as a simple top-to-bottom itinerary (replaces "show path" toggle).
  4. Known hazards (dated, confirmed-by-N), access/parking, recent reports, photos.
  5. Sourcing/freshness line.
- **Trust as freshness, not anxiety.** "confirmed by 3 paddlers, 6 days ago" / "from OpenStreetMap, not yet paddler-confirmed" — never bare "confidence: low".
- **Empty states as honest gaps / future invitations.** "No hazards logged here yet" (and, once Phase 2 lands, "— know one? Add it"). Never "0 seeded".
- **Strip all construction language** from user surfaces (migration notes, "0 seeded", "candidate/Unknown" as bare badges, admin vocabulary → admin-only views).
- **Calm safety posture:** one persistent, quiet "conditions change — assess for yourself" line instead of stacked banners and amber boxes. Per the no-advice principle.
- **Reduce entry gates:** let people touch the map before the auth modal; keep consent minimal.

**Owning specs:** `discovery/river-first-discovery.md`, `discovery/river-section-map.md` (this spec should be **split** into river-discovery vs section-detail as part of the work), `principles/no-advice-and-liability-language.md`. **Done when:** a new visitor lands on the map, picks a river, and reads its facts in priority order on one surface, with no construction language and no advice.

### WS-1C · Discovery data backfill (content)

Discovery is only worth using if rivers have content.

- Backfill the canonical model for the pilot rivers (Tryweryn, Wye, Dee/Llangollen, Dart, Tay) so each river has sections, access points, hazards/features (from reviewed candidates), and linked gauges.
- Run the moderator promotion workflow on source-derived candidate POIs so confirmed POIs render on the river.
- Wire live observations (EA/NRW) into the RiverCard "Today" block with clear stale/offline labelling.

**Owning specs:** `discovery/canonical-river-database.md`, `discovery/public-source-seeding.md`, `discovery/river-level-providers.md`, `foundations/observation-ingestion.md`, `foundations/seed-data-operations.md`. **Done when:** each pilot river opens to real sections, POIs, and a current level — not empty tabs.

### WS-1D · Search & filters (facts, not recommendations)

- "Find a river / near me" search wired to canonical rivers; nearby-river ranking by distance (opt-in location).
- Grade and craft filters, and a level-state filter expressed as **facts** ("level within community-reported range"), never "runnable now / suitable for you".

**Owning specs:** `discovery/river-first-discovery.md` (nearby list), `discovery/river-section-map.md` (filters). **Done when:** a paddler can find rivers by name/proximity and filter by grade/craft/level-state without any advisory framing.

---

## Phase 2 · Identity gate + re-expose contributions (Tier 2)

**Goal:** turn the empty-state invitations into a live, accountable contribution loop on the river-first surface.

- **Identity gate:** require email-verified account + public contributor name + accepted contributor terms before any contribution (browsing stays anonymous).
- **Re-expose contribution** on the river-first surface (remove the `!isCanonicalRiverOverviewActive` gating); contributions attach to a river, section, POI, or map location.
- Typed contributions (hazard/report/access/feature) + photos; "add to existing POI" rather than duplicate markers; confirm/correct seed POIs.
- Trust & moderation surfaced (confirm/resolve, dated freshness, moderation queue) and offline outbox/sync.
- Empty states become live entry points ("No hazards logged — know one?").

**Owning specs:** `identity/app-shell-navigation.md`, `contributions/community-contributions.md`, `contributions/photo-uploads.md`, `contributions/trust-and-moderation.md`, `foundations/data-and-sync-model.md`, `foundations/offline-mode.md`. **Done when:** a known member can add and confirm river knowledge from the discovery surface, and it appears with dated, sourced freshness.

## Phase 3 · Member tools (Tier 3a — individual, paid)

**Goal:** the individual depth that makes members stay. Paddle history, personal river history on river detail, stats/recap, kit, skills, training-ground. Built on the identity established in Phase 2. **Owning spec:** `member-tools/member-profiles-and-history.md`. (Detailed plan when we reach it.)

## Phase 4 · Group tools (Tier 3b — private sharing, paid)

**Goal:** private sharing among known groups. Clubs, planned sessions/meetups, availability, check-in/out, session-scoped ICE sharing, private messaging, session history. Consumes member + identity data. **Owning spec:** `group-tools/group-paddle-sessions.md`. (Detailed plan when we reach it.)

## Later · Lens A (feed) + commerce

The per-user **feed home** (Lens A) becomes worthwhile once members have groups/history — slot it into the lens frame from WS-1A. Commerce surfaces (recommendations, marketplace, monetisation) follow. **Owning specs:** `group-tools/*`, `commerce/community-commerce-and-learning.md`.

---

## Cross-cutting workstreams (threaded through every phase)

- **No-advice enforcement.** Use `principles/no-advice-and-liability-language.md` as a copy checklist on every discovery/contribution surface; reference it from those specs (backlog ADVICE-B1).
- **`App.tsx` decomposition.** Continue extracting as each surface is touched; never grow the monolith.
- **Spec upkeep.** Split `river-section-map.md` (discovery vs section detail); finish demoting `route-submissions.md` content; keep specs updated alongside code.
- **Foundations.** Canonical data, observation ingestion, sync, platform — maintained as discovery/contributions demand.

## Sequencing & dependencies

```
WS-1A (frame/decompose) ─┬─> WS-1B (UI rework) ──┬─> WS-1D (search/filters) ─> Phase 2 ─> Phase 3 ─> Phase 4 ─> Lens A / commerce
WS-1C (data backfill) ───┘                       │
                                                 └─ (WS-1B needs 1A's components and 1C's content)
```

## Risks & mitigations

- **Monolith rework regressions** → decompose incrementally behind unchanged behaviour; lean on no-live-users to move fast and verify in the running app.
- **Thin/unreviewed pilot data** → no-advice framing + explicit sourcing/freshness make honest gaps acceptable; prioritise Tryweryn + Wye depth over breadth.
- **No-advice drift in copy** → principles spec as a review gate; I already slipped once ("good for you today") — treat it as a hard checklist.
- **Scope creep into Tier 3** → member/group tools are explicitly deferred; resist building them before discovery + contributions are solid.

## Where I'd start (first concrete steps)

1. **Decompose the discovery slice of `App.tsx`** (AppShell → DiscoveryLens → MapCanvas + RiverCard) behind current behaviour. *(WS-1A)*
2. **Backfill Tryweryn + Wye** fully through the canonical model so there's real content to design against. *(WS-1C)*
3. **Rebuild the RiverCard** fact-first/no-advice with the spatial map connection. *(WS-1B)*
4. **Strip construction language and reframe empty states**; collapse the four-column layout to map-first. *(WS-1B)*

## Open decisions for review

- Confirm phase order (discovery → contributions → member → group).
- Decomposition appetite: incremental-as-touched (recommended) vs. a dedicated upfront refactor pass.
- Pilot depth-first (Tryweryn + Wye) vs. all five pilot rivers in Phase 1.
- Split `river-section-map.md` into discovery vs section-detail specs now, or as WS-1B lands?

## Change Log

| Date | Change |
| --- | --- |
| 2026-06-13 | Created. Discovery-led implementation plan against the tiered model, map-first Lens-B architecture, identity gate, and no-advice principle. |
