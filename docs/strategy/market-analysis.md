# Market Analysis

## Summary

There is a viable gap, but not for a generic river-level app. Established competitors already cover gauges, maps, route planning, and broad paddling data. The stronger opportunity is a UK-first, community-maintained river intelligence layer for canoeists.

The app should not challenge advanced competitors head-on across all features. It should win by being more relevant to UK canoe trips: access clarity, section-level planning, hazard freshness, portages, photos, and community verification.

## Competitive Landscape

### RiverApp

RiverApp is strong on river levels, gauge coverage, favorites, alerts, maps, and whitewater-style river data. It is a serious competitor for live river conditions and broad monitoring coverage.

RiverApp's public positioning includes large-scale gauge and river coverage, real-time aggregation from many hydrological sources, push alerts, favourites, historical data, whitewater sections, put-ins, take-outs, dams, impassable rapids, parking locations, user notes, hazards, legal issues, and trip reports.

Implication: RiffleMap should not try to beat RiverApp by being another larger gauge browser. River levels are necessary, but they are not enough to define the product. The stronger opportunity is to make UK canoe section knowledge more structured, local, fresh, trusted, and usable offline.

Reference: https://www.riverapp.net/en

### PaddleWays

PaddleWays is a broad paddling app with maps, routes, access points, hazards, public comments, photos, streamflow, trip tracking, and paid tiers for advanced planning features.

Implication: PaddleWays validates the demand for community map layers and trip planning, but it is broader than UK canoeing. River Go can compete through UK-specific utility and simpler section-level decision making.

Reference: https://www.paddleways.com

### Canua

Canua is Europe-focused and supports canoeing, kayaking, SUP, route planning, tracking, and logbook-style workflows. It is relevant as River Go expands beyond the UK.

Implication: European expansion will need careful differentiation. The community freshness and UK-originated section model should be proven before going wider.

Reference: https://www.canua.info/en

### American Whitewater

American Whitewater is not a UK competitor, but it is a strong example of community-maintained river information at scale: river sections, gauges, difficulty, descriptions, hazards, photos, and reports.

Implication: River Go can learn from the run/section model, but should adapt it for UK access, canoe suitability, and mixed river/canal/navigation-authority realities.

Reference: https://www.americanwhitewater.org

### UK Rivers Guidebook and Community Forums

UK paddlers already rely on fragmented community knowledge from guidebooks, forums, clubs, and informal channels.

Implication: The opportunity is to structure and refresh this knowledge in a map-first, contribution-friendly app.

Reference: https://www.ukriversguidebook.co.uk

### Paddle UK

Paddle UK provides membership, licensing information, advocacy, and access campaigning. Its "Clear Access, Clear Waters" work highlights the access complexity in England and Wales.

Implication: River Go should be careful with legal claims and should present access notes as informational guidance with source/date/context, not definitive legal advice.

Reference: https://paddleuk.org.uk

## Gap Analysis

### Gap 1: Section-Level Canoe Planning

Most tools can show maps, gauges, or routes. Fewer tools answer the canoeist's practical question:

"Can I realistically paddle this stretch from this put-in to this take-out?"

River Go should focus on the section as the main object, with relevant access, hazards, levels, photos, suitability, and notes all attached to that section.

### Gap 2: UK Access and Local Context

The UK has a complex mix of public rights, navigation authorities, licences, access agreements, contested rivers, canals, clubs, private land, parking constraints, and local sensitivities.

Generic global apps tend to flatten this complexity. River Go can make access context more visible while avoiding overconfident legal claims.

### Gap 3: Hazard Freshness

Hazards change. A fallen tree, blocked portage, damaged landing, or dangerous weir approach can make old information misleading.

River Go should treat hazard freshness as a core product feature:

- last reported
- last confirmed
- evidence photo
- status
- confidence
- community confirmations and disputes

### Gap 4: Canoe-Specific Suitability

Generic paddling apps often serve kayaks, SUPs, rafting, fishing, and touring together. Canoeists need specific details:

- open canoe suitability
- portage practicality
- carry distance
- landing quality
- low bridges
- weirs and locks
- multi-day journey support
- family and beginner suitability
- parking and public transport
- campsites and facilities

### Gap 5: Trustworthy Community Contributions

Community data is only useful if users can judge whether it is current and credible. River Go should not be a loose pile of pins and comments.

The gap is a structured contribution system where users add typed, reviewable, date-stamped river knowledge.

## Strategic Recommendation

Build RiffleMap as a UK-first community river intelligence app for canoeists.

Avoid a feature war with established apps. Instead, compete by making a smaller set of decisions much easier:

- which section to paddle
- where to launch and land
- what level is suitable
- what hazards exist
- what has changed recently
- what local access context matters

The core strategic rule is:

> Do not build a smaller RiverApp. Build the best local river knowledge layer for paddlers, with river levels as necessary context.

See `/docs/strategy/strategic-positioning.md`.

## Risks

- Liability risk if the app implies that a section is safe.
- Low-quality or stale community data.
- Difficulty sourcing and normalising river-level data.
- Access disputes if notes are presented too definitively.
- Cold-start problem without enough initial river sections and contributors.

## Mitigation

- Use careful language: "recent reports", "community guidance", "known hazards", "conditions may change".
- Build contribution freshness and confirmation into the product from the start.
- Seed the first region manually with high-quality sections and trusted club input.
- Keep access notes source-linked, dated, and moderated.
- Start with one geographic region or river cluster before covering the whole UK.
