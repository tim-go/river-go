-- Member profile picture (circle headshot). Separate from photo_url, which is
-- synced from the Firebase auth provider — this is the user's own upload.
-- avatar_x / avatar_position are the horizontal / vertical object-position
-- (0–100%, 50 = centre) and avatar_zoom is the scale % (100 = fit), so the
-- member can drag + zoom to frame their face in the circle. Mirrors the group
-- cover columns.
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS avatar_image_url text,
  ADD COLUMN IF NOT EXISTS avatar_x smallint NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS avatar_position smallint NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS avatar_zoom smallint NOT NULL DEFAULT 100;
