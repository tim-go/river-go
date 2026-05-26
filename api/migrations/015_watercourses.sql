CREATE TABLE IF NOT EXISTS watercourses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_id text NOT NULL,
  source_version text NOT NULL DEFAULT '',
  source_url text NOT NULL DEFAULT '',
  licence text NOT NULL DEFAULT 'Open Database Licence',
  name text,
  alternate_name text,
  watercourse_type text NOT NULL DEFAULT 'watercourse',
  flow_direction text,
  form text,
  length_m numeric,
  geometry geometry(MultiLineString, 4326) NOT NULL,
  raw_properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1,
  UNIQUE (source, source_id, source_version)
);

CREATE INDEX IF NOT EXISTS watercourses_source_idx ON watercourses (source);
CREATE INDEX IF NOT EXISTS watercourses_name_idx ON watercourses (name);
CREATE INDEX IF NOT EXISTS watercourses_geometry_gix ON watercourses USING gist (geometry);
CREATE INDEX IF NOT EXISTS watercourses_raw_properties_gin ON watercourses USING gin (raw_properties);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'river_go_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON watercourses TO river_go_app;
  END IF;
END
$$;
