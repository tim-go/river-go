---
name: river-create-and-raise-pr
description: Alias workflow for preparing, pushing, and opening or updating a River Go PR. Use this when the user asks to create, raise, open, or update a PR.
---

# Create And Raise PR

This is the River Go PR creation workflow.

Use the canonical workflow in:

- `.agents/skills/river-pr-prepare-and-raise/SKILL.md`

Summary:

1. Check branch and status.
2. Sync with `origin/main`.
3. Run `npm run build`.
4. Push the branch.
5. Open or update the GitHub PR against `main`.
