# Password policy

We now set passwords ourselves (sign-up + `/auth/action` reset), so we enforce
strength with live feedback — ported from kinetiq-engine's `auth-password-policy`
(zxcvbn-based, NIST 800-63B aligned: length + guessability, no composition rules).

## Decisions
- **Min length 12** + **zxcvbn score ≥ 3** + no leading/trailing whitespace.
- **Confirm-password on sign-up** → sign-up moves to a **dedicated `/signup` page**
  (the welcome sheet is too cramped for a strength meter + confirm).
- **Firebase server-side policy** set as a backstop (min length 12, Identity
  Platform) via `platform/scripts/infra/setup-password-policy.sh`.
- **HIBP breached-password check:** future, out of scope.

## Pieces
- `src/lib/passwordPolicy.ts` — pure: `PASSWORD_POLICY`, `evaluatePassword(password, score)`
  → `{ lengthOk, scoreOk, score, strengthLabel, valid, message }`, `validatePasswordConfirmation`.
  The zxcvbn score is passed in so the dictionary can be lazy-loaded.
- `src/components/auth/PasswordStrengthField.tsx` — password input + reveal toggle
  + 4-segment strength meter + requirements checklist. **Lazy-loads `@zxcvbn-ts`**
  (separate chunk; shows a length-only estimate until it loads). Reports status to
  the parent via `onStatusChange`.
- **`/signup`** (new standalone page, like `/auth/action`): email, display name,
  `PasswordStrengthField`, confirm; "Create account" disabled until valid + matching;
  Google sign-up + "already have an account?" link. The welcome sheet's "Create
  account" links here.
- **`/auth/action`** reset form: uses the same field + confirm; replaces the ad-hoc
  `length < 6` check.
- **`setup-password-policy.sh`** — PATCHes the Identity Platform config
  (`passwordPolicyConfig`, ENFORCE, min length 12, no composition requirements).

## Why kinetiq's approach (not reinvented)
zxcvbn scores real guessability (dictionary words, keyboard walks, `Summer2024!`)
rather than composition theatre — the modern, correct policy. Caveat handled:
`@zxcvbn-ts/language-common` is heavy, so we lazy-load it (only sign-up/reset need it).

## Out of scope
HIBP breach lookup; any signed-in "change password" UI.
