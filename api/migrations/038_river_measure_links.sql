-- River-level gauge links, re-keyed off canonical rivers directly instead of
-- pivoting through the (retired-in-a-later-migration) fixture section chain
-- canonical_river_section_links -> section_measure_links. This is the join
-- listRiverLevelStates() needs for river marker level colouring; see
-- docs/development/plan-community-sections.md Phase 0.
CREATE TABLE IF NOT EXISTS river_measure_links (
  river_id   text NOT NULL,
  measure_id uuid NOT NULL REFERENCES observation_measures(id),
  relevance  text NOT NULL DEFAULT 'primary',
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (river_id, measure_id)
);
CREATE INDEX IF NOT EXISTS river_measure_links_river_id_idx ON river_measure_links (river_id);

-- Backfill from the existing fixture chain. A (river, measure) pair can be
-- linked at several relevances across the river's different fixture sections
-- (e.g. "downstream" for one section, "primary" for the next); river_measure_links
-- has no section granularity, so pick one relevance per (river, measure) pair,
-- preferring 'primary' so listRiverLevelStates' `WHERE relevance = 'primary'`
-- filter keeps matching exactly the gauges it matched before.
INSERT INTO river_measure_links (river_id, measure_id, relevance, notes)
SELECT DISTINCT ON (crsl.river_id, sml.measure_id)
  crsl.river_id, sml.measure_id, sml.relevance, sml.notes
FROM canonical_river_section_links crsl
JOIN section_measure_links sml ON sml.section_id = crsl.section_id
WHERE crsl.route_source = 'section_fixture'
ORDER BY crsl.river_id, sml.measure_id,
  CASE sml.relevance
    WHEN 'primary' THEN 1
    WHEN 'secondary' THEN 2
    WHEN 'upstream' THEN 3
    WHEN 'downstream' THEN 4
    WHEN 'rainfall_context' THEN 5
    WHEN 'tidal_context' THEN 6
    WHEN 'release_context' THEN 7
    ELSE 8
  END
ON CONFLICT (river_id, measure_id) DO NOTHING;
