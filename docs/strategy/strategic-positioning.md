# Strategic Positioning

## Summary

RiverLaunch.app is worth building if it avoids becoming a smaller copy of established river-level apps.

The product should not try to win by matching broad gauge coverage, global river databases, mobile alerts, and general paddling features from day one. Established competitors already do that well. RiverLaunch.app should instead become the best local river knowledge layer for paddlers, starting with UK canoeing.

The strategic decision is:

> Do not build a smaller RiverApp. Build the best local river knowledge layer for paddlers, with river levels as necessary context.

## Why This Is Still Worth Doing

River levels are useful, but they are not the whole planning problem. Canoeists still need to know:

- where the practical put-in and take-out are
- whether a section is suitable for an open canoe
- what the gauge actually means for that section
- what hazards have changed recently
- whether a portage is realistic with a loaded boat
- whether access is physically practical and locally sensitive
- whether anyone has paddled or checked the section recently

Those answers often live in clubs, guidebooks, informal groups, local memory, trip reports, photos, and word of mouth. The opportunity is to turn that scattered local knowledge into structured, fresh, trusted river-section data.

## Competitive Reality

RiverApp is a strong competitor. Its public site positions it as a global river-condition app with tens of thousands of gauges, more than 20,000 rivers/water bodies, more than 80 data sources, push alerts, favourites, historical statistics, whitewater runs, put-ins, take-outs, dams, impassable rapids, parking locations, user notes, hazards, legal issues, and trip reports.

That means a direct gauge-app feature war would be weak strategy. RiverLaunch.app should assume competitors will remain better at broad coverage for some time.

PaddlePoints / Go Paddling is the closest UK product analogue for routes and points. It already supports map browsing, mapped rivers and canals, launches, hazards, comments, photos, public/private routes, direct route drawing, GPX import, personal markers, and access/licence context, backed by Paddle UK.

That means RiverLaunch.app should not become a generic "PaddlePoints but ours" product. PaddlePoints validates the need, but also raises the bar for differentiation. RiverLaunch.app must be meaningfully stronger in field use, live section intelligence, contribution trust, and group/member workflows.

The better gap is depth and trust around local section knowledge:

- UK-first rather than global-first
- canoe-first rather than generic river-use-first
- river-section planning rather than gauge browsing
- structured community data rather than loose notes
- offline-first field use rather than always-online planning only
- freshness and confidence indicators as first-class product features

The core route-data constraint is strategic, not technical. RiverLaunch.app can use trusted providers for maps, levels, weather, rainfall, and warnings, but it must not manufacture paddling routes from map geometry. A mapped river is not evidence that a section is suitable, accessible, current, or safe to paddle.

Route existence and suitability must come from paddling evidence: community submissions, clubs, trusted local paddlers, official trails, licensed partner data, field photos, recent reports, and moderator review. Even licensed third-party route data should enter as sourced baseline data, not automatic truth.

References:

- RiverApp: https://www.riverapp.net/en
- RiverApp rivers and gauge coverage: https://www.riverapp.net/en/rivers
- RiverApp gauge map: https://www.riverapp.net/en/map
- PaddlePoints: https://gopaddling.info/paddlepoints/

## Product Thesis

RiverLaunch.app becomes valuable when every trip can improve the map.

The product loop is:

1. A paddler views a useful river section.
2. They understand the section through levels, features, access notes, hazards, photos, and recent reports.
3. They paddle, scout, or locally verify part of it.
4. They add structured local knowledge.
5. That knowledge appears clearly on the map with date, source, confidence, and status.
6. Other paddlers can trust, confirm, dispute, or refresh it.

If this loop works, RiverLaunch.app gains a defensible data asset. If it does not work, the product becomes an underpowered map.

## Strategic Boundary

RiverLaunch.app should not start as:

- a general outdoor map
- a social network
- a trip recording app
- a complete Europe-wide river database
- a generic river-level browser
- a safety certification product
- an automatically generated paddling-route catalogue based on river map lines
- a generic duplicate of PaddlePoints / Go Paddling

RiverLaunch.app should start as:

- a small number of high-quality river sections
- a clear map of practical river knowledge
- an easy way to add local knowledge
- a trust model for community data
- a field-ready offline contribution workflow
- live levels where they help interpret a section
- a clear confidence model for suggested, imported, reviewed, verified, stale, and disputed sections

## Initial Wedge

The first wedge should be a small set of UK rivers where we can prove quality and contribution behaviour.

For each pilot river, the product should aim to answer:

- Can I paddle this section soon?
- What is the section actually like?
- Where do I get in and out?
- What hazards, weirs, portages, and awkward features matter?
- What does the current level mean locally?
- What changed recently?
- Who last confirmed this information?

This favours depth over coverage. Five useful rivers are better than fifty thin ones.

## Community Data Requirements

The community model is the highest-risk part of the strategy and must be treated as the core product, not an add-on.

The MVP should prove:

- members can sign in
- members can add local knowledge quickly
- contributions are typed and structured
- contributions attach to river sections or exact locations
- hazards and access notes show freshness
- users can confirm, dispute, or resolve existing information
- offline contributions survive poor signal and sync later
- moderators can control sensitive or unsafe content

Contribution types that matter most:

- hazards
- access notes
- portage notes
- photos
- recent condition reports
- runnable-level observations
- feature annotations

## Go/No-Go Test

The next major validation should not be whether we can deploy the platform. That is now largely proven.

The next major validation is whether paddlers will contribute useful data.

Useful test:

- choose 3-5 river sections
- seed them to a genuinely helpful level
- ask real paddlers or club contacts to use them
- watch whether they add or correct knowledge after a trip
- measure whether later users find those contributions useful

Positive signal:

- contributors add more than free-text comments
- hazards and access notes get confirmed or corrected
- photos attach to useful river objects
- users ask for more sections in the same format
- clubs or local paddlers are willing to steward a section

Negative signal:

- users only consume data and do not contribute
- contributions are too vague to trust
- moderation overhead is too high
- users prefer existing apps for the same job
- we cannot seed enough quality to make first use compelling

## Practical Recommendation

Continue, but keep the next milestone narrow:

1. Build the community knowledge MVP.
2. Add member sign-in before accepting real public contributions.
3. Persist contributions to the backend.
4. Support offline draft and sync as a first-class workflow.
5. Pilot with a few real paddlers on a few real sections.

The strategic question is not "Can we build another paddling app?"

The strategic question is "Can RiverLaunch.app become the trusted, fresh, community-maintained knowledge layer for real river sections?"
