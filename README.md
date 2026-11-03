# SemAPrototyp

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.6;
the installed Angular packages are currently 22.2.x (CLI 22.2.5).

## AI agent setup

The repository is prepared for spec-driven work with AI coding agents. **OpenCode is the primary
tool.** The role definitions are plain Markdown, with thin OpenCode adapters.

- `AGENTS.md`: project instructions, conventions, workflow and definition of done.
- `docs/agents/`: canonical role definitions (spec analyst, architect, design system, UI, feature,
  test, accessibility, code review, performance, docs).
- `.opencode/agents/`: OpenCode adapters for the 10 subagents.
- `.opencode/commands/`: `/build-from-spec`, `/next-task` and `/review-feature`.
- `.opencode/skills/`: project skills `spec-intake` and `angular-conventions`.
- `opencode.json`: Angular CLI MCP server, permissions and instructions.
- `docs/spec/SPEC.md`: the full specification (single source of truth); `docs/PROGRESS.md` tracks
  progress.
- `docs/architecture/DECISIONS.md`: ADRs; `docs/AGENT-SETUP.md`: how the setup works.

Start with `/build-from-spec intake` and use `/next-task` for the feature loop. No `.claude/`
adapters are maintained; Claude Code can reuse `AGENTS.md` and the canonical role files. Full
details: [`docs/AGENT-SETUP.md`](docs/AGENT-SETUP.md).

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner in a single pass, use:

```bash
npx ng test --no-watch
```

## Running end-to-end tests

End-to-end tests are not configured yet. Add Playwright only if a requirement demands it and the
decision is recorded in `docs/architecture/DECISIONS.md`.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
