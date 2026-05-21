---
name: river-go-testing-gate
description: Use before handing off, committing, or pushing River Go code changes. Runs the current lightweight validation gate and reports spec alignment.
---

# River Go Testing Gate

Use this before handoff, commit, or push when code changed.

## Checks

1. Confirm the relevant spec was used or updated.
2. Run:

   ```bash
   npm run build
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

`npm run build` performs TypeScript build and Vite production build. Add lint/test commands here when the repo gains them.
