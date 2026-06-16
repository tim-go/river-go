-- Member-owned private kit inventory (PROFILE-F4). Private by default; serials
-- and markings are stored only on the member's private record.

CREATE TABLE IF NOT EXISTS kit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  category text NOT NULL,
  name text NOT NULL,
  notes text,
  purchased_on date,
  replace_on date,
  serial text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS kit_items_member_idx ON kit_items (member_id, category);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'river_go_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON kit_items TO river_go_app;
  END IF;
END
$$;
