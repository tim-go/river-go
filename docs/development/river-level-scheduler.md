# Automating river-level ingestion (Cloud Scheduler + OIDC)

River levels are refreshed by `POST /api/jobs/observations/ingest`, which runs
the same provider ingestion as the `ingest:observations` script and is
surfaced in Admin → System as **"Refresh river levels"**. To keep levels
current automatically, a **Cloud Scheduler** job calls that endpoint on a
schedule.

## Auth model

The API service is **public** (`--no-invoker-iam-check` in
`platform/scripts/infra/deploy-api.sh`) because it serves the app's own API,
so we can't gate a single endpoint at the Cloud Run / IAM layer. Instead the
endpoint validates a Google-signed **OIDC** token in application code
(`api/src/observation-job-auth.ts`):

1. The token's signature, issuer (`accounts.google.com`), `aud`, and expiry are
   verified against Google's certs (`google-auth-library`).
2. The token's `email` must equal the configured scheduler service account and
   `email_verified` must be `true`.

If OIDC isn't configured, or the token is missing/invalid, the request falls
back to the existing **moderator (Firebase) session** path — i.e. the Admin
button keeps working unchanged. Firebase user tokens and Google OIDC tokens
have different issuers/audiences, so the two paths never cross over.

The endpoint enforces a **15-minute cooldown** (HTTP `429`), shared with the
Admin button, so an over-eager schedule can't hammer the providers.

## Configuration

Two non-secret values, set per environment in
`platform/.config/river-go-runtime.json` under `jobs` (template:
`platform/config/templates/river-go-runtime.json`):

```jsonc
"jobs": {
  // Audience the scheduler's OIDC token is minted for; we verify aud == this.
  "observationOidcAudience": "https://<cloud-run-host>",
  // Email of the service account the scheduler runs as.
  "observationServiceAccount": "river-levels-scheduler@<project>.iam.gserviceaccount.com"
}
```

`deploy-api.sh` passes these to Cloud Run as `OBSERVATION_JOB_OIDC_AUDIENCE`
and `OBSERVATION_JOB_SERVICE_ACCOUNT` (plain env vars, not secrets). Leave them
empty to disable OIDC (endpoint then requires a moderator session).

## One-time GCP setup

Values come from `platform/config/river-go-platform.json`
(`environments.<env>.gcpProject`, `.region`, `.cloudRunService`) and the
service's host. Replace the `<...>` placeholders.

```bash
PROJECT=<project>
REGION=<region>
HOST=<cloud-run-host>              # e.g. river-go-api-xxxx-nw.a.run.app or the custom domain
AUDIENCE="https://$HOST"          # must equal observationOidcAudience

# 1. Service account the scheduler runs as
gcloud iam service-accounts create river-levels-scheduler \
  --project="$PROJECT" \
  --display-name="River levels Cloud Scheduler"

# 2. The scheduler job (every 30 min; comfortably above the 15-min cooldown).
#    No run.invoker grant needed — the service is public and validates the
#    token itself. We only need a valid OIDC token from the right SA.
gcloud scheduler jobs create http river-levels-ingest \
  --project="$PROJECT" \
  --location="$REGION" \
  --schedule="*/30 * * * *" \
  --time-zone="Europe/London" \
  --http-method=POST \
  --uri="https://$HOST/api/jobs/observations/ingest" \
  --oidc-service-account-email="river-levels-scheduler@$PROJECT.iam.gserviceaccount.com" \
  --oidc-token-audience="$AUDIENCE"
```

Then set `observationOidcAudience` / `observationServiceAccount` in the runtime
config secret (`RIVER_GO_RUNTIME_CONFIG`) and redeploy the API so the env vars
land on the service.

> If `jobs create` fails with a permission error about generating OIDC tokens,
> grant the Cloud Scheduler service agent
> (`service-<project-number>@gcp-sa-cloudscheduler.iam.gserviceaccount.com`) the
> **Service Account Token Creator** role on `river-levels-scheduler`.

## Verify

```bash
gcloud scheduler jobs run river-levels-ingest --location="$REGION" --project="$PROJECT"
```

A `200` (or `429` if something ran in the last 15 min) means auth passed. A
`401` means the audience or service-account values don't match between the
scheduler job and the deployed env vars. The run also shows up in Admin →
System under the ingestion status, and via `GET /api/jobs/observations` (job
runs), regardless of whether you or the scheduler triggered it.
