# River Wye Pilot Plan

## Decision

RiverLaunch.app will use the River Wye as the first pilot region.

The pilot should prove the product's central thesis: a canoeist can use live baseline data plus fresh community intelligence to understand a specific river section before travelling.

## Why the River Wye

The River Wye is a strong first pilot because:

- it has a clear canoe touring identity
- it is relevant to open canoeists, tandem paddlers, beginners, clubs, and trip leaders
- sections can be understood as practical point-to-point journeys
- access, parking, campsites, outfitters, and take-outs matter
- river levels matter, but the interpretation is section-specific
- it has enough public awareness to make demos understandable
- it avoids making the first product feel like a whitewater-only tool

## Pilot Goal

Create a section-level River Wye dataset and prototype workflow that answers:

- Where can I put in and take out?
- What is the current level doing?
- Which gauge should I look at?
- What does that level mean for an open canoe?
- What hazards or access issues have been reported recently?
- What photos help me recognise the places?
- What data still needs local confirmation?

## Initial Pilot Area

Start with a compact lower/middle Wye touring cluster, then expand.

Initial sections:

- Glasbury to Hay-on-Wye
- Hay-on-Wye to Whitney Bridge
- Whitney Bridge to Bredwardine
- Hoarwithy to Ross-on-Wye
- Ross-on-Wye to Kerne Bridge
- Kerne Bridge to Symonds Yat
- Symonds Yat to Monmouth

These are not final published recommendations. They are seed sections for validation and data collection.

## Pilot Data to Seed

For each section, seed:

- section name
- start and end points
- approximate route geometry
- distance
- estimated paddle time
- difficulty
- canoe suitability
- put-in
- take-out
- parking notes
- access context
- linked gauge candidates
- known fixed features
- known hazard candidates
- photo requirements
- open verification questions

## Official and Open Data Sources

Likely baseline sources:

- Environment Agency Flood Monitoring API for level/flow stations
- Environment Agency or GOV.UK River Wye canoe guide material where clearly reusable
- OpenStreetMap for waterways, bridges, paths, parking, campsites, pubs, and visible access features
- OS Open Rivers for river geometry investigation

Each source must be recorded with attribution and licence notes.

## Community Data Needed

The valuable gaps are:

- which gauge is useful for each section
- good/low/high runnable ranges for open canoes
- real put-in and take-out practicality
- parking constraints
- recent hazards
- fallen trees and strainers
- awkward bridges or landings
- portage requirements
- photos of launches, landings, bridges, and features
- beginner suitability
- campsite and multi-day practicality

## Contributor Targets

Find early contributors from:

- local canoe clubs
- trip leaders
- coaches
- Wye canoe hire operators
- paddlers who regularly tour the Wye
- local outdoor centres
- campsite or landing operators where relevant

## Validation Questions

When showing the prototype, ask:

- Would you use this to choose a Wye section?
- What would make you trust or distrust a hazard report?
- Which data is missing before you would rely on it?
- Is the section split useful?
- Does the gauge interpretation match local experience?
- What access wording feels helpful without being overconfident?
- Would you add a report after paddling?
- Would your club help maintain a section?

## Success Criteria

The Wye pilot is successful when:

- at least 7 sections are seeded
- each section has put-in and take-out data
- each section has at least one gauge candidate
- each section has open verification questions
- at least 10 useful community contribution examples exist in the prototype
- users understand the difference between official data and community guidance
- at least one local paddler or club can validate the structure

## Near-Term Build Implications

The demo should support:

- map-click contribution placement
- observed date
- craft type
- hazard confirmation
- hazard resolution
- stale/needs-confirmation labels
- section-level contribution lists
- Wye-first section filtering

## Risks

- Access notes may be legally or locally sensitive.
- Seed data may be inaccurate if copied from memory or unofficial sources.
- Gauge interpretation may be misleading without local confirmation.
- Users may infer safety from "good level" labels.

## Mitigation

- Treat all seed data as unverified unless confirmed.
- Use cautious wording.
- Store source notes and confidence.
- Prioritise local review before publishing broadly.
- Keep official data separate from community interpretation.

