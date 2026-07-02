-- Canonical `routes` table: community-promoted river sections (see
-- docs/development/plan-community-sections.md Phase 2). "Section" is the only
-- user-facing word; `routes` matches the existing internal family
-- (route_suggestions, route_adjustments, route_overrides, poi_route_links.route_id).
-- Community-origin only: the ONLY write path is the moderator promote action
-- on an approved route_suggestion. There is no seed script for this table and
-- there must never be one.
CREATE TABLE IF NOT EXISTS routes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  route_type    text NOT NULL DEFAULT 'whitewater-section',
  river_id      text,               -- canonical_rivers.id; text, no FK (matches pois.river_id)
  status        text NOT NULL DEFAULT 'published',  -- published | hidden | retired
  evidence_status text NOT NULL DEFAULT 'community-reported',
  grade         text,
  summary       text,
  access_summary text,
  conditions_summary text,
  route         geometry(LineString, 4326) NOT NULL,
  geometry_source text NOT NULL DEFAULT 'member-trace',
  distance_km   numeric,
  source_route_suggestion_id uuid REFERENCES route_suggestions(id),
  created_by    uuid REFERENCES members(id),  -- submitting member
  promoted_by   uuid REFERENCES members(id),  -- moderator who promoted
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  revision      bigint NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS routes_river_id_idx ON routes (river_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'river_go_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON routes TO river_go_app;
  END IF;
END
$$;

-- Promotion is a new terminal status on the suggestion it came from: an
-- approved suggestion that a moderator has promoted to a canonical route.
-- Promoted suggestions drop out of the public "approved" list (superseded by
-- the routes row) but stay visible in moderation.
ALTER TABLE route_suggestions DROP CONSTRAINT IF EXISTS route_suggestions_status_check;
ALTER TABLE route_suggestions ADD CONSTRAINT route_suggestions_status_check
  CHECK (status IN ('local_draft', 'pending_review', 'needs_info', 'approved', 'rejected', 'hidden', 'promoted'));
