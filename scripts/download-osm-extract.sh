#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=osm-region.sh
source "$SCRIPT_DIR/osm-region.sh"

REGION="${1:-great-britain}"
OUTPUT_DIR="${2:-/tmp/riverlaunch-osm}"
FORCE="${FORCE:-false}"

resolve_osm_region "$REGION"

mkdir -p "$OUTPUT_DIR"

SOURCE_PBF="$OUTPUT_DIR/$OSM_REGION_SLUG-latest.osm.pbf"

if [[ -s "$SOURCE_PBF" && "$FORCE" != "true" ]]; then
  echo "Using existing extract: $SOURCE_PBF" >&2
  echo "Set FORCE=true to download it again." >&2
  printf '%s\n' "$SOURCE_PBF"
  exit 0
fi

if command -v curl >/dev/null 2>&1; then
  curl -L --continue-at - "$OSM_DOWNLOAD_URL" -o "$SOURCE_PBF"
elif command -v wget >/dev/null 2>&1; then
  wget -c "$OSM_DOWNLOAD_URL" -O "$SOURCE_PBF"
else
  echo "curl or wget is required to download Geofabrik extracts." >&2
  exit 1
fi

printf '%s\n' "$SOURCE_PBF"
