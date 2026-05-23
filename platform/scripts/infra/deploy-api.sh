#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLATFORM_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPO_DIR="$(cd "$PLATFORM_DIR/.." && pwd)"

# shellcheck source=_helpers.sh
source "$SCRIPT_DIR/_helpers.sh"

ENV="${1:-}"
DRY_RUN=false
TAG="${TAG:-}"

shift || true
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      ;;
    --tag)
      TAG="${2:-}"
      shift
      ;;
    *)
      fail "Unknown argument: $1"
      print_summary "Cloud Run API deploy"
      exit 1
      ;;
  esac
  shift
done

if [[ "$ENV" != "staging" && "$ENV" != "prod" ]]; then
  fail "Usage: deploy-api.sh <staging|prod> [--dry-run] [--tag <tag>]"
  print_summary "Cloud Run API deploy"
  exit 1
fi

CONFIG_PATH="${RIVER_GO_PLATFORM_CONFIG:-$PLATFORM_DIR/.config/river-go-platform.json}"
RUNTIME_CONFIG_PATH="${RIVER_GO_RUNTIME_CONFIG:-$PLATFORM_DIR/.config/river-go-runtime.json}"

json_value() {
  jq -er "$1" "$CONFIG_PATH"
}

runtime_value() {
  jq -er "$1" "$RUNTIME_CONFIG_PATH"
}

validate_inputs() {
  section "Deploy API preflight - $ENV"

  local ok=true
  for command_name in jq gcloud npm curl; do
    require_command "$command_name" || ok=false
  done

  if [[ ! -f "$CONFIG_PATH" ]]; then
    fail "Platform config not found: $CONFIG_PATH"
    ok=false
  fi

  if [[ ! -f "$RUNTIME_CONFIG_PATH" ]]; then
    fail "Runtime config not found: $RUNTIME_CONFIG_PATH"
    ok=false
  fi

  if [[ "$ok" != true ]]; then
    print_summary "Cloud Run API deploy"
    exit 1
  fi
}

write_secret() {
  local secret_name="$1"
  local secret_value="$2"
  local temp_file
  temp_file="$(mktemp)"
  chmod 600 "$temp_file"
  printf '%s' "$secret_value" >"$temp_file"

  if gcloud secrets describe "$secret_name" --project="$GCP_PROJECT" >/dev/null 2>&1; then
    run gcloud secrets versions add "$secret_name" \
      --data-file="$temp_file" \
      --project="$GCP_PROJECT" >/dev/null
    pass "Updated Secret Manager secret: $secret_name"
  else
    run gcloud secrets create "$secret_name" \
      --data-file="$temp_file" \
      --replication-policy="automatic" \
      --project="$GCP_PROJECT" >/dev/null
    pass "Created Secret Manager secret: $secret_name"
  fi

  rm -f "$temp_file"
}

validate_inputs

GCP_PROJECT="$(json_value ".environments.$ENV.gcpProject")"
REGION="$(json_value ".environments.$ENV.region")"
CLOUD_RUN_SERVICE="$(json_value ".environments.$ENV.cloudRunService")"
ARTIFACT_REPOSITORY="$(json_value ".environments.$ENV.artifactRegistryRepository")"
CLOUD_SQL_INSTANCE="$(json_value ".environments.$ENV.database.instance")"
SERVER_SA_NAME="$(jq -r ".environments.$ENV.serviceAccounts.server // \"river-go-server\"" "$CONFIG_PATH")"
SERVER_SA_EMAIL="$SERVER_SA_NAME@$GCP_PROJECT.iam.gserviceaccount.com"
DATABASE_URL="$(runtime_value ".$ENV.database.url")"

if [[ -z "$TAG" ]]; then
  GIT_SHA="$(git -C "$REPO_DIR" rev-parse --short HEAD 2>/dev/null || echo manual)"
  TAG="$GIT_SHA-$(date -u +%Y%m%d%H%M%S)"
fi

if [[ "$DATABASE_URL" == *"<"* || "$DATABASE_URL" == *">"* ]]; then
  fail "$ENV database.url in $RUNTIME_CONFIG_PATH still contains placeholder values"
  print_summary "Cloud Run API deploy"
  exit 1
fi

CLOUD_SQL_CONNECTION_NAME="$GCP_PROJECT:$REGION:$CLOUD_SQL_INSTANCE"
IMAGE="$REGION-docker.pkg.dev/$GCP_PROJECT/$ARTIFACT_REPOSITORY/$CLOUD_RUN_SERVICE:$TAG"

section "Build checks"
run npm --prefix "$REPO_DIR/api" run build

section "Secret Manager - $GCP_PROJECT"
write_secret "DATABASE_URL" "$DATABASE_URL"

section "Build and publish image"
run gcloud builds submit "$REPO_DIR/api" \
  --tag "$IMAGE" \
  --project="$GCP_PROJECT"

section "Deploy Cloud Run service"
run gcloud run deploy "$CLOUD_RUN_SERVICE" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$GCP_PROJECT" \
  --platform="managed" \
  --no-invoker-iam-check \
  --service-account="$SERVER_SA_EMAIL" \
  --add-cloudsql-instances="$CLOUD_SQL_CONNECTION_NAME" \
  --set-env-vars="CLOUD_SQL_CONNECTION_NAME=$CLOUD_SQL_CONNECTION_NAME,NODE_ENV=production" \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest" \
  --port="8080" \
  --memory="512Mi" \
  --cpu="1" \
  --min-instances="0" \
  --max-instances="2"

if [[ "$DRY_RUN" != true ]]; then
  SERVICE_URL="$(gcloud run services describe "$CLOUD_RUN_SERVICE" \
    --region="$REGION" \
    --project="$GCP_PROJECT" \
    --format="value(status.url)")"

  info "Cloud Run URL: $SERVICE_URL"
  curl -fsS "$SERVICE_URL/api/health" >/dev/null
  pass "Cloud Run health check passed"
fi

print_summary "Cloud Run API deploy"
