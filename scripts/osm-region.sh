#!/usr/bin/env bash

resolve_osm_region() {
  local region="${1:-great-britain}"

  case "$region" in
    great-britain|gb)
      OSM_REGION_SLUG="great-britain"
      OSM_DOWNLOAD_URL="https://download.geofabrik.de/europe/great-britain-latest.osm.pbf"
      ;;
    england)
      OSM_REGION_SLUG="england"
      OSM_DOWNLOAD_URL="https://download.geofabrik.de/europe/great-britain/england-latest.osm.pbf"
      ;;
    scotland)
      OSM_REGION_SLUG="scotland"
      OSM_DOWNLOAD_URL="https://download.geofabrik.de/europe/great-britain/scotland-latest.osm.pbf"
      ;;
    wales)
      OSM_REGION_SLUG="wales"
      OSM_DOWNLOAD_URL="https://download.geofabrik.de/europe/great-britain/wales-latest.osm.pbf"
      ;;
    *)
      echo "Usage: <script> <great-britain|england|scotland|wales> [output-dir]" >&2
      return 1
      ;;
  esac
}
