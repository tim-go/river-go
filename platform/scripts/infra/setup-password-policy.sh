#!/usr/bin/env bash
set -euo pipefail

# Sets the Identity Platform password policy as a SERVER-SIDE backstop:
# minimum length 12, ENFORCE, no composition requirements. The real strength
# gate (zxcvbn score) is enforced client-side (src/lib/passwordPolicy.ts); this
# only stops a trivially short password if a client bypasses our UI. Idempotent.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLATFORM_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# shellcheck source=_helpers.sh
source "$SCRIPT_DIR/_helpers.sh"

ENV="${1:-}"
if [[ "$ENV" != "staging" && "$ENV" != "prod" ]]; then
  fail "Usage: setup-password-policy.sh <staging|prod>"
  print_summary "Password policy setup"
  exit 1
fi

require_command jq
require_command gcloud
require_command curl

RUNTIME_CONFIG_PATH="${RIVER_GO_RUNTIME_CONFIG:-$PLATFORM_DIR/.config/river-go-runtime.json}"
MIN_LENGTH="${PASSWORD_MIN_LENGTH:-12}"

PROJECT_ID="$(jq -er ".$ENV.firebase.projectId // \"\"" "$RUNTIME_CONFIG_PATH" 2>/dev/null || true)"
if [[ -z "$PROJECT_ID" ]]; then
  fail "$ENV firebase.projectId not found in $RUNTIME_CONFIG_PATH"
  print_summary "Password policy setup"
  exit 1
fi

section "Identity Platform password policy - $PROJECT_ID"
info "Enforcing minimum length $MIN_LENGTH (no composition rules; zxcvbn is the client-side gate)"

TOKEN="$(gcloud auth print-access-token)"
RESPONSE="$(curl -sS -X PATCH \
  "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT_ID/config?updateMask=passwordPolicyConfig" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-goog-user-project: $PROJECT_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"passwordPolicyConfig\": {
      \"passwordPolicyEnforcementState\": \"ENFORCE\",
      \"forceUpgradeOnSignin\": false,
      \"passwordPolicyVersions\": [
        { \"customStrengthOptions\": { \"minPasswordLength\": $MIN_LENGTH } }
      ]
    }
  }")"

if echo "$RESPONSE" | jq -e '.passwordPolicyConfig.passwordPolicyEnforcementState == "ENFORCE"' >/dev/null 2>&1; then
  pass "Password policy enforced: $(echo "$RESPONSE" | jq -c '.passwordPolicyConfig.passwordPolicyVersions[0].customStrengthOptions')"
else
  fail "Unexpected response from Identity Platform:"
  echo "$RESPONSE" >&2
  print_summary "Password policy setup"
  exit 1
fi

print_summary "Password policy setup"
