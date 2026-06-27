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
BUILD_ONLY=false

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
    --build-only)
      BUILD_ONLY=true
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

if [[ "$BUILD_ONLY" != true && -z "$MODE" ]]; then
  fail "Choose --preview or --live. Live deploy is intentionally explicit."
  print_summary "Firebase Hosting deploy"
  exit 1
fi

CONFIG_PATH="${RIVER_GO_PLATFORM_CONFIG:-$PLATFORM_DIR/.config/river-go-platform.json}"
RUNTIME_CONFIG_PATH="${RIVER_GO_RUNTIME_CONFIG:-$PLATFORM_DIR/.config/river-go-runtime.json}"
FIREBASE_SDK_FILE=""

json_value() {
  jq -er "$1" "$CONFIG_PATH"
}

runtime_value() {
  jq -er "$1" "$RUNTIME_CONFIG_PATH"
}

runtime_or_sdk_value() {
  local runtime_query="$1"
  local sdk_query="$2"
  local runtime_result=""

  runtime_result="$(jq -er "$runtime_query" "$RUNTIME_CONFIG_PATH" 2>/dev/null || true)"
  if [[ -n "$runtime_result" ]]; then
    printf '%s' "$runtime_result"
    return 0
  fi

  jq -er "$sdk_query" "$FIREBASE_SDK_FILE"
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

if [[ ! -f "$RUNTIME_CONFIG_PATH" ]]; then
  fail "Runtime config not found: $RUNTIME_CONFIG_PATH"
  print_summary "Firebase Hosting deploy"
  exit 1
fi

GCP_PROJECT="$(json_value ".environments.$ENV.gcpProject")"
FIREBASE_PROJECT="$(json_value ".environments.$ENV.firebaseProject")"
REGION="$(json_value ".environments.$ENV.region")"
CLOUD_RUN_SERVICE="$(json_value ".environments.$ENV.cloudRunService")"
HOSTING_TARGET="$(json_value ".environments.$ENV.firebaseHostingSite")"
FIREBASE_SDK_FILE_VALUE="$(jq -r ".environments.$ENV.files.firebaseSdkFile // \".config/firebase-sdk-$ENV.json\"" "$CONFIG_PATH")"
FIREBASE_SDK_FILE="$PLATFORM_DIR/$FIREBASE_SDK_FILE_VALUE"

export VITE_FIREBASE_API_KEY
export VITE_FIREBASE_AUTH_DOMAIN
export VITE_FIREBASE_PROJECT_ID
export VITE_FIREBASE_STORAGE_BUCKET
export VITE_FIREBASE_MESSAGING_SENDER_ID
export VITE_FIREBASE_APP_ID
export VITE_FIREBASE_MEASUREMENT_ID
export VITE_FIREBASE_AUTH_FLOW

VITE_FIREBASE_API_KEY="$(runtime_or_sdk_value ".$ENV.firebase.client.apiKey" ".apiKey")"
VITE_FIREBASE_AUTH_DOMAIN="$(runtime_or_sdk_value ".$ENV.firebase.client.authDomain" ".authDomain")"
VITE_FIREBASE_PROJECT_ID="$(runtime_or_sdk_value ".$ENV.firebase.client.projectId" ".projectId")"
VITE_FIREBASE_STORAGE_BUCKET="$(runtime_or_sdk_value ".$ENV.firebase.client.storageBucket" ".storageBucket")"
VITE_FIREBASE_MESSAGING_SENDER_ID="$(runtime_or_sdk_value ".$ENV.firebase.client.messagingSenderId" ".messagingSenderId")"
VITE_FIREBASE_APP_ID="$(runtime_or_sdk_value ".$ENV.firebase.client.appId" ".appId")"
VITE_FIREBASE_MEASUREMENT_ID="$(runtime_or_sdk_value ".$ENV.firebase.client.measurementId // \"\"" ".measurementId // \"\"")"
VITE_FIREBASE_AUTH_FLOW="$(runtime_value ".$ENV.auth.flow // \"\"")"

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

# Stamp the build so every deploy is a distinct Firebase Hosting version. Without a
# unique marker, re-deploying byte-identical content makes Hosting reject the release
# as already the current active version (FAILED_PRECONDITION) — which the deploy
# action surfaces as a job failure. The short git sha + UTC build time guarantee a
# fresh version each run, while a genuine build/upload failure still fails.
printf '{"sha":"%s","builtAt":"%s"}\n' \
  "$(git -C "$REPO_DIR" rev-parse --short HEAD 2>/dev/null || echo unknown)" \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$REPO_DIR/dist/build-info.json"

# CI builds with --build-only and lets FirebaseExtended/action-hosting-deploy do the
# deploy (it bundles its own firebase-tools + handles SA-key auth, sidestepping
# firebase/firebase-tools#10726 where the CLI ignores GOOGLE_APPLICATION_CREDENTIALS).
if [[ "$BUILD_ONLY" == true ]]; then
  pass "Build complete (--build-only); skipping firebase deploy"
  print_summary "Firebase Hosting deploy"
  exit 0
fi

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
