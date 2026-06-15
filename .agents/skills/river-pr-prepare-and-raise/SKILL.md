---
name: river-pr-prepare-and-raise
description: Prepare a River Go branch for PR, push it, and open or update the GitHub PR against origin/main. Use when the user asks to push, raise a PR, open a PR, update a PR, or says "$river-pr-prepare" together with "raise PR".
---

# Prepare And Raise PR

Use when the user explicitly asks to push or open/update a PR.

Do not use for local commits only. For local commits, use `river-commit`.

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

If local changes are present, decide whether they are intended PR content. Do not carry unrelated user work into a PR.

Merge the parent if needed:

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

Run the required gate:

```bash
npm run build && npm test && npm --prefix api run test
```

Confirm the branch is clean or only has intentionally uncommitted files that must not be included:

```bash
git status --short
git rev-list --left-right --count HEAD...origin/main
```

Check whether a PR already exists for the branch and whether it has already been merged:

```bash
branch="$(git branch --show-current)"
pr_state="$(gh pr view "$branch" --json state --jq .state 2>/dev/null || true)"
pr_url="$(gh pr view "$branch" --json url --jq .url 2>/dev/null || true)"
printf '%s\n' "$pr_state"
printf '%s\n' "$pr_url"
```

If the PR state is `MERGED`, do not stop. Treat the merged PR as historical context, continue with push, and create a fresh PR for the current branch work after the push. Report the previously merged PR URL as context.

If the PR state is `CLOSED`, stop and ask whether to reopen it or create a fresh branch/PR. Do not push over a closed PR by default.

Push the current branch:

```bash
branch="$(git branch --show-current)"
git push -u origin "$branch"
```

Open or update the PR with GitHub CLI:

```bash
branch="$(git branch --show-current)"
pr_state="$(gh pr view "$branch" --json state --jq .state 2>/dev/null || true)"
if [ "$pr_state" = "MERGED" ]; then
  gh pr create --base main --head "$branch" --fill
else
  gh pr view "$branch" --json url --jq .url || gh pr create --base main --head "$branch" --fill
fi
```

If `gh pr create --fill` produces an inadequate title/body, edit the PR using:

```bash
gh pr edit "$branch" --title "<title>" --body "<body>"
```

## Report

Tell the user:

- PR URL
- branch name
- whether parent sync changed anything
- validation run
- whether any files remain uncommitted or unpushed
