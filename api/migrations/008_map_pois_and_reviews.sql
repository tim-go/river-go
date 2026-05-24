CREATE TABLE IF NOT EXISTS map_pois (
  id text PRIMARY KEY,
  section_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('access', 'hazard', 'feature', 'gauge')),
  geometry geometry(Point, 4326) NOT NULL,
  title text NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  source_kind text,
  source_label text,
  source_confidence text,
  source_updated_at text,
  source_url text,
  verification_status text NOT NULL DEFAULT 'needs-confirmation'
    CHECK (verification_status IN ('needs-confirmation', 'confirmed', 'needs-correction', 'resolved')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS map_pois_section_id_idx ON map_pois (section_id);
CREATE INDEX IF NOT EXISTS map_pois_kind_idx ON map_pois (kind);
CREATE INDEX IF NOT EXISTS map_pois_verification_status_idx ON map_pois (verification_status);
CREATE INDEX IF NOT EXISTS map_pois_geometry_gix ON map_pois USING gist (geometry);
CREATE INDEX IF NOT EXISTS map_pois_payload_gin ON map_pois USING gin (payload);

CREATE TABLE IF NOT EXISTS map_poi_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poi_id text NOT NULL REFERENCES map_pois (id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('confirm', 'correction')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS map_poi_reviews_poi_id_idx ON map_poi_reviews (poi_id);
CREATE INDEX IF NOT EXISTS map_poi_reviews_member_id_idx ON map_poi_reviews (member_id);
CREATE INDEX IF NOT EXISTS map_poi_reviews_decision_idx ON map_poi_reviews (decision);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'river_go_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON map_pois TO river_go_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON map_poi_reviews TO river_go_app;
  END IF;
END
$$;
