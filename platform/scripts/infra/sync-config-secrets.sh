#!/usr/bin/env bash
set -euo pipefail

# Pushes the local platform config into the GitHub Environment secrets that the
# deploy workflow (.github/workflows/deploy.yml) reads:
#   RIVER_GO_PLATFORM_CONFIG  <- platform/.config/river-go-platform.json
#   RIVER_GO_RUNTIME_CONFIG   <- platform/.config/river-go-runtime.json
# Run this after changing the runtime config (e.g. integrations.email) so CI
# picks it up on the next deploy. Idempotent.
#
# Requires gh authenticated with admin on the repo. The repo owner account is
# `tim-go`, so you may need: gh auth switch --user tim-go

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLATFORM_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# shellcheck source=_helpers.sh
source "$SCRIPT_DIR/_helpers.sh"

ENV="${1:-}"
if [[ "$ENV" != "staging" && "$ENV" != "prod" ]]; then
  fail "Usage: sync-config-secrets.sh <staging|prod>"
  print_summary "Config secret sync"
  exit 1
fi

require_command gh
require_command jq

REPO="${RIVER_GO_GITHUB_REPO:-tim-go/river-go}"
PLATFORM_CONFIG="${RIVER_GO_PLATFORM_CONFIG_FILE:-$PLATFORM_DIR/.config/river-go-platform.json}"
RUNTIME_CONFIG="${RIVER_GO_RUNTIME_CONFIG:-$PLATFORM_DIR/.config/river-go-runtime.json}"

for f in "$PLATFORM_CONFIG" "$RUNTIME_CONFIG"; do
  [[ -f "$f" ]] || { fail "Config not found: $f"; print_summary "Config secret sync"; exit 1; }
  jq empty "$f" 2>/dev/null || { fail "Invalid JSON: $f"; print_summary "Config secret sync"; exit 1; }
done

if ! jq -e ".$ENV.integrations.email.apiKey | strings | length > 0" "$RUNTIME_CONFIG" >/dev/null 2>&1; then
  warn "$ENV.integrations.email.apiKey is empty — verification/reset emails will be skipped"
fi

section "Sync config secrets -> GitHub environment '$ENV' ($REPO)"
info "Setting RIVER_GO_PLATFORM_CONFIG"
gh secret set RIVER_GO_PLATFORM_CONFIG --repo "$REPO" --env "$ENV" < "$PLATFORM_CONFIG"
info "Setting RIVER_GO_RUNTIME_CONFIG"
gh secret set RIVER_GO_RUNTIME_CONFIG --repo "$REPO" --env "$ENV" < "$RUNTIME_CONFIG"
pass "Synced platform + runtime config to the '$ENV' environment"

print_summary "Config secret sync"
