#!/usr/bin/env bash
# River Go platform health check. Read-only.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLATFORM_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$SCRIPT_DIR/_helpers.sh"

CONFIG_FILE="${RIVER_GO_PLATFORM_CONFIG:-$PLATFORM_ROOT/.config/river-go-platform.json}"
ENV="${1:-staging}"

if [[ "$ENV" != "staging" && "$ENV" != "prod" ]]; then
  echo "Usage: $0 <staging|prod>" >&2
  exit 1
fi

if [[ ! -f "$CONFIG_FILE" ]]; then
  fail "Config file not found: $CONFIG_FILE"
  exit 1
fi

json_value() {
  local expression="$1"
  jq -r "$expression // empty" "$CONFIG_FILE"
}

GCP_PROJECT="$(json_value ".environments.$ENV.gcpProject")"
FIREBASE_PROJECT="$(json_value ".environments.$ENV.firebaseProject")"
REGION="$(json_value ".environments.$ENV.region")"
CLOUD_RUN_SERVICE="$(json_value ".environments.$ENV.cloudRunService")"
ARTIFACT_REPO="$(json_value ".environments.$ENV.artifactRegistryRepository")"
CLOUD_SQL_INSTANCE="$(json_value ".environments.$ENV.database.instance")"

section "River Go platform health - $ENV"

for command_name in jq gcloud firebase; do
  require_command "$command_name"
done

section "GCP project"
PROJECT_STATE="$(gcloud projects describe "$GCP_PROJECT" --format="value(lifecycleState)" 2>/dev/null || true)"
if [[ "$PROJECT_STATE" == "ACTIVE" ]]; then
  pass "Project is active: $GCP_PROJECT"
else
  fail "Project is not accessible or not active: $GCP_PROJECT"
  print_summary "Platform health"
  exit $?
fi

section "Billing"
BILLING_ENABLED="$(gcloud billing projects describe "$GCP_PROJECT" --format="value(billingEnabled)" 2>/dev/null || true)"
if [[ "$BILLING_ENABLED" == "True" || "$BILLING_ENABLED" == "true" ]]; then
  pass "Billing is enabled"
else
  warn "Billing is not enabled; publishing remains blocked"
fi

section "APIs"
for api in firebase.googleapis.com firebasehosting.googleapis.com run.googleapis.com artifactregistry.googleapis.com sqladmin.googleapis.com secretmanager.googleapis.com; do
  if gcloud services list --enabled --project="$GCP_PROJECT" --format="value(config.name)" 2>/dev/null | grep -qx "$api"; then
    pass "API enabled: $api"
  else
    warn "API not enabled: $api"
  fi
done

section "Firebase"
if firebase projects:list --json 2>/dev/null | jq -e --arg project "$FIREBASE_PROJECT" '.result[]? | select(.projectId == $project)' >/dev/null; then
  pass "Firebase project visible: $FIREBASE_PROJECT"
else
  warn "Firebase project not visible yet: $FIREBASE_PROJECT"
fi

section "Cloud resources"
if gcloud artifacts repositories describe "$ARTIFACT_REPO" --location="$REGION" --project="$GCP_PROJECT" >/dev/null 2>&1; then
  pass "Artifact Registry repository exists: $ARTIFACT_REPO"
else
  warn "Artifact Registry repository missing: $ARTIFACT_REPO"
fi

if gcloud sql instances describe "$CLOUD_SQL_INSTANCE" --project="$GCP_PROJECT" >/dev/null 2>&1; then
  pass "Cloud SQL instance exists: $CLOUD_SQL_INSTANCE"
else
  warn "Cloud SQL instance missing: $CLOUD_SQL_INSTANCE"
fi

if gcloud run services describe "$CLOUD_RUN_SERVICE" --region="$REGION" --project="$GCP_PROJECT" >/dev/null 2>&1; then
  pass "Cloud Run service exists: $CLOUD_RUN_SERVICE"
else
  warn "Cloud Run service missing: $CLOUD_RUN_SERVICE"
fi

print_summary "Platform health"
