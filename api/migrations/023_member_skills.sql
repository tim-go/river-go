-- Member-declared skills & qualifications (PROFILE-F5). Self-declared only —
-- these never become automated claims that a paddler is safe, competent, or
-- suitable to lead. Club/coach verification is a later workflow.

CREATE TABLE IF NOT EXISTS member_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  category text NOT NULL,
  name text NOT NULL,
  detail text,
  attained_on date,
  expires_on date,
  self_declared boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS member_skills_member_idx ON member_skills (member_id, category);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'river_go_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON member_skills TO river_go_app;
  END IF;
END
$$;
