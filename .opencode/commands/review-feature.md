---
description: Run the full quality gate (code, accessibility, performance, tests) on a feature or the whole app
---

Run a quality gate on `$ARGUMENTS` (or the whole app if empty).

1. In parallel, delegate to `code-reviewer`, `a11y-reviewer`, and `performance-auditor`, scoped to the target.
2. Delegate to `test-engineer` to report requirement coverage for the target.
3. Merge the reports into a single list ordered by severity, removing duplicates. Do not fix anything in this command.
4. Present: overall verdict, blockers, majors, then a short list of minors. Ask the user which findings to fix, then route each to the right builder agent.
