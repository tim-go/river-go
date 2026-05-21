# River Go Platform Setup

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

Manual follow-up remains required for:

- Firebase terms acceptance if your account has not accepted them
- Blaze plan upgrade where Storage or paid GCP resources require it
- Google sign-in OAuth provider configuration
- Cloud SQL user passwords and database grants
- PostGIS extension enablement
- production custom domains and DNS
- Secret Manager and GitHub secret values

## Provisioning Roadmap

Future platform scripts should be added in this order:

1. Firebase Hosting config and deploy script.
2. Cloud Run API deployment script.
3. Secret Manager and GitHub environment secret sync.
4. Health checks for Hosting, Cloud Run, Auth, Storage, and database connectivity.
