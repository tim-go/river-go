-- Group Membership & Invites (GINV-F1..F13): replace invite-by-name search with
-- email invites + a shareable group link (handle) + request-to-join/approval,
-- plus the membership lifecycle (roles, ownership, removal) and an audit trail.
--
-- Decisions (see docs/specs/group-tools/group-membership-and-invites.md):
--   * Roles owner/organiser/leader/member (guest dropped → member). Membership
--     managers = owner+organiser; session managers add leader.
--   * Every group has a human-readable handle (Strava-style link) + an access
--     mode: request_to_join (default) | invite_only.
--   * Exactly one owner per group (partial unique index).
--   * Removed members are re-invitable; only declining is sticky.

-- ---------- groups: handle + access mode ----------
ALTER TABLE groups ADD COLUMN IF NOT EXISTS handle text;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS access_mode text NOT NULL
  DEFAULT 'request_to_join';

ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_access_mode_check;
ALTER TABLE groups ADD CONSTRAINT groups_access_mode_check
  CHECK (access_mode IN ('request_to_join', 'invite_only'));

-- Backfill a unique handle for existing groups: slug(name) with a numeric
-- suffix on collision. New groups get their handle from the app.
DO $$
DECLARE
  g RECORD;
  base text;
  candidate text;
  suffix int;
BEGIN
  FOR g IN SELECT id, name FROM groups WHERE handle IS NULL ORDER BY created_at LOOP
    base := regexp_replace(lower(coalesce(g.name, '')), '[^a-z0-9]+', '-', 'g');
    base := trim(both '-' from base);
    IF length(base) < 3 THEN
      base := 'group-' || left(replace(g.id::text, '-', ''), 6);
    END IF;
    base := left(base, 30);
    candidate := base;
    suffix := 1;
    WHILE EXISTS (SELECT 1 FROM groups WHERE lower(handle) = candidate) LOOP
      suffix := suffix + 1;
      candidate := left(base, 30 - (length(suffix::text) + 1)) || '-' || suffix;
    END LOOP;
    UPDATE groups SET handle = candidate WHERE id = g.id;
  END LOOP;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS groups_handle_lower_idx
  ON groups (lower(handle));

-- ---------- group_members: roles, statuses, single-owner ----------
-- Drop the legacy guest role first, then widen the role + status check sets.
UPDATE group_members SET role = 'member' WHERE role = 'guest';

ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_role_check;
ALTER TABLE group_members ADD CONSTRAINT group_members_role_check
  CHECK (role IN ('owner', 'organiser', 'leader', 'member'));

ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_status_check;
ALTER TABLE group_members ADD CONSTRAINT group_members_status_check
  CHECK (status IN ('invited', 'requested', 'active', 'left', 'removed', 'declined'));

-- Exactly one owner per group.
CREATE UNIQUE INDEX IF NOT EXISTS group_members_one_owner_idx
  ON group_members (group_id) WHERE role = 'owner';

-- ---------- membership audit (GINV-F13) ----------
CREATE TABLE IF NOT EXISTS group_membership_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  actor_member_id uuid REFERENCES members (id) ON DELETE SET NULL,
  target_member_id uuid REFERENCES members (id) ON DELETE SET NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS group_membership_events_group_idx
  ON group_membership_events (group_id, created_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'river_go_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON group_membership_events TO river_go_app;
  END IF;
END
$$;
