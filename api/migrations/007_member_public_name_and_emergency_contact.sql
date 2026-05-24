ALTER TABLE members
ADD COLUMN IF NOT EXISTS public_name text,
ADD COLUMN IF NOT EXISTS public_name_status text NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'members_public_name_status_check'
      AND conrelid = 'members'::regclass
  ) THEN
    ALTER TABLE members
    ADD CONSTRAINT members_public_name_status_check
    CHECK (public_name_status IN ('pending', 'active', 'rejected', 'admin-set'));
  END IF;
END
$$;

UPDATE members
SET public_name = CASE
    WHEN display_name IS NOT NULL AND btrim(display_name) <> '' THEN btrim(display_name)
    ELSE 'RiverLaunch member ' || right(replace(id::text, '-', ''), 4)
  END
WHERE public_name IS NULL OR btrim(public_name) = '';

CREATE INDEX IF NOT EXISTS members_public_name_idx ON members (lower(public_name));

CREATE TABLE IF NOT EXISTS member_emergency_profiles (
  member_id uuid PRIMARY KEY REFERENCES members (id) ON DELETE CASCADE,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  visibility_default text NOT NULL DEFAULT 'private'
    CHECK (visibility_default IN ('private')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'river_go_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON members TO river_go_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON member_emergency_profiles TO river_go_app;
  END IF;
END
$$;
