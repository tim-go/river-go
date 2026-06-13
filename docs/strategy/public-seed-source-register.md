# Public Seed Source Register

## Summary

RiverLaunch.app should source seed data from public material, but only through a controlled source register.

The register is not a scraping backlog. It records which public sources can be used as open data, which can only be used as references, and which need permission or partnership before any route geometry, POIs, text, photos, GPX, or structured trail data is imported.

This is the **canonical source register**. `/docs/strategy/data-sources-and-gaps.md` covers the wider source landscape and gaps; `/docs/strategy/community-data-strategy.md` §Source Register explains the policy.

## Seed Source Rules

- Do not create a paddleable route from map geometry alone.
- Do not copy guidebook, forum, app, club, venue, or PaddlePoints content into RiverLaunch.app unless reuse rights are explicit or permission is granted.
- Public pages may be used to identify candidate sections, source questions, and verification prompts.
- Open-data providers may be used for baseline facts, subject to attribution and licence terms.
- Route seed records must carry source metadata, checked date, confidence, and verification status.
- Any route sourced from partner/licensed material still needs local confidence review before becoming canonical.

## Source Classifications

| Classification | Meaning | Seed Use |
| --- | --- | --- |
| Open data | Published with a reusable open licence or public API terms that allow reuse. | May be ingested with attribution and licence compliance. |
| Reference only | Publicly visible, but no clear reuse right for structured route content. | Use for discovery, source metadata, and contributor prompts only. |
| Permission needed | Valuable structured route or POI source, but terms require permission or partnership. | Contact owner before import; no scraping. |
| Do not copy | Community, guidebook, forum, photo, or copyrighted narrative content. | Do not import or paraphrase into product data. |

## Current Register

| Source | Type | Coverage | Candidate Data | Classification | Current Seed Use | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Environment Agency Flood Monitoring API | Public agency API | England | Stations, level readings, flow where available, flood alerts | Open data | Ingest through observation provider | Attribution required; route suitability still comes from community/section data. |
| Natural Resources Wales river levels, rainfall, and sea data | Public agency API | Wales | River levels, rainfall totals, tide/sea levels, station history | Open data | Ingest through observation provider | API product describes recent and historical monitoring data; useful for Welsh routes and future route suggestions. |
| SEPA water level data | Public agency API | Scotland | River, loch, rainfall, and coastal level readings | Open data / API access to confirm | Future observation provider | SEPA states rainfall and river level data is available via API; terms and usage limits need implementation review. |
| OS Open Rivers | National mapping open dataset | Great Britain | Watercourse geometry, names, flow/connectivity context, freshwater rivers, tidal estuaries, canals | Open data | Canonical river bootstrap candidate | Strongest identified GB river-network source; source-owned import only. Direct OS GeoPackage download returned a datastore error during the 2026-06-05 spike, so schema sampling remains open. |
| OS Open Names | National mapping open dataset | Great Britain | Gazetteer names, alternate names, Welsh/Scots/Gaelic language variants, search context | Open data | Name/search enrichment | Not a watercourse geometry source; useful for river page search and alternate-name links. |
| Environment Agency Statutory Main River Map | Public agency spatial dataset | England | Main-river status, line geometry, length | Public spatial data / licence confirmation needed | Official status overlay | Sampled GeoJSON exposed `status`, `length_km`, and MultiLineString geometry but no river names; use only as status context. |
| Environment Agency WFD River, Canal and Surface Water Transfer Waterbodies Cycle 2 | Public agency spatial dataset | England | Official waterbody IDs, waterbody names, river basin district IDs/names, category, length | Public spatial data / licence confirmation needed | Official waterbody and basin links | Sampled GeoJSON exposed `wb_id`, `wb_name`, `rbd_id`, `rbd_name`, `wb_cat`, `length_m`; environmental units, not paddling sections. |
| Environment Agency WFD River Waterbody Catchments Cycle 2 | Public agency spatial dataset | England | Catchment polygons, waterbody IDs/names, basin context, area/length | Public spatial data / licence confirmation needed | Catchment context links | Useful for official context and provider linking; polygon catchments are not river-line geometry. |
| NRW WFD River Waterbodies / Catchments | Public agency spatial datasets | Wales | Official WFD waterbody/catchment context | Open data / licence confirmation needed | Welsh official waterbody links | DataMapWales/data.gov resources exist; direct file sampling and licence confirmation remain open. |
| OpenDataNI / DAERA WFD River Water Bodies 2nd Cycle | Public agency spatial dataset | Northern Ireland | WFD river waterbody polygons, local IDs, namespace/name context, area | Open data under UK OGL | NI official waterbody links | Sampled GeoJSON exposed `localid`, `namespace`, `spzonetype`, `area_km2`, and polygon geometry. |
| OpenStreetMap waterways | Open map data | Global | Waterway geometry and map context | Open data | Geometry support only | Active visual snap/overlay source; may help draw routes after paddling evidence exists, but is not route authority. |
| OpenStreetMap | Community open map database | UK and Europe | River geometry, rapids, weirs, waterfalls, dams, sluices, locks, bridges, tunnels, access/canoe/boat tags, tidal/intermittent flags, Wikidata/Wikipedia links, paths, facilities | Open data under ODbL | Basemap/context, prototype route traces, and review-needed candidate POIs | ODbL obligations apply; OSM tags are uneven and not legal/access/safety assurance. |
| National White Water Centre / Canolfan Tryweryn river guide | Venue/river-specific public page | Afon Tryweryn | Section split, approximate lengths, grade bands, venue warnings, obstruction notices | Reference only unless permission granted | Source metadata and verification prompts | Good source for Tryweryn seed context. Do not copy map, guide text, or exact POIs without permission/verification. |
| National White Water Centre water level information | Venue/river-specific public page | Afon Tryweryn | Release calendar, flow notes, operational availability | Reference only unless permission/API agreed | Source metadata and manual release check | Production needs a stable release provider or permissioned ingest. |
| Go Paddling Paddling Trails | Paddle UK route/trail pages | UK | Published trails, PDF downloads, GPX files, distance/time/difficulty, start/end context | Permission needed | Discovery and source register only | Valuable first partnership target. Public page reports 171 trails and GPX downloads, but terms do not grant RiverLaunch.app import rights. |
| PaddlePoints | Paddle UK community map service | UK | Launches, routes, comments, photos, user-submitted public/private points | Permission needed / do not scrape | Partnership target only | Terms disallow data-mining/extraction tools and Paddle UK controls service content reuse. |
| UK Rivers Guidebook | Community guidebook | UK rivers and sea | Route names, grades, descriptions, reports, local notes | Do not copy | Discovery only | Useful for understanding candidate rivers and taxonomy. Do not copy descriptions, hazards, grades, or routes. |
| Paddle Cymru / Canoe Wales trails | National paddling organisation | Wales | Paddling trails, maps, access notes, grades, GPX where available | Permission needed | Discovery/partnership target | Strong fit for Welsh expansion, but route data needs explicit reuse terms or partnership. |
| Paddle Scotland and recognised trail projects | National/regional paddling organisations | Scotland | Recognised trails, canoe trails, regional paddling guidance | Permission needed | Discovery/partnership target | Fragmented but strategically useful for Scotland. |
| Paddle NI / Outmore NI canoe trails | National/regional trail sources | Northern Ireland | Canoe trails, access/camping context | Permission needed | Later UK expansion research | Useful once England/Wales/Scotland flow is proven. |
| Local clubs and operators | Club/operator public pages | Local rivers | Club trip areas, access sensitivity, river notes | Reference only / permission needed | Contributor recruitment and verification prompts | These sources should generate local validation tasks, not copied data. |
| Managed whitewater centres | Venue public pages | Individual venues | Course existence, opening/booking context, facility details, course grades where published | Reference only unless permission granted | Candidate venue entries and partnership prompts | Includes centres such as Lee Valley, Cardiff, Tees Barrage, Holme Pierrepont, and Nene. |

## First Practical Seed Targets

The next useful seed pass should focus on a small number of routes where public references, open observation data, and community verification can meet quickly:

1. Tryweryn: keep as the managed dam-release pilot and formalise the source check against Canolfan Tryweryn plus NRW context stations.
2. Wye: keep as the touring/open-canoe pilot and use Go Paddling/Wye public sources only as reference metadata until Paddle UK permission is agreed.
3. Dee / Llangollen: candidate Welsh whitewater route, but needs Canoe Wales/Paddle UK/local club verification before any detailed POI data is shown confidently.
4. Dart Loop: candidate English whitewater route, but route suitability and access must come from local contributor verification or permissioned source material.
5. One Scottish touring route: candidate Spey/Tay route using SEPA levels and local contributor review.

This keeps the product useful without pretending public route pages are an importable national dataset.

## Seed Record Requirements

Every sourced seed section should record:

- source URL
- source organisation
- source classification
- date checked
- data type used: levels, geometry, section existence, access reference, route text, GPX, photo, warning, facility, or release data
- permitted use: ingest, reference, discovery, partnership needed, or do not copy
- confidence: seed, low, medium, or high
- verification status: suggested, imported, community-reviewed, verified, stale, or disputed
- outstanding questions for contributors/moderators

## Workflow

1. Add candidate source to this register.
2. Classify licence/permission before extracting any data.
3. If open-data, ingest through a provider or controlled seed file with attribution.
4. If reference-only, create candidate route/source metadata and verification prompts only.
5. If permission-needed, contact the source owner before importing route data, GPX, POIs, photos, or narrative content.
6. Ask local contributors to verify access, hazards, photos, and runnable interpretation.
7. Promote sections only when source confidence and community confidence support it.

## References Checked

- Environment Agency Flood Monitoring API: `https://environment.data.gov.uk/flood-monitoring/doc/reference`
- Natural Resources Wales API portal: `https://api-portal.naturalresources.wales/products`
- Natural Resources Wales data.gov.uk river levels dataset: `https://www.data.gov.uk/dataset/ef2fa5bc-2511-4522-b9e8-9d11c3caa20b/river-levels-application-programming-interface-api2`
- SEPA water levels: `https://www.sepa.org.uk/environment/water/water-levels/`
- OS Open Rivers docs: `https://docs.os.uk/os-downloads/networks/os-open-rivers`
- OS Open Rivers CKAN: `https://ckan.publishing.service.gov.uk/dataset/os-open-rivers1`
- OS Open Names docs: `https://docs.os.uk/os-downloads/addressing-and-location/os-open-names`
- OS Open Names CKAN: `https://ckan.publishing.service.gov.uk/dataset/os-open-names1`
- Environment Agency Statutory Main River Map: `https://ckan.publishing.service.gov.uk/dataset/statutory-main-river-map`
- Environment Agency WFD River, Canal and Surface Water Transfer Waterbodies Cycle 2: `https://ckan.publishing.service.gov.uk/dataset/wfd-river-canal-and-surface-water-transfer-waterbodies-cycle-2`
- Environment Agency WFD River Waterbody Catchments Cycle 2: `https://ckan.publishing.service.gov.uk/dataset/wfd-river-waterbody-catchments-cycle-2`
- OpenDataNI WFD River Water Bodies 2nd Cycle: `https://ckan.publishing.service.gov.uk/dataset/wfd-river-water-bodies-2nd-cycle11`
- OpenStreetMap waterways: `https://wiki.openstreetmap.org/wiki/Key:waterway`
- OpenStreetMap copyright and licence: `https://www.openstreetmap.org/copyright`
- National White Water Centre river guide: `https://www.nationalwhitewatercentre.co.uk/the-river`
- National White Water Centre water level information: `https://www.nationalwhitewatercentre.co.uk/water-level-information`
- Go Paddling trails: `https://gopaddling.info/find-paddling-trails/`
- PaddlePoints terms: `https://gopaddling.info/blog/paddlepoints/paddlepoints-terms-of-use/`
- UK Rivers Guidebook river index: `https://www.ukriversguidebook.co.uk/rivers/`

**Last checked:** 2026-06-05
