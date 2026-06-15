---
name: river-go-testing-gate
description: Use before handing off, committing, or pushing River Go code changes. Runs the current lightweight validation gate and reports spec alignment.
---

# River Go Testing Gate

Use this before handoff, commit, or push when code changed.

## Checks

1. Confirm the relevant spec was used or updated.
2. Run the full gate:

   ```bash
   npm run build && npm test && npm --prefix api run test
   ```

3. Check git status:

   ```bash
   git status --short
   ```

4. Report:

   - validation result
   - spec path used or updated
   - any remaining divergence
   - whether generated or ignored files were left out intentionally

## Current Scope

The gate covers the frontend build (`tsc -b && vite build`), the frontend unit
tests (`npm test`), and the API unit tests (`npm --prefix api run test`). For
API-only changes, `npm --prefix api run build && npm --prefix api run test` is
sufficient. See `.agents/rules/river-go-testing.md`.
