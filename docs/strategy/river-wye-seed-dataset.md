# River Wye Seed Dataset

## Purpose

This document describes the initial River Wye seed dataset used by the demo app.

The seed dataset is not a published guide. It is draft product data for testing the River Go community model, contribution workflow, and section-level information architecture.

The source fixture is:

`src/data/riverWyeSeed.ts`

## Seed Status

Status: draft, unverified.

The current data should be treated as a prompt for community validation, not as advice for planning a trip.

Before public use, each section needs:

- put-in confirmation
- take-out confirmation
- access and parking review
- gauge-to-section review
- runnable range review
- hazard review
- recent photos
- local contributor confirmation

## Seed Sections

Initial River Wye sections:

- Glasbury to Hay-on-Wye
- Hay-on-Wye to Whitney Bridge
- Whitney Bridge to Bredwardine
- Hoarwithy to Ross-on-Wye
- Ross-on-Wye to Kerne Bridge
- Kerne Bridge to Symonds Yat
- Symonds Yat to Monmouth

These sections are intended to test a mix of beginner-friendly, touring, visitor-heavy, and longer day-trip scenarios.

## Data Captured Per Section

Each seed section captures:

- river name
- section name
- summary
- centre point
- approximate route geometry
- distance
- estimated time
- difficulty
- craft suitability
- level band
- level label
- runnable guidance
- access summary
- gauge candidate
- access points
- hazards
- features
- placeholder photos
- seed reports

## Community Validation Questions

For each section, ask local contributors:

- Is this section split useful?
- Is the start point correct and practical?
- Is the end point correct and practical?
- What parking constraints matter?
- Which gauge do you actually use?
- What levels are too low, good, high, or not recommended for open canoes?
- What hazards should be shown from day one?
- Which hazards change frequently?
- Where are the best photo reference points?
- What beginner guidance is missing?

## Product Implications

The dataset should drive these prototype behaviours:

- section-first browsing
- map-click contribution placement
- hazard confirmation and resolution
- observed-date capture
- craft-specific reports
- stale and needs-confirmation labels
- photo gap identification

## Next Dataset Improvements

Next improvements:

- replace approximate geometry with a verified line source
- attach source metadata to each seeded item
- add confidence status per field
- add Wye gauge provider IDs
- add photo-needed markers
- add portage candidates where relevant
- add access moderation status
- add local contributor attribution once confirmed

