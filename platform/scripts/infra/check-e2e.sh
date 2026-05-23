#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-}"

if [[ -z "$BASE_URL" ]]; then
  echo "Usage: check-e2e.sh <base-url>"
  exit 1
fi

BASE_URL="${BASE_URL%/}"
CONTRIBUTION_ID="$(node -e "console.log(require('node:crypto').randomUUID())")"
OPERATION_ID="$(node -e "console.log(require('node:crypto').randomUUID())")"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "Checking $BASE_URL/api/health"
curl -fsS "$BASE_URL/api/health" | jq .

echo "Posting idempotent sync smoke operation"
PAYLOAD="$(jq -n \
  --arg operationId "$OPERATION_ID" \
  --arg contributionId "$CONTRIBUTION_ID" \
  --arg now "$NOW" \
  '{
    operations: [
      {
        operationId: $operationId,
        operationType: "contribution.create",
        entityType: "contribution",
        entityId: $contributionId,
        createdAt: $now,
        baseRevision: null,
        payload: {
          id: $contributionId,
          type: "report",
          sectionId: "tryweryn-dam-centre",
          geometry: {
            type: "Point",
            coordinates: [-3.668422, 52.944901]
          },
          observedAt: $now,
          payload: {
            title: "E2E smoke test",
            detail: "Created by platform/scripts/infra/check-e2e.sh"
          },
          client: {
            deviceId: "e2e-smoke",
            createdOffline: true,
            appVersion: "0.1.0"
          }
        }
      }
    ]
  }')"

FIRST="$(curl -fsS \
  -H "content-type: application/json" \
  --data "$PAYLOAD" \
  "$BASE_URL/api/sync/push")"
echo "$FIRST" | jq .

SECOND="$(curl -fsS \
  -H "content-type: application/json" \
  --data "$PAYLOAD" \
  "$BASE_URL/api/sync/push")"
echo "$SECOND" | jq .

echo "$SECOND" | jq -e '.accepted[0].status == "duplicate"' >/dev/null
echo "E2E sync smoke passed"
