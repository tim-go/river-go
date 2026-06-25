-- Riverside OSM amenities (pubs, car parks, toilets, …). Stored small: the import
-- keeps only features within ~1km of our featured rivers. Reference data, as-is.
CREATE TABLE IF NOT EXISTS amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'osm_amenity',
  source_id text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  name text,
  geometry geometry(Point, 4326) NOT NULL,
  raw_properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);

CREATE INDEX IF NOT EXISTS amenities_geometry_gix ON amenities USING gist (geometry);
CREATE INDEX IF NOT EXISTS amenities_category_idx ON amenities (category);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'river_go_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON amenities TO river_go_app;
  END IF;
END
$$;
