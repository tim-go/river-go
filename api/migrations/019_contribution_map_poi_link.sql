-- Member contributions (reports/photos/updates) can attach to an existing map
-- POI instead of dropping a duplicate marker. NULL means a standalone point.
ALTER TABLE contributions
ADD COLUMN IF NOT EXISTS map_poi_id text REFERENCES map_pois (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS contributions_map_poi_id_idx ON contributions (map_poi_id);
