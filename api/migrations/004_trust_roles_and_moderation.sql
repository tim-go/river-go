UPDATE members
SET role = 'CONTRIB_MODERATOR'
WHERE role = 'CONTRIB_ADMIN';

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'members'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%role%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE members DROP CONSTRAINT %I', constraint_name);
  END IF;
END
$$;

ALTER TABLE members
ADD CONSTRAINT members_role_check
CHECK (role IN ('MEMBER', 'TRUSTED_MEMBER', 'CONTRIB_MODERATOR', 'ADMIN'));

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'members'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%trust_level%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE members DROP CONSTRAINT %I', constraint_name);
  END IF;
END
$$;

ALTER TABLE members
ADD CONSTRAINT members_trust_level_check
CHECK (trust_level IN ('NEW', 'KNOWN', 'TRUSTED'));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'river_go_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON members TO river_go_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON contributions TO river_go_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON sync_operations TO river_go_app;
  END IF;
END
$$;
