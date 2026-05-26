#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=osm-region.sh
source "$SCRIPT_DIR/osm-region.sh"

REGION="${1:-great-britain}"
OUTPUT_DIR="${2:-/tmp/riverlaunch-osm}"

resolve_osm_region "$REGION"

if ! command -v osmium >/dev/null 2>&1; then
  echo "osmium is required. Install osmium-tool before running this script." >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

SOURCE_PBF="$OUTPUT_DIR/$OSM_REGION_SLUG-latest.osm.pbf"
FILTERED_PBF="$OUTPUT_DIR/$OSM_REGION_SLUG-waterways.osm.pbf"
OUTPUT_GEOJSONSEQ="$OUTPUT_DIR/$OSM_REGION_SLUG-waterways.geojsonseq"

if [[ ! -s "$SOURCE_PBF" ]]; then
  echo "Missing source extract: $SOURCE_PBF" >&2
  echo "Run: npm run osm:download-extract -- $REGION $OUTPUT_DIR" >&2
  exit 1
fi

osmium tags-filter "$SOURCE_PBF" \
  w/waterway=river,stream,canal,drain,ditch,tidal_channel \
  -o "$FILTERED_PBF" \
  --overwrite

osmium export "$FILTERED_PBF" \
  --geometry-types=linestring \
  --attributes=type,id \
  -o "$OUTPUT_GEOJSONSEQ" \
  --overwrite

printf '%s\n' "$OUTPUT_GEOJSONSEQ"
