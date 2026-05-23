#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLATFORM_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPO_DIR="$(cd "$PLATFORM_DIR/.." && pwd)"

# shellcheck source=_helpers.sh
source "$SCRIPT_DIR/_helpers.sh"

ENV="${1:-}"
MODE=""
CHANNEL_ID="${CHANNEL_ID:-api-e2e-test}"
DRY_RUN=false

shift || true
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --preview)
      MODE="preview"
      ;;
    --live)
      MODE="live"
      ;;
    --channel)
      CHANNEL_ID="${2:-}"
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      ;;
    *)
      fail "Unknown argument: $1"
      print_summary "Firebase Hosting deploy"
      exit 1
      ;;
  esac
  shift
done

if [[ "$ENV" != "staging" && "$ENV" != "prod" ]]; then
  fail "Usage: deploy-web.sh <staging|prod> (--preview|--live) [--channel <id>] [--dry-run]"
  print_summary "Firebase Hosting deploy"
  exit 1
fi

if [[ -z "$MODE" ]]; then
  fail "Choose --preview or --live. Live deploy is intentionally explicit."
  print_summary "Firebase Hosting deploy"
  exit 1
fi

CONFIG_PATH="${RIVER_GO_PLATFORM_CONFIG:-$PLATFORM_DIR/.config/river-go-platform.json}"

json_value() {
  jq -er "$1" "$CONFIG_PATH"
}

section "Hosting deploy preflight - $ENV"
ok=true
for command_name in jq gcloud firebase npm curl; do
  require_command "$command_name" || ok=false
done

if [[ "$ok" != true ]]; then
  print_summary "Firebase Hosting deploy"
  exit 1
fi

GCP_PROJECT="$(json_value ".environments.$ENV.gcpProject")"
FIREBASE_PROJECT="$(json_value ".environments.$ENV.firebaseProject")"
REGION="$(json_value ".environments.$ENV.region")"
CLOUD_RUN_SERVICE="$(json_value ".environments.$ENV.cloudRunService")"
HOSTING_TARGET="$(json_value ".environments.$ENV.firebaseHostingSite")"

section "Cloud Run API"
if gcloud run services describe "$CLOUD_RUN_SERVICE" \
  --region="$REGION" \
  --project="$GCP_PROJECT" >/dev/null 2>&1; then
  pass "Cloud Run service exists: $CLOUD_RUN_SERVICE"
else
  fail "Cloud Run service is missing: $CLOUD_RUN_SERVICE"
  print_summary "Firebase Hosting deploy"
  exit 1
fi

section "Build web app"
run npm --prefix "$REPO_DIR" run build

section "Deploy Firebase Hosting"
if [[ "$MODE" == "preview" ]]; then
  if [[ "$DRY_RUN" == true ]]; then
    run firebase hosting:channel:deploy "$CHANNEL_ID" \
      --only "$HOSTING_TARGET" \
      --project "$FIREBASE_PROJECT"
  else
    (
      cd "$REPO_DIR"
      firebase hosting:channel:deploy "$CHANNEL_ID" \
        --only "$HOSTING_TARGET" \
        --project "$FIREBASE_PROJECT"
    )
  fi
else
  if [[ "$DRY_RUN" == true ]]; then
    run firebase deploy \
      --only "hosting:$HOSTING_TARGET" \
      --project "$FIREBASE_PROJECT"
  else
    (
      cd "$REPO_DIR"
      firebase deploy \
        --only "hosting:$HOSTING_TARGET" \
        --project "$FIREBASE_PROJECT"
    )
  fi
fi

print_summary "Firebase Hosting deploy"
