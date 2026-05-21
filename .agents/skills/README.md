# River Go Repo Skills

These are repo-local Codex skill workflows.

They complement the mandatory rules in `.agents/rules/`; they do not replace them.

## Skills

- `river-commit`
  - commit workflow for River Go changes
- `river-pr-prepare`
  - branch readiness check without pushing or opening a PR
- `river-pr-prepare-and-raise`
  - push and open/update a GitHub PR against `main`
- `river-create-and-raise-pr`
  - alias for the PR prepare-and-raise workflow
- `river-ui-review`
  - River Go frontend/map UI review checklist
- `river-local-dev-troubleshooting`
  - local Vite/dev/build troubleshooting workflow
- `river-testing-gate`
  - alias for the River Go testing gate
- `river-go-spec-first-development`
  - workflow helper for implementing durable work against local specs
- `river-go-spec-authoring`
  - workflow helper for creating or restructuring specs
- `river-go-testing-gate`
  - validation checklist before handoff, commit, or push
