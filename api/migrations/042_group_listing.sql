-- Separate a club's directory listing from its page visibility. `visibility`
-- (private/members/public) governs who can see the club page; `listing`
-- governs whether it appears in Discover. Default 'visible' for ALL existing
-- clubs (including private ones) to maximise club discoverability — a private
-- club can now be listed and still gate its page + require request/invite.
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS listing text NOT NULL DEFAULT 'visible';
