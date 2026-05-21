# Shared Agent Control Layer

This folder is the shared agent control layer for River Go.

Use it for:

- shared repo rules
- repo-scoped Codex skills under `.agents/skills/`
- durable agent-facing conventions
- docs structure guidance

Do not use it for:

- tool runtime config
- plugin settings
- hooks required by a specific agent
- skills that only work because a non-Codex tool discovers them from its own folder

## Current Structure

- `rules.md`
  - shared repo conventions, command rules, and focused rule index
- `rules/`
  - focused mandatory standards for specific work areas
- `skills/`
  - Codex-discoverable repo skills and reusable agent workflows/checklists

## Relationship To Tool-Specific Folders

If future tools need their own folders, keep those folders thin and point them back here.

For shared workflows, prefer `.agents/skills/` as the canonical source.
