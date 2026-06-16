-- Member-owned paddle history (PROFILE-F1). Private by default; later sharing
-- controls hang off `visibility`. A log may link a canonical river and/or
-- section, or just name a venue/training ground freely.

CREATE TABLE IF NOT EXISTS paddle_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  river_id text,
  section_id text,
  venue text,
  title text NOT NULL,
  paddled_on date NOT NULL,
  level_note text,
  craft_type text,
  companions text,
  notes text,
  visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'friends', 'public')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS paddle_logs_member_idx ON paddle_logs (member_id, paddled_on DESC);
CREATE INDEX IF NOT EXISTS paddle_logs_member_river_idx ON paddle_logs (member_id, river_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'river_go_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON paddle_logs TO river_go_app;
  END IF;
END
$$;
