# Canonical River Source Spike

**Generated:** 2026-06-05T15:08:20.510Z

## Purpose

This report is a repeatable evidence snapshot for the RiverLaunch canonical river database spike. It inspects public source metadata, lightweight official feature samples, OS download availability, and OSM candidate feature tags across pilot rivers. It does not write to the application database.

## Summary

- OS Open Rivers remains the best identified Great Britain river-network bootstrap candidate, but the direct OS download endpoint still needs a successful file sample before implementation.
- EA WFD and Statutory Main River OGC APIs are reachable and expose useful official IDs/status/context, not paddling guidance.
- OpenDataNI/DAERA WFD is reachable through the ArcGIS service and provides polygon waterbody context for Northern Ireland.
- OSM pilot samples expose useful candidate POI and feature tags, especially rapids, weirs, whitewater grades/names, access/boat/canoe hints, tunnels, bridges, tidal/intermittent flags, and named structures.

## CKAN Source Metadata

| Source | OK | Licence | Preferred resources | Source URL |
| --- | --- | --- | --- | --- |
| OS Open Rivers | yes | Unknown | GeoPackage download ; Shapefile download  | https://ckan.publishing.service.gov.uk/dataset/os-open-rivers1 |
| OS Open Names | yes | Unknown | Geopackage download ; CSV download  | https://ckan.publishing.service.gov.uk/dataset/os-open-names1 |
| Environment Agency Statutory Main River Map | yes | Unknown | OGC API - Features service ; Statutory_Main_River_Map.geojson.zip (ZIP) | https://ckan.publishing.service.gov.uk/dataset/statutory-main-river-map |
| EA WFD River/Canal/SWT Waterbodies Cycle 2 | yes | Unknown | OGC API - Features service ; WFD_River_Canal_and_Surface_Water_Transfer_Waterbodies_Cycle_2.geojson.zip (ZIP) | https://ckan.publishing.service.gov.uk/dataset/wfd-river-canal-and-surface-water-transfer-waterbodies-cycle-2 |
| OpenDataNI / DAERA WFD River Water Bodies 2nd Cycle | yes | UK Open Government Licence (OGL) | ArcGIS GeoService (JSON); GeoJSON (GeoJSON) | https://ckan.publishing.service.gov.uk/dataset/wfd-river-water-bodies-2nd-cycle11 |

## OS Download Probes

| Probe | OK | Status | Content type | Content length | Result |
| --- | --- | --- | --- | --- | --- |
| OS Open Rivers GeoPackage | no | 500 | application/json | 127 | HTTP 500 |
| OS Open Rivers Shapefile | no | 500 | application/json | 127 | HTTP 500 |
| OS Open Names GeoPackage | no | 500 | application/json | 127 | HTTP 500 |

## Official Feature Samples

| Source | OK | Count | Returned | Geometry | Property keys | Sample properties |
| --- | --- | --- | --- | --- | --- | --- |
| EA WFD River/Canal/SWT Waterbodies Cycle 2 | yes | 3924 | 2 | MultiLineString | wb_id, wb_name, rbd_id, rbd_name, wb_cat, length_m, gdb_geomattr_data | {"wb_id":"GB102077074150","wb_name":"Hether Burn","rbd_id":"2","rbd_name":"Solway Tweed","wb_cat":"River","length_m":"22495.1627391","gdb_geomattr_data":null} |
| EA Statutory Main River Map | yes | 183911 | 2 | MultiLineString | status, length_km, shape_length | {"status":"Main River","length_km":1.0791344562415377,"shape_length":null} |
| OpenDataNI / DAERA WFD River Water Bodies 2nd Cycle | yes | 450 | 2 | Polygon | OBJECTID, localid, namespace, spzonetype, area_km2, shape_star, shape_stle, SHAPE__Length, SHAPE__Area, GlobalID, Shape__Area_2, Shape__Length_2 | {"OBJECTID":1,"localid":"UKGBNI1NW363604083","namespace":"Woodford River","spzonetype":"riverWaterBody","area_km2":23.16673,"shape_star":23166734.4805,"shape_stle":51188.109838,"SHAPE__Length":51188.10983797,"SHAPE__Area":23166734.48013454,"GlobalID":"9ac3f49c-b949-47b6-8277-25ebd49308f4","Shape__Area_2":23166734.48045349,"Shape__Length_2":51188.10983796122} |

## OSM Pilot Feature Samples

| Pilot river | OK | Query | Reason | BBox | Elements | Element types | Waterway values | Useful tags | Candidate POI tags | Named candidate examples |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tryweryn | yes | waterway-and-candidates | Managed dam-release whitewater pilot. | 52.9,-3.7,52.99,-3.55 | 137 | way: 127; node: 7; relation: 3 | stream: 71; river: 30; drain: 15; weir: 8; rapids: 6; canal: 2; flowline: 2; dam: 1; ditch: 1; historic: 1 | waterway: 137; tunnel: 18; whitewater:section_grade: 9; rapids: 6; boat: 3; wikidata: 2; wikipedia: 2 | whitewater-section: 9; waterway=weir: 8; waterway=rapids: 6; waterway=dam: 1 | Ski Jump (waterway=rapids, node/444464372); Bala Mill Falls (waterway=rapids, node/444464639); NRA Bridge (waterway=rapids, node/444868403); Chapel Falls (waterway=rapids, node/444868404); Fedr Goch Bridge (waterway=rapids, node/444868405); Cafe Wave (waterway=rapids, node/10055552619); Afon Tryweryn (whitewater-section, way/25455784); Afon Tryweryn (whitewater-section, way/25455790) |
| Wye | yes | waterway-and-candidates | Touring/open-canoe pilot with broad public awareness. | 52,-3.15,52.15,-2.6 | 1000 | way: 988; node: 12 | stream: 799; ditch: 134; river: 46; lock_gate: 7; drain: 5; weir: 5; derelict_canal: 2; waterfall: 1 | waterway: 999; tunnel: 169; intermittent: 114; boat: 78; rapids: 2; access: 1; tidal: 1; whitewater:section_grade: 1; whitewater:section_name: 1; wikidata: 1; wikipedia: 1 | waterway=lock_gate: 7; waterway=weir: 5; rapids: 2; waterway=waterfall: 1; whitewater-section: 1 | Molly's Waterfall (waterway=waterfall, node/12282543317); River Wye (rapids, way/126776532); River Wye (rapids, way/126776540); Monnington Falls (whitewater-section, way/126776547); Yazor Brook Flood Alleviation Scheme (waterway=weir, way/219889962) |
| Dee / Llangollen | yes | waterway-and-candidates | Welsh whitewater and canal/aqueduct context. | 52.94,-3.25,53.05,-3.05 | 354 | way: 344; node: 5; relation: 5 | stream: 283; river: 32; canal: 21; weir: 5; turning_point: 3; boatyard: 2; dam: 2; ditch: 2; drain: 2; lock_gate: 1; sanitary_dump_station: 1 | waterway: 354; boat: 83; tunnel: 78; operator: 14; wikidata: 7; wikipedia: 6; intermittent: 5; bridge: 2; access: 1 | waterway=weir: 5; waterway=turning_point: 3; waterway=dam: 2; waterway=lock_gate: 1; waterway=sanitary_dump_station: 1 | Llangollen Elsan Point (waterway=sanitary_dump_station, node/10969591094); Horseshoe Falls (waterway=weir, way/93945121); Llangollen Town Weir (waterway=weir, way/98009685) |
| Dart Loop | yes | waterway-and-candidates | English whitewater candidate. | 50.48,-3.9,50.62,-3.7 | 700 | way: 681; node: 13; relation: 6 | stream: 519; drain: 79; river: 76; ditch: 5; sluice_gate: 4; dam: 3; flowline: 3; weir: 3; canal: 2; leat: 2; rapids: 2; waterfall: 2 | waterway: 700; boat: 167; tunnel: 150; canoe: 14; wikidata: 14; wikipedia: 14; intermittent: 9; rapids: 5; bridge: 1 | rapids: 4; waterway=sluice_gate: 4; waterway=dam: 3; waterway=weir: 3; waterway=rapids: 2; waterway=waterfall: 2 | Washing Machine Rapid (waterway=rapids, node/232656353); Buckfast Weir (waterway=weir, node/6091084770); Venford Waterfall (waterway=waterfall, node/6750910790); Dart (rapids, way/21132542); Dart (rapids, way/21612133); Dart (rapids, way/21612138); Dart (rapids, way/21612330) |
| Tay / Grandtully | yes | waterway-and-candidates | Scottish pilot where official WFD source discovery remains open. | 56.55,-3.85,56.75,-3.55 | 1000 | way: 975; node: 25 | stream: 824; ditch: 81; river: 21; drain: 19; dam: 15; waterfall: 15; canal: 10; rapids: 6; flowline: 5; weir: 3; fish_pass: 1 | waterway: 1000; tunnel: 228; intermittent: 30; wikidata: 8; rapids: 7; whitewater:section_grade: 2; wikipedia: 2 | waterway=dam: 15; waterway=waterfall: 15; waterway=rapids: 6; waterway=weir: 3; whitewater-section: 2 | Fisherman's Rapid (waterway=rapids, node/33728990); Grandtully Bottom Fall (waterway=weir, node/33729018); Grandtully Falls (waterway=rapids, node/255822388); S-bend (waterway=rapids, node/492158073); Linn of Tummel (waterway=rapids, node/492158078); Falls of Braan (waterway=waterfall, node/492213929); Falls of the Braan (waterway=waterfall, node/887108486); The Black Spout (waterway=waterfall, node/1239120459) |

## OSM Tag Frequency Detail

### Tryweryn

Top tags: `waterway` 137, `name` 61, `source` 36, `tunnel` 18, `layer` 14, `name:cy` 11, `name:en` 10, `whitewater:section_grade` 9, `rapids` 6, `boat` 3, `type` 3, `wikidata` 2

### Wye

Top tags: `waterway` 999, `source` 796, `tunnel` 169, `layer` 156, `name` 140, `intermittent` 114, `historic` 100, `boat` 78, `admin_level` 19, `boundary` 19, `name:cy` 16, `alt_name:cy` 14

### Dee / Llangollen

Top tags: `waterway` 354, `name` 99, `source` 92, `layer` 85, `boat` 83, `tunnel` 78, `name:cy` 31, `name:en` 25, `operator` 14, `motorboat` 11, `wikidata` 7, `wikipedia` 6

### Dart Loop

Top tags: `waterway` 700, `source` 300, `name` 225, `boat` 167, `layer` 153, `tunnel` 150, `admin_level` 56, `boundary` 56, `source:alignment` 27, `note` 19, `canoe` 14, `wikidata` 14

### Tay / Grandtully

Top tags: `waterway` 1000, `source` 228, `tunnel` 228, `layer` 196, `name` 182, `intermittent` 30, `name:gd` 16, `alt_name:gd` 11, `width` 8, `wikidata` 8, `description` 7, `height` 7

## Implementation Implications

1. Add source-owned tables/imports before canonical `rivers`. The existing `watercourses` model already has the right provenance shape, but canonical records need separate source links.
2. Keep OSM line geometry as the map-aligned snap/display layer. Use OSM nodes/ways with candidate tags as source-derived POI candidates, not confirmed hazards/features.
3. Treat EA/NRW/SEPA/DAERA WFD and Main River datasets as official enrichment/context. They should link to rivers and observation providers, not create route suitability.
4. Do not start a national canonical generation until OS Open Rivers file access and schema are confirmed and pilot river matching is reviewed.

## Recommended Next Build Slice

Build a non-public pilot importer that creates source-owned `river_source_features`, `canonical_rivers`, and `river_source_links` rows for the five pilot rivers only, plus `source_candidate_pois` rows for OSM feature tags in review-needed state.

