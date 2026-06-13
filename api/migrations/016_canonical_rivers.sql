CREATE TABLE IF NOT EXISTS canonical_rivers (
  id text PRIMARY KEY,
  canonical_name text NOT NULL,
  display_name text NOT NULL,
  country text NOT NULL DEFAULT 'GB',
  region text NOT NULL DEFAULT '',
  river_type text NOT NULL DEFAULT 'river',
  summary text NOT NULL DEFAULT '',
  overview_location geometry(Point, 4326) NOT NULL,
  bbox geometry(Polygon, 4326) NOT NULL,
  source_confidence text NOT NULL DEFAULT 'pilot-curated',
  curation_status text NOT NULL DEFAULT 'candidate',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS canonical_rivers_overview_location_gix ON canonical_rivers USING gist (overview_location);
CREATE INDEX IF NOT EXISTS canonical_rivers_bbox_gix ON canonical_rivers USING gist (bbox);
CREATE INDEX IF NOT EXISTS canonical_rivers_curation_status_idx ON canonical_rivers (curation_status);
CREATE INDEX IF NOT EXISTS canonical_rivers_payload_gin ON canonical_rivers USING gin (payload);

CREATE TABLE IF NOT EXISTS river_source_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_id text NOT NULL,
  source_version text NOT NULL DEFAULT '',
  source_url text NOT NULL DEFAULT '',
  licence text NOT NULL DEFAULT '',
  feature_type text NOT NULL DEFAULT 'source-feature',
  name text,
  geometry geometry(Geometry, 4326) NOT NULL,
  raw_properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1,
  UNIQUE (source, source_id, source_version)
);

CREATE INDEX IF NOT EXISTS river_source_features_source_idx ON river_source_features (source);
CREATE INDEX IF NOT EXISTS river_source_features_feature_type_idx ON river_source_features (feature_type);
CREATE INDEX IF NOT EXISTS river_source_features_name_idx ON river_source_features (name);
CREATE INDEX IF NOT EXISTS river_source_features_geometry_gix ON river_source_features USING gist (geometry);
CREATE INDEX IF NOT EXISTS river_source_features_raw_properties_gin ON river_source_features USING gin (raw_properties);

CREATE TABLE IF NOT EXISTS river_source_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  river_id text NOT NULL REFERENCES canonical_rivers (id) ON DELETE CASCADE,
  source_feature_id uuid NOT NULL REFERENCES river_source_features (id) ON DELETE CASCADE,
  relationship_type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  confidence text NOT NULL DEFAULT 'source-derived',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (river_id, source_feature_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS river_source_links_river_idx ON river_source_links (river_id);
CREATE INDEX IF NOT EXISTS river_source_links_source_feature_idx ON river_source_links (source_feature_id);
CREATE INDEX IF NOT EXISTS river_source_links_status_idx ON river_source_links (status);

CREATE TABLE IF NOT EXISTS canonical_river_section_links (
  river_id text NOT NULL REFERENCES canonical_rivers (id) ON DELETE CASCADE,
  route_source text NOT NULL DEFAULT 'section_fixture',
  section_id text NOT NULL,
  relationship_type text NOT NULL DEFAULT 'contains-section',
  status text NOT NULL DEFAULT 'active',
  confidence text NOT NULL DEFAULT 'pilot-curated',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (river_id, route_source, section_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS canonical_river_section_links_section_idx ON canonical_river_section_links (route_source, section_id);
CREATE INDEX IF NOT EXISTS canonical_river_section_links_status_idx ON canonical_river_section_links (status);

CREATE TABLE IF NOT EXISTS source_candidate_pois (
  id text PRIMARY KEY,
  river_id text REFERENCES canonical_rivers (id) ON DELETE SET NULL,
  source_feature_id uuid REFERENCES river_source_features (id) ON DELETE SET NULL,
  source text NOT NULL,
  source_id text NOT NULL,
  source_version text NOT NULL DEFAULT '',
  source_url text NOT NULL DEFAULT '',
  licence text NOT NULL DEFAULT '',
  candidate_type text NOT NULL,
  title text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'review_needed',
  geometry geometry(Geometry, 4326) NOT NULL,
  raw_properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1,
  UNIQUE (source, source_id, source_version)
);

CREATE INDEX IF NOT EXISTS source_candidate_pois_river_idx ON source_candidate_pois (river_id);
CREATE INDEX IF NOT EXISTS source_candidate_pois_source_idx ON source_candidate_pois (source);
CREATE INDEX IF NOT EXISTS source_candidate_pois_candidate_type_idx ON source_candidate_pois (candidate_type);
CREATE INDEX IF NOT EXISTS source_candidate_pois_status_idx ON source_candidate_pois (status);
CREATE INDEX IF NOT EXISTS source_candidate_pois_geometry_gix ON source_candidate_pois USING gist (geometry);
CREATE INDEX IF NOT EXISTS source_candidate_pois_raw_properties_gin ON source_candidate_pois USING gin (raw_properties);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'river_go_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON canonical_rivers TO river_go_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON river_source_features TO river_go_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON river_source_links TO river_go_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON canonical_river_section_links TO river_go_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON source_candidate_pois TO river_go_app;
  END IF;
END
$$;
