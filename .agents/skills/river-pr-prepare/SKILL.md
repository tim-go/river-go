---
name: river-pr-prepare
description: Prepare a River Go branch for push or PR readiness by checking parent branch state and running required checks. Use when the user asks to prepare/check PR readiness without pushing or raising the PR. If the user asks to push, raise, open, or update a PR, use river-pr-prepare-and-raise instead.
---

# Prepare PR Readiness

Use to verify branch readiness without pushing or opening/updating a PR.

If the user explicitly asks to push, open, raise, or update a PR, use `river-pr-prepare-and-raise`.

## Parent Branch

Feature work uses `origin/main` unless the task explicitly says release, hotfix, or another parent.

## Steps

Inspect branch and worktree:

```bash
git branch --show-current
git status --short
git fetch origin main
git rev-list --left-right --count HEAD...origin/main
```

If the branch is behind `origin/main`, merge the parent:

```bash
git merge origin/main --no-edit
```

For intended dirty work, use autostash:

```bash
git merge origin/main --no-edit --autostash
```

Resolve conflicts deliberately. For `package-lock.json`, prefer regenerating over hand-merging:

```bash
git checkout --ours package-lock.json
npm install
git add package-lock.json
```

Run the current gate:

```bash
npm run build && npm test && npm --prefix api run test
```

Confirm final state:

```bash
git status --short
git rev-list --left-right --count HEAD...origin/main
```

Do not push or open/update the PR from this skill. Use `river-pr-prepare-and-raise` for that workflow.
