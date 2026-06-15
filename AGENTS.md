# Agent Guide

This repository supports coding agents.

Use this file as the neutral entrypoint for shared repo guidance.

## Read Order

1. Read `.agents/rules.md`
2. Read relevant focused rule files in `.agents/rules/`
   - spec-backed River Go work: `.agents/rules/river-go-spec-first-development.md`
   - frontend/UI work: `.agents/rules/river-go-frontend.md`
   - backend/API work: `.agents/rules/river-go-backend.md`
   - tests or test setup: `.agents/rules/river-go-testing.md`
   - user-facing copy / condition indicators: `.agents/rules/river-go-no-advice.md`
3. Read `/docs/specs/README.md`
4. Read `/docs/specs/spec-consolidation-map.md` when choosing the owning spec
5. Read relevant strategy documents in `/docs/strategy/` when product context matters
6. Read tool-specific bootstrap files only if your agent requires them

## Purpose Split

- `.agents/`
  - shared repo rules, workflows, Codex-discoverable skills, and agent-agnostic guidance
- `.agents/rules/`
  - focused rule files for specific work areas
- `.agents/skills/`
  - repo-local Codex skill workflows/checklists

## Product And Docs Structure

Use the repo docs by role:

- `/docs/strategy/`
  - long-lived product strategy, market analysis, business case, community model, data strategy, and roadmap
- `/docs/specs/`
  - canonical living specs for product, frontend, backend, data, release, ops, and future-roadmap work
- `/docs/product/`
  - demo feedback plans, UX support material, and product research artefacts

## Rule

Keep shared repo conventions in `.agents/` whenever they are not tool-specific.

Do not duplicate shared policy in tool-specific files. Tool-specific files should be thin wrappers over this shared control layer.
