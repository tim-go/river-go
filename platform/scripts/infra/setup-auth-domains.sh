#!/usr/bin/env bash
set -euo pipefail

# Ensures the environment's web + app hosts are in Firebase Auth's authorized
# domains (Identity Platform `authorizedDomains`). Redirect/popup sign-in only
# completes on a domain that's authorized, so the app being served on both
# riverlaunch.info and riverlaunch.app needs both listed. Additive + idempotent:
# it reads the current list and only adds what's missing (never removes).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLATFORM_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# shellcheck source=_helpers.sh
source "$SCRIPT_DIR/_helpers.sh"

ENV="${1:-}"
if [[ "$ENV" != "staging" && "$ENV" != "prod" ]]; then
  fail "Usage: setup-auth-domains.sh <staging|prod>"
  print_summary "Auth domains setup"
  exit 1
fi

require_command jq
require_command gcloud
require_command curl

RUNTIME_CONFIG_PATH="${RIVER_GO_RUNTIME_CONFIG:-$PLATFORM_DIR/.config/river-go-runtime.json}"

PROJECT_ID="$(jq -er ".$ENV.firebase.projectId // \"\"" "$RUNTIME_CONFIG_PATH" 2>/dev/null || true)"
WEB_URL="$(jq -er ".$ENV.urls.web // \"\"" "$RUNTIME_CONFIG_PATH" 2>/dev/null || true)"
APP_URL="$(jq -er ".$ENV.urls.app // \"\"" "$RUNTIME_CONFIG_PATH" 2>/dev/null || true)"

if [[ -z "$PROJECT_ID" ]]; then
  fail "$ENV firebase.projectId not found in $RUNTIME_CONFIG_PATH"
  print_summary "Auth domains setup"
  exit 1
fi

host_of() { sed -E 's#^https?://##; s#/.*$##' <<<"$1"; }
WEB_HOST="$(host_of "$WEB_URL")"
APP_HOST="$(host_of "$APP_URL")"

section "Firebase Auth authorized domains - $PROJECT_ID"

TOKEN="$(gcloud auth print-access-token)"
BASE_URL="https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT_ID/config"

CURRENT="$(curl -sS -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: $PROJECT_ID" "$BASE_URL")"
CUR_DOMAINS="$(jq -c '.authorizedDomains // empty' <<<"$CURRENT" 2>/dev/null || true)"

if [[ -z "$CUR_DOMAINS" ]]; then
  fail "Could not read current authorizedDomains (aborting so we never wipe them):"
  echo "$CURRENT" >&2
  print_summary "Auth domains setup"
  exit 1
fi

info "Current: $(jq -r 'join(", ")' <<<"$CUR_DOMAINS")"

NEW_DOMAINS="$(jq -nc --argjson cur "$CUR_DOMAINS" --arg w "$WEB_HOST" --arg a "$APP_HOST" \
  '($cur + [$w, $a]) | map(select(length > 0)) | unique')"
ADDED="$(jq -nr --argjson cur "$CUR_DOMAINS" --argjson new "$NEW_DOMAINS" '($new - $cur) | join(", ")')"

if [[ -z "$ADDED" ]]; then
  pass "Already authorized: $WEB_HOST, $APP_HOST — no change."
  print_summary "Auth domains setup"
  exit 0
fi

info "Adding: $ADDED"
RESP="$(curl -sS -X PATCH \
  "$BASE_URL?updateMask=authorizedDomains" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-goog-user-project: $PROJECT_ID" \
  -H "Content-Type: application/json" \
  -d "{\"authorizedDomains\": $NEW_DOMAINS}")"

if jq -e --arg a "$APP_HOST" '.authorizedDomains | index($a)' >/dev/null 2>&1 <<<"$RESP"; then
  pass "Authorized domains: $(jq -r '.authorizedDomains | join(", ")' <<<"$RESP")"
else
  fail "Update failed:"
  echo "$RESP" >&2
  print_summary "Auth domains setup"
  exit 1
fi

print_summary "Auth domains setup"
