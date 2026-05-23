# RiverLaunch.app Platform Setup

## Current State

The platform subproject validates configuration shape, prints a resource plan, and includes an idempotent setup script for the first GCP/Firebase resource pass.

## Prerequisites

Install the same core tools used by the preferred GCP/Firebase workflow:

```bash
gcloud --version
firebase --version
gh --version
jq --version
```

Authenticate locally before future provisioning scripts are added:

```bash
gcloud auth login
gcloud auth application-default login
firebase login
gh auth login
```

## Local Config

Copy templates:

```bash
mkdir -p platform/.config
cp platform/config/templates/river-go-platform.json platform/.config/river-go-platform.json
cp platform/config/templates/river-go-runtime.json platform/.config/river-go-runtime.json
```

Edit `platform/.config/river-go-platform.json` first. Do not edit the committed template with real account values.

Important values:

- `project.billingAccount`
- `project.resourceParent.type` and `project.resourceParent.id`, only if project creation must happen under a GCP folder or organisation
- `environments.staging.gcpProject`
- `environments.staging.firebaseProject`
- `environments.prod.gcpProject`
- `environments.prod.firebaseProject`
- `environments.*.domains`
- `environments.*.githubEnvironment`

Edit `platform/.config/river-go-runtime.json` once Firebase apps and API URLs exist.

RiverLaunch.app follows the Kinetiq two-file config split while keeping internal repository and cloud IDs as `river-go`:

- `river-go-platform.json` contains provisioning facts: GCP project IDs, billing/resource parent, Firebase project IDs, Cloud SQL instance/database/user names, service accounts, domains, and GitHub environment names.
- `river-go-runtime.json` contains execution facts and deployable secrets: URLs, `DATABASE_URL`, migration database URL, Firebase web SDK config, Firebase Admin credentials when needed, session/auth settings, and storage buckets.

Treat `platform/.config/river-go-runtime.json` as a convenience cache backed by your vault. It is ignored by git and should be populated from the vault, not treated as the source of truth.

For Cloud Run runtime, keep `staging.database.url` and `prod.database.url` in the simple form:

```text
postgresql://river_go_app:<password>@localhost/river_go
```

Do not add a `?host=/cloudsql/...` suffix to that URL. The Cloud SQL connection name should be passed separately when the backend is deployed. Use `database.migrationsUrl` for GitHub Actions or local migration runs through Cloud SQL Auth Proxy.

## Local PostGIS Database

The Kinetiq workspace already runs a shared `kinetiq-db` container on `localhost:5432`. Do not reuse or modify that container for RiverLaunch.app.

RiverLaunch.app owns a separate local PostGIS container on `127.0.0.1:5435`.

```bash
npm run db:local:up
npm run db:local:check
```

The local database creates:

- database: `river_go`
- admin user: `river_go_admin`
- app user: `river_go_app`
- migration user: `github_ci`
- local password for all three users: `river_go`
- extension: `postgis`

Use:

```text
postgresql://river_go_app:river_go@localhost:5435/river_go
```

for local app execution, and:

```text
postgresql://github_ci:river_go@localhost:5435/river_go
```

for local migrations.

## Validation

```bash
npm run platform:check
```

This checks the local config if present, otherwise the committed template.

## Planning

```bash
npm run platform:plan:staging
npm run platform:plan:prod
```

The plan output is read-only. It is the review step before we add provisioning scripts.

## Provisioning

Preview the staging setup:

```bash
npm run platform:setup:staging -- --dry-run
```

Create or update staging resources:

```bash
npm run platform:setup:staging -- --create-resources
```

Project creation should usually be run from a human Google account with project-creation and billing permissions:

```bash
gcloud auth login
gcloud auth list
gcloud config set account <your-google-account>
```

If `gcloud` is authenticated as a service account, GCP requires a parent folder or organisation for project creation. In that case set:

```json
{
  "project": {
    "resourceParent": {
      "type": "folder",
      "id": "123456789012"
    }
  }
}
```

The service account also needs project-creator permissions on that folder or organisation.

If Google returns a Cloud Resource Manager `429` or `RESOURCE_EXHAUSTED` error while creating a project, wait a few minutes and re-run the same command. The setup script retries project creation with backoff, but quota exhaustion can still persist if the account or parent has just performed many project/resource writes.

If billing link fails with `Cloud billing quota exceeded`, the project exists but the billing account cannot be attached to another project yet. Resolve that in Google Cloud Billing by removing unused linked projects, using another billing account, or requesting a billing quota increase. The setup script stops at this point because billable APIs cannot be enabled until billing is linked.

Check current billing state:

```bash
gcloud billing projects describe river-go-staging
```

Create or update production resources:

```bash
npm run platform:setup:prod -- --create-resources
```

The setup script can also run both environments:

```bash
platform/scripts/infra/setup.sh all --dry-run
platform/scripts/infra/setup.sh all --create-resources
```

Check current platform state without changing cloud resources:

```bash
npm run platform:health:staging
npm run platform:health:prod
```

The setup script handles:

- GCP project verification or creation
- billing verification and link attempt when `project.billingAccount` is set
- required API enablement
- Firebase enablement on the GCP project
- Firebase web app registration
- Firebase Hosting site creation
- Firebase web SDK config export to `platform/.config`
- Firebase Auth basic email/password configuration where the API is ready
- Firebase Storage default bucket creation where available
- Artifact Registry Docker repository creation
- Cloud SQL PostgreSQL instance and database creation
- CI/server service account creation and IAM roles
- service account key export into `platform/.config`
- GitHub environment creation when `gh` is authenticated

`firebase.json` includes the staging `/api/**` rewrite to `river-go-api-staging`. Deploy Hosting to a preview channel first, and only deploy live after the Cloud Run API exists and the preview passes smoke tests.

The template defaults to keyless auth:

```json
{
  "auth": {
    "serviceAccountKeys": false,
    "workloadIdentityFederation": true
  }
}
```

If your organisation enforces `constraints/iam.disableServiceAccountKeyCreation`, leave this default in place. Deployment should use GitHub Workload Identity Federation and Cloud Run runtime service identity rather than downloaded JSON keys.

If GitHub environment creation returns `HTTP 403`, the authenticated `gh` account or token does not have repository admin rights. Create the environment manually in GitHub repository settings, or rerun after `gh auth login` with an admin-capable account.

Manual follow-up remains required for:

- Firebase terms acceptance if your account has not accepted them
- Blaze plan upgrade where Storage or paid GCP resources require it
- Google sign-in OAuth provider configuration. Hosted web currently uses popup sign-in through the Firebase project helper domain; if redirect sign-in is re-enabled, also add `https://staging.riverlaunch.app/__/auth/handler` for staging and `https://riverlaunch.app/__/auth/handler` for production.
- Cloud SQL user passwords and database grants
- PostGIS extension enablement
- production custom domains and DNS
- Secret Manager and GitHub secret values

## End-To-End Staging Deployment

The safe staging deployment order is backend-first and preview-first. This avoids disrupting the current live Firebase Hosting site while the Cloud Run API and Cloud SQL connection are being tested.

1. Refresh local authentication if needed:

```bash
gcloud auth login
gcloud config set project river-go-staging
firebase login
```

2. Ensure `platform/.config/river-go-runtime.json` contains real staging database URLs:

```text
staging.database.url
staging.database.migrationsUrl
```

Do not commit this file.

3. Run migrations through Cloud SQL Auth Proxy:

```bash
npm run platform:migrate:staging
```

4. Build and deploy the API to Cloud Run:

```bash
npm run platform:deploy-api:staging
```

This builds `api/Dockerfile`, pushes the image to Artifact Registry, stores `DATABASE_URL` in Secret Manager, deploys `river-go-api-staging`, attaches `river-go-staging:europe-west2:river-go-db-staging`, enables Cloud Run public access with `--no-invoker-iam-check`, and checks `/api/health` on the Cloud Run URL.

5. Deploy Firebase Hosting to a preview channel:

```bash
npm run platform:deploy-web-preview:staging
```

6. Smoke-test the preview channel:

```bash
platform/scripts/infra/check-e2e.sh https://<preview-url>
```

7. Deploy live only after the preview passes:

```bash
npm run platform:deploy-web:staging
```

If live Hosting needs to be rolled back, use the Firebase Console Hosting release history and select the previous release rollback action.

## Provisioning Roadmap

Future platform scripts should be added in this order:

1. GitHub Actions deployment using Workload Identity Federation.
2. One-off Cloud Run migration job.
3. Secret Manager and GitHub environment secret sync.
4. Health checks for Hosting, Cloud Run, Auth, Storage, and database connectivity.
