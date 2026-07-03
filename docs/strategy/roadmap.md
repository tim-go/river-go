# Roadmap

This is the phased delivery view. The tiered feature inventory is `/docs/strategy/feature-register.md`; current delivery state is `/docs/strategy/delivery-plan.md`.

> **Current position (2026-07-03):** the product spans **Phases 2–4, largely delivered** — community contributions, live river data (EA + NRW; SEPA pending), and trust + clubs (roles, Meetups V1, membership v2) are all built, and **Phase 5** is partly realised at **62 rivers on OS Open Rivers geometry**. Still open in these phases: duplicate-merge / staleness rules, the discovery **river detail page** + **nearby-river list**, and the **grade filter**. No release cut yet — everything is pre-`Delivered`. **Trip planning is being pulled forward from "Later Opportunities"** (see the note there) as a unified solo-float-plan + club-meetup engine.

## Phase 0: Strategy and Validation

Goals:

- Define product positioning.
- Select first UK region or river cluster.
- Identify initial data sources.
- Speak with paddlers, clubs, and trip leaders.
- Seed an initial list of rivers and river sections.

Outputs:

- product brief
- market analysis
- community model
- feature taxonomy
- MVP spec
- product-level data model

## Phase 1: Seeded River Guide

Goal: create a useful read-only guide for a small number of rivers and river sections.

Features:

- river map
- river and river section pages
- put-ins and take-outs
- access notes
- hazards and features
- photos
- manually linked gauge references

Success:

- users can plan a section from available data
- sections have enough detail to be useful without contributions
- the seeded sections feel meaningfully deeper than a generic gauge or map listing

## Phase 2: Community Contributions

Goal: let members improve and refresh river knowledge.

Features:

- member accounts
- add photos
- add hazards
- add features
- add condition reports
- confirm or flag existing items
- basic moderation dashboard
- stale indicators

Success:

- users add useful updates after trips
- old hazards get confirmed, resolved, or marked stale
- every trip can improve the shared river knowledge layer

## Phase 3: Live River Data

Goal: integrate river-level data and connect it to section planning.

Features:

- data provider abstraction
- Environment Agency river-level integration
- gauge-to-section links
- latest reading and trend
- community runnable ranges
- basic level alerts

Success:

- users can interpret current levels at section level
- watched sections produce useful alerts
- levels support section decisions rather than becoming the whole product

## Phase 4: Trust and Clubs

Goal: improve contribution quality and local credibility.

Features:

- trusted contributor role
- club contributor role
- club-affiliated section stewardship
- contribution history
- better confidence scoring
- duplicate merging
- access-note moderation workflow

Success:

- local experts can maintain river knowledge efficiently
- users can tell which data is fresh and credible

## Phase 5: UK Coverage Expansion

Goal: expand beyond the first region while maintaining quality.

Features:

- region onboarding tools
- import and review workflow for new sections
- improved search and filtering
- richer map layers
- more UK data providers

Success:

- new regions can be added without manual engineering work
- contribution quality remains high as coverage grows

## Phase 6: Europe Expansion

Goal: adapt the model to European markets.

Features:

- provider plugins for country-specific gauge data
- localised access and licensing notes
- translated taxonomy labels
- regional moderation groups
- country-specific source references

Success:

- the UK model works in at least one additional European country without a major rewrite

## Later Opportunities

Potential future features:

- offline maps
- **trip planning** — *being pulled forward (2026-07): a unified float-plan / trip engine covering both solo paddlers (float plan + overdue-alert, filling the vacant RYA SafeTrx niche) and club meetups. Builds on Meetups V1 + community sections.*
- **trip recording** — via watch/Strava/Garmin/GPX **import** (we are not the recorder); river map-matching + level-at-time-of-paddle is the differentiator.
- route sharing
- **club trip management** — largely delivered as Meetups V1; trip planning above extends it.
- incident reporting
- **water quality integrations** — spec drafted; **on hold (2026-07)** after a coverage check (strong England/Wales, patchy Scotland; bathing data too sparse). Revisit as a targeted touring-river layer.
- campsite and accommodation planning
- public transport planning
- paid advanced alerts
- API for clubs or organisations
