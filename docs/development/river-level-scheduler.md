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
  // OIDC token audience — a stable public origin for the API. Any value works
  // as long as it is identical on both sides; deploy-api.sh and the scheduler
  // setup both read THIS key, so they always agree.
  "observationOidcAudience": "https://staging.riverlaunch.info",
  // The scheduler's service-account email. setup-scheduler.sh creates it if it
  // is missing; the API checks the token's email against it.
  "observationServiceAccount": "river-levels-scheduler@<project>.iam.gserviceaccount.com"
}
```

`deploy-api.sh` passes these to Cloud Run as `OBSERVATION_JOB_OIDC_AUDIENCE`
and `OBSERVATION_JOB_SERVICE_ACCOUNT` (plain env vars, not secrets). Leave them
empty to disable OIDC (the endpoint then requires a moderator session).

## Setup

All GCP provisioning is done by platform scripts — no manual `gcloud`. The
scheduler script is idempotent (safe to re-run) and mirrors the other
`platform:*` scripts.

1. **Configure** the two `jobs` values above in
   `platform/.config/river-go-runtime.json`, and apply the same change to the
   `RIVER_GO_RUNTIME_CONFIG` secret used by CI.

2. **Deploy the API** so it picks them up as env vars:

   ```bash
   npm run platform:deploy-api:staging
   ```

3. **Provision the scheduler** — creates the service account, lets the Cloud
   Scheduler agent mint OIDC tokens as it, and creates/updates the job
   (`river-levels-ingest-<env>`) pointed at the live Cloud Run URL:

   ```bash
   npm run platform:setup:scheduler:staging
   # preview only: npm run platform:setup:scheduler:staging -- --dry-run
   ```

The cadence defaults to every 30 minutes (`Europe/London`), comfortably above
the 15-minute cooldown. Override per environment by adding
`environments.<env>.scheduler.ingestionSchedule` / `.timeZone` to the platform
config. No `run.invoker` grant is needed — the service is public and validates
the token itself.

## Verify

`setup-scheduler.sh` prints a ready-to-run trigger command. Or:

```bash
gcloud scheduler jobs run river-levels-ingest-staging \
  --location=<region> --project=<project>
```

A `200` (or `429` if something ran in the last 15 min) means auth passed. A
`401` means the audience or service-account values don't line up — but since
`deploy-api.sh` and `setup-scheduler.sh` read them from the same runtime-config
keys, that should only happen if the API wasn't redeployed after a config
change. The run shows up in Admin → System and via `GET /api/jobs/observations`,
whoever triggered it.
