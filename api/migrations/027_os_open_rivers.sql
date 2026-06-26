-- OS Open Rivers (Ordnance Survey, Open Government Licence) — a clean, authoritative,
-- single-line named GB river network. It replaces OSM watercourses as the source for
-- canonical_rivers.matched_geometry (OSM double-maps rivers 60-100m apart and names
-- them inconsistently; OS names and traces each river once). Named watercourse links
-- only, reprojected to EPSG:4326. Populated by scripts/import-os-open-rivers.sh.
CREATE TABLE IF NOT EXISTS os_open_rivers (
  id text PRIMARY KEY,
  name text NOT NULL,
  name_alt text,
  form text,
  geometry geometry(LineString, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS os_open_rivers_gix ON os_open_rivers USING gist (geometry);
CREATE INDEX IF NOT EXISTS os_open_rivers_name_idx ON os_open_rivers (lower(name));
