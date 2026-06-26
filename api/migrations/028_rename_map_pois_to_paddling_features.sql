-- Rename map_pois -> paddling_features and standardise its columns (see
-- docs/specs/map-features-data-model.md §2). Data-safe: ALTER ... RENAME preserves
-- rows and auto-follows FKs (map_poi_reviews, poi_route_links, source_candidate_pois,
-- contributions.map_poi_id keep pointing at the renamed table). The pois index row
-- ids stay 'map_poi:<id>' for safety; only source_entity_type flips to
-- 'paddling_feature'.

ALTER TABLE IF EXISTS map_pois RENAME TO paddling_features;

ALTER TABLE paddling_features RENAME COLUMN kind TO category;
ALTER TABLE paddling_features RENAME COLUMN title TO name;
ALTER TABLE paddling_features RENAME COLUMN payload TO metadata;
ALTER TABLE paddling_features RENAME COLUMN source_kind TO source;
ALTER TABLE paddling_features ADD COLUMN IF NOT EXISTS source_id text;

-- Rewrite the location-POI sync function for the new source-column names and the
-- new source_entity_type. (pois' own columns are unchanged; only the NEW.* reads
-- from the source table change.)
CREATE OR REPLACE FUNCTION sync_map_poi_to_location_poi()
RETURNS trigger AS $$
BEGIN
  INSERT INTO pois (
    id, geometry, poi_type, category, title, summary, status,
    source_entity_type, source_entity_id,
    source_kind, source_label, source_confidence, source_updated_at, source_url,
    payload, created_at, updated_at, revision
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

-- The trigger followed the table rename; re-name it for clarity.
DROP TRIGGER IF EXISTS map_pois_sync_location_poi ON paddling_features;
CREATE TRIGGER paddling_features_sync_location_poi
AFTER INSERT OR UPDATE ON paddling_features
FOR EACH ROW
EXECUTE FUNCTION sync_map_poi_to_location_poi();

-- Migrate existing index rows to the new source_entity_type.
UPDATE pois SET source_entity_type = 'paddling_feature' WHERE source_entity_type = 'map_poi';
