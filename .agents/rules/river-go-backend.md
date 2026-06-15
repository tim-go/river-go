---
description: Backend / API rules for River Go (Cloud Run + PostGIS)
---

# River Go Backend Rules

Read this before changing the `api/` workspace.

## Shape

`api/` is a standalone TypeScript ESM service (Node, `"type": "module"`, NodeNext)
that runs on Cloud Run against a PostGIS database. It is separate from the
frontend and has its own `package.json`, `tsconfig.json`, and `node_modules`.

- HTTP is hand-rolled in `src/server.ts` via a single `route()` function that
  matches on method + `url.pathname`. There is no framework. Handlers return
  `{ status, body }`; throw `HttpError(status, message)` for error responses.
- Auth: `src/auth.ts` verifies the Firebase ID token and returns `AuthContext`
  (`userId`, `email`, `emailVerified`, ...). Use `requireAuthContext` for
  protected routes and `upsertMemberFromAuth` to map it to a `Member`.
- Contributions are written through `POST /api/sync/push` (`src/sync.ts`). The
  contributor identity gate (`requireContributorIdentity`) enforces verified
  email + public name + accepted terms; email verification is currently relaxable
  by env flag (`REQUIRE_EMAIL_VERIFICATION`).
- Keep pure logic in dependency-light modules (for example `src/public-name.ts`)
  so it stays unit-testable without pg or firebase-admin.

## Database & Migrations

- Schema changes are numbered SQL files: `api/migrations/NNN_name.sql`, applied in
  order.
- Make migrations idempotent (`ADD COLUMN IF NOT EXISTS`, guarded `DO $$` blocks).
- Apply locally with `npm run api:migrate`. The local DB runs on `127.0.0.1:5435`.
- Do not edit an already-applied migration; add a new numbered one.

## Config & Secrets

- All config comes from env via `src/config.ts` (`DATABASE_URL`,
  `FIREBASE_PROJECT_ID`, `ADMIN_EMAILS`, `REQUIRE_EMAIL_VERIFICATION`, ...).
- Never commit secrets, service-account files, or credentials. Local Firebase env
  is generated, not committed.

## Commands

```bash
npm --prefix api run build   # tsc typecheck — validation gate for API changes
npm --prefix api run test    # vitest
npm run api:dev              # local API on :8080
npm run api:migrate          # apply migrations to the local DB
```
