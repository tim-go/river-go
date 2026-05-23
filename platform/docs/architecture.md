# RiverLaunch.app Platform Architecture

## Purpose

RiverLaunch.app will publish from the main repository while keeping platform configuration in `platform/`. Internal repository, GCP, Firebase, and service IDs continue to use `river-go`.

The deployment shape should support the current web demo, the future backend API, and a later mobile app without splitting infrastructure into a separate repository.

## Environments

| Environment | Purpose | Typical URL |
| --- | --- | --- |
| `staging` | Public pilot/demo testing | `https://staging.riverlaunch.app` |
| `prod` | Public launch service | `https://riverlaunch.app` |

The exact domains can change in local config. The templates use placeholder domains until real DNS is chosen.

## Target System

```text
User
  |
  v
Firebase Hosting
  |-- static web app
  |-- rewrite /api/* to Cloud Run
  |
  v
Cloud Run API
  |-- verifies Firebase Auth tokens
  |-- stores river/community data in Cloud SQL
  |-- stores photos in Firebase Storage
  |-- reads secrets from Secret Manager
  |-- ingests provider data from EA/NRW/SEPA/DfI APIs
```

## Services

| Service | Role |
| --- | --- |
| Firebase Hosting | CDN-backed frontend hosting and API rewrites. |
| Firebase Auth | Contributor identity for reports, confirmations, moderation, and future mobile sign-in. |
| Firebase Storage | User-uploaded photos and future media assets. |
| Cloud Run | Backend API, provider adapters, ingestion jobs, and future admin endpoints. |
| Cloud SQL PostgreSQL | Durable river, section, hazard, contribution, moderation, and provider cache data. |
| PostGIS | Spatial queries once route geometry and marker snapping move server-side. |
| Artifact Registry | Container images for Cloud Run services. |
| Secret Manager | Database URLs, service credentials, API tokens, and webhook secrets. |
| GitHub Actions | Build, test, deploy, and environment-scoped secret delivery. |

Hosted web sign-in currently uses Firebase popup sign-in with the Firebase project helper domain as the SDK `authDomain`. This avoids the custom-domain redirect path while the OAuth project configuration is being stabilised. If RiverLaunch.app switches back to redirect sign-in later, staging should use `staging.riverlaunch.app` and production should use `riverlaunch.app` as `authDomain`, with both domains listed in Firebase Auth authorised domains and as Google OAuth redirect URIs using the `/__/auth/handler` suffix.

## Repository Boundary

Platform configuration lives in this repo:

- app source remains in `src/`
- strategy and specs remain in `docs/`
- platform configuration and scripts live in `platform/`

This keeps platform decisions close to the product specs while preserving a clear boundary around operational files.
