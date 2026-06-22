# Service emails (Resend)

Branded transactional emails — **verify email** and **password reset** — sent
via [Resend](https://resend.com) from `mail.riverlaunch.app`.

## How it works

1. The frontend asks the API to send the email (after sign-up, or from "forgot
   password"): `POST /api/auth/email/verification` (signed-in) /
   `POST /api/auth/email/password-reset` (`{ email }`, public).
2. The API (`api/src/email/auth-emails.ts`) uses the **Firebase Admin SDK** to
   generate the action link, rewrites it to our own `/auth/action` page
   (`toBrandedAuthActionUrl`), renders a branded template
   (`api/src/email/templates/`), and sends it through Resend
   (`transactional-email.ts`).
3. The link lands on the in-app **`/auth/action`** page
   (`src/auth/AuthActionPage.tsx`) — never a Firebase screen — which applies the
   `oobCode` (`applyActionCode` / `verifyPasswordResetCode` +
   `confirmPasswordReset`) and shows a branded result.

The password-reset endpoint always returns `200` so it can't be used to discover
which addresses have accounts.

## Configuration

Per environment in the runtime config under `integrations.email`:

```jsonc
"email": {
  "provider": "resend",
  "from": "RiverLaunch.app <hello@mail.riverlaunch.app>",
  "replyTo": "hello@mail.riverlaunch.app",
  "apiKey": "re_…"   // secret — only in platform/.config + the CI runtime-config secret
}
```

`deploy-api.sh` mounts `RESEND_API_KEY` as a Secret Manager secret and sets
`EMAIL_PROVIDER` / `EMAIL_FROM` / `EMAIL_REPLY_TO` / `APP_BASE_URL` as env vars.
`APP_BASE_URL` is the brand `.app` domain (`urls.app`, e.g.
`https://staging.riverlaunch.app`, falling back to `urls.web`) — it's both the
host for the `/auth/action` links and the email logo. With no key configured the endpoints no-op
(`status: "skipped"`) — sign-up and reset still work, just without the email.

## Local preview

`npm run api:dev` + `npm run dev`, then open these via the Vite origin (so `/api`
is proxied to the API):

- **Emails:** <http://localhost:6173/api/dev/email-preview>
- **Landing pages:** `/auth/action?preview=true` (shows a switcher), or directly
  `?preview=verifyEmail` · `?preview=resetPassword` · `?preview=resetSuccess` ·
  `?preview=error`

The preview route is disabled when `NODE_ENV=production`.

## Enabling enforced verification

Sign-up works without verification during Beta. To require it, set the frontend
flag (`REQUIRE_EMAIL_VERIFICATION` in `src/lib/contributorTerms`) and the API env
(`REQUIRE_EMAIL_VERIFICATION=true`).
