-- Group cover photo horizontal pan: the horizontal object-position (0–100%,
-- 50 = centre). Pairs with cover_position (vertical) so a manager can drag the
-- cover to frame the crop on both axes.
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS cover_x smallint NOT NULL DEFAULT 50;
