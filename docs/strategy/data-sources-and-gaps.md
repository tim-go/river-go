# Data Sources and Gaps

## Summary

RiverLaunch.app needs two categories of data:

- Authoritative baseline data: rivers, gauges, river levels, flow, flood warnings, paths, navigation notices, water quality, and broad map context.
- Community river intelligence: hazards, photos, access practicality, runnable ranges, canoe suitability, portages, recent condition reports, and local feature knowledge.

The product should use official and open data for the baseline, then differentiate through community-confirmed section-level knowledge.

## Data Strategy

RiverLaunch.app should not try to own every data source directly at the start. It should use a provider model:

- each external source has an adapter
- source data is normalised into RiverLaunch.app entities
- source attribution is stored and displayed where required
- official data is kept separate from user-submitted interpretation
- community data can refine, confirm, or contextualise official data

The primary product object remains the river section. External data is useful only when it helps users understand a specific section.

## UK Baseline Sources

## River Levels and Flow

### England: Environment Agency Flood Monitoring API

Use for:

- monitoring stations
- water level readings
- flow readings where available
- flood warnings and alerts
- recent readings
- station metadata

Notes:

- open data
- no registration required
- attribution is required
- readings are near real-time, but station reporting frequency varies
- some stations measure level only, while others may also provide flow

Reference:

https://environment.data.gov.uk/flood-monitoring/doc/reference

### England: Environment Agency Hydrology API

Use for:

- future hydrology integration investigation
- qualified hydrology readings
- newer station identifiers and data model

Notes:

- likely worth treating as the preferred future provider for England
- evaluate alongside the flood-monitoring API before committing

Reference:

https://www.api.gov.uk/ea/hydrology/

### Wales: Natural Resources Wales River Level Data

Use for:

- Welsh river level stations
- rainfall, river, and sea data where available
- live station data

Notes:

- NRW has live data from more than 400 monitoring stations
- API availability and access terms should be confirmed during implementation

Reference:

https://naturalresourceswales.gov.uk/about-us/news-and-blogs/news/enhanced-flood-warning-and-river-level-data-service-launched-by-nrw/

### Scotland: SEPA Water Level Data

Use for:

- Scottish river and loch water levels
- rainfall and river-level data where exposed through API
- station metadata and trend context

Notes:

- SEPA states that rainfall and river level data is available via API
- data model and rate limits should be checked before integration

Reference:

https://beta.sepa.scot/flooding/water-level-data/

### Northern Ireland: DfI Rivers

Use for:

- Northern Ireland river, sea, and lough levels
- hydrometric station data

Notes:

- DfI Rivers monitors around 130 active hydrometric stations
- API access and formats need investigation

Reference:

https://www.infrastructure-ni.gov.uk/articles/dfi-rivers-water-level-network

## Maps and River Geometry

### OpenStreetMap

Use for:

- waterways
- river names
- bridges
- weirs
- locks
- slipways
- access points
- footpaths and tracks
- parking
- campsites
- pubs and facilities
- railway stations and bus stops
- portage-related tags where present

Relevant tags:

- `waterway=river`
- `waterway=stream`
- `waterway=weir`
- `waterway=access_point`
- `canoe=put_in`
- `canoe=egress`
- `canoe=put_in;egress`
- `leisure=slipway`
- `portage=*`
- `access=*`

Notes:

- useful as broad map context
- data quality varies by area
- OSM access tags should not be treated as definitive legal access advice
- user-visible attribution is required when using OSM tiles or data

References:

https://wiki.openstreetmap.org/wiki/Tag:waterway%3Daccess_point

https://wiki.openstreetmap.org/wiki/Tag:canoe%3Dput_in

https://wiki.openstreetmap.org/wiki/Key:portage

### Ordnance Survey Open Rivers

Use for:

- GB river network geometry
- stable baseline river lines
- river naming and network structure investigation

Notes:

- refreshed every six months
- derived from Ordnance Survey large-scale data
- likely useful for seeding river geometry, but OSM may be richer for paddling-specific context

Reference:

https://docs.os.uk/os-downloads/products/water-portfolio/os-open-rivers/os-open-rivers-overview/os-open-rivers-data

## Navigation, Closures, and Stoppages

### Canal & River Trust

Use for:

- canal and navigation notices
- stoppages
- closures
- strong stream warnings
- water level warnings
- booking requirements
- waterway dimensions

Notes:

- important for navigation-style canoe trips and canal-connected rivers
- public website has notices and alert workflows
- investigate whether public API endpoints are stable and permitted for app use

Reference:

https://canalrivertrust.org.uk/notices

### Other Navigation Authorities

Likely sources to investigate:

- Environment Agency navigations
- Broads Authority
- Scottish Canals
- local harbour authorities
- local navigation trusts
- private navigation authorities

Gap:

- there is no single UK navigation notice source covering all canoe-relevant waterways.

## Water Quality

### Environment Agency Bathing Water Quality API

Use for:

- designated bathing water sites in England
- annual classifications
- in-season assessments
- bathing water profiles

Notes:

- useful where a paddling section overlaps or is near a designated bathing water
- does not cover every river section
- bathing water quality is not the same as full ecological health or paddling suitability

Reference:

https://environment.data.gov.uk/bwq/index.html

### Environment Agency Water Quality Explorer

Use for:

- broader water quality sampling data in England
- sampling points across rivers, lakes, canals, groundwater, coastal, and estuarine waters
- historical observations

Notes:

- potentially valuable, but may be too complex for the MVP
- should be considered later as an optional context layer

Reference:

https://www.data.gov.uk/collections/environment/water-quality

### Scotland, Wales, and Northern Ireland

Sources to investigate:

- SEPA water quality data
- Natural Resources Wales water quality data
- DAERA/NIEA water quality data

Gap:

- water quality data is devolved and inconsistent across the UK.

## Rights of Way and Access Context

### Local Authority Definitive Maps

Use for:

- public rights of way near put-ins, take-outs, portages, and emergency exits
- identifying paths to and from the water

Notes:

- definitive maps are legal records in England and Wales
- data is managed by local authorities and is fragmented
- many councils provide web maps or GIS downloads, but there is no simple national API
- presence of a path does not automatically mean canoe access is allowed at the water

Reference:

https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/414670/definitive-map-guide.pdf

### OpenStreetMap Paths and Access Tags

Use for:

- practical path geometry
- visible access routes
- tracks, paths, gates, steps, and parking

Notes:

- useful for route planning and carrying distance estimates
- not authoritative legal evidence
- should be displayed with caution for access-sensitive sections

## Weather and Rainfall

Potential sources:

- Environment Agency rainfall readings
- Met Office weather data
- Open-Meteo for general forecast context
- SEPA and NRW rainfall where available

Use for:

- recent rain context
- level trend interpretation
- trip planning conditions

Gap:

- rainfall is only indirectly useful unless linked to catchment behaviour and section-level level response.

## Europe-Later Sources

### European Flood Awareness System

Use for:

- broad European flood awareness
- modelled river discharge forecasts
- pan-European forecast context

Notes:

- useful for expansion strategy
- likely too coarse or complex for the first UK canoeing MVP
- should not replace local national gauge data where available

Reference:

https://www.copernicus.eu/en/european-flood-awareness-system

### European Bathing Water Data

Use for:

- European bathing water quality context
- country comparison and official bathing-site status

Notes:

- relevant for Europe expansion
- still does not solve local canoeing hazards, access, or runnable ranges

Reference:

https://environment.ec.europa.eu/topics/water/bathing-water_en

## Community-Only Data

These are the data categories where RiverLaunch.app can differentiate most strongly.

### Runnable Ranges

Official gauge data does not tell users whether a section is good for canoeing.

Community data should capture:

- gauge used for the section
- too low
- low but possible
- good
- high
- not recommended
- craft type
- ability level
- notes from recent trips

### Gauge-to-Section Mapping

A gauge may be upstream, downstream, on a tributary, affected by sluices, or only loosely representative.

Community data should capture:

- primary gauge for a section
- secondary gauges
- reliability notes
- lag after rainfall
- level interpretation
- known mismatch between gauge and actual section conditions

### Hazards

Official maps may show fixed structures like weirs, but they rarely capture temporary or condition-dependent hazards.

Community data should capture:

- fallen trees
- strainers
- flood debris
- blocked channels
- low bridges
- dangerous weir approaches
- damaged landings
- construction works
- pollution observations
- livestock or landowner issues

### Hazard Freshness

This is a major gap in existing data.

RiverLaunch.app should store:

- date observed
- last confirmed
- status
- confidence
- evidence photo
- confirmation count
- disputes
- resolved date

### Access Practicality

Legal access and practical access are different.

Community data should capture:

- parking practicality
- carry distance
- bank steepness
- mud
- steps
- gates
- locked barriers
- landing condition
- busy periods
- whether an open canoe can realistically be carried

### Access Sensitivity

Access notes should be careful and moderated.

Community data should capture:

- known local sensitivities
- seasonal restrictions
- landowner concerns
- club agreements
- navigation authority notes
- source and confidence

The app should avoid presenting community access notes as legal advice.

### Portage Quality

Portages are critical for canoeists and often poorly represented in general maps.

Community data should capture:

- start and end points
- route geometry
- distance
- surface
- steps or gates
- steepness
- difficulty with loaded canoes
- whether wheels help
- photos
- seasonal issues

### Canoe Suitability

Generic paddling data often fails to distinguish open canoe needs.

Community data should capture suitability for:

- open canoe
- tandem canoe
- solo canoe
- inflatable canoe
- touring kayak
- SUP
- whitewater kayak
- packraft

It should also capture:

- beginner suitability
- family suitability
- group suitability
- multi-day suitability

### Photos

Photos provide fast context and evidence.

Useful photo types:

- put-in
- take-out
- weir
- hazard
- portage
- bridge
- water level view
- parking
- access path
- campsite
- river character

### Recent Condition Reports

Condition reports are time-sensitive.

Examples:

- paddled today
- too low
- good level
- high and pushy
- tree still present
- access blocked
- take-out gate locked
- portage muddy
- parking full

Reports should become visually stale over time.

## Key Product Gaps

The main gaps RiverLaunch.app should solve are:

- no single UK-first canoe section guide with live data and community intelligence
- no reliable section-level runnable-range model for canoeists
- fragmented gauge coverage across UK nations
- weak mapping between gauges and actual paddleable sections
- poor freshness for hazards and obstructions
- fragmented and sensitive access information
- limited canoe-specific portage and carry-distance information
- lack of recent photos tied to hazards and access points
- poor beginner context for real-world section planning
- no simple way for clubs and trusted contributors to maintain local river knowledge

## MVP Data Priorities

For the MVP, prioritise:

1. seeded river sections
2. put-ins and take-outs
3. linked gauges
4. current level and trend
5. hazards
6. recent condition reports
7. access notes
8. photos
9. community confirmations
10. basic runnable-range guidance

Defer:

- full UK rights-of-way ingestion
- broad water quality layers
- Europe-wide hydrology
- advanced forecasting
- official navigation notices beyond selected pilot areas
- automated trip safety recommendations

## First Integration Recommendation

Start with the Environment Agency Flood Monitoring API for England because it is openly documented, requires no registration, and directly supports stations, levels, flows, and readings.

Build a generic provider interface at the same time:

- `Provider`
- `Station`
- `Measure`
- `Reading`
- `RiverSectionGaugeLink`

Then add NRW, SEPA, and DfI Rivers as separate providers once the model is proven.

## Open Questions

- Which UK region should be seeded first?
- Should OpenStreetMap or OS Open Rivers be the primary river geometry baseline?
- How should user-submitted access notes be moderated?
- Should water quality appear in the MVP, or only later?
- How should the app display contested access without creating legal risk?
- Should clubs be able to steward sections from the first public release?
- Should runnable ranges be curated by trusted users only, or inferred from repeated reports?

