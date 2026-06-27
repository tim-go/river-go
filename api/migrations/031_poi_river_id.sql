-- POI ↔ river association (see docs/specs/map-features-data-model.md §5): every
-- paddling feature / amenity belongs to one river, stored as a single denormalised
-- river_id — the same shape as contributions.river_id (plain text, no FK, so seed
-- ordering can't fail on a not-yet-loaded canonical_rivers row).
--
-- river_id is ASSERTED, never recomputed live:
--   * paddling_features — from their curated section (section_id → river), the
--     same resolution contributions use (migration 030).
--   * amenities — the NEAREST featured river, derived once where watercourses
--     exist and carried in via amenities.river_id (importer / seed pack §10a).
-- Stations are left null for now.

ALTER TABLE pois ADD COLUMN IF NOT EXISTS river_id text;
CREATE INDEX IF NOT EXISTS pois_river_id_idx ON pois (river_id);

ALTER TABLE amenities ADD COLUMN IF NOT EXISTS river_id text;

-- ---------- amenities -> pois: carry river_id through ----------
CREATE OR REPLACE FUNCTION amenities_sync_location_poi()
RETURNS trigger AS $$
BEGIN
  INSERT INTO pois (
    id, geometry, poi_type, category, title, summary, status,
    source_entity_type, source_entity_id, source_kind, river_id, payload,
    created_at, updated_at
  ) VALUES (
    'amenity:' || NEW.source_id,
    NEW.geometry,
    'amenity',
    NEW.category,
    COALESCE(NEW.name, NEW.category),
    '',
    'active',
    'amenity',
    NEW.source_id,
    NEW.source,
    NEW.river_id,
    NEW.raw_properties,
    NEW.created_at, NEW.updated_at
  )
  ON CONFLICT (source_entity_type, source_entity_id) DO UPDATE SET
    geometry = EXCLUDED.geometry,
    poi_type = EXCLUDED.poi_type,
    category = EXCLUDED.category,
    title = EXCLUDED.title,
    source_kind = EXCLUDED.source_kind,
    river_id = EXCLUDED.river_id,
    payload = EXCLUDED.payload,
    updated_at = now(),
    revision = pois.revision + 1;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- ---------- paddling_features -> pois: derive river_id from the section ----------
CREATE OR REPLACE FUNCTION sync_map_poi_to_location_poi()
RETURNS trigger AS $$
DECLARE
  v_river_id text;
BEGIN
  -- section_id is either a direct river reference ('canonical-river:<id>') or a
  -- real section id resolved via canonical_river_section_links — same two shapes
  -- contributions resolve (migration 030).
  SELECT COALESCE(
    (SELECT cr.id FROM canonical_rivers cr
       WHERE NEW.section_id LIKE 'canonical-river:%'
         AND cr.id = replace(NEW.section_id, 'canonical-river:', '')),
    (SELECT l.river_id FROM canonical_river_section_links l
       WHERE l.section_id = NEW.section_id AND l.status = 'active'
       ORDER BY l.river_id LIMIT 1)
  ) INTO v_river_id;

  INSERT INTO pois (
    id, geometry, poi_type, category, title, summary, status,
    source_entity_type, source_entity_id,
    source_kind, source_label, source_confidence, source_updated_at, source_url,
    river_id, payload, created_at, updated_at, revision
  ) VALUES (
    'map_poi:' || NEW.id,
    NEW.geometry,
    NEW.category,
    NEW.category,
    NEW.name,
    NEW.summary,
    CASE WHEN NEW.verification_status = 'resolved' THEN 'resolved' ELSE 'active' END,
    'paddling_feature',
    NEW.id,
    NEW.source,
    NEW.source_label,
    NEW.source_confidence,
    NEW.source_updated_at,
    NEW.source_url,
    v_river_id,
    jsonb_build_object(
      'legacySectionId', NEW.section_id,
      'legacyMapPoiId', NEW.id,
      'verificationStatus', NEW.verification_status,
      'subtitle', NEW.subtitle,
      'payload', NEW.metadata
    ),
    NEW.created_at, NEW.updated_at, NEW.revision
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
    river_id = EXCLUDED.river_id,
    payload = EXCLUDED.payload,
    updated_at = now(),
    revision = pois.revision + 1;

  INSERT INTO poi_route_links (
    poi_id, route_id, route_source, relationship_type, source, status, confidence, payload
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

-- ---------- standalone contributions -> pois: carry the contribution's river ----------
-- Standalone contributions already become their own pois row; carry their
-- (asserted) contributions.river_id onto it so the river filter covers them too.
-- Only the river_id line is added; everything else matches migration 030.
CREATE OR REPLACE FUNCTION sync_contribution_to_location_poi()
RETURNS trigger AS $$
DECLARE
  contributor_label text;
BEGIN
  IF NEW.geometry IS NULL OR GeometryType(NEW.geometry) != 'POINT' THEN
    RETURN NEW;
  END IF;

  -- Targeted contributions enrich their target poi; they do NOT get their own pois row.
  IF NEW.poi_id IS NOT NULL THEN
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
    id, geometry, poi_type, category, title, summary, status,
    source_entity_type, source_entity_id, source_kind, source_label, source_confidence,
    river_id, payload, created_at, updated_at, revision
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
    NEW.river_id,
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
    river_id = EXCLUDED.river_id,
    payload = EXCLUDED.payload,
    updated_at = now(),
    revision = pois.revision + 1;

  IF NEW.section_id IS NOT NULL THEN
    INSERT INTO poi_route_links (
      poi_id, route_id, route_source, relationship_type, source, status, confidence, payload
    ) VALUES (
      'contribution:' || NEW.id::text,
      NEW.section_id,
      'section_fixture',
      'legacy-section-association',
      'source-trigger',
      CASE WHEN NEW.moderation_status IN ('hidden', 'rejected') THEN 'hidden' ELSE 'active' END,
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

-- ---------- backfill existing rows ----------
-- Paddling-feature pois get their river now (no re-seed needed); amenity pois get
-- theirs when amenities.river_id is populated (importer/backfill → re-seed pack).
UPDATE pois p
SET river_id = sub.river_id, updated_at = now()
FROM (
  SELECT pf.id AS feature_id,
    COALESCE(
      (SELECT cr.id FROM canonical_rivers cr
         WHERE pf.section_id LIKE 'canonical-river:%'
           AND cr.id = replace(pf.section_id, 'canonical-river:', '')),
      (SELECT l.river_id FROM canonical_river_section_links l
         WHERE l.section_id = pf.section_id AND l.status = 'active'
         ORDER BY l.river_id LIMIT 1)
    ) AS river_id
  FROM paddling_features pf
) sub
WHERE p.source_entity_type = 'paddling_feature'
  AND p.source_entity_id = sub.feature_id
  AND sub.river_id IS NOT NULL
  AND p.river_id IS DISTINCT FROM sub.river_id;

-- Standalone-contribution pois inherit the contribution's denormalised river_id.
UPDATE pois p
SET river_id = c.river_id, updated_at = now()
FROM contributions c
WHERE p.source_entity_type = 'contribution'
  AND p.source_entity_id = c.id::text
  AND c.river_id IS NOT NULL
  AND p.river_id IS DISTINCT FROM c.river_id;
