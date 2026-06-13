---
spec_schema: 4
maturity: Draft
---

# No-Advice and Liability Language

**Work state:** Active
**Last updated:** 2026-06-13
**Scope:** The cross-cutting product principle that RiverLaunch.app presents information and never gives paddling, safety, or legal advice. Canonical home for the "use/avoid" wording rules referenced by discovery and contribution specs.

## Purpose

RiverLaunch.app shows facts — grades, gauge readings, community reports, access notes, source and freshness — and lets the paddler reach their own conclusion. It must never make or endorse a go/no-go decision, certify safety, or present community or third-party data as guaranteed or as legal advice.

This rule was previously restated in three strategy docs (`community-model.md §Safety Language`, `mvp-spec.md §Safety and Liability`, `community-data-strategy.md §Legal and Ethical Position`). This spec is the single enforceable home; those sections now point here. The full rationale stays in `community-data-strategy.md §Legal and Ethical Position`.

## Product Role

- `Primary user objective:` understand a river/section from facts and decide for themselves.
- `Classification:` cross-cutting product principle.
- `Why this matters:` advising whether a stretch is safe or suitable creates legal liability and false confidence. The product's value and defensibility come from sourced community information, not recommendations.

## Scope of Application

Applies to every surface that presents river information: river/section/POI detail, levels and observations, hazards, access/parking notes, grades and runnable ranges, search results, map markers, and any contribution display — including copy, badges, icons, tooltips, empty states, and notifications.

## Requirements

### Present facts, not verdicts

- Show the data that informs a decision (grade, current level and trend, community-reported runnable range, recency, source, confidence) and let the user judge.
- Never synthesise or display a go/no-go conclusion such as "safe", "suitable for you", "good to paddle today", or "runnable now".
- Personalisation may filter or surface relevant facts (for example by craft), but must not render a suitability verdict.

### Wording rules

Use:

- recent reports
- community guidance
- known hazards
- last confirmed
- may be suitable
- conditions can change quickly
- community-reported range

Avoid:

- safe
- guaranteed
- approved
- risk-free
- definitely passable
- suitable for your ability
- recommended for you

### Data honesty

- Community data is user-submitted and may be wrong, incomplete, or out of date — say so.
- Conditions can change quickly; the app does not certify safety.
- Cached/offline readings must be labelled as not current.
- Every fact carries source, date, and confidence where available.

### Access and legal

- Access notes are informational, not legal access advice; present uncertain access as uncertain, never as definitive.
- Do not encourage trespass or conflict; do not expose sensitive private or environmental locations unnecessarily.

### Trust as freshness, not anxiety

- Express confidence as dated, sourced, human freshness ("added from OpenStreetMap, not yet paddler-confirmed"; "confirmed by 3 paddlers, 6 days ago"), not bare machine labels ("confidence: low").

## References

- `/docs/strategy/community-data-strategy.md` — §Legal and Ethical Position (full rationale)
- `/docs/strategy/community-model.md` — §Safety Language (points here)
- `/docs/strategy/mvp-spec.md` — §Safety and Liability (points here)
- `/docs/strategy/feature-register.md` — cross-cutting principle note
- Referenced by discovery and contribution specs.

## Open Questions

- Standard footer/disclaimer wording and where it persists in the UI.
- Whether the contributor terms (identity gate) should restate contributor responsibility for accuracy.

## Tracking

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| ADVICE-B1 | task | Reference from discovery/contribution specs | Open | MVP | Add a one-line link to this spec in river-first-discovery, river-section-map, community-contributions, river-level-providers, and observation-ingestion. |
| ADVICE-B2 | decision | Standing UI disclaimer wording | Open | MVP | Define the persistent "conditions change / your own judgement" line and placement. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-06-13 | Created by consolidating no-advice/safety-language rules previously duplicated across `community-model`, `mvp-spec`, and `community-data-strategy`. |
