# Market Analysis Review — July 2026

**Purpose:** A point-in-time refresh of the competitive and demand-side landscape against the
existing strategy (`market-analysis.md`, `strategic-positioning.md`, `community-data-strategy.md`).
This is a review/refresh, not a replacement — where it contradicts or extends those docs it says so.

**Method:** Two parallel web-research sweeps (competitor set; UK market + access law + water quality),
mid-2026. Figures are the most recent verifiable; several official sites blocked automated fetch, so
some numbers rest on search-indexed snippets — flagged inline. Re-verify against primary sources before
using externally.

## Headline

The core thesis holds. The field genuinely splits into a gauge utility (RiverApp), an NGB incumbent
with weak UX (PaddlePoints), a deep-but-dated content community (UK Rivers Guidebook), and non-UK
templates (PaddleWays US, Canua DACH). The intersection RiverLaunch targets — polished native app +
moderated hazard/route knowledge + live UK conditions + structured community editing — is unoccupied.

But the review surfaces **three things the strategy under-weights** and **two UK competitors the docs
don't name.**

## New / under-weighted since the strategy was written

### 1. Water quality / sewage — biggest blind spot (currently "Later Opportunity")
- Paddle UK attributes part of the **2024 participation dip** to water-quality concerns (Annual Report 2024).
- 2024: record **3.6M hours** of monitored sewage spills; SAS logged **1,853** sickness reports; Paddle UK's
  own CSO testing found **83%** of samples above safe-swimming guidance. (2025 spills fell ~35%, but EA
  attributes this to dry weather, not infrastructure.)
- **Data is free/open:** National Storm Overflow Hub (live Nov 2024, public API), Rivers Trust Sewage Map,
  EA bathing-water classifications. No proprietary deals needed.
- **Paddling-specific gap is open:** SAS SSRS and Rivers Trust map alert on surf/swim/bathing spots; nobody
  ties spill status to the **put-ins, take-outs and reaches paddlers actually use.** Natural extension of the
  POI/section model. Frame as *risk indication, not safety guarantee* (EDM = spill presence/absence, not
  pathogen levels; sensor faults exist) — fits the no-advice principle.
- **Why it matters:** potentially a stronger *cold-start* hook than hazards — high-salience, national,
  constantly refreshing (recurring engagement), useful on day one without community seeding.

### 2. AI forecasting — unclaimed
- No paddler-facing app uses AI for conditions/routes/hazards as of mid-2026.
- Free inputs exist: **Google Flood Hub** (AI riverine forecasts, dev API), UK RFFS / UKCEH-EA flow forecasting.
- Not urgent, but should be a deliberate strategic choice, not an omission. Natural fit: "what will the level
  be this weekend" at section level.

### 3. Two UK competitors not in the current docs
- **Paddle Logger (paddlelogger.com)** — *most important omission.* PaddlePLAN (route nav + Apple Watch
  off-course haptics) and PaddleLIVE (auto safety tracking + rescue alerts). **Official Paddle UK partner,
  50% member discount = a distribution moat.** No river-knowledge/hazard content layer, so not head-on — but
  owns the same paddler's phone and the NGB relationship. **The Paddle UK / distribution question is not
  addressed in any current strategy doc.**
- **Wild Open Water (wildopenwater.com)** — closest *structural* analogue: map + live tide/temp/water-quality
  + community-verified reports + per-spot risk assessments, 40,000+ reports, free, native apps. Aimed at
  swimmers; the exact model RiverLaunch is pursuing, already populated, with paddling crossover. Model to
  beat and a crossover threat.

## Competitive landscape (refreshed)

| Product | What | Platform | UK | Community/UGC | Live levels | So what |
|---|---|---|---|---|---|---|
| **RiverApp** | Gauge/flow aggregator + WW sections + alerts/forecasts | Web+iOS+Android | Strong (3,020 GB gauges) | Read-heavy (post hazards/reports) | Yes (core) | Category leader for gauge breadth; a utility, not a community. Match coverage, beat on curated content + true UGC. |
| **PaddlePoints / Go Paddling** (Paddle UK) | Community map of routes/launches/POIs + licence pages | Web/PWA only | UK-wide | Strong on paper (routes/points/photos/hazards) | No | The incumbent to differentiate against — owns access/licence authority + NGB relationship, but thin UX, no live data, no native app. |
| **Paddle Logger** | Route nav + safety tracking/rescue alerts | iOS+Android+Watch | UK | No content layer | No | New. Paddle UK official partner (distribution moat). Competes for the phone, not the knowledge layer. |
| **Wild Open Water** | Map + live conditions + water quality + verified reports | Web+iOS+Android | UK | Strong (40k+ reports, verified) | Tide/temp/WQ | The model to beat; swimmer-focused with paddling crossover. |
| **PaddleWays** (NRS) | Guide + trip planning + offline nav + hazard geofencing | iOS+Android | US-only | Curated (onWater), some UGC | Streamflow | Mature "good" template; not a UK competitor. Borrow the model. |
| **Canua** (DKV) | DKV database (150k geopoints) + nav | iOS+Android | Thin (DACH-focused) | Editorial moderation, not open | No (static danger pts) | Proof a federation DB powers an app; editorial (not open) model + weak UK depth leave room. |
| **UK Rivers Guidebook** | UK WW reference + phpBB forum | Web only | Comprehensive | Editor-mediated contribution | No (links out) | Deep content + trusted community, dated tech, no app/live data. Aging UX is the opening; its contributors are who to win over. |
| **American Whitewater** | Nonprofit; National WW Inventory + Accident DB | Web+iOS+Android | (US ref) | Structured, login-gated, public edit feed, named editors | Yes | **Governance blueprint** — copy the model (below). |

## Demand-side reality checks

- **Market size:** ~7.6M UK adults did SUP/kayak/canoe in 2022 (+46% vs 2020) — the casual base. But *regular*
  canoe/kayak participation is ~231k in England (Sport England Active Lives), and **Paddle UK membership fell
  14% to ~75k in FY2024** (behind its 120k-by-2026 target). >10M of 13.2M watersports participants go only
  once or twice — casual/independent paddling dominates. Favours a free consumer discovery app; pressures a
  paid-depth revenue model aimed at "committed members." **Stress-test monetization: individuals vs clubs/
  Paddle UK/B2B.** (British Marine data is the 2022 wave — 2–3 yrs old; use 75k membership, discard 90k/30k.)
- **Access law validated:** ~3–4% of E&W rivers have uncontested navigation rights; the common-law question
  is genuinely unsettled; Scotland has a statutory right (Land Reform Act 2003) — the model campaigners want.
  Labour (since Jul 2024) has *not* committed to a right-to-navigate; policy is piecemeal (nine National River
  Walks). Dartmoor wild-camping Supreme Court win (May 2025) is symbolic, not extending. **Legislative change
  looks unlikely this Parliament — the "access clarity" job stays unsolved and valuable.** The cautious
  "informational, not legal advice" stance is correct.
- **Canoe-first vs SUP:** SUP is the growth engine (Paddle UK became SUP NGB in 2024; inflatable SUPs >70% of
  UK board sales). Canoe-first is a defensible differentiation wedge, but explicitly forgoes the fastest-growing
  segment. Decide if SUP is a fast-follow.

## Governance blueprint — American Whitewater (copy this)

Directly relevant to the unanswered contribution Go/No-Go risk:
1. **Structured section-level editing** — form fields for rapids/hazards/gauges/geometry, not blank wiki blobs
   (low friction, queryable). *RiverLaunch already does typed contributions.*
2. **Login-gated editing + public "show edits" revision feed** — accountability. *RiverLaunch has identity gate;
   consider a public edit history.*
3. **Named volunteer editor corps** (StreamTeam / Regional Coordinators) — distributed local ownership vs
   anonymous crowd. *RiverLaunch already has a "section steward" role — lean into it.*
4. **Explicit editorial norms** — "contribute only high-confidence first-hand info."
5. **Safety mission as the contribution incentive** (their Accident Database).

## Recommendations (priority order)

1. **Elevate water quality from "Later" to a Tier-1 discovery layer.** Spike the National Storm Overflow Hub
   API against existing POIs/sections. Cheapest, highest-salience, recurring-engagement hook; strengthens
   cold-start before community data exists.
2. **Resolve the Paddle UK / distribution question explicitly** (compete / partner / pure-consumer). Paddle
   Logger has the partner slot. Not addressed in any current doc.
3. **Add Paddle Logger + Wild Open Water to `market-analysis.md`** and reposition (differentiate on content/
   knowledge depth, not tracking or swimming).
4. **Run the Go/No-Go contribution pilot now** — every downstream strategic question depends on it; the
   AmericanWhitewater named-steward model is the best structural bet.
5. **Pressure-test monetization** against the ~75k-and-falling committed-member reality; weigh club/B2B revenue
   over individual paid depth.
6. **Note AI forecasting (Flood Hub)** as a deliberate later differentiator in the strategy.

## Key uncertainties
- Exact pricing tiers for RiverApp / PaddleWays / Canua (store pages rate-limited).
- PaddlePoints total point count and moderation workflow undocumented.
- British Marine participation data is the 2022 wave (no newer headline found).
- No landmark 2024–26 river-*navigation* court case found ("not found," not proven absent).
- 2025 sewage drop is weather-attributed, not infrastructure improvement.
- SAS "550+ locations" and the 1.5M→7.7M participation figures rest on search snippets — re-verify.
