CREATE TABLE IF NOT EXISTS observation_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_station_id text NOT NULL,
  name text NOT NULL,
  geometry geometry(Point, 4326),
  region text,
  catchment text,
  source_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_station_id)
);

CREATE INDEX IF NOT EXISTS observation_stations_provider_idx ON observation_stations (provider);
CREATE INDEX IF NOT EXISTS observation_stations_geometry_gix ON observation_stations USING gist (geometry);
CREATE INDEX IF NOT EXISTS observation_stations_metadata_gin ON observation_stations USING gin (metadata);

CREATE TABLE IF NOT EXISTS observation_measures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES observation_stations (id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_measure_id text NOT NULL,
  parameter text NOT NULL CHECK (
    parameter IN (
      'river_level',
      'river_flow',
      'rainfall',
      'tidal_level',
      'sea_level',
      'release',
      'forecast'
    )
  ),
  unit text NOT NULL,
  sampling_interval text,
  datum text,
  source_url text,
  enabled boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_measure_id)
);

CREATE INDEX IF NOT EXISTS observation_measures_station_id_idx ON observation_measures (station_id);
CREATE INDEX IF NOT EXISTS observation_measures_provider_idx ON observation_measures (provider);
CREATE INDEX IF NOT EXISTS observation_measures_parameter_idx ON observation_measures (parameter);
CREATE INDEX IF NOT EXISTS observation_measures_enabled_idx ON observation_measures (enabled);
CREATE INDEX IF NOT EXISTS observation_measures_metadata_gin ON observation_measures USING gin (metadata);

CREATE TABLE IF NOT EXISTS section_measure_links (
  section_id text NOT NULL,
  measure_id uuid NOT NULL REFERENCES observation_measures (id) ON DELETE CASCADE,
  relevance text NOT NULL CHECK (
    relevance IN (
      'primary',
      'secondary',
      'upstream',
      'downstream',
      'rainfall_context',
      'tidal_context',
      'release_context'
    )
  ),
  confidence text NOT NULL CHECK (
    confidence IN (
      'nearby-candidate',
      'section-candidate',
      'community-confirmed',
      'moderator-verified'
    )
  ),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (section_id, measure_id, relevance)
);

CREATE INDEX IF NOT EXISTS section_measure_links_measure_id_idx ON section_measure_links (measure_id);
CREATE INDEX IF NOT EXISTS section_measure_links_confidence_idx ON section_measure_links (confidence);

CREATE TABLE IF NOT EXISTS observation_readings (
  measure_id uuid NOT NULL REFERENCES observation_measures (id) ON DELETE CASCADE,
  observed_at timestamptz NOT NULL,
  value double precision NOT NULL,
  quality text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (measure_id, observed_at)
);

CREATE INDEX IF NOT EXISTS observation_readings_observed_at_idx ON observation_readings (observed_at DESC);

CREATE TABLE IF NOT EXISTS observation_latest_readings (
  measure_id uuid PRIMARY KEY REFERENCES observation_measures (id) ON DELETE CASCADE,
  observed_at timestamptz NOT NULL,
  value double precision NOT NULL,
  quality text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  state text NOT NULL DEFAULT 'live' CHECK (state IN ('live', 'stale', 'unavailable', 'error')),
  raw jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS observation_latest_readings_observed_at_idx ON observation_latest_readings (observed_at DESC);
CREATE INDEX IF NOT EXISTS observation_latest_readings_state_idx ON observation_latest_readings (state);

CREATE TABLE IF NOT EXISTS observation_job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  measures_attempted integer NOT NULL DEFAULT 0,
  readings_fetched integer NOT NULL DEFAULT 0,
  readings_inserted integer NOT NULL DEFAULT 0,
  readings_updated integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  message text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS observation_job_runs_job_type_idx ON observation_job_runs (job_type);
CREATE INDEX IF NOT EXISTS observation_job_runs_provider_idx ON observation_job_runs (provider);
CREATE INDEX IF NOT EXISTS observation_job_runs_status_idx ON observation_job_runs (status);
CREATE INDEX IF NOT EXISTS observation_job_runs_started_at_idx ON observation_job_runs (started_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'river_go_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON observation_stations TO river_go_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON observation_measures TO river_go_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON section_measure_links TO river_go_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON observation_readings TO river_go_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON observation_latest_readings TO river_go_app;
    GRANT SELECT, INSERT, UPDATE ON observation_job_runs TO river_go_app;
  END IF;
END
$$;
