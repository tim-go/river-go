-- Step 3: contributions target the pois index (poi_id) and carry a derived river_id.
-- ADDITIVE ONLY — map_poi_id and section_id are KEPT (dropped in a later migration
-- after staging is verified). Model A: a targeted contribution enriches its target
-- poi and does NOT create its own pois row; only standalone (poi_id IS NULL)
-- contributions become their own pois rows.

ALTER TABLE contributions
  ADD COLUMN IF NOT EXISTS poi_id text REFERENCES pois (id) ON DELETE SET NULL;
ALTER TABLE contributions
  ADD COLUMN IF NOT EXISTS river_id text;
CREATE INDEX IF NOT EXISTS contributions_poi_id_idx ON contributions (poi_id);
CREATE INDEX IF NOT EXISTS contributions_river_id_idx ON contributions (river_id);

-- Backfill poi_id from the existing map_poi_id (the target paddling feature → its
-- pois row, which uses the 'map_poi:'||id convention). Only where that row exists.
UPDATE contributions c
SET poi_id = 'map_poi:' || c.map_poi_id
WHERE c.map_poi_id IS NOT NULL
  AND c.poi_id IS NULL
  AND EXISTS (SELECT 1 FROM pois p WHERE p.id = 'map_poi:' || c.map_poi_id);

-- Backfill river_id. section_id comes in two shapes: a direct river reference
-- ('canonical-river:<river-id>', used by the map-rework era) or a real section id
-- (resolved via canonical_river_section_links). Validate against canonical_rivers.
UPDATE contributions c
SET river_id = sub.river_id
FROM (
  SELECT c2.id,
    COALESCE(
      (SELECT cr.id FROM canonical_rivers cr
        WHERE c2.section_id LIKE 'canonical-river:%'
          AND cr.id = replace(c2.section_id, 'canonical-river:', '')),
      (SELECT l.river_id FROM canonical_river_section_links l
        WHERE l.section_id = c2.section_id AND l.status = 'active'
        ORDER BY l.river_id LIMIT 1)
    ) AS river_id
  FROM contributions c2
  WHERE c2.section_id IS NOT NULL
) sub
WHERE c.id = sub.id AND sub.river_id IS NOT NULL AND c.river_id IS NULL;

-- Sync trigger: only STANDALONE contributions become their own pois rows.
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
    payload, created_at, updated_at, revision
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

-- Remove stray 'contribution' pois rows (+ their legacy route links) for contributions
-- that are now targeted — they enrich their target instead of standing alone.
DELETE FROM poi_route_links
WHERE poi_id IN (
  SELECT 'contribution:' || c.id::text FROM contributions c WHERE c.poi_id IS NOT NULL
);
DELETE FROM pois
WHERE source_entity_type = 'contribution'
  AND source_entity_id IN (
    SELECT c.id::text FROM contributions c WHERE c.poi_id IS NOT NULL
  );
