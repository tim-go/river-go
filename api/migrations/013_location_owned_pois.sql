CREATE TABLE IF NOT EXISTS pois (
  id text PRIMARY KEY,
  geometry geometry(Geometry, 4326) NOT NULL,
  poi_type text NOT NULL,
  category text,
  title text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  source_entity_type text NOT NULL,
  source_entity_id text NOT NULL,
  source_kind text,
  source_label text,
  source_confidence text,
  source_updated_at text,
  source_url text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1,
  UNIQUE (source_entity_type, source_entity_id)
);

CREATE INDEX IF NOT EXISTS pois_geometry_gix ON pois USING gist (geometry);
CREATE INDEX IF NOT EXISTS pois_type_idx ON pois (poi_type);
CREATE INDEX IF NOT EXISTS pois_status_idx ON pois (status);
CREATE INDEX IF NOT EXISTS pois_source_idx ON pois (source_entity_type, source_entity_id);
CREATE INDEX IF NOT EXISTS pois_payload_gin ON pois USING gin (payload);

CREATE TABLE IF NOT EXISTS poi_route_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poi_id text NOT NULL REFERENCES pois (id) ON DELETE CASCADE,
  route_id text NOT NULL,
  route_source text NOT NULL DEFAULT 'section_fixture',
  relationship_type text NOT NULL,
  source text NOT NULL DEFAULT 'derived',
  status text NOT NULL DEFAULT 'active',
  confidence text NOT NULL DEFAULT 'legacy',
  distance_m numeric,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poi_id, route_source, route_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS poi_route_links_poi_id_idx ON poi_route_links (poi_id);
CREATE INDEX IF NOT EXISTS poi_route_links_route_idx ON poi_route_links (route_source, route_id);
CREATE INDEX IF NOT EXISTS poi_route_links_status_idx ON poi_route_links (status);
CREATE INDEX IF NOT EXISTS poi_route_links_payload_gin ON poi_route_links USING gin (payload);

INSERT INTO pois (
  id,
  geometry,
  poi_type,
  category,
  title,
  summary,
  status,
  source_entity_type,
  source_entity_id,
  source_kind,
  source_label,
  source_confidence,
  source_updated_at,
  source_url,
  payload,
  created_at,
  updated_at,
  revision
)
SELECT
  'map_poi:' || p.id,
  p.geometry,
  p.kind,
  p.kind,
  p.title,
  p.summary,
  CASE
    WHEN p.verification_status = 'resolved' THEN 'resolved'
    ELSE 'active'
  END,
  'map_poi',
  p.id,
  p.source_kind,
  p.source_label,
  p.source_confidence,
  p.source_updated_at,
  p.source_url,
  jsonb_build_object(
    'legacySectionId', p.section_id,
    'legacyMapPoiId', p.id,
    'verificationStatus', p.verification_status,
    'subtitle', p.subtitle,
    'payload', p.payload
  ),
  p.created_at,
  p.updated_at,
  p.revision
FROM map_pois p
ON CONFLICT (source_entity_type, source_entity_id) DO UPDATE SET
  geometry = EXCLUDED.geometry,
  poi_type = EXCLUDED.poi_type,
  category = EXCLUDED.category,
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  status = EXCLUDED.status,
  source_kind = EXCLUDED.source_kind,
  source_label = EXCLUDED.source_label,
  source_confidence = EXCLUDED.source_confidence,
  source_updated_at = EXCLUDED.source_updated_at,
  source_url = EXCLUDED.source_url,
  payload = EXCLUDED.payload,
  updated_at = now(),
  revision = pois.revision + 1;

INSERT INTO poi_route_links (
  poi_id,
  route_id,
  route_source,
  relationship_type,
  source,
  status,
  confidence,
  payload
)
SELECT
  'map_poi:' || p.id,
  p.section_id,
  'section_fixture',
  'legacy-section-association',
  'migration',
  'active',
  'legacy',
  jsonb_build_object('legacyMapPoiId', p.id)
FROM map_pois p
ON CONFLICT (poi_id, route_source, route_id, relationship_type) DO UPDATE SET
  status = EXCLUDED.status,
  confidence = EXCLUDED.confidence,
  payload = EXCLUDED.payload,
  updated_at = now();

INSERT INTO pois (
  id,
  geometry,
  poi_type,
  category,
  title,
  summary,
  status,
  source_entity_type,
  source_entity_id,
  source_kind,
  source_label,
  source_confidence,
  payload,
  created_at,
  updated_at,
  revision
)
SELECT
  'contribution:' || c.id::text,
  c.geometry,
  c.type,
  COALESCE(NULLIF(c.payload ->> 'category', ''), c.type),
  COALESCE(NULLIF(c.payload ->> 'title', ''), c.type),
  COALESCE(NULLIF(c.payload ->> 'detail', ''), ''),
  CASE
    WHEN c.moderation_status IN ('hidden', 'rejected') THEN 'hidden'
    WHEN c.moderation_status = 'resolved' THEN 'resolved'
    ELSE 'active'
  END,
  'contribution',
  c.id::text,
  'community',
  COALESCE(m.public_name, m.display_name, c.created_by),
  'community',
  jsonb_build_object(
    'legacySectionId', c.section_id,
    'legacyContributionId', c.id::text,
    'moderationStatus', c.moderation_status,
    'payload', c.payload
  ),
  c.created_at,
  c.updated_at,
  c.revision
FROM contributions c
LEFT JOIN members m ON m.id = c.member_id
WHERE c.geometry IS NOT NULL
  AND GeometryType(c.geometry) = 'POINT'
ON CONFLICT (source_entity_type, source_entity_id) DO UPDATE SET
  geometry = EXCLUDED.geometry,
  poi_type = EXCLUDED.poi_type,
  category = EXCLUDED.category,
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  status = EXCLUDED.status,
  source_label = EXCLUDED.source_label,
  source_confidence = EXCLUDED.source_confidence,
  payload = EXCLUDED.payload,
  updated_at = now(),
  revision = pois.revision + 1;

INSERT INTO poi_route_links (
  poi_id,
  route_id,
  route_source,
  relationship_type,
  source,
  status,
  confidence,
  payload
)
SELECT
  'contribution:' || c.id::text,
  c.section_id,
  'section_fixture',
  'legacy-section-association',
  'migration',
  CASE
    WHEN c.moderation_status IN ('hidden', 'rejected') THEN 'hidden'
    ELSE 'active'
  END,
  'legacy',
  jsonb_build_object('legacyContributionId', c.id::text)
FROM contributions c
WHERE c.section_id IS NOT NULL
  AND c.geometry IS NOT NULL
  AND GeometryType(c.geometry) = 'POINT'
ON CONFLICT (poi_id, route_source, route_id, relationship_type) DO UPDATE SET
  status = EXCLUDED.status,
  confidence = EXCLUDED.confidence,
  payload = EXCLUDED.payload,
  updated_at = now();

CREATE OR REPLACE FUNCTION sync_map_poi_to_location_poi()
RETURNS trigger AS $$
BEGIN
  INSERT INTO pois (
    id,
    geometry,
    poi_type,
    category,
    title,
    summary,
    status,
    source_entity_type,
    source_entity_id,
    source_kind,
    source_label,
    source_confidence,
    source_updated_at,
    source_url,
    payload,
    created_at,
    updated_at,
    revision
  ) VALUES (
    'map_poi:' || NEW.id,
    NEW.geometry,
    NEW.kind,
    NEW.kind,
    NEW.title,
    NEW.summary,
    CASE
      WHEN NEW.verification_status = 'resolved' THEN 'resolved'
      ELSE 'active'
    END,
    'map_poi',
    NEW.id,
    NEW.source_kind,
    NEW.source_label,
    NEW.source_confidence,
    NEW.source_updated_at,
    NEW.source_url,
    jsonb_build_object(
      'legacySectionId', NEW.section_id,
      'legacyMapPoiId', NEW.id,
      'verificationStatus', NEW.verification_status,
      'subtitle', NEW.subtitle,
      'payload', NEW.payload
    ),
    NEW.created_at,
    NEW.updated_at,
    NEW.revision
  )
  ON CONFLICT (source_entity_type, source_entity_id) DO UPDATE SET
    geometry = EXCLUDED.geometry,
    poi_type = EXCLUDED.poi_type,
    category = EXCLUDED.category,
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    status = EXCLUDED.status,
    source_kind = EXCLUDED.source_kind,
    source_label = EXCLUDED.source_label,
    source_confidence = EXCLUDED.source_confidence,
    source_updated_at = EXCLUDED.source_updated_at,
    source_url = EXCLUDED.source_url,
    payload = EXCLUDED.payload,
    updated_at = now(),
    revision = pois.revision + 1;

  INSERT INTO poi_route_links (
    poi_id,
    route_id,
    route_source,
    relationship_type,
    source,
    status,
    confidence,
    payload
  ) VALUES (
    'map_poi:' || NEW.id,
    NEW.section_id,
    'section_fixture',
    'legacy-section-association',
    'source-trigger',
    'active',
    'legacy',
    jsonb_build_object('legacyMapPoiId', NEW.id)
  )
  ON CONFLICT (poi_id, route_source, route_id, relationship_type) DO UPDATE SET
    status = EXCLUDED.status,
    confidence = EXCLUDED.confidence,
    payload = EXCLUDED.payload,
    updated_at = now();

  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS map_pois_sync_location_poi ON map_pois;
CREATE TRIGGER map_pois_sync_location_poi
AFTER INSERT OR UPDATE ON map_pois
FOR EACH ROW
EXECUTE FUNCTION sync_map_poi_to_location_poi();

CREATE OR REPLACE FUNCTION sync_contribution_to_location_poi()
RETURNS trigger AS $$
DECLARE
  contributor_label text;
BEGIN
  IF NEW.geometry IS NULL OR GeometryType(NEW.geometry) != 'POINT' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(m.public_name, m.display_name, NEW.created_by)
    INTO contributor_label
  FROM members m
  WHERE m.id = NEW.member_id;

  IF contributor_label IS NULL THEN
    contributor_label := NEW.created_by;
  END IF;

  INSERT INTO pois (
    id,
    geometry,
    poi_type,
    category,
    title,
    summary,
    status,
    source_entity_type,
    source_entity_id,
    source_kind,
    source_label,
    source_confidence,
    payload,
    created_at,
    updated_at,
    revision
  ) VALUES (
    'contribution:' || NEW.id::text,
    NEW.geometry,
    NEW.type,
    COALESCE(NULLIF(NEW.payload ->> 'category', ''), NEW.type),
    COALESCE(NULLIF(NEW.payload ->> 'title', ''), NEW.type),
    COALESCE(NULLIF(NEW.payload ->> 'detail', ''), ''),
    CASE
      WHEN NEW.moderation_status IN ('hidden', 'rejected') THEN 'hidden'
      WHEN NEW.moderation_status = 'resolved' THEN 'resolved'
      ELSE 'active'
    END,
    'contribution',
    NEW.id::text,
    'community',
    contributor_label,
    'community',
    jsonb_build_object(
      'legacySectionId', NEW.section_id,
      'legacyContributionId', NEW.id::text,
      'moderationStatus', NEW.moderation_status,
      'payload', NEW.payload
    ),
    NEW.created_at,
    NEW.updated_at,
    NEW.revision
  )
  ON CONFLICT (source_entity_type, source_entity_id) DO UPDATE SET
    geometry = EXCLUDED.geometry,
    poi_type = EXCLUDED.poi_type,
    category = EXCLUDED.category,
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    status = EXCLUDED.status,
    source_label = EXCLUDED.source_label,
    source_confidence = EXCLUDED.source_confidence,
    payload = EXCLUDED.payload,
    updated_at = now(),
    revision = pois.revision + 1;

  IF NEW.section_id IS NOT NULL THEN
    INSERT INTO poi_route_links (
      poi_id,
      route_id,
      route_source,
      relationship_type,
      source,
      status,
      confidence,
      payload
    ) VALUES (
      'contribution:' || NEW.id::text,
      NEW.section_id,
      'section_fixture',
      'legacy-section-association',
      'source-trigger',
      CASE
        WHEN NEW.moderation_status IN ('hidden', 'rejected') THEN 'hidden'
        ELSE 'active'
      END,
      'legacy',
      jsonb_build_object('legacyContributionId', NEW.id::text)
    )
    ON CONFLICT (poi_id, route_source, route_id, relationship_type) DO UPDATE SET
      status = EXCLUDED.status,
      confidence = EXCLUDED.confidence,
      payload = EXCLUDED.payload,
      updated_at = now();
  END IF;

  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contributions_sync_location_poi ON contributions;
CREATE TRIGGER contributions_sync_location_poi
AFTER INSERT OR UPDATE ON contributions
FOR EACH ROW
EXECUTE FUNCTION sync_contribution_to_location_poi();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'river_go_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON pois TO river_go_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON poi_route_links TO river_go_app;
  END IF;
END
$$;
