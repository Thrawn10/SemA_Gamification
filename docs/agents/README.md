# Agent roles

Canonical, tool-neutral role definitions for the project's AI subagents. The OpenCode adapters in
`.opencode/agents/` are thin files that set the frontmatter (description, `mode: all`, permissions)
and point here. `mode: all` means each role can be selected directly in OpenCode and delegated to as
a subagent. `AGENTS.md` is the shared project instruction file.

| Role                   | File                                                     | Purpose                                                            | Writes code?  |
| ---------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ | ------------- |
| spec-analyst           | [`spec-analyst.md`](spec-analyst.md)                     | Turn the spec into requirements, work breakdown, open questions    | docs only     |
| architect              | [`architect.md`](architect.md)                           | Architecture, routing, state/data strategy, ADRs, workspace config | docs + config |
| design-system-engineer | [`design-system-engineer.md`](design-system-engineer.md) | Tokens, theming, shared UI components                              | yes           |
| ui-component-developer | [`ui-component-developer.md`](ui-component-developer.md) | Presentational standalone components                               | yes           |
| feature-developer      | [`feature-developer.md`](feature-developer.md)           | Feature routes, pages, services/stores, HTTP, forms, guards        | yes           |
| test-engineer          | [`test-engineer.md`](test-engineer.md)                   | Vitest/TestBed/harness tests, coverage                             | tests only    |
| a11y-reviewer          | [`a11y-reviewer.md`](a11y-reviewer.md)                   | Accessibility audit                                                | no (reports)  |
| code-reviewer          | [`code-reviewer.md`](code-reviewer.md)                   | Correctness, Angular conventions, maintainability                  | no (reports)  |
| performance-auditor    | [`performance-auditor.md`](performance-auditor.md)       | Bundle, change detection, loading performance                      | no (reports)  |
| docs-writer            | [`docs-writer.md`](docs-writer.md)                       | README, component docs, handover docs                              | docs only     |

The main session acts as orchestrator (subagents cannot spawn other subagents), usually through the
OpenCode commands in `.opencode/commands/`. See [`../AGENT-SETUP.md`](../AGENT-SETUP.md).
