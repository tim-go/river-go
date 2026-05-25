CREATE TABLE IF NOT EXISTS route_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('local_draft', 'pending_review', 'needs_info', 'approved', 'rejected', 'hidden')),
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

CREATE INDEX IF NOT EXISTS route_suggestions_member_id_idx ON route_suggestions (member_id);
CREATE INDEX IF NOT EXISTS route_suggestions_status_idx ON route_suggestions (status);
CREATE INDEX IF NOT EXISTS route_suggestions_created_at_idx ON route_suggestions (created_at DESC);
CREATE INDEX IF NOT EXISTS route_suggestions_route_gix ON route_suggestions USING gist (route);
CREATE INDEX IF NOT EXISTS route_suggestions_payload_gin ON route_suggestions USING gin (payload);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'river_go_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON route_suggestions TO river_go_app;
  END IF;
END
$$;
