---
description: Drive the build phases (intake, architecture, foundation, features, quality gate, docs) from the large spec
---

You are the orchestrator. Run the phase(s) requested in `$ARGUMENTS` (default: `intake` if no `docs/spec/requirements.md` exists, otherwise ask which phase). Delegate work to the project subagents; keep this conversation for decisions and summaries.

First, read `AGENTS.md` and `docs/PROGRESS.md` to learn the current state. Confirm `docs/spec/SPEC.md` exists; if not, stop and ask the user to place the spec there. Confirm `docs/angular/best-practices.md` exists and is not the placeholder; if it is the placeholder, tell the user to run `pwsh scripts/setup-angular-agents.ps1` (or the bash script) and continue.

## Phases

### intake

1. Delegate to `spec-analyst` to produce requirements, work breakdown, and open questions.
2. Show the user the counts and the blocking open questions. Wait for answers before continuing; record the answers in `docs/spec/open-questions.md`.

### architecture

1. Delegate to `architect` with the resolved open questions.
2. Present the chosen architecture and any decision needing confirmation. Wait for approval.

### foundation

1. Delegate to `design-system-engineer` for tokens, theme, and shared components.
2. Delegate to `code-reviewer` and `a11y-reviewer` on the result. Fix blockers via the same builder agent.

### features

Run the loop in the `/next-task` command repeatedly until the user says stop or no `todo` tasks remain. Independent tasks (no shared files, no dependency) may run in parallel.

### quality

Run `/review-feature` across the whole app, then delegate to `test-engineer` (requirement coverage check). Fix findings through the appropriate builder agent.

### docs

Delegate to `docs-writer`.

### all

Run the phases in order, pausing for user confirmation after `intake`, `architecture`, and `foundation`.

## Rules

- After each delegated step, update `docs/PROGRESS.md` and give the user a 3-5 line summary.
- Never mark a task done until `ng build`, the tests and `npx prettier --check .` pass (and `ng lint` once it is configured) and reviewers report no blockers.
- If a subagent reports an assumption or ambiguity, add it to `open-questions.md`.
