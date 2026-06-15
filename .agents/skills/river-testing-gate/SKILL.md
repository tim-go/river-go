---
name: river-testing-gate
description: Use before handing off, committing, or pushing River Go code changes. Runs the current lightweight validation gate and reports spec alignment.
---

# River Go Testing Gate

This is the short River-prefixed alias for the repo validation workflow.

Use the canonical workflow in:

- `.agents/skills/river-go-testing-gate/SKILL.md`

Current required check for code changes:

```bash
npm run build && npm test && npm --prefix api run test
```
