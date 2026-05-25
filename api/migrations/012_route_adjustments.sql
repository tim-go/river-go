CREATE TABLE IF NOT EXISTS route_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('section', 'route_suggestion')),
  target_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'needs_info', 'approved', 'rejected', 'hidden')),
  river_name text NOT NULL,
  section_name text NOT NULL,
  difficulty text NOT NULL DEFAULT 'Needs grading',
  summary text NOT NULL DEFAULT '',
  access_notes text NOT NULL DEFAULT '',
  evidence text NOT NULL DEFAULT '',
  route geometry(LineString, 4326) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS route_adjustments_member_id_idx ON route_adjustments (member_id);
CREATE INDEX IF NOT EXISTS route_adjustments_target_idx ON route_adjustments (target_type, target_id);
CREATE INDEX IF NOT EXISTS route_adjustments_status_idx ON route_adjustments (status);
CREATE INDEX IF NOT EXISTS route_adjustments_created_at_idx ON route_adjustments (created_at DESC);
CREATE INDEX IF NOT EXISTS route_adjustments_route_gix ON route_adjustments USING gist (route);
CREATE INDEX IF NOT EXISTS route_adjustments_payload_gin ON route_adjustments USING gin (payload);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'river_go_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON route_adjustments TO river_go_app;
  END IF;
END
$$;
