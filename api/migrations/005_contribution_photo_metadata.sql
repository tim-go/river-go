ALTER TABLE contribution_photos
ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES members (id),
ADD COLUMN IF NOT EXISTS section_id text,
ADD COLUMN IF NOT EXISTS display_path text,
ADD COLUMN IF NOT EXISTS thumbnail_path text,
ADD COLUMN IF NOT EXISTS display_url text,
ADD COLUMN IF NOT EXISTS thumbnail_url text,
ADD COLUMN IF NOT EXISTS mime_type text,
ADD COLUMN IF NOT EXISTS width integer,
ADD COLUMN IF NOT EXISTS height integer,
ADD COLUMN IF NOT EXISTS thumbnail_width integer,
ADD COLUMN IF NOT EXISTS thumbnail_height integer,
ADD COLUMN IF NOT EXISTS size_bytes bigint,
ADD COLUMN IF NOT EXISTS thumbnail_size_bytes bigint,
ADD COLUMN IF NOT EXISTS original_name text,
ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS contribution_photos_section_id_idx ON contribution_photos (section_id);
CREATE INDEX IF NOT EXISTS contribution_photos_member_id_idx ON contribution_photos (member_id);
CREATE INDEX IF NOT EXISTS contribution_photos_moderation_status_idx ON contribution_photos (moderation_status);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'river_go_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON contribution_photos TO river_go_app;
  END IF;
END
$$;
