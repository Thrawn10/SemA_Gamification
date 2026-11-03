# Architecture Decision Records

One entry per decision, format per SPEC 0.6. `Status: ANNAHME` means the decision is a reasonable
reading that the human still has to confirm; it is also mirrored in
[`../spec/open-questions.md`](../spec/open-questions.md).

## D-001 Two local packages with path aliases

- Bezug: SPEC 0.7 (rules layer), Kap. 5, 10.1
- Entscheid: `packages/vertraege` (DTOs, commands, error codes, German labels) and
  `packages/regeln` (pure functions) are separate TypeScript packages, imported as
  `@skilltree/vertraege` and `@skilltree/regeln` via `tsconfig.json` `paths` (no `baseUrl`, entries
  start with `./` under TypeScript 6).
- Grund: the rules module must not depend on Angular or storage; the alias keeps imports stable when
  a backend package is added later.
- Status: BESTÄTIGT

## D-002 IndexedDB behind a small storage contract, one adapter per port

- Bezug: SPEC 0.3, 0.7, N-12
- Entscheid: `DatenSpeicher` wraps the raw IndexedDB API (`MemorySpeicher` for tests). Each
  repository port has its own adapter class in `daten/lokal/speicher-adapter.ts`. Components and
  services never see IndexedDB or `localStorage`.
- Grund: a later HTTP layer replaces one adapter at a time; tests run deterministically against the
  in-memory implementation (TF21).
- Status: BESTÄTIGT

## D-003 Signal state, no global store

- Bezug: SPEC 0.8, AGENTS.md
- Entscheid: components hold view state in signals; `SitzungDienst` exposes read-only signals;
  services emit `DomaenenEreignisse`, and pages reload via an `effect` on the `version()` token.
- Grund: the prototype has no cross-feature shared state that would justify NgRx or a custom store.
- Status: BESTÄTIGT

## D-004 Lazy routes plus `withComponentInputBinding`

- Bezug: SPEC 8.1–8.3
- Entscheid: every route uses `loadComponent`; `skilltree/:id` receives `id`, `knoten` and `lz` as
  component inputs (route and query parameters). Route guards mirror, but never replace, the
  service-layer permission checks.
- Grund: lazy loading keeps the initial bundle small; input binding removes `ActivatedRoute`
  boilerplate from the pages.
- Status: BESTÄTIGT

## D-005 Design tokens instead of a UI library

- Bezug: SPEC 8.5, AGENTS.md stack table
- Entscheid: SCSS custom properties in `src/styles/_tokens.scss` with light and dark values, plus
  global component classes in `_komponenten.scss`. No UI library is installed.
- Grund: the spec fixes the layout but not the visual design; tokens keep the prototype consistent
  without adding a dependency.
- Status: BESTÄTIGT

## D-006 `DEMO_MODE` is a constant for the validation build

- Bezug: SPEC N-11, Kap. 8.1
- Entscheid: `DEMO_MODE = true` in `src/app/core/konfiguration.ts`. The violet bar and the
  requirement markers render only when it is true.
- Grund: the validation build always shows the prototype controls; a productive build would flip the
  constant. No environment file is introduced for one flag.
- Status: ANNAHME

## D-007 Fixed graph geometry inside the allowed range

- Bezug: SPEC 8.2
- Entscheid: 180 px column width (allowed 150–196), 66 px row height, 44 px node circle, fixed
  stage width; the card scrolls horizontally and starts centred.
- Grund: a deterministic layout simplifies rendering and tests; the spec's clamp formula can be
  applied later without changing the data model.
- Status: ANNAHME

## D-008 Raise the per-component style budget to 6 kB

- Bezug: AGENTS.md definition of done (`ng build` without budget warnings)
- Entscheid: `anyComponentStyle.maximumWarning` is 6 kB (error stays 8 kB). The graph card needs
  5.66 kB of layout rules; splitting it would duplicate tokens.
- Grund: the warning threshold was below the legitimate size of the most complex component.
- Status: ANNAHME

## D-009 Fixtures are generated from the spec appendices

- Bezug: SPEC 7.4, T-V5, TF6c
- Entscheid: `tools/fixtures-aus-markdown.mjs` reads the appendices of `docs/spec/SPEC.md` and writes
  APP, PLA and MED template JSON to `public/vorlagen/` and `fixtures/`. Counts are checked against
  the control numbers (APP 5/25/145, PLA 6/33/177, MED 6/24/158).
- Grund: one source of truth for plan data; no hand-copied JSON that drifts from the spec.
- Status: BESTÄTIGT

## D-010 Template JSON import now, Excel import deferred

- Bezug: SPEC 7.2, 7.5 (T-I1, T-I3, T-I6), M6
- Entscheid: `ImportDienst` validates a `VorlageImport` JSON with a mandatory dry run and stores it
  through `VorlageRepository`. The browser Excel reader is not implemented because the `.xlsx`
  fixtures are not in the repository and `xlsx` is not installed.
- Grund: T-I3/T-I6 are testable with the JSON path; TF6/TF6b stay `skip` until the files exist
  (SPEC 10.3). Recorded in `backlog.md` and `open-questions.md`.
- Status: ANNAHME

## D-011 `strict` in the root tsconfig

- Bezug: AGENTS.md (TypeScript 6.0, strict)
- Entscheid: `"strict": true` is set in `tsconfig.json`; `tsconfig.spec.json` additionally includes
  `src/testing/**/*.ts` so the shared test harness is type-checked.
- Grund: the generated workspace did not enable `strict`; AGENTS.md requires it.
- Status: BESTÄTIGT

## D-012 Seed requests pick the next open level

- Bezug: SPEC Kap. 9, TF13
- Entscheid: the seed looks for a free learning objective one level below the requested target level
  and falls back to any objective below level 3. This replaced an exact-level search that produced
  console warnings for Nora and Sara.
- Grund: every seeded request must be valid (`Zielstufe` above the current level) so the demo shows
  the request flow without warnings.
- Status: ANNAHME

## D-013 Demo reset is available in every role

- Bezug: SPEC N-11, T-W6
- Entscheid: `DatenverwaltungDienst.zuruecksetzen()` skips the `ADMIN` check while `DEMO_MODE` is
  true. Export and import of a data set stay admin-only; only the seed reset is opened up.
- Grund: the violet prototype bar is visible to every role, and a facilitator running a session as a
  learner could otherwise not restore the seed state. The reset is a demo affordance, not a product
  feature.
- Status: ANNAHME

## D-014 Template versioning stops at "new version replaces active plan"

- Bezug: SPEC 6.3, T-I6, T-I7
- Entscheid: importing a template deactivates the previous version and stores a complete new tree.
  Learning objectives are **not** matched by code, removed objectives are not archived, existing
  apprenticeships keep their old `vorlageId`, and `TEXTVERWEIS` edges are not derived from module
  overlaps during import.
- Grund: a correct migration needs stable objective identities; with fresh UUIDs per import the
  append-only events would lose their target. The prototype demonstrates the import gate, the dry
  run and the version number; the migration belongs to the backend milestone. T-I6 is marked
  `partial`, T-I7 `partial`, and Q-011 asks for the product decision.
- Status: ANNAHME

## D-015 Sidebar modal without the CDK

- Bezug: SPEC 8.2, T-A1
- Entscheid: the node sidebar keeps `role="dialog" aria-modal="true"`, moves focus to the dialog on
  open, contains Tab inside the panel and returns focus to the triggering node on close. The rest of
  the page is not marked `inert` because `@angular/cdk` is not installed and the sidebar renders
  inside `<main>`; a screen reader can still browse the background.
- Grund: Tab containment and focus return cover the keyboard loop that the study session exercises,
  without adding a dependency for a prototype. A later move to `@angular/cdk` dialog (or
  `<dialog showModal()>`) would also make the background inert.
- Status: ANNAHME

## D-016 An empty learning-location list means "not taught in the Basislehrjahr"

- Bezug: SPEC 6.4 (Leistungsziel.lernorte), R-M1, N-05, E6
- Entscheid: the Bbc readiness only falls back to the competence's modules when a learning objective
  has **no** learning-location record (`lernorte: null`). If the record exists and names an empty
  `basislehrjahr` list, the objective counts as explicitly not taught in the Basislehrjahr and is
  excluded from the denominator. For MED this yields 126 of 158 objectives (122 explicit + 4
  inherited, 32 explicitly excluded), matching the fixture.
- Grund: MED carries module data per learning objective; an empty list there is a statement, not a
  gap. Falling back in that case inflated the denominator to 158 and made the readiness text wrong.
- Status: ANNAHME

## D-017 Duplicate objective codes only merge inside one competence

- Bezug: SPEC 7.5 (T-I4), `ImportDienst`, `VorlageSpeicherAdapter`
- Entscheid: the dry run warns when the same objective code appears twice in **one** competence with
  identical text (it is merged) and reports a `FEHLER` when the code appears in a second competence
  or with a different text. The adapter merges duplicates per competence, not across the whole
  template.
- Grund: a repeated code inside a competence is a copy-paste duplicate; the same code in two
  competences would attach one of them to the wrong parent, so the import must stop instead of
  silently dropping an objective.
- Status: ANNAHME

## D-018 Every component uses four files, never an inline template

- Bezug: project convention (AGENTS.md), all components under `src/app`, `tools/pruefe-komponenten.mjs`
- Entscheid: every Angular component consists of `<name>.ts`, `<name>.html`, `<name>.scss` and
  `<name>.spec.ts`. The decorator always uses `templateUrl` and `styleUrl` with relative paths; inline
  `template:` or `styles:` is not allowed, also for small presentational components. The npm script
  `check:components` fails the build gate when a component misses one of the four files or embeds its
  template.
- Grund: the course requires a uniform, reviewable four-file structure per component. This
  deliberately deviates from the official Angular guidance ("prefer inline templates for small
  components"): the official guidance otherwise still wins.
- Status: BESTÄTIGT

## D-019 Bildungsplan export as a standalone Node script

- Bezug: SPEC 7.2/7.3, D-010, Q-002, Q-016, Q-017
- Entscheid: the APP/PLA/EdB workbooks are converted by `tools/bildungsplan-import.mjs` with the
  hand-written ZIP/XML reader `tools/xlsx-lesen.mjs`, without adding an XLSX or PDF dependency. The
  generated `VorlageImport` JSONs live in `fixtures/bildungsplaene/`, are validated against
  `docs/import/bildungsplan.schema.json`, and are **not** wired into `public/vorlagen/`, the seed or
  the in-browser import yet. The MED PDF is not parsed automatically; its JSON is the cleaned
  transcription from SPEC Appendix C, verified against the extracted PDF text. Word syllable
  hyphenation is cleaned heuristically; a small prefix list protects compounds such as
  `nicht-funktional`, while space-split artefacts are left untouched and documented.
- Grund: this keeps the runtime import deferred (D-010) and avoids an unreviewed dependency, while
  still producing reproducible, reviewable data and a schema another tool or AI can target.
- Status: BESTÄTIGT
