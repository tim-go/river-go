-- Retire the seeded Wye/Tryweryn (and auto-generated "-main") section fixtures.
-- RiverLaunch must never itself declare a stretch of river paddleable —
-- sections are community-origin only (see
-- docs/development/plan-community-sections.md). Phase 0 already re-keyed the
-- reads that depended on this chain (river level colouring, river POIs); this
-- migration removes the fixture data itself. Tables stay (route_suggestions /
-- route_adjustments / route_overrides / poi_route_links /
-- canonical_river_section_links / section_measure_links all remain, just
-- emptied of fixture rows) — the canonical `routes` table arrives in a later
-- migration.
DELETE FROM poi_route_links            WHERE route_source = 'section_fixture';
DELETE FROM canonical_river_section_links WHERE route_source = 'section_fixture';
DELETE FROM section_measure_links;  -- all rows are fixture-keyed (verified 2026-07-02)
