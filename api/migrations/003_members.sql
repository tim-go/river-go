CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid text NOT NULL UNIQUE,
  email text,
  display_name text,
  photo_url text,
  role text NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('MEMBER', 'ADMIN', 'CONTRIB_ADMIN')),
  trust_level text NOT NULL DEFAULT 'NEW',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz
);

CREATE INDEX IF NOT EXISTS members_email_idx ON members (lower(email));
CREATE INDEX IF NOT EXISTS members_role_idx ON members (role);
CREATE INDEX IF NOT EXISTS members_last_seen_at_idx ON members (last_seen_at DESC);

ALTER TABLE contributions
ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES members (id);

CREATE INDEX IF NOT EXISTS contributions_member_id_idx ON contributions (member_id);

ALTER TABLE sync_operations
ADD COLUMN IF NOT EXISTS actor_member_id uuid REFERENCES members (id);

CREATE INDEX IF NOT EXISTS sync_operations_actor_member_id_idx ON sync_operations (actor_member_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'river_go_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON members TO river_go_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON contributions TO river_go_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON sync_operations TO river_go_app;
  END IF;
END
$$;
