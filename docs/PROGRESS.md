# Progress

Last updated: 2026-11-03

## Current phase

MVP complete through M5 and the JSON part of M6; M7 is in progress (Excel import and Playwright
remain). The spec in [`spec/SPEC.md`](spec/SPEC.md) is still the source of truth.

## Milestones

| Milestone | Title                        | Status      | Evidence                                                                                            |
| --------- | ---------------------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| M0        | Gerüst                       | mostly done | Angular 22 workspace, `packages/regeln`, `packages/vertraege`, Prettier; ESLint and Playwright open |
| M1        | Regelmodul                   | done        | `packages/regeln/src/*`, 21 rule tests (TF1–TF3c, TF7, TF10–TF12, TF16–TF19, R-B4, R-M1)            |
| M2        | Daten                        | done        | contracts, ports, IndexedDB + in-memory adapters, fixtures APP/PLA/MED, seed, export/import/reset   |
| M3        | Anwendungsdienste und Rechte | done        | `src/app/dienste/`, 23 service tests (TF4, TF5, TF8, TF13–TF15, TF20, TF21, T-I4, D-013)            |
| M4        | UI Lernende                  | done        | login, skilltree graph, sidebar, requests, history, badges, “Meine Daten”, demo bar                 |
| M5        | UI Praxisbildner/in          | done        | coach overview, requests, confirm/withdraw, milestone confirmation                                  |
| M6        | Excel-Import                 | partial     | template JSON dry run and import (T-I3, T-I4, T-I6 partial, TF6c); Excel reader blocked (Q-002)     |
| M7        | Feinschliff                  | in progress | tokens, dark mode, a11y review fixes; axe run and Playwright still open                             |

## Task status

| Task ID      | Title                                                                | Requirements                                          | Feature folder              | Status  | Notes                                                  |
| ------------ | -------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------- | ------- | ------------------------------------------------------ |
| setup-agents | Split the agent bundle into OpenCode agents, commands and role docs  | —                                                     | `.opencode/`, `docs/agents` | done    | `.opencode/`, `docs/agents/`, `docs/AGENT-SETUP.md`    |
| rules-core   | Stages, progress, traffic light, plan index, milestones, badges      | R-S1–R-S6, R-F1–R-F6, R-M1–R-M3, R-B1–R-B8, R-T1–R-T4 | `packages/regeln`           | done    | 21 tests                                               |
| contracts    | DTOs, commands, results, error codes, German labels                  | SPEC Kap. 6                                           | `packages/vertraege`        | done    | `@skilltree/vertraege`                                 |
| fixtures     | Generate APP/PLA/MED template JSON from the spec appendices          | SPEC 7.4, T-V5, TF6c                                  | `tools/`, `public/vorlagen` | done    | counts 5/25/145, 6/33/177, 6/24/158                    |
| data-layer   | Ports, IndexedDB adapter, per-port adapters, session store, seed     | SPEC 0.7, N-12, Kap. 9                                | `src/app/daten`             | done    | deterministic seed, 3 plans, 7 accounts                |
| app-services | Access rules, session, skilltree, confirmation, requests, milestones | SPEC 10.2 (TF4, TF5, TF8, TF13–TF15, TF20, TF21)      | `src/app/dienste`           | done    | `Zugriff`, `SitzungDienst`, `SkilltreeDienst`, …       |
| admin-data   | Data export/import/reset and template import dry run                 | T-I1, T-I3, T-I4, T-I6, T-W6, TF6c                    | `src/app/admin`             | done    | Excel reader deferred (Q-002)                          |
| learner-ui   | Skilltree graph, sidebar, request form, history, badges              | S-A01–S-A08, S-Q01                                    | `src/app/skilltree`         | done    | keyboard focus, tooltips, mobile horizontal scroll     |
| coach-ui     | Overview table, request cards, direct confirmation, milestones       | S-L01–S-L06                                           | `src/app/uebersicht`        | done    | sortable table, inline forms, “Im Baum zeigen”         |
| demo-bar     | Violet prototype control bar and requirement markers                 | N-11                                                  | `src/app/demo-steuerung`    | done    | `DEMO_MODE` constant (D-006)                           |
| excel-import | Browser Excel reader for INF templates                               | T-I1, T-I3, T-I6, TF6, TF6b                           | —                           | blocked | `.xlsx` fixtures missing, `xlsx` not installed (Q-002) |
| e2e          | Playwright learner and coach flows plus axe                          | SPEC 10.4, T-A1                                       | `e2e/`                      | todo    | Playwright not installed                               |
| lint         | `angular-eslint` clean run                                           | T-W5                                                  | —                           | todo    | not installed; gate is build, tests and Prettier       |

Status values: `todo`, `in-progress`, `blocked`, `done`.

## Verification

- `npx ng build` — green, no budget warnings. Initial bundle ≈ 305 kB raw / 85 kB transfer.
- `npx ng test --no-watch` — green, 82 tests in 21 files (21 rules, 23 services, 2 app shell tests,
  2 inline-form tests, 1 bootstrap test, 33 per-component and per-page tests).
- `npx prettier --check .` — green.
- `npm run check:components` — green (four-file rule, no inline templates, D-018).
- `ng lint` — not available (no `angular-eslint`).

## Component structure (D-018)

Every Angular component now ships as four files (`.ts`, `.html`, `.scss`, `.spec.ts`). The 17
components that still carried an inline template were split; components without styles received an
empty component stylesheet so the structure is uniform. The test-only router stub was replaced by a
wildcard route with `children: []`, so no test component lives outside the rule. New per-component
tests were added for the remaining components, and the former shared `seiten.spec.ts` was split into
one spec per page. `npm run check:components` fails the gate if a component misses a file or embeds a
`template:`/`styles:` block.

## Fix: blank page after bootstrap (NG0203)

The first real browser run showed an empty `<app-root>`: `provideAppInitializer` called
`inject(SitzungDienst)` **after** an `await`, so the injection context was gone and bootstrap
rejected with NG0203. The initializer now lives in `src/app/app-initialisierung.ts` and resolves both
services synchronously before awaiting their work; `app-initialisierung.spec.ts` seeds an empty store
through it, so the regression is covered (82 tests). Verified in headless Chrome: login → skilltree
(25 nodes, 3 milestones) → sidebar (7 objectives), no console errors.

## Quality-gate fixes (review round 1)

Applied from the `code-reviewer` and `a11y-reviewer` reports:

- R-B4: milestone badges resolved zero objectives, so `MS-25/50/75/100` were never awarded. Fixed in
  `packages/regeln/src/badges.ts`, covered by two new rule tests.
- S-L02: the confirmation form preselected the requested stage in its model but the rendered
  `<select>` fell back to the first option, so a coach could confirm a different stage than the one
  displayed. Fixed with `[selected]` and a component test.
- R-M1 / N-05: Bbc readiness now falls back to the competence's Basislehrjahr modules.
- Focus management: inline forms focus their first field and return focus to the opener; the sidebar
  focuses the dialog, contains Tab and returns focus to the graph node on close.
- Traffic light: the compact variant exposes its state to screen readers; the graph legend now lists
  the three levels with symbol and text (S-A02).
- Contrast: `--farbe-rand-stark` raised to ≥ 3:1 (light and dark); revoked history entries no longer
  use opacity.
- Semantics: tabs became toggle buttons, progress bars are labelled, sort changes are announced,
  skip link target is focusable, requirement chips are hidden from the accessibility tree.
- Data: T-I6 downgraded to `partial` (D-014), demo reset opened to all roles (D-013), duplicate
  objective codes are merged on import, missing `module` blocks are reported in the dry run instead of
  crashing mid-write.

## Quality-gate fixes (review round 2)

- R-M1 / N-05: the Bbc readiness no longer falls back to the competence modules when the objective
  has an explicit empty `basislehrjahr` list. MED now reports 126 of 158 objectives instead of 158
  (D-016); two rule tests and one fixture test cover the denominator.
- T-I4: duplicates are merged only inside one competence. A code that appears in a second competence
  is now a `FEHLER` in the dry run instead of a silent "wird zusammengeführt" (D-017), with a test.
- Demo bar: the account `<select>` marks the active option with `[selected]`, so it no longer shows
  the first account after a reload and cannot silently switch users.
- Focus: milestone forms in the sidebar focus their textarea and return focus to the dialog on
  submit/cancel; the coach request forms, the admin import/reset and the demo reset move focus to the
  next stable control when the clicked button disappears. `summary` is part of the Tab containment in
  the modal, and the inline forms only remember openers inside their own row. A component test covers
  the focus move into and back out of the inline form.
- Stale sidebar selection: a node or area that disappears after a reload or template import is
  cleared, so the panel no longer stays open without content.
- Contrast: `--farbe-rand-stark` is now `#7f8a99` (light) / `#6b7b8f` (dark), ≥ 3:1 against
  `--farbe-flaeche-leise` and `--farbe-hintergrund`.
- D-013 test: it now appends a stage event and asserts that the demo reset removes it.

## Decisions awaiting the human

- Q-001: npm vs pnpm (spec names pnpm).
- Q-002: Excel fixtures and the `xlsx` dependency.
- Q-006: `fake-indexeddb` for the second TF21 run.
- Q-003–Q-005, Q-007–Q-017: assumptions recorded in
  [`spec/open-questions.md`](spec/open-questions.md) and
  [`architecture/DECISIONS.md`](architecture/DECISIONS.md); confirm or correct them.

## Follow-ups

- Add the APP/PLA/EdB workbooks to `fixtures/excel/` if they may be committed, then wire the
  converter or the in-browser Excel adapter into the admin import and enable TF6/TF6b.
- Add `angular-eslint` and fix the first lint run.
- Add Playwright with the two flows from SPEC 10.4 and an axe check per view.
- Move the node sidebar to `@angular/cdk` (or `<dialog showModal()>`) so the background becomes
  `inert` (D-015).
- Template versioning: code-based objective migration, archiving and cross edges (D-014, Q-011).
- Run `/review-feature` with `a11y-reviewer`, `code-reviewer` and `performance-auditor` before the
  next test-participant session.

## Bildungsplan → JSON export (2026-11-03)

- Added a dependency-free XLSX reader (`tools/xlsx-lesen.mjs`) and the converter
  (`tools/bildungsplan-import.mjs`); run with `npm run import:bildungsplaene`.
- Generated the normalized `VorlageImport` JSONs under `fixtures/bildungsplaene/`:
  APP 2021 (5 areas / 25 competences / 145 objectives), PLA 2021 (6 / 33 / 177),
  EdB 2024 (5 / 28 / 136) and MED 2019 (6 / 24 / 158). `bericht.json` records the counts,
  warnings and the competences without BFS modules.
- Added the JSON Schema (`docs/import/bildungsplan.schema.json`) and the mapping/validation guide
  (`docs/import/BILDUNGSPLAN-IMPORT.md`). Another AI can use these to transfer further PDF/Excel
  plans into the same shape.
- The MED PDF is not parsed automatically: text extraction loses the BFS/ÜK column positions and no
  PDF library is installed. The checked-in MED JSON is the cleaned transcription from SPEC Appendix C;
  it was verified against the extracted PDF text (24/24 competence titles, 158/158 objective texts and
  codes found).
- Known data gaps: the delivered Excel files have no BFS modules (column G empty) and store the
  Basislehrjahr module numbers in C–E instead of F. The converter keeps C–E as
  `module.basislehrjahr`, leaves BFS empty and reports the gap (Q-016). EdB `A5` has a copied APP
  title in `A2`; the `Start` title is used. EdB `lehrdauerJahre = 4` and `bildungsplanJahr = 2024` are
  assumptions (Q-017).
- The generated JSONs do not replace `public/vorlagen/*.json` or the seed. Structural validation of
  all four files passed with zero errors; APP/PLA texts match the existing fixtures except for the
  documented `a6.1`, hyphenation and space-split differences.
