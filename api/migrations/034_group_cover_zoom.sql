-- Group cover photo zoom: how far the manager has zoomed into the cover image.
-- 100 = baseline (image fills the banner via cover), up to 300 = zoomed in.
-- Pairs with cover_position (vertical pan) to frame the crop.
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS cover_zoom smallint NOT NULL DEFAULT 100;
