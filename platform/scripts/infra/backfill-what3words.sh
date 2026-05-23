#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLATFORM_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPO_DIR="$(cd "$PLATFORM_DIR/.." && pwd)"

# shellcheck source=_helpers.sh
source "$SCRIPT_DIR/_helpers.sh"

ENV="${1:-}"
DRY_RUN=false
LIMIT="500"

shift || true
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      ;;
    --limit)
      LIMIT="${2:-}"
      shift
      ;;
    *)
      fail "Unknown argument: $1"
      print_summary "what3words backfill"
      exit 1
      ;;
  esac
  shift
done

if [[ "$ENV" != "staging" && "$ENV" != "prod" ]]; then
  fail "Usage: backfill-what3words.sh <staging|prod> [--dry-run] [--limit <n>]"
  print_summary "what3words backfill"
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

section "what3words backfill preflight - $ENV"
ok=true
for command_name in jq gcloud cloud-sql-proxy npm node; do
  require_command "$command_name" || ok=false
done

if [[ "$ok" != true ]]; then
  print_summary "what3words backfill"
  exit 1
fi

GCP_PROJECT="$(json_value ".environments.$ENV.gcpProject")"
REGION="$(json_value ".environments.$ENV.region")"
CLOUD_SQL_INSTANCE="$(json_value ".environments.$ENV.database.instance")"
DATABASE_URL="$(runtime_value ".$ENV.database.url")"
WHAT3WORDS_API_KEY="$(runtime_value ".$ENV.integrations.what3words.apiKey")"

if [[ "$DATABASE_URL" == *"<"* || "$DATABASE_URL" == *">"* ]]; then
  fail "$ENV database.url in $RUNTIME_CONFIG_PATH still contains placeholder values"
  print_summary "what3words backfill"
  exit 1
fi

if [[ -z "$WHAT3WORDS_API_KEY" || "$WHAT3WORDS_API_KEY" == *"<"* || "$WHAT3WORDS_API_KEY" == *">"* ]]; then
  fail "$ENV integrations.what3words.apiKey is required"
  print_summary "what3words backfill"
  exit 1
fi

DB_PORT="$(node -e "const u = new URL(process.argv[1]); console.log(u.port || '5432')" "$DATABASE_URL")"
CLOUD_SQL_CONNECTION_NAME="$GCP_PROJECT:$REGION:$CLOUD_SQL_INSTANCE"
PROXY_PID=""

cleanup() {
  if [[ -n "$PROXY_PID" ]]; then
    kill "$PROXY_PID" >/dev/null 2>&1 || true
    wait "$PROXY_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

section "Cloud SQL Auth Proxy"
cloud-sql-proxy "$CLOUD_SQL_CONNECTION_NAME" \
  --address 127.0.0.1 \
  --port "$DB_PORT" >/tmp/river-go-cloud-sql-proxy.log 2>&1 &
PROXY_PID="$!"
sleep 3

if ! kill -0 "$PROXY_PID" >/dev/null 2>&1; then
  fail "Cloud SQL Auth Proxy did not start; see /tmp/river-go-cloud-sql-proxy.log"
  print_summary "what3words backfill"
  exit 1
fi

pass "Cloud SQL Auth Proxy listening on 127.0.0.1:$DB_PORT"

section "Run what3words backfill"
args=("--limit=$LIMIT")
if [[ "$DRY_RUN" == true ]]; then
  args+=("--dry-run")
fi

DATABASE_URL="$DATABASE_URL" \
  WHAT3WORDS_API_KEY="$WHAT3WORDS_API_KEY" \
  npm --prefix "$REPO_DIR/api" run backfill:w3w -- "${args[@]}"

pass "what3words backfill completed"
print_summary "what3words backfill"
