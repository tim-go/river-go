-- Group cover photo: a wide banner shown on the group entity page.
-- cover_position is the vertical object-position (0–100%, 50 = centre) so a
-- manager can frame a wide crop of a tall photo.
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS cover_image_path text,
  ADD COLUMN IF NOT EXISTS cover_position smallint NOT NULL DEFAULT 50;
