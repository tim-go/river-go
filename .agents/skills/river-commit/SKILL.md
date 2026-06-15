---
name: river-commit
description: Use when the user asks to commit changes in River Go, including phrases like "commit", "good commit", or "commit this". Enforces selective staging, validation judgement, unrelated-change protection, and concise commit reporting.
---

# Commit Changes

Use this skill before creating a local commit.

## Principles

- Preserve unrelated user work. Never revert, reset, or discard local changes to make a commit clean.
- Stage only the intended files. Avoid `git add .` unless every changed file is clearly part of the requested commit.
- Do not push or open/update a PR from this skill. Use `river-pr-prepare-and-raise` when the user asks to push or raise/update a PR.
- If validation already ran after the final code changes and no merge changed relevant files, reuse that result. Otherwise run targeted validation before committing.
- For durable product, UX, data, or platform work, identify the owning spec under `/docs/specs`.

## Parent Branch

River Go currently uses `main` as the integration branch unless the user explicitly names another parent.

## Workflow

1. Inspect branch and worktree:

   ```bash
   git branch --show-current
   git status --short
   git diff --stat
   git diff --cached --stat
   ```

   If there are no changes to commit, report that and stop.

2. Identify the intended commit scope.

   - Group files by task.
   - Treat unrelated dirty files as user work and leave them unstaged.
   - If the requested commit scope is ambiguous and unrelated changes are present, ask before staging them.

3. Check upstream state before committing:

   ```bash
   git fetch origin main
   git rev-list --left-right --count HEAD...origin/main
   ```

   If the current branch is not `main` and is behind `origin/main`, merge before committing:

   ```bash
   git merge origin/main --no-edit
   ```

   If dirty intended work is present, use autostash:

   ```bash
   git merge origin/main --no-edit --autostash
   ```

   Resolve conflicts deliberately. For `package-lock.json`, prefer regenerating over hand-merging:

   ```bash
   git checkout --ours package-lock.json
   npm install
   git add package-lock.json
   ```

4. Run validation appropriate to the commit.

   Minimum useful checks:

   ```bash
   git diff --check
   ```

   For code changes, run the full gate:

   ```bash
   npm run build && npm test && npm --prefix api run test
   ```

5. Stage only intended files:

   ```bash
   git add <explicit paths>
   git status --short
   git diff --cached --stat
   git diff --cached --check
   ```

   If staged files include unrelated work, unstage deliberately:

   ```bash
   git restore --staged <path>
   ```

6. Commit with a concise imperative message:

   ```bash
   git commit -m "<Verb concise change summary>"
   ```

   Good examples:

   - `Add River Wye pilot specs`
   - `Fix map marker contribution flow`
   - `Add Environment Agency provider adapter`

7. Confirm final state:

   ```bash
   git status --short
   git log --oneline --decorate -3
   ```

## Report

Tell the user:

- commit hash and message
- whether parent sync changed anything
- validation run or reused
- any remaining unstaged/uncommitted files
- whether the commit was local only
