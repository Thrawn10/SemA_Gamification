# SemAPrototyp

Research prototype of a skill tree for Swiss apprenticeships (FFHS semester project). It visualises
the training plan as a bottom-up graph, lets practice trainers confirm stages, collects confirmation
requests and awards badges. All values are computed from append-only stage events.

The UI copy is German with Swiss spelling; the specification
([`docs/spec/SPEC.md`](docs/spec/SPEC.md)) is the source of truth for product behaviour.

## What is implemented

- Learner view: skilltree graph (Bbc → branches → IPA → Lehrabschluss), sidebar with learning
  objectives, request form, history, badges, “Meine Daten”.
- Coach view: sortable overview of assigned learners, collected requests with confirm/reject,
  direct confirmation and withdrawal in the tree, milestone confirmation.
- Violet prototype bar (`DEMO_MODE`) with role switch, requirement IDs, review and reset.
- Preloaded seed: four learning plans (APP, PLA, MED and the binary PiBS plan) with one learner each,
  deterministic stage events, requests, history and badges. No upload or setup step is required.

Data lives in IndexedDB in the browser and is seeded on first start. There is no backend yet; the
ports and adapters are prepared for one (see `docs/architecture/DECISIONS.md`).

## Try it

```bash
npm install
npm start        # http://localhost:4200
```

Choose a test account on the login page (no password, pseudonymised demo data):

| Login  | Person     | Profession               |
| ------ | ---------- | ------------------------ |
| `nora` | Nora Frei  | Applikationsentwicklerin |
| `luca` | Luca Meier | Plattformentwickler      |
| `sara` | Sara Huber | Mediamatikerin           |

The practice-trainer accounts (`daniel`, `petra`) are not part of the participant flow. They stay
reachable behind the collapsed “Prototyp-Zugang Praxisbildner/in” panel on the login page and in the
violet prototype bar, so the coach view can still be demonstrated (D-021, Q-018). There is no admin
route or file upload.

Reset the demo data with the violet prototype bar.

## Checks

```bash
npx ng build                # production build
npx ng test --no-watch      # Vitest unit, service, page and component tests
npm run check:components    # four-file component rule (D-018)
npx prettier --check .      # formatting
```

`ng lint` is not available yet (`angular-eslint` is not installed). The validation build has no
Excel/PDF or template upload; the seed is the only data source. The offline converter and the
normalised `VorlageImport` JSON remain available for later work: `npm run import:bildungsplaene`
(D-010, D-021). See [`docs/import/BILDUNGSPLAN-IMPORT.md`](docs/import/BILDUNGSPLAN-IMPORT.md),
[`docs/PROGRESS.md`](docs/PROGRESS.md) and [`docs/spec/open-questions.md`](docs/spec/open-questions.md).

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
