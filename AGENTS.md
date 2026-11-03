# Skilltree Prototype — Project Agent Instructions

You are working on an Angular frontend that visualises the training progress of apprentices as a
skill tree, lets practice trainers confirm stages, and awards milestone badges. It is a research
prototype (research questions FF1–FF4), so correctness, traceability and usability with test
participants matter more than production hardening.

## Source of truth

- The full specification lives in `docs/spec/SPEC.md`. Never paraphrase it from memory; re-read the
  relevant section.
- Derived artifacts (created by the `spec-analyst` agent):
  - `docs/spec/requirements.md`: every requirement with a stable ID (`R-001`, `R-002`, ...)
  - `docs/spec/work-breakdown.md`: ordered tasks, each mapped to requirement IDs
  - `docs/spec/open-questions.md`: ambiguities and assumptions
- Progress is tracked in `docs/PROGRESS.md`. Update it at the end of every task.
- Architecture decisions are recorded in `docs/architecture/DECISIONS.md`.
- Angular's official guidance is in `docs/angular/best-practices.md` (downloaded by
  `scripts/setup-angular-agents.sh`) and in the Angular CLI MCP server (`get_best_practices`,
  `search_documentation`).

Precedence: the spec wins for product behavior. For Angular code style, the official
best-practices file wins unless an ADR in `DECISIONS.md` records a deliberate deviation. This file
wins for project structure and process.

The spec names a few documentation paths differently. They exist as pointers so either name works:

- `docs/decisions.md` → `docs/architecture/DECISIONS.md`
- `docs/open-questions.md` → `docs/spec/open-questions.md`

## Non-negotiable product constraints (from the spec)

- **Language:** UI copy in German with Swiss spelling (`ss` instead of `ß`, « » quotes). Domain
  terms in code and data stay German with umlauts written out (`Stufenereignis`,
  `BESTAETIGT`). Comments, technical names and commit messages are English.
- **Compute, never store:** stage, progress, traffic light, recommendations and badges are always
  derived from stage events. Stage events are append-only; never update or delete them.
- **Authorisation in the service layer:** every reading and writing operation checks role and
  assignment in the application/service layer, never only in the UI. Components may additionally
  hide actions.
- **Rules first:** the rules module (spec chapter 5) is a standalone library of pure functions
  without framework or database dependencies. Write its tests before its functions.
- **No invented business rules:** implement the documented default, mark it with `// ANNAHME:`,
  and record it in `docs/architecture/DECISIONS.md`. Record undecided questions in
  `docs/spec/open-questions.md`.
- **No extra features:** ideas go to `docs/backlog.md`.
- Work through the milestones defined in the spec, in the given order.

## Angular version and defaults

Angular **22.x** (current install: `@angular/core` 22.2.4, CLI 22.2.5), TypeScript **6.0**
strict, Vitest 4 + jsdom.

Defaults that follow from this version:

- Do **not** write `standalone: true`; it is the default.
- Do **not** write `changeDetection: ChangeDetectionStrategy.OnPush`; OnPush is the default in v22.
- Signal Forms (`@angular/forms/signals`) are stable; prefer them for new forms.
- `@Service` is available; prefer it over `@Injectable({ providedIn: 'root' })` for new singletons.

When unsure how an API behaves in this version, call the MCP tool `search_documentation` or
`get_best_practices` instead of guessing.

## Stack

| Concern              | Choice                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Framework            | Angular 22.x, standalone components, signals                                                                          |
| Language             | TypeScript 6.0, `strict`                                                                                              |
| Styling              | SCSS plus CSS custom-property design tokens. No UI library is installed yet; `architect` records the choice in an ADR |
| State                | Signals in components and services. A global store only if the requirements need one (ADR)                            |
| Data                 | `HttpClient` with functional interceptors; in-memory/mock layer until a backend exists                                |
| Forms                | Signal Forms, otherwise typed Reactive forms                                                                          |
| Unit/component tests | Vitest via `@angular/build:unit-test`, `TestBed`, CDK component harnesses                                             |
| E2E                  | Not configured yet; add Playwright only if the requirements demand it                                                 |
| Lint/format          | Prettier (configured). angular-eslint is not installed yet                                                            |

## Commands

- Install: `npm install`
- Dev server: `npm start` (= `ng serve`)
- Build: `npm run build` (= `ng build`)
- Unit/component tests (single run): `npx ng test --no-watch`
- Format check: `npx prettier --check .`; write: `npx prettier --write .`
- Lint: **not available yet**; `ng lint` fails until angular-eslint is added. Until then the gate
  is `ng build`, the test suite and Prettier.
- E2E: not configured.

With the MCP server available, `run_target`, `devserver_start`, `devserver_wait_for_build` and
`devserver_stop` can do the same.

## Project structure (target)

```
src/app/
  app.config.ts          providers (router, http, interceptors, error handling)
  app.routes.ts          top-level lazy routes
  core/                  singletons: interceptors, guards, auth, config, error handling
  shared/
    ui/                  design-system components (presentational, reusable)
    util/                pure helpers, pipes, directives
  features/
    <feature>/
      <feature>.routes.ts
      pages/             routed (smart) components
      components/        feature-only presentational components
      data/              services, API clients, stores, models
      <feature>.spec.ts or colocated *.spec.ts
src/styles/              tokens, theme, global styles
e2e/                     end-to-end tests
docs/                    spec, architecture, progress, angular guidance
```

Import rules: `features` may import `shared` and `core`; `shared` imports nothing from `features`;
features do not import each other (use a shared abstraction or the router).

## Conventions

- TypeScript strict; no `any` (use `unknown` and narrow). No non-null assertions without a comment.
- Standalone components only; do not create NgModules for new code.
- `inject()` for dependency injection, not constructor parameters.
- Signals for state: `signal`, `computed`, `linkedSignal`, `effect` only for side effects (not for
  deriving state). Use `set`/`update`, never `mutate`.
- `input()`, `output()`, `model()` instead of `@Input`/`@Output` decorators.
- Native control flow (`@if`, `@for` with a `track` expression, `@switch`, `@defer`) instead of
  `*ngIf`/`*ngFor`/`*ngSwitch`.
- Host bindings and listeners go in the `host` object, not `@HostBinding`/`@HostListener`.
- `class`/`style` bindings instead of `ngClass`/`ngStyle`. Do not import `CommonModule`.
- Observables in templates via the `async` pipe or `toSignal`; in classes clean up with
  `takeUntilDestroyed`.
- Lazy-load every feature route (`loadComponent` / `loadChildren`).
- Use `NgOptimizedImage` for static images.
- Keep templates simple; move logic into `computed` signals or the class.
- No hard-coded colors, spacing, or font sizes: use design tokens.
- Do not add a dependency without recording why in `docs/architecture/DECISIONS.md`.
- Prefer the Angular CLI (`ng generate`) for scaffolding so files follow the workspace schematics.

## Definition of done (per task)

1. Implements the mapped requirement IDs completely (check against `requirements.md`).
2. `ng build` and the test suite pass with no new warnings; `npx prettier --check .` is clean.
3. New logic has tests; new components have at least one component test.
4. Keyboard accessible, visible focus, sufficient contrast, responsive at mobile/tablet/desktop
   widths; passes AXE checks.
5. `docs/PROGRESS.md` updated (task status, requirement IDs covered, follow-ups).

## Agent roster

The canonical, tool-neutral role definitions live in `docs/agents/`. The maintained adapters are in
`.opencode/agents/` (OpenCode): each one is a thin file with the description, `mode: subagent`,
permissions and a pointer to its role file. The main session acts as orchestrator (subagents cannot
spawn other subagents), usually via the commands in `.opencode/commands/`. See
`docs/AGENT-SETUP.md`.

Project skills live in `.opencode/skills/`: `spec-intake` (chunking the spec) and
`angular-conventions` (Angular 22.x project conventions). No `.claude/` adapters are maintained;
Claude Code can read `AGENTS.md` and the canonical role files directly.

| Agent                    | Purpose                                                                         | Writes code?  |
| ------------------------ | ------------------------------------------------------------------------------- | ------------- |
| `spec-analyst`           | Turn the big spec into requirements, work breakdown, open questions             | docs only     |
| `architect`              | Angular architecture, routing, state/data strategy, ADRs, workspace scaffolding | docs + config |
| `design-system-engineer` | Tokens, theming, shared UI components                                           | yes           |
| `ui-component-developer` | Presentational standalone components                                            | yes           |
| `feature-developer`      | Feature routes, pages, services/stores, HTTP, forms, guards                     | yes           |
| `test-engineer`          | TestBed/harness tests, e2e tests, flaky-test fixes                              | tests only    |
| `a11y-reviewer`          | Accessibility audit                                                             | no (reports)  |
| `code-reviewer`          | Correctness, Angular conventions, maintainability                               | no (reports)  |
| `performance-auditor`    | Bundle, change detection, loading performance                                   | no (reports)  |
| `docs-writer`            | README, component docs, handover docs                                           | docs only     |

Official skills (`angular-developer`, `angular-new-app`) and the Angular CLI MCP server are
available to the whole team; builder agents should use them before guessing at Angular APIs. The
project skills in `.opencode/skills/` are available to every agent.

## Workflow

1. **Intake**: `spec-analyst` produces requirements, work breakdown, open questions. Human resolves
   open questions.
2. **Architecture**: `architect` decides structure and cross-cutting concerns, scaffolds config,
   writes ADRs.
3. **Foundation**: `design-system-engineer` builds tokens, theme, and shared UI components.
4. **Feature loop**: for each task in `work-breakdown.md`: builders implement, `test-engineer`
   covers, reviewers run.
5. **Quality gate**: `a11y-reviewer`, `code-reviewer`, `performance-auditor` review; findings are
   fixed before moving on.
6. **Docs**: `docs-writer` finalizes README and handover notes.

## Rules for all agents

- Read `docs/PROGRESS.md` and the relevant spec section before starting.
- If the spec is ambiguous, record an assumption in `open-questions.md` and continue with the most
  reasonable reading; do not silently invent product behavior.
- If you are unsure how an Angular API behaves in this version, check
  `docs/angular/best-practices.md` or the MCP `search_documentation` tool; do not rely on memory for
  newer APIs (signals, Signal Forms, resources, `@defer`).
- Do not edit files outside your assigned scope without saying so in your report.
- End every task with a short report: what changed, requirement IDs covered, what is still open.

---

# Angular and TypeScript best practices

You are an expert in TypeScript, Angular, and scalable web application development. You write
functional, maintainable, performant, and accessible code following Angular and TypeScript best
practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly. `OnPush` is the default
  in Angular v22+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host`
  object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA
  attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `model()` for two-way bound properties with `[(prop)]` syntax instead of pairing `input()`
  with `output()`
- Use `computed()` for derived state
- Use `linkedSignal()` for state derived from multiple reactive sources that must stay synchronized
- Prefer inline templates for small components
- Prefer Signal Forms (`@angular/forms/signals`) for new forms. They are stable in Angular v22+ and
  provide signal-based state, type-safe field access, and schema-based validation
- When not using Signal Forms, prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Prefer the `@Service` decorator over `@Injectable({providedIn: 'root'})` for new singleton services
  (Angular v22+)
- Use the `inject()` function instead of constructor injection
