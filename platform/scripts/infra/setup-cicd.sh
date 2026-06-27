#!/usr/bin/env bash
# RiverLaunch.app CI/CD wiring: GitHub Actions deploy via Workload Identity Federation.
#
# Makes GitHub Actions able to deploy keylessly (no downloaded service-account keys).
# Idempotent — safe to re-run. It:
#   1. tops up the CI service account with the roles the deploy scripts need
#   2. creates the Workload Identity pool + GitHub OIDC provider (scoped to this repo)
#   3. lets the GitHub repo impersonate the CI service account
#   4. pushes the GitHub environment secrets and the auto-deploy variable
#
# Prerequisites (same human auth as setup.sh):
#   - gcloud authenticated as a principal with IAM admin on the GCP project
#   - gh authenticated with admin rights on the GitHub repo
#   - setup.sh has already created the CI service account and base resources
#   - platform/.config/river-go-platform.json and river-go-runtime.json populated
#
# Usage:
#   platform/scripts/infra/setup-cicd.sh staging [--dry-run]
#   platform/scripts/infra/setup-cicd.sh prod [--dry-run]
#   platform/scripts/infra/setup-cicd.sh all [--dry-run]

set -uo pipefail
export CLOUDSDK_CORE_DISABLE_PROMPTS=1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLATFORM_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$SCRIPT_DIR/_helpers.sh"

CONFIG_FILE="${RIVER_GO_PLATFORM_CONFIG:-$PLATFORM_ROOT/.config/river-go-platform.json}"
RUNTIME_FILE="${RIVER_GO_RUNTIME_CONFIG:-$PLATFORM_ROOT/.config/river-go-runtime.json}"

ENVS=()
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    staging|prod) ENVS+=("$1"); shift ;;
    all) ENVS=("staging" "prod"); shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    --help|-h)
      sed -n '2,20p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Usage: $0 <staging|prod|all> [--dry-run]" >&2
      exit 1 ;;
  esac
done

if [[ ${#ENVS[@]} -eq 0 ]]; then
  echo "Specify environment: staging, prod, or all" >&2
  exit 1
fi

if [[ ! -f "$CONFIG_FILE" ]]; then
  fail "Platform config not found: $CONFIG_FILE"
  exit 1
fi

json_value() { jq -r "$1 // empty" "$CONFIG_FILE"; }

# Roles the deploy scripts (migrate / deploy-api / deploy-web) need:
# - run.admin + iam.serviceAccountUser: deploy Cloud Run as the server SA
# - artifactregistry.writer + cloudbuild.builds.editor: `gcloud builds submit`
# - serviceusage.serviceUsageConsumer: required to drive Cloud Build at all
# - secretmanager.admin: deploy-api creates/updates Secret Manager secrets
# - cloudsql.client: migrations + Cloud Run reach Cloud SQL via the proxy
# - firebasehosting.admin: `firebase deploy` (web)
# - storage.admin: Cloud Build source/logs bucket access
# - viewer: lets `gcloud builds submit` stream build logs (it errors out otherwise)
#   (alternatively, add `--suppress-logs` to deploy-api.sh and drop viewer)
CI_DEPLOY_ROLES=(
  roles/run.admin
  roles/iam.serviceAccountUser
  roles/artifactregistry.writer
  roles/cloudbuild.builds.editor
  roles/serviceusage.serviceUsageConsumer
  roles/secretmanager.admin
  roles/cloudsql.client
  roles/firebasehosting.admin
  roles/storage.admin
  roles/viewer
)

preflight() {
  section "Preflight"
  local ok=true
  require_command jq || ok=false
  require_command gcloud || ok=false
  require_command gh || ok=false
  $ok || { fail "Install missing CLIs before running"; exit 1; }

  if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q "@"; then
    fail "gcloud is not authenticated. Run: gcloud auth login"
    exit 1
  fi
  pass "gcloud authenticated"

  if gh auth status >/dev/null 2>&1; then
    pass "gh authenticated"
  else
    fail "gh is not authenticated. Run: gh auth login (with repo admin rights)"
    exit 1
  fi

  $DRY_RUN && warn "Dry-run mode: commands are printed, not executed"
}

grant_roles() {
  local email="$1"; shift
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

set_env_secret() {
  # set_env_secret <name> <value> [--from-file]
  local name="$1" value="$2" from_file="${3:-}"
  if $DRY_RUN; then
    if [[ "$from_file" == "--from-file" ]]; then
      info "[dry-run] gh secret set $name --env $GITHUB_ENV (from $value)"
    else
      info "[dry-run] gh secret set $name --env $GITHUB_ENV"
    fi
    return 0
  fi
  local body="$value"
  [[ "$from_file" == "--from-file" ]] && body="$(cat "$value")"
  if gh secret set "$name" --repo "$GITHUB_REPO" --env "$GITHUB_ENV" --body "$body" >/dev/null 2>&1; then
    pass "Set env secret $name ($GITHUB_ENV)"
  else
    warn "Could not set env secret $name ($GITHUB_ENV)"
  fi
}

setup_environment() {
  local env="$1"
  echo ""
  echo -e "${BOLD}RiverLaunch.app CI/CD setup: $env${NC}"

  GCP_PROJECT="$(json_value ".environments.$env.gcpProject")"
  GITHUB_REPO="$(json_value '.project.githubRepo')"
  GITHUB_ENV="$(json_value ".environments.$env.githubEnvironment")"
  local ci_sa_name; ci_sa_name="$(json_value ".environments.$env.serviceAccounts.ci")"
  ci_sa_name="${ci_sa_name:-github-actions}"
  CI_SA_EMAIL="$ci_sa_name@$GCP_PROJECT.iam.gserviceaccount.com"
  local wif_pool; wif_pool="$(json_value ".environments.$env.auth.workloadIdentityPool")"
  wif_pool="${wif_pool:-github-pool}"
  local wif_provider; wif_provider="$(json_value ".environments.$env.auth.workloadIdentityProvider")"
  wif_provider="${wif_provider:-github}"

  for pair in "gcpProject:$GCP_PROJECT" "githubRepo:$GITHUB_REPO" "githubEnvironment:$GITHUB_ENV"; do
    if [[ -z "${pair#*:}" ]]; then
      fail "Missing config: ${pair%%:*} for $env"
      return 1
    fi
  done

  local project_number
  project_number="$(gcloud projects describe "$GCP_PROJECT" --format='value(projectNumber)' 2>/dev/null || true)"
  if [[ -z "$project_number" ]]; then
    fail "Could not read project number for $GCP_PROJECT (is it created and are you authenticated to it?)"
    return 1
  fi

  # --- 1. CI service account must already exist (created by setup.sh) ---
  section "CI service account - $env"
  if gcloud iam service-accounts describe "$CI_SA_EMAIL" --project="$GCP_PROJECT" >/dev/null 2>&1; then
    pass "CI service account exists: $CI_SA_EMAIL"
  else
    fail "CI service account missing: $CI_SA_EMAIL — run platform:setup:$env first"
    return 1
  fi

  # --- 2. Deploy roles ---
  section "CI deploy roles - $env"
  grant_roles "$CI_SA_EMAIL" "${CI_DEPLOY_ROLES[@]}"

  # Cloud Build runs builds as the Compute Engine default SA; let it write images + logs.
  local build_sa="$project_number-compute@developer.gserviceaccount.com"
  grant_roles "$build_sa" roles/artifactregistry.writer roles/logging.logWriter

  # --- 3. Workload Identity pool ---
  section "Workload Identity pool - $wif_pool"
  if gcloud iam workload-identity-pools describe "$wif_pool" \
      --project="$GCP_PROJECT" --location=global >/dev/null 2>&1; then
    pass "Pool exists: $wif_pool"
  else
    run gcloud iam workload-identity-pools create "$wif_pool" \
      --project="$GCP_PROJECT" --location=global \
      --display-name="GitHub Actions" \
      && pass "Pool created: $wif_pool" \
      || { fail "Could not create Workload Identity pool"; return 1; }
  fi

  # --- 4. GitHub OIDC provider (scoped to this repo) ---
  section "Workload Identity provider - $wif_provider"
  if gcloud iam workload-identity-pools providers describe "$wif_provider" \
      --project="$GCP_PROJECT" --location=global \
      --workload-identity-pool="$wif_pool" >/dev/null 2>&1; then
    pass "Provider exists: $wif_provider"
  else
    run gcloud iam workload-identity-pools providers create-oidc "$wif_provider" \
      --project="$GCP_PROJECT" --location=global \
      --workload-identity-pool="$wif_pool" \
      --display-name="GitHub" \
      --issuer-uri="https://token.actions.githubusercontent.com" \
      --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
      --attribute-condition="assertion.repository == '$GITHUB_REPO'" \
      && pass "Provider created (scoped to $GITHUB_REPO)" \
      || { fail "Could not create Workload Identity provider"; return 1; }
  fi

  # --- 5. Let the repo impersonate the CI service account ---
  section "Repo -> CI SA impersonation"
  local principal="principalSet://iam.googleapis.com/projects/$project_number/locations/global/workloadIdentityPools/$wif_pool/attribute.repository/$GITHUB_REPO"
  run gcloud iam service-accounts add-iam-policy-binding "$CI_SA_EMAIL" \
    --project="$GCP_PROJECT" \
    --role="roles/iam.workloadIdentityUser" \
    --member="$principal" \
    --quiet >/dev/null 2>&1 \
    && pass "$GITHUB_REPO may impersonate $CI_SA_EMAIL" \
    || warn "Could not bind workloadIdentityUser for $GITHUB_REPO"

  local provider_resource="projects/$project_number/locations/global/workloadIdentityPools/$wif_pool/providers/$wif_provider"

  # --- 6. GitHub environment secrets + variables ---
  section "GitHub environment secrets - $GITHUB_ENV"
  run gh api -X PUT "repos/$GITHUB_REPO/environments/$GITHUB_ENV" >/dev/null 2>&1 \
    && pass "GitHub environment ready: $GITHUB_ENV" \
    || warn "Could not ensure GitHub environment $GITHUB_ENV (need repo admin)"

  set_env_secret "GCP_WORKLOAD_IDENTITY_PROVIDER" "$provider_resource"
  set_env_secret "GCP_DEPLOY_SERVICE_ACCOUNT" "$CI_SA_EMAIL"
  set_env_secret "RIVER_GO_PLATFORM_CONFIG" "$CONFIG_FILE" --from-file
  if [[ -f "$RUNTIME_FILE" ]]; then
    set_env_secret "RIVER_GO_RUNTIME_CONFIG" "$RUNTIME_FILE" --from-file
  else
    warn "Runtime config not found ($RUNTIME_FILE); set RIVER_GO_RUNTIME_CONFIG secret manually"
  fi

  # --- 7. Service-account key (only when auth.serviceAccountKeys = true) ---
  # WIF is the default, but firebase-tools can't authenticate with WIF external-
  # account credentials (firebase/firebase-tools#10726), so the firebase deploy step
  # needs a real SA key. Gated on auth.serviceAccountKeys, which in turn requires the
  # org policy iam.disableServiceAccountKeyCreation to be relaxed for this project.
  local sa_keys_enabled; sa_keys_enabled="$(json_value ".environments.$env.auth.serviceAccountKeys")"
  if [[ "$sa_keys_enabled" == "true" ]]; then
    section "Service-account key - $env"
    local sa_key_rel; sa_key_rel="$(json_value ".environments.$env.files.gcpSaKeyFile")"
    if [[ -z "$sa_key_rel" ]]; then
      warn "auth.serviceAccountKeys is true but files.gcpSaKeyFile is unset; skipping SA key"
    else
      local sa_key_path="$PLATFORM_ROOT/$sa_key_rel"
      mkdir -p "$(dirname "$sa_key_path")"
      if [[ -s "$sa_key_path" ]] && jq -e '.type == "service_account" and (.private_key | length) > 0' "$sa_key_path" >/dev/null 2>&1; then
        pass "Reusing existing SA key: $sa_key_rel (a service account caps at 10 keys)"
      else
        rm -f "$sa_key_path"   # clear any placeholder/invalid file so the create won't refuse
        run gcloud iam service-accounts keys create "$sa_key_path" \
          --iam-account="$CI_SA_EMAIL" \
          --project="$GCP_PROJECT" \
          && pass "Created SA key for $CI_SA_EMAIL -> $sa_key_rel" \
          || fail "Could not create SA key — is org policy iam.disableServiceAccountKeyCreation relaxed for $GCP_PROJECT?"
      fi
      if [[ -s "$sa_key_path" ]] || $DRY_RUN; then
        set_env_secret "GCP_SA_KEY" "$sa_key_path" --from-file
      fi
    fi
  else
    info "auth.serviceAccountKeys is false for $env; Workload Identity Federation only"
  fi

  if [[ "$env" == "staging" ]]; then
    section "Enable staging auto-deploy"
    if $DRY_RUN; then
      info "[dry-run] gh variable set STAGING_DEPLOY_ENABLED --body true"
    else
      gh variable set STAGING_DEPLOY_ENABLED --repo "$GITHUB_REPO" --body "true" >/dev/null 2>&1 \
        && pass "Repo variable STAGING_DEPLOY_ENABLED=true (push-to-main now auto-deploys staging)" \
        || warn "Could not set STAGING_DEPLOY_ENABLED variable"
    fi
  else
    manual_step "Production deploys are manual (workflow_dispatch). Add required reviewers to the '$GITHUB_ENV' GitHub environment before the first prod deploy."
  fi
}

preflight
for env in "${ENVS[@]}"; do
  setup_environment "$env" || warn "CI/CD setup incomplete for $env"
done
print_summary "RiverLaunch.app CI/CD setup"
exit $?
