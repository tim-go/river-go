# Community Data Strategy

## Summary

River Go depends on community data. Official sources can provide maps, gauges, river levels, warnings, and some physical features, but they do not answer the most important canoeing questions at section level:

- Is this section practical for an open canoe?
- Which gauge actually represents this stretch?
- What level is good, too low, or high for this section?
- Are there current hazards?
- Is the put-in usable today?
- Is the portage realistic with a loaded boat?
- Has anyone paddled it recently?

The app's long-term value is a structured, trusted, and fresh community-maintained river intelligence layer.

## Core Strategic Principle

River Go should not rely on scraping other community sites or copying guidebook content. That creates copyright, licensing, trust, and brand risk.

Instead, River Go should build its own first-party community dataset:

- contributed directly by users
- contributed by clubs and trusted local paddlers
- sourced from official/open data where permitted
- independently verified when reference material is used for discovery
- structured into River Go's river-section model
- moderated and maintained over time

This makes community data both the product's main value and its defensible asset.

## Why Community Data Is the Product

River data alone is not enough. A gauge reading only becomes useful when someone knows what it means for a specific section, craft, and group.

Example:

- Official data says a gauge is at `0.82 m`.
- Community intelligence says that at `0.82 m`, the section is good for tandem open canoes, but the lower take-out becomes muddy and the inside bend below the bridge is shallow.

That interpretation is the value.

The strongest product experience should combine:

- current official data
- section-level community interpretation
- recent observations
- photos
- hazard freshness
- confidence indicators

## Community Data Categories

## Runnable Ranges

Community members help define what gauge levels mean for each river section.

Data to collect:

- linked gauge
- too low
- low but possible
- good
- high
- not recommended
- craft type
- ability level
- notes
- evidence reports
- confidence score

Runnable ranges should be treated as guidance, not safety certification.

## Gauge-to-Section Knowledge

Gauge data is often only indirectly useful. Local users can explain how a gauge relates to a section.

Data to collect:

- primary gauge
- secondary gauge
- upstream or downstream relevance
- rainfall lag
- tributary effects
- sluice or navigation effects
- known mismatch between gauge and real conditions

## Hazards

Hazards are one of the most valuable and time-sensitive community data types.

Data to collect:

- hazard type
- exact location
- severity
- status
- date observed
- last confirmed
- photos
- level dependency
- portage note
- confirmation count
- dispute count
- resolved date

Important hazard types:

- weirs
- fallen trees
- strainers
- flood debris
- low bridges
- dangerous lock or sluice approaches
- blocked channels
- damaged landings
- construction works
- pollution reports

## Access Practicality

Official/legal access context is not the same as practical canoe access.

Data to collect:

- put-in quality
- take-out quality
- parking
- carry distance
- bank steepness
- mud
- steps
- gates
- locked barriers
- public transport
- seasonal crowding
- local sensitivity

Access notes should be moderated and should avoid giving legal advice unless sourced from official material.

## Portages

Portage information is especially important for canoeists and often missing from generic maps.

Data to collect:

- portage start
- portage end
- route geometry
- distance
- surface
- steepness
- gates, steps, or stiles
- suitability for canoe wheels
- difficulty with loaded canoes
- photos
- seasonal issues

## Photos

Photos are evidence. They help users judge conditions and recognise places.

Priority photos:

- put-in
- take-out
- weir
- hazard
- portage start and end
- bridge
- access path
- parking
- river character
- water level reference view

Photos should be attached to specific objects, not just uploaded as a loose gallery.

## Recent Condition Reports

Reports capture time-sensitive conditions.

Examples:

- paddled today
- good level
- too low
- high and fast
- tree still present
- take-out blocked
- parking full
- portage muddy
- water quality concern

Reports should become visually stale over time.

## Canoe Suitability

Community data should explain suitability by craft and ability.

Craft types:

- open canoe
- tandem canoe
- solo canoe
- inflatable canoe
- touring kayak
- whitewater kayak
- SUP
- packraft

Suitability dimensions:

- beginner
- novice
- intermediate
- advanced
- family-friendly
- multi-day suitable
- club-trip suitable

## Data Acquisition Model

## First-Party Contributions

The default acquisition model should be direct user contribution.

Users should be able to:

- add hazards
- add photos
- add access notes
- add features
- add condition reports
- confirm existing items
- dispute stale or inaccurate items
- mark hazards as resolved

Every contribution should have:

- author
- date submitted
- date observed
- location
- contribution type
- source or evidence where relevant
- moderation status

## Club and Trusted Contributor Programme

Clubs and experienced local paddlers should be a core part of the acquisition strategy.

They can help:

- seed river sections
- confirm access notes
- maintain local hazards
- define runnable ranges
- review disputed reports
- provide region-specific expertise

Possible roles:

- trusted contributor
- club contributor
- section steward
- regional moderator

This should not become a closed expert-only system. The product needs broad participation, but expert review increases trust.

## Guided Contribution Prompts

The app should actively ask for the data it needs.

After viewing or watching a section:

- "Did you paddle this recently?"
- "Was this hazard still present?"
- "Was the take-out usable?"
- "What craft were you using?"
- "What was the level like?"
- "Can you add a photo of the put-in?"

Contribution prompts should be contextual, short, and attached to specific river objects.

## Seeding Strategy

The app needs useful initial data before community flywheel effects begin.

Seed a small pilot area manually:

- define river sections
- add put-ins and take-outs
- link gauges
- add known fixed hazards from open/official sources where permitted
- add access notes from official/open sources where possible
- invite local paddlers to fill gaps

Do not attempt full UK coverage before the data model and contribution workflow are proven.

## Reference Sources Without Copying

Guidebooks, forums, club pages, and existing apps can help identify what to investigate, but River Go should not copy protected content.

Acceptable use:

- discovering candidate rivers or sections
- learning what types of information paddlers value
- identifying questions for field verification
- informing taxonomy and product design

Avoid:

- copying route descriptions
- copying hazard notes
- copying access notes
- copying photos
- copying ratings or curated guidebook structure
- bulk scraping community comments

If external content is useful enough to include, seek permission, partnership, or a licence.

## Trust Model

Community data must be judged by freshness and confidence.

Signals:

- date observed
- last confirmed
- number of confirmations
- contributor reputation
- club affiliation
- evidence photos
- consistency with other reports
- unresolved disputes
- moderator review

Data should not simply be either visible or hidden. It should carry confidence.

Example confidence labels:

- recently confirmed
- trusted contributor
- needs confirmation
- disputed
- stale
- resolved

## Staleness Model

Different data types age differently.

Suggested defaults:

- condition report: current for 7 days, aging after 7 days, stale after 30 days
- hazard: active until resolved, but needs confirmation after 90 days
- access note: needs review after 180 days
- photo: does not expire, but always shows date taken
- runnable range: versioned and reviewed periodically
- gauge link: reviewed when reports conflict with gauge readings

The UI should invite users to refresh stale data.

## Moderation Model

Moderation is essential because the app covers safety and access.

Moderation priorities:

- safety-critical hazards
- access/legal claims
- landowner disputes
- offensive content
- spam
- privacy-sensitive photos
- duplicate or misleading pins

Moderator actions:

- edit wording
- change status
- hide content
- merge duplicates
- request evidence
- mark as stale
- mark as resolved
- lock sensitive access notes
- promote trusted contributors

Access notes should receive stricter moderation than general photos or features.

## Legal and Ethical Position

River Go should be explicit:

- community data is submitted by users
- conditions can change quickly
- users must make their own judgement
- the app does not certify safety
- access notes are informational and may be incomplete
- official source attribution is preserved

The app should avoid:

- republishing copyrighted guidebook or community-site content without permission
- presenting uncertain access as definitive
- saying a section is safe
- encouraging trespass or conflict
- exposing sensitive private or environmental locations unnecessarily

## Community Flywheel

The flywheel should work like this:

1. Seed a small region with useful baseline data.
2. Users use the app to plan trips.
3. The app prompts users to confirm or add recent information.
4. Photos and reports improve section confidence.
5. Better data attracts more users and clubs.
6. Clubs and trusted contributors steward local sections.
7. The app expands region by region.

This flywheel is more defensible than scraped data because it produces first-party, structured, current, canoe-specific knowledge.

## Product Implications

The app should prioritise contribution and verification features early:

- click map to add hazard or feature
- attach photo to a specific object
- confirm existing hazard
- mark hazard resolved
- report section conditions
- ask for craft type and observed level
- show freshness and confidence
- show contributor credibility
- support club/section steward roles

Features that are less important early:

- social feeds
- likes
- badges
- broad trip tracking
- advanced offline maps
- complex account profiles

The community data model is not an add-on. It is the core product.

## MVP Requirements

The MVP should include:

- member contributions
- typed contribution forms
- photos attached to objects
- hazard status
- last confirmed date
- confirm and dispute actions
- basic moderation status
- stale indicators
- section-level recent reports
- contributor display names

The MVP can defer:

- sophisticated reputation scoring
- club verification automation
- full moderation dashboard
- automated confidence algorithms
- bulk import workflows

## Open Questions

- Which region or river cluster should become the first community pilot?
- Which clubs or local experts can help seed and review data?
- Should early contributions require accounts?
- Who can edit or resolve hazards?
- Should runnable ranges be limited to trusted contributors at first?
- How much access content should be visible before moderation?
- Can we create a simple contributor agreement suitable for user-submitted data?

