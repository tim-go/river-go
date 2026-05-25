CREATE TABLE IF NOT EXISTS route_overrides (
  route_source text NOT NULL DEFAULT 'section_fixture',
  route_id text NOT NULL,
  route geometry(LineString, 4326) NOT NULL,
  source_route_adjustment_id uuid REFERENCES route_adjustments (id) ON DELETE SET NULL,
  applied_by uuid REFERENCES members (id) ON DELETE SET NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  notes text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1,
  PRIMARY KEY (route_source, route_id)
);

CREATE INDEX IF NOT EXISTS route_overrides_route_gix ON route_overrides USING gist (route);
CREATE INDEX IF NOT EXISTS route_overrides_applied_at_idx ON route_overrides (applied_at DESC);
CREATE INDEX IF NOT EXISTS route_overrides_payload_gin ON route_overrides USING gin (payload);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'river_go_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON route_overrides TO river_go_app;
  END IF;
END
$$;
