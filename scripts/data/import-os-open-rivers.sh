#!/usr/bin/env bash
# Download OS Open Rivers (GB GeoPackage, Ordnance Survey, Open Government Licence) and
# load the named watercourse links into os_open_rivers, reprojected to EPSG:4326.
# Repeatable (TRUNCATE + reload). Run build:river-geometry afterwards to rebuild the
# canonical river geometry from it.
#
# Requires: python3 (reads the GeoPackage via its sqlite3 module), psql, unzip, curl.
# Env: OS_RIVERS_GPKG=/path/to.gpkg reuses a local file and skips the ~52MB download.
#      DATABASE_URL overrides the local database.
set -euo pipefail
cd "$(dirname "$0")/../.."
DB="${DATABASE_URL:-postgresql://river_go_admin:river_go@127.0.0.1:5440/river_go}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

if [ -n "${OS_RIVERS_GPKG:-}" ]; then
  GPKG="$OS_RIVERS_GPKG"
else
  echo "Downloading OS Open Rivers GeoPackage (~52MB)..."
  curl -sL --max-time 600 -o "$WORK/oprvrs.zip" \
    "https://api.os.uk/downloads/v1/products/OpenRivers/downloads?area=GB&format=GeoPackage&redirect"
  unzip -q "$WORK/oprvrs.zip" -d "$WORK"
  GPKG="$(find "$WORK" -iname '*.gpkg' | head -1)"
fi

echo "Parsing $GPKG ..."
python3 scripts/data/os-open-rivers-export.py "$GPKG" "$WORK/links.tsv"

echo "Loading os_open_rivers ..."
psql "$DB" -v ON_ERROR_STOP=1 <<SQL
CREATE TEMP TABLE _os_raw (id text, name text, name_alt text, form text, wkb text);
\copy _os_raw FROM '$WORK/links.tsv' WITH (FORMAT text)
TRUNCATE os_open_rivers;
INSERT INTO os_open_rivers (id, name, name_alt, form, geometry)
  SELECT id, name, nullif(name_alt, ''), form,
    ST_Transform(ST_SetSRID(ST_GeomFromWKB(decode(wkb, 'hex')), 27700), 4326)
  FROM _os_raw
  ON CONFLICT (id) DO NOTHING;
SQL
echo "Done: $(psql "$DB" -tAc 'SELECT count(*) FROM os_open_rivers') links loaded."
