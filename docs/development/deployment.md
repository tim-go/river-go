# Deployment

How RiverLaunch.app is built, migrated, and deployed to **staging** and **production**.

This is the developer-facing runbook. The deeper provisioning reference (creating
the GCP/Firebase resources the first time) lives in
[`platform/docs/setup.md`](../../platform/docs/setup.md); the architecture notes
are in [`platform/docs/architecture.md`](../../platform/docs/architecture.md).

---

## Architecture

| Layer | Service | Notes |
| --- | --- | --- |
| Web app | **Firebase Hosting** | Serves the built `dist/` (Vite/React). Two sites: `river-go-staging`, `river-go-prod`. |
| API | **Cloud Run** (`europe-west2`) | Container built from `api/Dockerfile`; image in Artifact Registry. Staging service: `river-go-api-staging`. |
| Database | **Cloud SQL** PostgreSQL + **PostGIS** | Reached from your machine / CI via the **Cloud SQL Auth Proxy**. |
| Auth | **Firebase Auth** | Contributor identity (Google + email/password). |
| Photos | **Firebase Storage** | `storage.rules`. |
| Secrets | **Secret Manager** + GitHub environment secrets | `DATABASE_URL` etc. |

On staging, Firebase Hosting rewrites `/api/**` to the Cloud Run service (see
`firebase.json`), so the web origin and API share a domain. The catch-all SPA
rewrite sits below it, so the map app keeps loading even if the API has a problem.

**Config split** (Kinetiq-style, both files live in `platform/.config/`, git-ignored):

- `river-go-platform.json` — provisioning facts: project IDs, region, Cloud SQL
  instance, service accounts, Firebase project/site, GitHub environment names.
- `river-go-runtime.json` — runtime facts + secrets: `DATABASE_URL`,
  `migrationsUrl`, Firebase web SDK config, admin creds. **Vault-backed; never commit.**

Scripts read these from `platform/.config/` by default, or from the paths in
`RIVER_GO_PLATFORM_CONFIG` / `RIVER_GO_RUNTIME_CONFIG` (used by CI).

---

## Prerequisites (local deploys)

```bash
gcloud --version
firebase --version
cloud-sql-proxy --version   # Cloud SQL Auth Proxy v2
jq --version
```

Authenticate, and make sure `platform/.config/` holds real config (copy the
templates from `platform/config/templates/` and fill from the vault):

```bash
gcloud auth login
firebase login
```

> The platform scripts pass `--project` to every `gcloud` / `firebase` call (and
> the full `project:region:instance` to the Cloud SQL proxy), so they target the
> project in `platform/.config/` automatically — you do **not** need to
> `gcloud config set project` or switch away from another project (e.g. a kinetiq
> one). See [Working across multiple GCP projects](#working-across-multiple-gcp-projects).

Validate config before doing anything:

```bash
npm run platform:check
npm run platform:health:staging   # read-only: what is provisioned/ready
```

---

## Deploy a release (staging)

The safe order is **backend-first, preview-first** — it never disrupts the live
Hosting site while the API/DB are being checked.

```bash
# 1. Migrate the database (through Cloud SQL Auth Proxy)
npm run platform:migrate:staging

# 2. Build + push the API image and deploy Cloud Run
npm run platform:deploy-api:staging      # checks /api/health when done

# 3. Deploy the web app to a PREVIEW channel first
npm run platform:deploy-web-preview:staging

# 4. Smoke-test the preview URL Firebase prints
platform/scripts/infra/check-e2e.sh https://<preview-url>

# 5. Only if the preview is good, deploy live
npm run platform:deploy-web:staging
```

`deploy-web` builds `dist` itself with the staging Firebase web config from the
runtime file — you do **not** pre-build `dist`.

### Production

Same sequence with `:prod`:

```bash
npm run platform:migrate:prod
npm run platform:deploy-api:prod
npm run platform:deploy-web-preview:prod
platform/scripts/infra/check-e2e.sh https://<preview-url>
npm run platform:deploy-web:prod
```

Dry-run any step first with `-- --dry-run`, e.g.
`npm run platform:deploy-api:staging -- --dry-run`.

---

## Database migrations

Migrations are numbered SQL files in `api/migrations/NNN_*.sql`, applied in order by
`api/src/migrate.ts`.

- **Locally** (against the local PostGIS on `127.0.0.1:5440`):
  ```bash
  npm run api:migrate
  ```
- **Staging / prod** (opens a Cloud SQL Auth Proxy and runs migrations through the
  `migrationsUrl` from the runtime config):
  ```bash
  npm run platform:migrate:staging
  npm run platform:migrate:prod
  ```

Add a new migration by creating the next `api/migrations/NNN_*.sql` file. Migrations
should be idempotent/forward-only; the runner applies anything not yet recorded.

---

## Working across multiple GCP projects

You don't need to switch your active gcloud project for RiverLaunch — the platform
scripts pass `--project` on every command. `gcloud config set project` is
**global** (it changes the project for *every* terminal), which is what makes
juggling kinetiq + river-go painful. Better options for your own ad-hoc `gcloud`:

- **Named configurations** (built in) — a profile per project (bundles project +
  account + region):
  ```bash
  gcloud config configurations create river-go
  gcloud config set project river-go-staging
  gcloud config configurations activate river-go    # switch whenever
  ```
- **Per shell** — two terminals, two projects, no global tug-of-war:
  ```bash
  export CLOUDSDK_ACTIVE_CONFIG_NAME=river-go   # and =kinetiq in the other terminal
  ```
- **Auto per repo** with [direnv](https://direnv.net) — add an `.envrc` to each repo
  and the project follows your `cd`:
  ```bash
  # river-go/.envrc
  export CLOUDSDK_ACTIVE_CONFIG_NAME=river-go
  ```

## Cloud SQL Auth Proxy ports

The migrate / seed / backfill scripts start a Cloud SQL Auth Proxy on the **port in
`<env>.database.migrationsUrl`** (from the runtime config) and connect through it.
Keep these clear of other projects' proxies so they can run side by side:

| Use | Port |
| --- | --- |
| RiverLaunch local PostGIS container (Docker) | 5440 |
| RiverLaunch **staging** Cloud SQL proxy | **5441** |
| RiverLaunch **prod** Cloud SQL proxy | **5442** |
| _kinetiq proxy (keep clear)_ | _5434_ |

So `staging.database.migrationsUrl` should end `…@localhost:5441/river_go` and prod
`…@localhost:5442/river_go`. The committed template now defaults to these — update
the ports in your local `platform/.config/river-go-runtime.json` to match. (The
proxy only runs locally and in CI; CI runners have no kinetiq to clash with, but a
consistent port is simplest.)

## Rollback

- **Web (Hosting):** Firebase Console → Hosting → release history → roll back to a
  previous release.
- **API (Cloud Run):** route traffic back to the previous revision in the Cloud Run
  console (or `gcloud run services update-traffic`).
- **Auth flow** (redirect ↔ popup / authDomain): see the "Hosted Web Auth Flow"
  rollback values in `platform/docs/setup.md`.

---

## CI/CD (GitHub Actions)

Two workflows live in `.github/workflows/`:

### `build.yml` — CI (already active)
Runs on every PR and on push to `main`: installs deps, validates the platform
config template, builds web + API, and runs both test suites. Recommended: protect
`main` with a branch rule that **requires the "Build" check** before merge.

### `deploy.yml` — CD (auto-deploy)
Reuses the same `platform:*` scripts above.

- **Staging** auto-deploys on push to `main` — but only once you opt in (see below).
- **Production** is **manual only** (`workflow_dispatch`, choose `environment: prod`),
  and should be gated by a protected GitHub `prod` environment with required reviewers.
- A manual run can target a **preview** channel (`live: false`, the default) or
  **live** (`live: true`).

It authenticates to Google Cloud with **Workload Identity Federation** (no
downloaded service-account keys), installs the Cloud SQL Auth Proxy + Firebase CLI,
materialises the two config files from secrets, then runs
`platform:migrate → platform:deploy-api → platform:deploy-web`.

#### One-time setup to enable it

This is automated by a platform script — no manual click-paths. Run it once per
environment from a machine where **`gcloud` is authenticated** (a principal with
IAM admin on the GCP project) and **`gh` is authenticated** (repo admin):

```bash
npm run platform:setup:cicd:staging          # add --dry-run to preview
npm run platform:setup:cicd:prod
```

`platform:setup:cicd:<env>` is idempotent and:

1. Tops up the CI service account (`github-actions@<project>`) with the deploy
   roles (`run.admin`, `cloudbuild.builds.editor`, `artifactregistry.writer`,
   `secretmanager.admin`, `firebasehosting.admin`, `cloudsql.client`, …).
2. Creates the **Workload Identity pool + GitHub OIDC provider**, scoped with an
   attribute condition to this repo only, and lets the repo impersonate the CI SA
   (keyless — no downloaded JSON keys).
3. Pushes the **GitHub environment secrets** (`GCP_WORKLOAD_IDENTITY_PROVIDER`,
   `GCP_DEPLOY_SERVICE_ACCOUNT`, `RIVER_GO_PLATFORM_CONFIG`,
   `RIVER_GO_RUNTIME_CONFIG`) from your local `platform/.config/`. For staging it
   also sets the `STAGING_DEPLOY_ENABLED` repo variable, switching on push-to-main
   auto-deploy.

It assumes `platform:setup:<env>` has already created the CI service account and
base resources (it has, since staging is live).

Remaining manual bits:

- Add **required reviewers** to the `prod` GitHub environment before the first
  production deploy (so prod never deploys unattended).
- The runtime config secret must include `<env>.database.migrationsUrl` and
  `<env>.firebase.client.*` (they should already be there from deploys).
- If your org blocks the Firebase CLI from using WIF ADC, add a `FIREBASE_TOKEN`
  env secret as a fallback and pass it to `firebase --token`.

#### Running it

- Push/merge to `main` → staging migrate + API + live web (once enabled).
- Manual: Actions → **Deploy** → Run workflow → pick `environment` and `live`.

---

## Where things live

- Local dev: [`docs/development/local-development.md`](./local-development.md)
- Provisioning / first-time setup: [`platform/docs/setup.md`](../../platform/docs/setup.md)
- Seed-data & ops runbooks: [`docs/specs/foundations/seed-data-operations.md`](../specs/foundations/seed-data-operations.md)
- Platform config reference: [`docs/specs/foundations/platform-configuration.md`](../specs/foundations/platform-configuration.md)
- Deploy/migrate scripts: `platform/scripts/infra/`
