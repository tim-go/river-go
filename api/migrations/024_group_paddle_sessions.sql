-- Group Paddle Sessions (GROUP-F1..F9): clubs/groups + subgroups, planned
-- paddle sessions, participants with RSVP/availability/check-in-out, and
-- session-scoped ICE consent.
--
-- Privacy-first decisions (see docs/specs/group-tools/group-paddle-sessions.md):
--   * Groups default to 'private'. Public/member directories are opt-in.
--   * ICE consent is explicit per-session, revocable, and auditable. The
--     contact data itself stays in member_emergency_profiles; here we only
--     record consent to reveal it to organisers/leaders while the session runs.
--   * Live location sharing / SOS (GROUP-F8) is intentionally out of scope.
--   * No medical/health data is collected (V1).

CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'friends'
    CHECK (kind IN ('club', 'subgroup', 'friends', 'trip')),
  parent_group_id uuid REFERENCES groups (id) ON DELETE SET NULL,
  description text,
  discipline text
    CHECK (discipline IN ('whitewater', 'touring', 'both')),
  visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'members', 'public')),
  created_by uuid NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS groups_created_by_idx ON groups (created_by);
CREATE INDEX IF NOT EXISTS groups_parent_idx ON groups (parent_group_id);

CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'organiser', 'leader', 'member', 'guest')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('invited', 'active', 'left')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, member_id)
);

CREATE INDEX IF NOT EXISTS group_members_member_idx
  ON group_members (member_id, status);
CREATE INDEX IF NOT EXISTS group_members_group_idx
  ON group_members (group_id, status);

CREATE TABLE IF NOT EXISTS group_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  title text NOT NULL,
  river_id text,
  section_id text,
  venue text,
  scheduled_for timestamptz,
  meeting_point text,
  meeting_at timestamptz,
  notes text,
  organiser_id uuid NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  started_at timestamptz,
  ended_at timestamptz,
  -- Manual session completion (GROUP-F9) — advisory, no telemetry in V1.
  outcome_notes text,
  outcome_level_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS group_sessions_group_idx
  ON group_sessions (group_id, scheduled_for DESC);
CREATE INDEX IF NOT EXISTS group_sessions_organiser_idx
  ON group_sessions (organiser_id);
CREATE INDEX IF NOT EXISTS group_sessions_status_idx
  ON group_sessions (status);

CREATE TABLE IF NOT EXISTS session_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES group_sessions (id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  rsvp text NOT NULL DEFAULT 'invited'
    CHECK (rsvp IN ('invited', 'yes', 'no', 'maybe')),
  availability_note text,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  checked_in_by uuid REFERENCES members (id) ON DELETE SET NULL,
  -- Session-scoped ICE consent (GROUP-F6). Explicit, revocable, auditable.
  ice_consent boolean NOT NULL DEFAULT false,
  ice_consent_at timestamptz,
  ice_revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, member_id)
);

CREATE INDEX IF NOT EXISTS session_participants_session_idx
  ON session_participants (session_id);
CREATE INDEX IF NOT EXISTS session_participants_member_idx
  ON session_participants (member_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'river_go_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON groups TO river_go_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON group_members TO river_go_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON group_sessions TO river_go_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON session_participants TO river_go_app;
  END IF;
END
$$;
