-- Member public profile (opt-in, off by default). A member flips profile_public
-- on, optionally sets a vanity handle + bio, and ticks which sections to show.
-- Curation is enforced server-side by the public read endpoint.
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS profile_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS handle text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS show_paddles boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_skills boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_photos boolean NOT NULL DEFAULT false;

-- Case-insensitive unique handle (matches the club handle pattern). Partial so
-- the many members without a handle don't collide on NULL.
CREATE UNIQUE INDEX IF NOT EXISTS members_handle_lower_idx
  ON members (lower(handle))
  WHERE handle IS NOT NULL;
