CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contributions (
  id uuid PRIMARY KEY,
  client_id text,
  section_id text,
  type text NOT NULL CHECK (type IN ('hazard', 'report', 'photo', 'feature', 'access')),
  geometry geometry(Geometry, 4326),
  observed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  moderation_status text NOT NULL DEFAULT 'pending',
  sync_status text NOT NULL DEFAULT 'accepted',
  sync_source text NOT NULL DEFAULT 'unknown',
  revision bigint NOT NULL DEFAULT 1,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS contributions_section_id_idx ON contributions (section_id);
CREATE INDEX IF NOT EXISTS contributions_type_idx ON contributions (type);
CREATE INDEX IF NOT EXISTS contributions_moderation_status_idx ON contributions (moderation_status);
CREATE INDEX IF NOT EXISTS contributions_geometry_gix ON contributions USING gist (geometry);
CREATE INDEX IF NOT EXISTS contributions_payload_gin ON contributions USING gin (payload);

CREATE TABLE IF NOT EXISTS sync_operations (
  operation_id uuid PRIMARY KEY,
  operation_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  actor_id text,
  base_revision bigint,
  received_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL,
  result_status text NOT NULL,
  result_payload jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS sync_operations_entity_idx ON sync_operations (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS sync_operations_received_at_idx ON sync_operations (received_at);

CREATE TABLE IF NOT EXISTS contribution_photos (
  id uuid PRIMARY KEY,
  contribution_id uuid NOT NULL REFERENCES contributions (id) ON DELETE CASCADE,
  storage_path text,
  caption text,
  status text NOT NULL DEFAULT 'pending-upload',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contribution_photos_contribution_id_idx ON contribution_photos (contribution_id);
