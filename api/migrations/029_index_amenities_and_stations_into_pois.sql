-- Index amenities + observation_stations into the pois location index (see
-- docs/specs/map-features-data-model.md §1, §3), so they become first-class,
-- contributable features alongside paddling_features. Mirrors the
-- paddling_features sync. INSERT/UPDATE triggers ONLY — no delete handling
-- (a delete-cascade here would orphan contributions; deletion is handled by a
-- later reconcile step). Keyed on the stable source identity: amenities by their
-- OSM source_id, stations by their (upsert-stable) uuid. pois.geometry is NOT NULL,
-- so geometry-less stations are skipped. Render queries are unchanged.

-- ---------- amenities -> pois ----------
CREATE OR REPLACE FUNCTION amenities_sync_location_poi()
RETURNS trigger AS $$
BEGIN
  INSERT INTO pois (
    id, geometry, poi_type, category, title, summary, status,
    source_entity_type, source_entity_id, source_kind, payload,
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
    NEW.raw_properties,
    NEW.created_at, NEW.updated_at
  )
  ON CONFLICT (source_entity_type, source_entity_id) DO UPDATE SET
    geometry = EXCLUDED.geometry,
    poi_type = EXCLUDED.poi_type,
    category = EXCLUDED.category,
    title = EXCLUDED.title,
    source_kind = EXCLUDED.source_kind,
    payload = EXCLUDED.payload,
    updated_at = now(),
    revision = pois.revision + 1;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS amenities_sync_location_poi ON amenities;
CREATE TRIGGER amenities_sync_location_poi
AFTER INSERT OR UPDATE ON amenities
FOR EACH ROW
EXECUTE FUNCTION amenities_sync_location_poi();

-- ---------- observation_stations -> pois ----------
CREATE OR REPLACE FUNCTION observation_stations_sync_location_poi()
RETURNS trigger AS $$
BEGIN
  -- pois.geometry is NOT NULL; skip stations without a usable location.
  IF NEW.geometry IS NULL OR ST_IsEmpty(NEW.geometry) THEN
    RETURN NEW;
  END IF;

  INSERT INTO pois (
    id, geometry, poi_type, category, title, summary, status,
    source_entity_type, source_entity_id, source_kind, source_url, payload,
    created_at, updated_at
  ) VALUES (
    'station:' || NEW.id,
    NEW.geometry,
    'gauge',
    'gauge',
    NEW.name,
    '',
    'active',
    'station',
    NEW.id::text,
    NEW.provider,
    NEW.source_url,
    NEW.metadata,
    NEW.created_at, NEW.updated_at
  )
  ON CONFLICT (source_entity_type, source_entity_id) DO UPDATE SET
    geometry = EXCLUDED.geometry,
    poi_type = EXCLUDED.poi_type,
    category = EXCLUDED.category,
    title = EXCLUDED.title,
    source_kind = EXCLUDED.source_kind,
    source_url = EXCLUDED.source_url,
    payload = EXCLUDED.payload,
    updated_at = now(),
    revision = pois.revision + 1;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS observation_stations_sync_location_poi ON observation_stations;
CREATE TRIGGER observation_stations_sync_location_poi
AFTER INSERT OR UPDATE ON observation_stations
FOR EACH ROW
EXECUTE FUNCTION observation_stations_sync_location_poi();

-- ---------- backfill existing rows ----------
INSERT INTO pois (
  id, geometry, poi_type, category, title, summary, status,
  source_entity_type, source_entity_id, source_kind, payload,
  created_at, updated_at
)
SELECT
  'amenity:' || source_id, geometry, 'amenity', category,
  COALESCE(name, category), '', 'active', 'amenity', source_id, source,
  raw_properties, created_at, updated_at
FROM amenities
ON CONFLICT (source_entity_type, source_entity_id) DO UPDATE SET
  geometry = EXCLUDED.geometry,
  poi_type = EXCLUDED.poi_type,
  category = EXCLUDED.category,
  title = EXCLUDED.title,
  source_kind = EXCLUDED.source_kind,
  payload = EXCLUDED.payload,
  updated_at = now(),
  revision = pois.revision + 1;

INSERT INTO pois (
  id, geometry, poi_type, category, title, summary, status,
  source_entity_type, source_entity_id, source_kind, source_url, payload,
  created_at, updated_at
)
SELECT
  'station:' || id, geometry, 'gauge', 'gauge', name, '', 'active', 'station',
  id::text, provider, source_url, metadata, created_at, updated_at
FROM observation_stations
WHERE geometry IS NOT NULL AND NOT ST_IsEmpty(geometry)
ON CONFLICT (source_entity_type, source_entity_id) DO UPDATE SET
  geometry = EXCLUDED.geometry,
  poi_type = EXCLUDED.poi_type,
  category = EXCLUDED.category,
  title = EXCLUDED.title,
  source_kind = EXCLUDED.source_kind,
  source_url = EXCLUDED.source_url,
  payload = EXCLUDED.payload,
  updated_at = now(),
  revision = pois.revision + 1;
