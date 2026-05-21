#!/usr/bin/env bash
# River Go platform setup.
#
# Usage:
#   platform/scripts/infra/setup.sh staging --dry-run
#   platform/scripts/infra/setup.sh staging --create-resources
#   platform/scripts/infra/setup.sh prod --create-resources
#   platform/scripts/infra/setup.sh all --dry-run

set -uo pipefail

export CLOUDSDK_CORE_DISABLE_PROMPTS=1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLATFORM_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPO_ROOT="$(cd "$PLATFORM_ROOT/.." && pwd)"

source "$SCRIPT_DIR/_helpers.sh"

CONFIG_FILE="${RIVER_GO_PLATFORM_CONFIG:-$PLATFORM_ROOT/.config/river-go-platform.json}"
TEMPLATE_CONFIG_FILE="$PLATFORM_ROOT/config/templates/river-go-platform.json"

ENVS=()
DRY_RUN=false
CREATE_RESOURCES=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    staging|prod)
      ENVS+=("$1")
      shift
      ;;
    all)
      ENVS=("staging" "prod")
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --create-resources)
      CREATE_RESOURCES=true
      shift
      ;;
    --help|-h)
      cat <<'USAGE'
River Go platform setup.

Usage:
  platform/scripts/infra/setup.sh staging --dry-run
  platform/scripts/infra/setup.sh staging --create-resources
  platform/scripts/infra/setup.sh prod --create-resources
  platform/scripts/infra/setup.sh all --dry-run

Flags:
  --dry-run           Print actions without changing cloud resources.
  --create-resources  Create missing GCP projects and paid resources.
USAGE
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Usage: $0 <staging|prod|all> [--dry-run] [--create-resources]" >&2
      exit 1
      ;;
  esac
done

if [[ ${#ENVS[@]} -eq 0 ]]; then
  echo "Specify environment: staging, prod, or all" >&2
  exit 1
fi

if [[ ! -f "$CONFIG_FILE" ]]; then
  fail "Config file not found: $CONFIG_FILE"
  echo ""
  echo "Create local config first:"
  echo "  mkdir -p $PLATFORM_ROOT/.config"
  echo "  cp $TEMPLATE_CONFIG_FILE $CONFIG_FILE"
  echo "  npm run platform:check"
  exit 1
fi

json_value() {
  local expression="$1"
  jq -r "$expression // empty" "$CONFIG_FILE"
}

http_request_json() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local token response status payload

  token="$(gcloud auth print-access-token 2>/dev/null)" || return 1

  if [[ -n "$body" ]]; then
    response="$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -H "x-goog-user-project: $GCP_PROJECT" \
      -d "$body" \
      "$url" 2>/dev/null)"
  else
    response="$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -H "x-goog-user-project: $GCP_PROJECT" \
      "$url" 2>/dev/null)"
  fi

  status="$(echo "$response" | tail -1)"
  payload="$(echo "$response" | sed '$d')"
  printf '%s\n%s\n' "$status" "$payload"
}

load_config() {
  local env="$1"

  DISPLAY_NAME="$(json_value '.project.displayName')"
  PROJECT_SLUG="$(json_value '.project.slug')"
  GITHUB_REPO="$(json_value '.project.githubRepo')"
  BILLING_ACCOUNT="$(json_value '.project.billingAccount // .billingAccount')"
  RESOURCE_PARENT_TYPE="$(json_value '.project.resourceParent.type // .resourceParent.type')"
  RESOURCE_PARENT_ID="$(json_value '.project.resourceParent.id // .resourceParent.id')"

  GCP_PROJECT="$(json_value ".environments.$env.gcpProject")"
  FIREBASE_PROJECT="$(json_value ".environments.$env.firebaseProject")"
  REGION="$(json_value ".environments.$env.region")"
  WEB_DOMAIN="$(json_value ".environments.$env.domains.web")"
  API_DOMAIN="$(json_value ".environments.$env.domains.api")"
  FIREBASE_HOSTING_SITE="$(json_value ".environments.$env.firebaseHostingSite")"
  CLOUD_RUN_SERVICE="$(json_value ".environments.$env.cloudRunService")"
  ARTIFACT_REPO="$(json_value ".environments.$env.artifactRegistryRepository")"
  GITHUB_ENVIRONMENT="$(json_value ".environments.$env.githubEnvironment")"
  CI_SA_NAME="$(json_value ".environments.$env.serviceAccounts.ci")"
  SERVER_SA_NAME="$(json_value ".environments.$env.serviceAccounts.server")"
  GCP_SA_KEY_FILE="$(json_value ".environments.$env.files.gcpSaKeyFile")"
  FIREBASE_ADMIN_SA_KEY_FILE="$(json_value ".environments.$env.files.firebaseAdminSaKeyFile")"
  FIREBASE_SDK_FILE="$(json_value ".environments.$env.files.firebaseSdkFile")"
  CLOUD_SQL_INSTANCE="$(json_value ".environments.$env.database.instance")"
  CLOUD_SQL_DB="$(json_value ".environments.$env.database.database")"
  CLOUD_SQL_USER_APP="$(json_value ".environments.$env.database.appUser")"
  CLOUD_SQL_USER_MIGRATIONS="$(json_value ".environments.$env.database.migrationUser")"
  CLOUD_SQL_POSTGIS="$(json_value ".environments.$env.database.postgis")"
  STORAGE_BUCKET="$(json_value ".environments.$env.storage.bucket")"

  CI_SA_NAME="${CI_SA_NAME:-github-actions}"
  SERVER_SA_NAME="${SERVER_SA_NAME:-river-go-server}"
  GCP_SA_KEY_FILE="${GCP_SA_KEY_FILE:-.config/gcp-sa-$env.json}"
  FIREBASE_ADMIN_SA_KEY_FILE="${FIREBASE_ADMIN_SA_KEY_FILE:-.config/firebase-admin-sa-$env.json}"
  FIREBASE_SDK_FILE="${FIREBASE_SDK_FILE:-.config/firebase-sdk-$env.json}"

  CI_SA_EMAIL="$CI_SA_NAME@$GCP_PROJECT.iam.gserviceaccount.com"
  SERVER_SA_EMAIL="$SERVER_SA_NAME@$GCP_PROJECT.iam.gserviceaccount.com"
}

validate_config() {
  local env="$1"
  local missing=()

  for pair in \
    "project.displayName:$DISPLAY_NAME" \
    "project.slug:$PROJECT_SLUG" \
    "project.githubRepo:$GITHUB_REPO" \
    "environments.$env.gcpProject:$GCP_PROJECT" \
    "environments.$env.firebaseProject:$FIREBASE_PROJECT" \
    "environments.$env.region:$REGION" \
    "environments.$env.domains.web:$WEB_DOMAIN" \
    "environments.$env.firebaseHostingSite:$FIREBASE_HOSTING_SITE" \
    "environments.$env.cloudRunService:$CLOUD_RUN_SERVICE" \
    "environments.$env.artifactRegistryRepository:$ARTIFACT_REPO" \
    "environments.$env.githubEnvironment:$GITHUB_ENVIRONMENT" \
    "environments.$env.serviceAccounts.ci:$CI_SA_NAME" \
    "environments.$env.serviceAccounts.server:$SERVER_SA_NAME" \
    "environments.$env.files.gcpSaKeyFile:$GCP_SA_KEY_FILE" \
    "environments.$env.files.firebaseAdminSaKeyFile:$FIREBASE_ADMIN_SA_KEY_FILE" \
    "environments.$env.files.firebaseSdkFile:$FIREBASE_SDK_FILE" \
    "environments.$env.database.instance:$CLOUD_SQL_INSTANCE" \
    "environments.$env.database.database:$CLOUD_SQL_DB" \
    "environments.$env.database.appUser:$CLOUD_SQL_USER_APP" \
    "environments.$env.database.migrationUser:$CLOUD_SQL_USER_MIGRATIONS" \
    "environments.$env.storage.bucket:$STORAGE_BUCKET"; do
    local field="${pair%%:*}"
    local value="${pair#*:}"
    if [[ -z "$value" || "$value" == "null" ]]; then
      missing+=("$field")
    fi
  done

  if [[ "$GCP_PROJECT" != "$FIREBASE_PROJECT" ]]; then
    missing+=("environments.$env.firebaseProject must match gcpProject for this setup script")
  fi

  if $CREATE_RESOURCES && [[ -z "$BILLING_ACCOUNT" ]]; then
    missing+=("project.billingAccount is required in $CONFIG_FILE with --create-resources")
  fi

  if $CREATE_RESOURCES && [[ -n "$BILLING_ACCOUNT" ]] && ! [[ "$BILLING_ACCOUNT" =~ ^[0-9A-Fa-f]{6}-[0-9A-Fa-f]{6}-[0-9A-Fa-f]{6}$ ]]; then
    missing+=("project.billingAccount in $CONFIG_FILE must look like 000000-000000-000000")
  fi

  if [[ -n "$RESOURCE_PARENT_TYPE" || -n "$RESOURCE_PARENT_ID" ]]; then
    if [[ "$RESOURCE_PARENT_TYPE" != "folder" && "$RESOURCE_PARENT_TYPE" != "organization" ]]; then
      missing+=("project.resourceParent.type must be folder or organization when set")
    fi
    if [[ -z "$RESOURCE_PARENT_ID" ]]; then
      missing+=("project.resourceParent.id is required when project.resourceParent.type is set")
    fi
  fi

  if [[ ${#missing[@]} -gt 0 ]]; then
    fail "Config validation failed for $env"
    for field in "${missing[@]}"; do
      echo "  - $field"
    done
    exit 1
  fi

  pass "Config validated for $env"
}

preflight() {
  section "Preflight"

  local ok=true
  require_command jq || ok=false
  require_command gcloud || ok=false
  require_command firebase || ok=false
  require_command curl || ok=false

  if command -v gh >/dev/null 2>&1; then
    pass "gh found at $(command -v gh)"
  else
    warn "gh is not installed; GitHub environment setup will be skipped"
  fi

  if ! $ok; then
    fail "Install missing CLIs before running setup"
    exit 1
  fi

  if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q "@"; then
    fail "gcloud is not authenticated. Run: gcloud auth login"
    exit 1
  fi
  pass "gcloud authenticated"

  if ! firebase projects:list --json >/dev/null 2>&1; then
    fail "firebase CLI is not authenticated. Run: firebase login"
    exit 1
  fi
  pass "firebase CLI authenticated"

  if command -v gh >/dev/null 2>&1; then
    if gh auth status >/dev/null 2>&1; then
      pass "gh authenticated"
    else
      warn "gh is installed but not authenticated; run: gh auth login"
    fi
  fi

  if $DRY_RUN; then
    warn "Dry-run mode: commands will be printed but not executed"
  fi
}

ensure_project() {
  section "GCP project - $GCP_PROJECT"

  local state active_account
  state="$(gcloud projects describe "$GCP_PROJECT" --format="value(lifecycleState)" 2>/dev/null || true)"
  active_account="$(gcloud config get-value account 2>/dev/null || true)"

  if [[ "$state" == "ACTIVE" ]]; then
    pass "GCP project is active: $GCP_PROJECT"
  elif $CREATE_RESOURCES; then
    if [[ "$active_account" == *".gserviceaccount.com" && -z "$RESOURCE_PARENT_ID" ]]; then
      fail "Cannot create GCP project as service account without a resource parent"
      echo "  Active account: $active_account"
      echo "  Use a user account with project-creation rights:"
      echo "    gcloud auth login"
      echo "    gcloud config set account <your-google-account>"
      echo "  Or set project.resourceParent.type/id in $CONFIG_FILE and grant this service account project-creator permissions on that parent."
      return 1
    fi

    info "Creating GCP project: $GCP_PROJECT"
    local create_args=(projects create "$GCP_PROJECT" --name="$DISPLAY_NAME" --quiet)
    if [[ "$RESOURCE_PARENT_TYPE" == "folder" ]]; then
      create_args+=("--folder=$RESOURCE_PARENT_ID")
    elif [[ "$RESOURCE_PARENT_TYPE" == "organization" ]]; then
      create_args+=("--organization=$RESOURCE_PARENT_ID")
    fi

    if run_with_retry 5 15 gcloud "${create_args[@]}"; then
      pass "GCP project created: $GCP_PROJECT"
    elif [[ "$(gcloud projects describe "$GCP_PROJECT" --format="value(lifecycleState)" 2>/dev/null || true)" == "ACTIVE" ]]; then
      pass "GCP project became active after create retry: $GCP_PROJECT"
    else
      fail "Could not create GCP project: $GCP_PROJECT"
      return 1
    fi
  else
    fail "GCP project not found: $GCP_PROJECT"
    info "Re-run with --create-resources to create it"
    return 1
  fi

  ensure_billing_linked || return 1
}

ensure_billing_linked() {
  section "Billing - $GCP_PROJECT"

  local billing_enabled
  billing_enabled="$(gcloud billing projects describe "$GCP_PROJECT" --format="value(billingEnabled)" 2>/dev/null || true)"

  if [[ "$billing_enabled" == "True" || "$billing_enabled" == "true" ]]; then
    pass "Billing is enabled for $GCP_PROJECT"
    return 0
  fi

  if [[ -z "$BILLING_ACCOUNT" ]]; then
    fail "Billing is not enabled and project.billingAccount is not set in $CONFIG_FILE"
    manual_step "Set project.billingAccount in $CONFIG_FILE, or link billing manually for $GCP_PROJECT."
    return 1
  fi

  info "Linking billing account to $GCP_PROJECT"
  if ! run gcloud billing projects link "$GCP_PROJECT" --billing-account="$BILLING_ACCOUNT" --quiet; then
    fail "Could not link billing to $GCP_PROJECT"
    echo "  This can be caused by billing account quota, billing permissions, or billing account policy."
    echo "  Check Google Cloud Console -> Billing -> Account management, or request a billing quota increase."
    echo "  Manual command:"
    echo "    gcloud billing projects link $GCP_PROJECT --billing-account=<billing-account-id>"
    return 1
  fi

  if $DRY_RUN; then
    return 0
  fi

  local attempt
  for attempt in {1..12}; do
    billing_enabled="$(gcloud billing projects describe "$GCP_PROJECT" --format="value(billingEnabled)" 2>/dev/null || true)"
    if [[ "$billing_enabled" == "True" || "$billing_enabled" == "true" ]]; then
      pass "Billing is enabled for $GCP_PROJECT"
      return 0
    fi

    info "Waiting for billing link to propagate ($attempt/12)"
    sleep 5
  done

  fail "Billing link did not become active for $GCP_PROJECT"
  echo "  Re-run after a minute, or check the project billing page in Google Cloud Console."
  return 1
}

enable_apis() {
  section "GCP APIs - $GCP_PROJECT"

  local apis=(
    serviceusage.googleapis.com
    cloudresourcemanager.googleapis.com
    firebase.googleapis.com
    firebasehosting.googleapis.com
    identitytoolkit.googleapis.com
    firebasestorage.googleapis.com
    storage.googleapis.com
    run.googleapis.com
    cloudbuild.googleapis.com
    artifactregistry.googleapis.com
    sqladmin.googleapis.com
    secretmanager.googleapis.com
    iam.googleapis.com
    iamcredentials.googleapis.com
  )

  run gcloud services enable "${apis[@]}" --project="$GCP_PROJECT" --quiet \
    && pass "Required APIs enabled" \
    || { fail "Could not enable required APIs"; return 1; }
}

ensure_firebase() {
  section "Firebase - $FIREBASE_PROJECT"

  local firebase_state
  firebase_state="$(firebase projects:list --json 2>/dev/null | jq -r --arg project "$FIREBASE_PROJECT" '.result[]? | select(.projectId == $project) | .projectId' | head -1)"

  if [[ "$firebase_state" == "$FIREBASE_PROJECT" ]]; then
    pass "Firebase is already added to $FIREBASE_PROJECT"
  else
    info "Adding Firebase to GCP project $FIREBASE_PROJECT"
    run firebase projects:addfirebase "$FIREBASE_PROJECT" \
      && pass "Firebase added to $FIREBASE_PROJECT" \
      || warn "Could not add Firebase automatically; verify Firebase terms and IAM permissions"
  fi

  local web_app_id
  web_app_id="$(firebase apps:list --project="$FIREBASE_PROJECT" --json 2>/dev/null | jq -r '.result[]? | select(.platform == "WEB") | .appId' | head -1)"

  if [[ -n "$web_app_id" ]]; then
    pass "Firebase web app exists: $web_app_id"
  else
    info "Registering Firebase web app"
    run firebase apps:create WEB "River Go Web ($ENV)" --project="$FIREBASE_PROJECT" \
      && pass "Firebase web app registered" \
      || warn "Could not register Firebase web app"

    if ! $DRY_RUN; then
      web_app_id="$(firebase apps:list --project="$FIREBASE_PROJECT" --json 2>/dev/null | jq -r '.result[]? | select(.platform == "WEB") | .appId' | head -1)"
    fi
  fi

  if [[ -n "$web_app_id" ]]; then
    info "Exporting Firebase web SDK config"
    mkdir -p "$PLATFORM_ROOT/$(dirname "$FIREBASE_SDK_FILE")"
    if $DRY_RUN; then
      echo -e "  ${CYAN}[dry-run]${NC} firebase apps:sdkconfig WEB $web_app_id > $FIREBASE_SDK_FILE"
    else
      firebase apps:sdkconfig WEB "$web_app_id" --project="$FIREBASE_PROJECT" --json 2>/dev/null \
        | jq '.result.sdkConfig' > "$PLATFORM_ROOT/$FIREBASE_SDK_FILE" \
        && pass "Firebase SDK config exported to platform/$FIREBASE_SDK_FILE" \
        || warn "Could not export Firebase SDK config"
    fi
  fi
}

ensure_hosting() {
  section "Firebase Hosting - $FIREBASE_HOSTING_SITE"

  local site
  site="$(firebase hosting:sites:list --project="$FIREBASE_PROJECT" --json 2>/dev/null \
    | jq -r --arg site "$FIREBASE_HOSTING_SITE" '.result[]? | select(.name | endswith("/sites/" + $site)) | .name' \
    | head -1)"

  if [[ -n "$site" ]]; then
    pass "Firebase Hosting site exists: $FIREBASE_HOSTING_SITE"
    return 0
  fi

  info "Creating Firebase Hosting site"
  run firebase hosting:sites:create "$FIREBASE_HOSTING_SITE" --project="$FIREBASE_PROJECT" \
    && pass "Firebase Hosting site created: $FIREBASE_HOSTING_SITE" \
    || warn "Could not create Firebase Hosting site; verify site id availability or create it in Firebase Console"
}

configure_auth() {
  section "Firebase Auth - $GCP_PROJECT"

  if $DRY_RUN; then
    echo -e "  ${CYAN}[dry-run]${NC} Enable Email/Password sign-in"
    echo -e "  ${CYAN}[dry-run]${NC} Configure authorised domains"
    return 0
  fi

  local response status domains_body
  mapfile -t response < <(http_request_json GET "https://identitytoolkit.googleapis.com/admin/v2/projects/$GCP_PROJECT/config")
  status="${response[0]:-}"

  if [[ "$status" == "200" ]]; then
    pass "Identity Toolkit config is accessible"
  else
    warn "Identity Toolkit config is not accessible yet (HTTP ${status:-unknown})"
    manual_step "Open Firebase Console -> Authentication for $GCP_PROJECT and click Get started, then re-run setup."
    return 0
  fi

  mapfile -t response < <(http_request_json PATCH \
    "https://identitytoolkit.googleapis.com/v2/projects/$GCP_PROJECT/config?updateMask=signIn.email" \
    '{"signIn":{"email":{"enabled":true,"passwordRequired":true}}}')
  status="${response[0]:-}"
  [[ "$status" == "200" ]] && pass "Email/Password sign-in enabled" || warn "Could not enable Email/Password sign-in"

  domains_body="$(jq -n \
    --arg firebaseDomain "$FIREBASE_PROJECT.firebaseapp.com" \
    --arg webDomain "$WEB_DOMAIN" \
    '{authorizedDomains:["localhost",$firebaseDomain,$webDomain]}')"
  mapfile -t response < <(http_request_json PATCH \
    "https://identitytoolkit.googleapis.com/admin/v2/projects/$GCP_PROJECT/config?updateMask=authorizedDomains" \
    "$domains_body")
  status="${response[0]:-}"
  [[ "$status" == "200" ]] && pass "Authorised domains configured" || warn "Could not configure authorised domains"

  manual_step "Configure Google sign-in provider in Firebase Console once OAuth client IDs are confirmed."
}

ensure_storage() {
  section "Firebase Storage - $GCP_PROJECT"

  if $DRY_RUN; then
    echo -e "  ${CYAN}[dry-run]${NC} Check or create Firebase Storage default bucket in $REGION"
    return 0
  fi

  local storage_bucket response status
  storage_bucket="$(curl -s \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "x-goog-user-project: $GCP_PROJECT" \
    "https://firebasestorage.googleapis.com/v1beta/projects/$GCP_PROJECT/buckets" 2>/dev/null \
    | jq -r '.buckets[0].name // empty' 2>/dev/null)"

  if [[ -n "$storage_bucket" ]]; then
    pass "Firebase Storage bucket exists: $storage_bucket"
    return 0
  fi

  info "Creating Firebase Storage default bucket"
  mapfile -t response < <(http_request_json POST \
    "https://firebasestorage.googleapis.com/v1alpha/projects/$GCP_PROJECT/defaultBucket" \
    "{\"location\":\"$REGION\"}")
  status="${response[0]:-}"

  if [[ "$status" == "200" || "$status" == "409" ]]; then
    pass "Firebase Storage default bucket created or already linked"
  else
    warn "Could not create Firebase Storage bucket (HTTP ${status:-unknown})"
    manual_step "Create Firebase Storage manually in Firebase Console. New buckets require Blaze billing."
  fi
}

ensure_artifact_registry() {
  section "Artifact Registry - $ARTIFACT_REPO"

  local repo
  repo="$(gcloud artifacts repositories describe "$ARTIFACT_REPO" --location="$REGION" --project="$GCP_PROJECT" --format="value(name)" 2>/dev/null || true)"

  if [[ -n "$repo" ]]; then
    pass "Artifact Registry repository exists: $ARTIFACT_REPO"
    return 0
  fi

  info "Creating Artifact Registry Docker repository"
  run gcloud artifacts repositories create "$ARTIFACT_REPO" \
    --repository-format=docker \
    --location="$REGION" \
    --description="River Go Cloud Run images" \
    --project="$GCP_PROJECT" \
    --quiet \
    && pass "Artifact Registry repository created" \
    || warn "Could not create Artifact Registry repository"
}

ensure_cloud_sql() {
  section "Cloud SQL - $CLOUD_SQL_INSTANCE"

  local sql_state
  sql_state="$(gcloud sql instances describe "$CLOUD_SQL_INSTANCE" --project="$GCP_PROJECT" --format="value(state)" 2>/dev/null || echo "NOT_FOUND")"

  if [[ "$sql_state" == "RUNNABLE" ]]; then
    pass "Cloud SQL instance is RUNNABLE"
  elif [[ "$sql_state" == "NOT_FOUND" ]]; then
    if $CREATE_RESOURCES; then
      info "Creating Cloud SQL PostgreSQL 16 instance"
      run gcloud sql instances create "$CLOUD_SQL_INSTANCE" \
        --database-version=POSTGRES_16 \
        --edition=enterprise \
        --tier=db-g1-small \
        --region="$REGION" \
        --project="$GCP_PROJECT" \
        --storage-type=SSD \
        --storage-size=10GB \
        --backup-start-time=03:00 \
        --quiet \
        && pass "Cloud SQL instance created" \
        || { warn "Could not create Cloud SQL instance"; return 0; }
    else
      warn "Cloud SQL instance does not exist"
      manual_step "Re-run with --create-resources, or create Cloud SQL PostgreSQL 16 instance '$CLOUD_SQL_INSTANCE' manually."
      return 0
    fi
  else
    warn "Cloud SQL instance state is $sql_state"
  fi

  if $DRY_RUN; then
    echo -e "  ${CYAN}[dry-run]${NC} Check/create database $CLOUD_SQL_DB"
    return 0
  fi

  if gcloud sql databases describe "$CLOUD_SQL_DB" --instance="$CLOUD_SQL_INSTANCE" --project="$GCP_PROJECT" >/dev/null 2>&1; then
    pass "Cloud SQL database exists: $CLOUD_SQL_DB"
  else
    run gcloud sql databases create "$CLOUD_SQL_DB" --instance="$CLOUD_SQL_INSTANCE" --project="$GCP_PROJECT" \
      && pass "Cloud SQL database created: $CLOUD_SQL_DB" \
      || warn "Could not create Cloud SQL database"
  fi

  if [[ "$CLOUD_SQL_POSTGIS" == "true" ]]; then
    manual_step "Enable PostGIS in database '$CLOUD_SQL_DB': connect with psql and run CREATE EXTENSION IF NOT EXISTS postgis;"
  fi

  manual_step "Create/set Cloud SQL passwords for users '$CLOUD_SQL_USER_APP' and '$CLOUD_SQL_USER_MIGRATIONS', then grant schema/table privileges."
}

ensure_service_accounts() {
  section "Service accounts - $GCP_PROJECT"

  ensure_service_account "$CI_SA_NAME" "River Go GitHub Actions"
  ensure_service_account "$SERVER_SA_NAME" "River Go server runtime"

  grant_roles "$CI_SA_EMAIL" \
    roles/run.admin \
    roles/iam.serviceAccountUser \
    roles/artifactregistry.writer \
    roles/cloudsql.client \
    roles/secretmanager.secretAccessor \
    roles/storage.objectAdmin

  grant_roles "$SERVER_SA_EMAIL" \
    roles/firebaseauth.admin \
    roles/cloudsql.client \
    roles/secretmanager.secretAccessor \
    roles/storage.objectAdmin

  ensure_service_account_key "$CI_SA_EMAIL" "$GCP_SA_KEY_FILE" "CI/CD"
  ensure_service_account_key "$SERVER_SA_EMAIL" "$FIREBASE_ADMIN_SA_KEY_FILE" "server/Firebase Admin"
}

ensure_service_account() {
  local name="$1"
  local display_name="$2"
  local email="$name@$GCP_PROJECT.iam.gserviceaccount.com"

  if gcloud iam service-accounts describe "$email" --project="$GCP_PROJECT" >/dev/null 2>&1; then
    pass "Service account exists: $email"
    return 0
  fi

  info "Creating service account: $email"
  run gcloud iam service-accounts create "$name" \
    --display-name="$display_name" \
    --project="$GCP_PROJECT" \
    && pass "Service account created: $email" \
    || warn "Could not create service account: $email"
}

grant_roles() {
  local email="$1"
  shift

  for role in "$@"; do
    run gcloud projects add-iam-policy-binding "$GCP_PROJECT" \
      --member="serviceAccount:$email" \
      --role="$role" \
      --condition=None \
      --quiet >/dev/null 2>&1 \
      && pass "$email has $role" \
      || warn "Could not grant $role to $email"
  done
}

ensure_service_account_key() {
  local email="$1"
  local key_file="$2"
  local label="$3"
  local key_path="$PLATFORM_ROOT/$key_file"

  if [[ -s "$key_path" ]] && jq -e '.type == "service_account" and (.client_email // "") != ""' "$key_path" >/dev/null 2>&1; then
    pass "$label service account key exists: platform/$key_file"
    return 0
  fi

  mkdir -p "$(dirname "$key_path")"
  info "Creating $label service account key"
  run gcloud iam service-accounts keys create "$key_path" \
    --iam-account="$email" \
    --project="$GCP_PROJECT" \
    && pass "$label service account key written: platform/$key_file" \
    || {
      warn "Could not create $label service account key"
      manual_step "If org policy blocks service account keys, use Workload Identity Federation for GitHub Actions instead."
    }
}

ensure_github_environment() {
  section "GitHub environment - $GITHUB_ENVIRONMENT"

  if ! command -v gh >/dev/null 2>&1 || ! gh auth status >/dev/null 2>&1; then
    warn "Skipping GitHub environment setup because gh is unavailable or unauthenticated"
    return 0
  fi

  run gh api -X PUT "repos/$GITHUB_REPO/environments/$GITHUB_ENVIRONMENT" >/dev/null \
    && pass "GitHub environment exists: $GITHUB_REPO / $GITHUB_ENVIRONMENT" \
    || warn "Could not create or verify GitHub environment"
}

setup_environment() {
  ENV="$1"

  echo ""
  echo -e "${BOLD}River Go platform setup: $ENV${NC}"

  load_config "$ENV"
  validate_config "$ENV"

  ensure_project || return 1
  enable_apis || return 1
  ensure_firebase
  ensure_hosting
  configure_auth
  ensure_storage
  ensure_artifact_registry
  ensure_cloud_sql
  ensure_service_accounts
  ensure_github_environment

  manual_step "After first deploy, configure custom domain/DNS for $WEB_DOMAIN and add any Cloud Run URL to Firebase Auth authorised domains."
  manual_step "Store DATABASE_URL, FIREBASE_ADMIN_CREDENTIALS, and SESSION_SECRET in Secret Manager and GitHub environment secrets."
}

preflight

for env in "${ENVS[@]}"; do
  setup_environment "$env" || warn "Setup incomplete for $env"
done

print_summary "River Go platform setup"
exit $?
