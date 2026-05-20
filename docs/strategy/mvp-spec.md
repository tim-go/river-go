# MVP Spec

## Goal

Build the first useful version of River Go for UK canoeists. The MVP should help users choose and understand river sections using live data plus community-contributed local knowledge.

## MVP Scope

The MVP should include:

- browse river sections on a map
- view a river section detail page
- show linked river-level data where available
- show put-ins, take-outs, and access notes
- show hazards and river features
- upload photos
- add condition reports
- confirm or dispute existing reports
- favourite or watch river sections

The MVP should not initially include:

- full turn-by-turn navigation
- social feed
- achievements or gamification
- complex trip tracking
- offline maps
- paid subscriptions
- full Europe coverage
- automated safety recommendations

## Primary User Flow

1. User opens the map.
2. User searches or browses a UK river.
3. User selects a river section.
4. App shows current level, recent reports, hazards, access points, and photos.
5. User decides whether the section may be suitable for their trip.
6. After paddling or scouting, user adds a report, photo, hazard, or confirmation.

## River Section Page

Each section page should show:

- section name
- river name
- map preview
- put-in and take-out
- distance
- estimated paddle time
- canoe suitability
- difficulty
- linked gauge readings
- current trend
- community runnable range
- known hazards
- recent condition reports
- access notes
- photos
- last updated timestamp
- contribution actions

## Map MVP

Map should show:

- river sections
- gauges
- put-ins and take-outs
- hazards
- notable features
- photos

Map markers should visually distinguish:

- hazards
- access points
- features
- gauges
- stale reports

## Contribution MVP

Users should be able to add:

- photo
- hazard
- feature
- access note
- condition report
- confirmation
- dispute or flag

Contribution forms should be short and structured.

### Add Hazard

Required:

- location
- hazard type
- severity
- description
- date observed

Recommended:

- photo
- affected river level
- whether it blocks passage
- suggested portage note

### Add Photo

Required:

- image
- location or attached object
- category

Recommended:

- caption
- date taken
- water level if known

### Add Condition Report

Required:

- river section
- report type
- short note
- date observed

Recommended:

- level impression
- craft type
- photos

## Trust MVP

Each contribution should show:

- author display name
- date created
- date observed
- confirmation count
- dispute or flag state
- stale indicator where relevant

Start with simple trust mechanics:

- members can add contributions
- members can confirm or flag
- moderators can edit, hide, resolve, or merge
- contributions become stale over time depending on type

## Staleness Rules

Suggested first-pass staleness:

- condition reports: current for 7 days, aging after 7 days, stale after 30 days
- hazards: active until resolved, but needs confirmation after 90 days
- access notes: needs review after 180 days
- photos: do not become stale automatically, but show date taken
- runnable ranges: versioned and reviewed, not stale by default

## Notifications MVP

Users should be able to watch sections and receive basic updates:

- new hazard added
- hazard resolved
- new recent condition report
- river level crosses a saved threshold

## Data Integrations MVP

Initial river-level sources should focus on UK availability.

Likely sources to investigate:

- Environment Agency flood monitoring and river levels API
- Scottish Environment Protection Agency data
- Natural Resources Wales data
- Met Office or other forecast data where practical
- OpenStreetMap for base waterway/access context

Each data source should be wrapped behind a provider abstraction so Europe expansion can add new providers later.

## Safety and Liability

The MVP should use cautious wording.

Use:

- "community guidance"
- "recent reports"
- "known hazards"
- "last confirmed"
- "conditions may change"

Avoid:

- "safe"
- "approved"
- "guaranteed"
- "definitely passable"

## MVP Success Metrics

Product metrics:

- river sections with complete put-in/take-out data
- sections with linked gauge data
- active contributors per region
- contributions per section
- hazards confirmed or resolved
- condition reports added in the last 30 days
- watched sections

Quality metrics:

- percentage of hazards with photos
- percentage of hazards confirmed by more than one user
- percentage of sections updated recently
- number of stale items reconfirmed

## Suggested Build Order

1. Seed a small UK region with river sections and access points.
2. Build section pages and map display.
3. Add manual community contributions.
4. Add moderation and staleness.
5. Integrate river-level data.
6. Add watchlists and notifications.
7. Expand region coverage.

