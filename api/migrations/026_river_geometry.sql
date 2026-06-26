-- Precompute each canonical river's matched OSM line geometry at full precision.
-- The level-coloured lines previously re-derived this from the 850k-way watercourse
-- name+bbox join on EVERY request. Storing it lets the endpoint read (and cheaply
-- simplify) per river, and lets the geometry be hand-corrected. Repopulated by the
-- build:river-geometry step (run after the watercourse import).
ALTER TABLE canonical_rivers
  ADD COLUMN IF NOT EXISTS matched_geometry geometry(MultiLineString, 4326);

CREATE INDEX IF NOT EXISTS idx_canonical_rivers_matched_geometry
  ON canonical_rivers USING gist (matched_geometry);
