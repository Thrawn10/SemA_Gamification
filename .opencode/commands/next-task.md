---
description: Pick the next todo task from the work breakdown, implement it, test it, and review it
---

Implement exactly one task from `docs/spec/work-breakdown.md`.

1. Select the task: `$ARGUMENTS` if given, otherwise the first `todo` task whose dependencies are all `done` per `docs/PROGRESS.md`. Mark it `in-progress`.
2. Read its requirement IDs in `docs/spec/requirements.md`.
3. Choose the builder:
   - Mostly visual/presentational → `ui-component-developer`
   - Routes, data, state, forms, guards → `feature-developer`
   - Both → `ui-component-developer` first, then `feature-developer`
     Pass the task text, requirement IDs, target feature folder, and pointers to the exact spec sections.
4. Delegate to `test-engineer` to cover the acceptance criteria.
5. Delegate to `code-reviewer` and `a11y-reviewer` (in parallel). If either reports blockers or major findings, send them back to the builder and repeat steps 4-5 once more.
6. Run `ng build`, the tests and `npx prettier --check .` yourself and confirm they pass.
7. Update `docs/PROGRESS.md` (status `done`, requirement IDs covered, follow-ups) and summarize in 3-5 lines: what changed, what is covered, what remains.
