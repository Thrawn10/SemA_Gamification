# Progress

Last updated: 2026-11-03 (agent setup completed; intake not started)

## Current phase

intake

## Task status

| Task ID                  | Title                                                               | Requirements | Feature folder | Status | Notes                                               |
| ------------------------ | ------------------------------------------------------------------- | ------------ | -------------- | ------ | --------------------------------------------------- |
| setup-agents             | Split the agent bundle into OpenCode agents, commands and role docs | —            | —              | done   | `.opencode/`, `docs/agents/`, `docs/AGENT-SETUP.md` |
| (filled by spec-analyst) |                                                                     |              |                | todo   |                                                     |

Status values: `todo`, `in-progress`, `blocked`, `done`.

## Decisions awaiting the human

- Q-001: the spec names `pnpm`, while the workspace uses npm. See
  `docs/spec/open-questions.md`.

## Follow-ups

- Angular's official `best-practices.md` and the `angular-developer` skill are installed. Re-run
  `pwsh scripts/setup-angular-agents.ps1` (or the bash script) when you want to refresh them.
- Run `/build-from-spec intake` to generate `requirements.md`, `work-breakdown.md` and
  `open-questions.md` from `docs/spec/SPEC.md`.
- `angular-eslint` is not installed yet; the gate is `ng build`, `npx ng test --no-watch` and
  `npx prettier --check .`.
