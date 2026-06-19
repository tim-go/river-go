#!/usr/bin/env bash
set -euo pipefail

# Provisions the Cloud Scheduler job (and its service account) that drives
# automated river-level ingestion by calling POST /api/jobs/observations/ingest.
# Idempotent — safe to re-run. The endpoint authenticates the scheduler's
# Google-signed OIDC token in app code (see api/src/observation-job-auth.ts);
# the audience + service-account values come from the runtime config, the same
# ones deploy-api.sh sets on the Cloud Run service, so the two always agree.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLATFORM_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# shellcheck source=_helpers.sh
source "$SCRIPT_DIR/_helpers.sh"

ENV="${1:-}"
DRY_RUN=false

shift || true
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      ;;
    *)
      fail "Unknown argument: $1"
      print_summary "Level scheduler setup"
      exit 1
      ;;
  esac
  shift
done

if [[ "$ENV" != "staging" && "$ENV" != "prod" ]]; then
  fail "Usage: setup-scheduler.sh <staging|prod> [--dry-run]"
  print_summary "Level scheduler setup"
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

section "Level scheduler setup - $ENV"

ok=true
for command_name in jq gcloud; do
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
  print_summary "Level scheduler setup"
  exit 1
fi

GCP_PROJECT="$(json_value ".environments.$ENV.gcpProject")"
REGION="$(json_value ".environments.$ENV.region")"
CLOUD_RUN_SERVICE="$(json_value ".environments.$ENV.cloudRunService")"
SCHEDULE="$(jq -r ".environments.$ENV.scheduler.ingestionSchedule // \"*/30 * * * *\"" "$CONFIG_PATH")"
TIME_ZONE="$(jq -r ".environments.$ENV.scheduler.timeZone // \"Europe/London\"" "$CONFIG_PATH")"

AUDIENCE="$(jq -er ".$ENV.jobs.observationOidcAudience // \"\"" "$RUNTIME_CONFIG_PATH" 2>/dev/null || true)"
SCHEDULER_SA_EMAIL="$(jq -er ".$ENV.jobs.observationServiceAccount // \"\"" "$RUNTIME_CONFIG_PATH" 2>/dev/null || true)"

if [[ -z "$AUDIENCE" || "$AUDIENCE" == *"<"* || "$AUDIENCE" == *">"* ]]; then
  fail "$ENV jobs.observationOidcAudience is not set in $RUNTIME_CONFIG_PATH (e.g. https://$ENV.riverlaunch.info)"
  print_summary "Level scheduler setup"
  exit 1
fi
if [[ -z "$SCHEDULER_SA_EMAIL" || "$SCHEDULER_SA_EMAIL" == *"<"* || "$SCHEDULER_SA_EMAIL" == *">"* ]]; then
  fail "$ENV jobs.observationServiceAccount is not set in $RUNTIME_CONFIG_PATH (e.g. river-levels-scheduler@$GCP_PROJECT.iam.gserviceaccount.com)"
  print_summary "Level scheduler setup"
  exit 1
fi

SCHEDULER_SA_NAME="${SCHEDULER_SA_EMAIL%%@*}"
JOB_NAME="river-levels-ingest-$ENV"

section "Enable APIs"
run gcloud services enable cloudscheduler.googleapis.com --project="$GCP_PROJECT"
pass "cloudscheduler.googleapis.com enabled"

section "Scheduler service account"
if gcloud iam service-accounts describe "$SCHEDULER_SA_EMAIL" --project="$GCP_PROJECT" >/dev/null 2>&1; then
  pass "Service account exists: $SCHEDULER_SA_EMAIL"
else
  run gcloud iam service-accounts create "$SCHEDULER_SA_NAME" \
    --project="$GCP_PROJECT" \
    --display-name="River levels Cloud Scheduler ($ENV)"
  pass "Created service account: $SCHEDULER_SA_EMAIL"
fi

section "OIDC token permissions"
# Make sure the Cloud Scheduler service agent exists, then let it mint OIDC
# tokens as our scheduler SA. (On a brand-new project the agent can take a
# moment to appear — re-run this script if the binding below fails.)
run gcloud beta services identity create \
  --service=cloudscheduler.googleapis.com \
  --project="$GCP_PROJECT" >/dev/null 2>&1 || true
PROJECT_NUMBER="$(gcloud projects describe "$GCP_PROJECT" --format='value(projectNumber)')"
SCHEDULER_AGENT="service-$PROJECT_NUMBER@gcp-sa-cloudscheduler.iam.gserviceaccount.com"
run gcloud iam service-accounts add-iam-policy-binding "$SCHEDULER_SA_EMAIL" \
  --project="$GCP_PROJECT" \
  --member="serviceAccount:$SCHEDULER_AGENT" \
  --role="roles/iam.serviceAccountTokenCreator" >/dev/null
pass "Cloud Scheduler agent may mint OIDC tokens as $SCHEDULER_SA_NAME"

section "Resolve Cloud Run URL"
# The scheduler calls Cloud Run directly (not via the Hosting rewrite) so the
# Authorization header reaches the app unchanged. The audience it stamps on the
# token is the configured value above, not this URL.
SERVICE_URL="$(gcloud run services describe "$CLOUD_RUN_SERVICE" \
  --region="$REGION" --project="$GCP_PROJECT" \
  --format='value(status.url)' 2>/dev/null || true)"
if [[ -z "$SERVICE_URL" ]]; then
  fail "Cloud Run service '$CLOUD_RUN_SERVICE' not found in $REGION — deploy the API first (npm run platform:deploy-api:$ENV)"
  print_summary "Level scheduler setup"
  exit 1
fi
INGEST_URI="$SERVICE_URL/api/jobs/observations/ingest"
pass "Target: $INGEST_URI"

section "Cloud Scheduler job"
if gcloud scheduler jobs describe "$JOB_NAME" \
  --location="$REGION" --project="$GCP_PROJECT" >/dev/null 2>&1; then
  run gcloud scheduler jobs update http "$JOB_NAME" \
    --location="$REGION" --project="$GCP_PROJECT" \
    --schedule="$SCHEDULE" --time-zone="$TIME_ZONE" \
    --http-method=POST --uri="$INGEST_URI" \
    --oidc-service-account-email="$SCHEDULER_SA_EMAIL" \
    --oidc-token-audience="$AUDIENCE"
  pass "Updated scheduler job: $JOB_NAME ($SCHEDULE $TIME_ZONE)"
else
  run gcloud scheduler jobs create http "$JOB_NAME" \
    --location="$REGION" --project="$GCP_PROJECT" \
    --schedule="$SCHEDULE" --time-zone="$TIME_ZONE" \
    --http-method=POST --uri="$INGEST_URI" \
    --oidc-service-account-email="$SCHEDULER_SA_EMAIL" \
    --oidc-token-audience="$AUDIENCE"
  pass "Created scheduler job: $JOB_NAME ($SCHEDULE $TIME_ZONE)"
fi

info "Audience '$AUDIENCE' must equal OBSERVATION_JOB_OIDC_AUDIENCE on the API"
info "(deploy-api.sh sets it from the same runtime-config value, so they match)."
info "Verify once: gcloud scheduler jobs run $JOB_NAME --location=$REGION --project=$GCP_PROJECT"

print_summary "Level scheduler setup"
