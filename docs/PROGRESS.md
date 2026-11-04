# Progress

Last updated: 2026-11-04

## Current phase

MVP complete through M5. The validation build now starts with preloaded mock data for four learner
accounts (APP, PLA, MED and PiBS) and keeps the practice-trainer role behind a hidden mock login
(D-021, D-022, Q-018). M6 (admin route and file upload) was removed; M7 is in progress (Playwright and
the remaining accessibility polish). The spec in [`spec/SPEC.md`](spec/SPEC.md) is still the source of
truth.

## Milestones

| Milestone | Title                        | Status      | Evidence                                                                                               |
| --------- | ---------------------------- | ----------- | ------------------------------------------------------------------------------------------------------ |
| M0        | Gerüst                       | mostly done | Angular 22 workspace, `packages/regeln`, `packages/vertraege`, Prettier; ESLint and Playwright open    |
| M1        | Regelmodul                   | done        | `packages/regeln/src/*`, 21 rule tests (TF1–TF3c, TF7, TF10–TF12, TF16–TF19, R-B4, R-M1)               |
| M2        | Daten                        | done        | contracts, ports, IndexedDB + in-memory adapters, fixtures APP/PLA/MED/PiBS, seed, export/import/reset |
| M3        | Anwendungsdienste und Rechte | done        | `src/app/dienste/`, service and seed tests (TF4, TF5, TF8, TF13–TF15, TF20, TF21, D-013, D-021)        |
| M4        | UI Lernende                  | done        | login, skilltree graph, sidebar, requests, history, badges, “Meine Daten”, demo bar                    |
| M5        | UI Praxisbildner/in          | done        | coach overview, requests, confirm/withdraw, milestone confirmation                                     |
| M6        | Import/Upload                | removed     | admin route, Excel/PDF and template-JSON upload deleted; seed covers all four plans (D-021)            |
| M7        | Feinschliff                  | in progress | tokens, dark mode, a11y review fixes; axe run and Playwright still open                                |

## Task status

| Task ID      | Title                                                                | Requirements                                          | Feature folder              | Status  | Notes                                                                         |
| ------------ | -------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------- | ------- | ----------------------------------------------------------------------------- |
| setup-agents | Split the agent bundle into OpenCode agents, commands and role docs  | —                                                     | `.opencode/`, `docs/agents` | done    | `.opencode/`, `docs/agents/`, `docs/AGENT-SETUP.md`                           |
| rules-core   | Stages, progress, traffic light, plan index, milestones, badges      | R-S1–R-S6, R-F1–R-F6, R-M1–R-M3, R-B1–R-B8, R-T1–R-T4 | `packages/regeln`           | done    | 21 tests                                                                      |
| contracts    | DTOs, commands, results, error codes, German labels                  | SPEC Kap. 6                                           | `packages/vertraege`        | done    | `@skilltree/vertraege`                                                        |
| fixtures     | Generate APP/PLA/MED template JSON from the spec appendices          | SPEC 7.4, T-V5                                        | `tools/`, `public/vorlagen` | done    | counts 5/25/145, 6/33/177, 6/24/158                                           |
| data-layer   | Ports, IndexedDB adapter, per-port adapters, session store, seed     | SPEC 0.7, N-12, Kap. 9                                | `src/app/daten`             | done    | deterministic seed, 4 plans, 4 visible learner accounts                       |
| app-services | Access rules, session, skilltree, confirmation, requests, milestones | SPEC 10.2 (TF4, TF5, TF8, TF13–TF15, TF20, TF21)      | `src/app/dienste`           | done    | `Zugriff`, `SitzungDienst`, `SkilltreeDienst`, …                              |
| mock-data    | Preloaded seed, four learner accounts, hidden trainer login          | N-10, N-11, D-021, D-022                              | `src/app/daten/lokal`       | done    | APP/PLA/MED/PiBS with events, requests, history, badges                       |
| learner-ui   | Skilltree graph, sidebar, request form, history, badges              | S-A01–S-A08, S-Q01                                    | `src/app/skilltree`         | done    | keyboard focus, tooltips, mobile horizontal scroll                            |
| rewards      | Larger responsive tree and per-area reward board below the graph     | S-A02, S-A03, S-A07, R-B3, N-04, D-024                | `src/app/skilltree`         | done    | 150–284 px columns, badge + competence counts per Ast; board removed by D-028 |
| graph-ux     | Orthogonal edge lanes, node states and mouse panning in the tree     | S-A02, S-A03, R-E1, R-T2, D-026                       | `src/app/skilltree`         | done    | lanes, ✓/▶/… badges, drag-to-pan, focusable card                              |
| graph-layout | Taller rows and a three-level node language in the tree              | S-A02, S-A03, S-A04, R-E1, D-027                      | `src/app/skilltree`         | done    | 84 px rows, filled/dashed/quiet states                                        |
| tree-focus   | Remove the milestone/reward board so the tree carries the page       | S-A01, S-A03, S-A07, R-B3, N-04, D-028                | `src/app/skilltree`         | done    | board deleted, area reward opens in the sidebar                               |
| coach-ui     | Overview table, request cards, direct confirmation, milestones       | S-L01–S-L06                                           | `src/app/uebersicht`        | done    | sortable table, inline forms, “Im Baum zeigen”                                |
| demo-bar     | Violet prototype control bar and requirement markers                 | N-11                                                  | `src/app/demo-steuerung`    | done    | `DEMO_MODE` constant (D-006)                                                  |
| admin-data   | Admin route, template import and JSON restore UI                     | T-I1, T-I3, T-I4, T-I6, T-W6, TF6c                    | —                           | removed | Deleted by D-021; reset stays in the demo bar                                 |
| e2e          | Playwright learner and coach flows plus axe                          | SPEC 10.4, T-A1                                       | `e2e/`                      | todo    | Playwright not installed                                                      |
| lint         | `angular-eslint` clean run                                           | T-W5                                                  | —                           | todo    | not installed; gate is build, tests and Prettier                              |

Status values: `todo`, `in-progress`, `blocked`, `done`, `removed` (intentionally dropped, D-021).

## Verification

- `npx ng build` — green, no budget warnings. Initial bundle ≈ 311 kB raw / 84 kB transfer.
- `npx ng test --no-watch` — green, 121 tests in 24 files (rules, services/seed, app shell,
  per-component and per-page tests).
- `npx prettier --check .` — green.
- `npm run check:components` — green (four-file rule, no inline templates, D-018).
- `ng lint` — not available (no `angular-eslint`).

## Component structure (D-018, D-020)

Every Angular component ships as four files (`.ts`, `.html`, `.scss`, `.spec.ts`) inside its own
folder named after the component. The 17 components that previously shared a feature folder were
moved to `skilltree/<name>/`, `uebersicht/<name>/`, `anmeldung/<name>/`,
`meine-daten/<name>/`, `demo-steuerung/<name>/` and `shared/ui/<name>/`; the former `admin/<name>/`
folder was deleted with the upload route (D-021). All relative imports,
route imports and test imports were updated. The bootstrap root component stays at
`src/app/app.ts` with its four files, because `src/app` is already its named folder and the Angular
schematic generates it there. The 17 components that still carried an inline template were split
earlier; components without styles received an empty component stylesheet so the structure is
uniform. The test-only router stub was replaced by a wildcard route with `children: []`, so no test
component lives outside the rule. New per-component tests were added for the remaining components,
and the former shared `seiten.spec.ts` was split into one spec per page. `npm run check:components`
fails the gate if a component misses a file, embeds a `template:`/`styles:` block, or is not in a
folder named after it.

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

## Validation-build change: no upload, learner accounts (2026-11-04)

- Removed the whole admin route (`src/app/admin`), its guard/nav entry, `ImportDienst` and the
  template dry-run/import tests. The demo bar still resets the seed (`DatenverwaltungDienst` keeps
  export/import at service level for T-W6).
- The seed now has one learner per MVP profession: Nora Frei (Applikationsentwicklerin), Luca Meier
  (Plattformentwickler) and Sara Huber (Mediamatikerin), plus Mia Keller (PiBS-Studentin, D-022).
  Each learner has an active training; the start page still handles a missing training and is tested
  by removing the training in the test store.
- All four learners already have stage events, an open request, history and badge grants from the
  seed; no upload or setup step is required. PiBS is binary and only stores completed objectives.
- The IndexedDB name is `skilltree-prototyp-v3` (D-022); a browser that still holds older accounts
  reseeds itself once. Since D-023 the `meta` store also records `SEED_VERSION`, so an interrupted or
  outdated seed is replaced on the next start without another database-name bump.
- The login page shows only the four learners. Practice-trainer accounts stay in the seed behind a
  collapsed "Prototyp-Zugang Praxisbildner/in" panel and in the violet prototype switcher; the admin
  account is hidden from both and kept only for data-management tests. See D-021 and Q-018 for the
  still-open question of manual vs automated trainer confirmations.
- Tests updated: login page (4 cards, hidden trainer panel), demo bar (no admin option), seed
  coverage (4 learners, 4 professions/plans, events present) and the MED readiness test now reads the
  seeded plan directly instead of importing a template.

## Grösserer Skilltree und Belohnungen pro Ast (2026-11-04)

- Human request: the tree should be a bit larger so wide screens show more of it, and it should feel
  more game-like by showing the badge of each finished Ast plus the competences that are levelled
  (D-024).
- Wide column: only the skill-tree route opts in with `data: { breite: 'breit' }`; the shell applies
  `.app-inhalt--breit` (`--max-breite-breit: 1720px`). Coach overview, login and «Meine Daten» keep
  the 1280 px column.
- Graph: `baum-geometrie.ts` holds `SPALTEN_REFERENZ = 196`, `SPALTEN_MIN = 150`, `SPALTEN_MAX = 284`;
  `spaltenbreite` = clamp(150, (Kartenbreite − 16) / Äste, 284), `baumSkala` = max(1, Spalte / 196).
  A `ResizeObserver` on the card feeds `--spalte` and `--skala`; circles, row height, fonts and edge
  offsets scale with them, and the card still scrolls horizontally below 150 px per Ast. The node
  button is now placed at `punkt.x − radius`, which removes a 20 px horizontal offset and puts the
  ring centre exactly on the SVG edge endpoint.
- Rewards: `belohnungen.ts` maps the existing `BEREICH_ABGESCHLOSSEN` badges (R-B3) to their area and
  collects the competences with «erreicht / gesamt» on the top level. The new four-file component
  `belohnungen-uebersicht` below the graph shows one card per Ast with the badge, its progress, award
  date or inactivity, the skill list with mini bars and «Im Baum zeigen». The area sidebar shows the
  same badge plus the same per-competence counts. Everything is derived from the stage events; no
  rule, stored field or event was added. With `badges.ausgeblendet` the board and the sidebar block
  show a note instead of badge content (N-04).
- Copy and mobile: the competence count uses a singular form («Die Kompetenz ist abgeschlossen»), and
  the two-line title clamp only applies above 620 px so narrow screens show full competence titles.
- `anyComponentStyle.maximumWarning` rises from 6 kB to 7 kB (error stays 8 kB), because the graph
  stylesheet now holds the scale rules (6.7 kB).
- Tests: `baum-geometrie.spec.ts` and `belohnungen.spec.ts` cover the pure rules; the graph spec
  covers the reference fallback, the page spec the board wiring, the sidebar spec the reward block
  and the level counts, and the board has its own component spec. Verified in headless Chrome at
  1920×1200 (content 1720 px, column ≈ 278 px, scale 1.42 for the PLA tree, ring centres on the edge
  endpoints) and at 390×900; the coach overview is unchanged at 1280 px.

## Reduzierte Badge-Regeln und Fortschritt (2026-11-04)

- Human request: fewer badges — milestones of the primary nodes, one badge per completed
  Handlungskompetenzbereich, 5/10/15 competences per stage and one all-competences badge; learners
  must see how close the next badge is (D-025).
- Contracts: `BadgeRegeltyp` is now `MEILENSTEIN_ERREICHT | BEREICH_ABGESCHLOSSEN |
KOMPETENZ_ANZAHL | ALLE_KOMPETENZEN`, with `parameter.stufe`, `parameter.anzahl` and
  `parameter.meilenstein`. `MeilensteinErgebnis` now returns `neueBadges`/`inaktiveBadges`.
  `meilensteinTexteFuer(code, modell)` maps `IPA`→«Bachelorarbeit» and `LAP`→«Bachelorabschluss» for
  the binary PiBS plan while the stored codes stay `IPA`/`LAP`.
- Rules (`packages/regeln/src/badges.ts`): definitions are generated as `M-<code>`, `BA-<code>`,
  `K<stufe>-<anzahl>` and `K-ALLE`; 5/10/15 are only generated when the plan has that many
  competences. Badge replay merges stage and milestone events chronologically, so a milestone badge
  becomes inactive when its milestone is withdrawn. `istAktuellesBadgeSet` replaces stored old sets.
- Services: stage confirmations and milestone confirmations/withdrawals share
  `ermittleBadgeAenderungen` (`badge-vergabe.ts`), which computes the difference and the new grants.
  Both write the grants and mention new/inactive badges in the confirmation message; both load
  milestone events for the replay. `SEED_VERSION` is 2 and the seed passes milestone events into the
  badge replay.
- UI: `badge-karte` shows a progress bar for open and inactive badges and uses angular medals for
  milestones and areas. The Badges tab shows «X von Y Badges erhalten» with a progress bar. The
  reward board groups milestone badges, the 5/10/15 stage badges and the all-competences badge, each
  as a badge card with progress, plus the existing per-Ast cards. Graph and sidebar use the
  model-aware milestone labels and PiBS descriptions.
- Requirements covered: R-B1/R-B2 (removed, superseded), R-B3, R-B4, R-B5, R-B8, R-B9, R-B10,
  R-M2, R-M3, S-A07, N-04, D-025.
- Tests: `regeln.spec.ts` covers milestone awards/reversals, the 5/10/15 thresholds, all-competences
  and the omission of unreachable thresholds; `dienste.spec.ts` covers the milestone badge appearing
  and being withdrawn through the service; `belohnungen.spec.ts` and the two component specs cover
  the new groups, progress bars and counters.
- Review pass (`a11y-reviewer`, `code-reviewer`) and fixes: the progress track has a 3:1 border
  (WCAG 1.4.11) and inactive cards no longer use `opacity` (text fell below 4.5:1); open cards show
  a visible «Noch offen» status; the Ast list is a labelled section with `h3`→`h4`→`h5` headings and
  the badge grid shrinks below 17rem; count badges read «x von y nötigen Kompetenzen» so the
  threshold is not mistaken for the plan size, and milestone writes report both new and inactive
  badges. New tests pin competence-vs-objective counting, `gesamt` = threshold, and replay of
  out-of-order event arrays.
- Suite: 126 tests / 25 files green, `ng build`, `npx prettier --check .` (for the badge files) and
  `npm run check:components` green.

## Kantenführung, Knotenzustände und Ziehen im Baum (2026-11-04)

- Human request: no edge may run under another node (especially at the start and end of the tree),
  completed / can be completed / cannot yet be completed nodes must be more distinct, and the tree
  must be draggable with the mouse instead of using the scrollbar (D-026).
- Routing: the cubic beziers are replaced by rounded orthogonal routes in `baum-geometrie.ts`
  (`rundeKanten`, `pfadFolge`, `pfadBbcAst`, `pfadAstIpa`, `pfadVerweis`). Every milestone and cross
  edge travels on a free lane: above the top row (`ipaY + 36·s`), between the bottom row and the
  area row (`untersteZeile + 33·s`) and between the area row and Bbc (`astBasisY + 52·s`; Bbc moves
  down to `astBasisY + 96·s`). `VERWEIS` edges stay on the row boundary for one-row jumps and use
  the outer lane plus the 8 px column gutter for longer jumps. Corner radius 8·s, clearance 11·s.
- States: `knoten-zustand.ts` derives `ABGESCHLOSSEN` / `NAECHSTER` / `SPAETER` from the existing
  view data (all objectives confirmed, `istNaechster`, otherwise). Each node carries a corner badge
  ✓ / ▶ / … and the next node an accent outline; the tooltip and accessible name repeat the state.
  No rule, event or lock was added (R-E1). The legend reuses the node badge classes.
- Panning: a mouse/pen drag on the card scrolls it horizontally. A 5 px threshold keeps normal
  clicks working, a real drag captures the pointer and suppresses the following click, touch keeps
  native scrolling. The card is focusable (`tabindex="0"`, `role="group"`, aria-label), so arrow
  keys scroll. The initial centring now uses the measured stage width instead of `scrollWidth`,
  because invisible tooltips extended the scroll area and started narrow screens at the right edge
  of the tree. The stylesheet budget rises from 7 kB to 8 kB (error 9 kB).
- Requirements covered: S-A02, S-A03, R-E1 (visual guidance only), R-T2 (cross edges), D-026.
- Tests: `baum-geometrie.spec.ts` covers the rounded corners, the four route types and the lane
  clearances; `knoten-zustand.spec.ts` the three states; the graph spec covers the state
  classes/glyphs, the absence of horizontal edges through node rows, the reference fallback and the
  pan/click-suppression behaviour.
- Verified in headless Chrome at 1920×1200: the IPA lane and the Bbc fan run outside all rings and
  titles, the a1→g1 cross edge travels in the row boundary, the 25 APP nodes show 5 ✓ / 5 ▶ / 15 …,
  and the footer legend shows ✓ / ▶ / … next to the traffic-light legend. At 820 px the card pans
  from 0 to its end without opening a node, and a plain click still opens the sidebar. At 390×900
  the tree is centred, native touch scrolling stays active and the hint names dragging and the
  arrow keys.

## Grössere Zeilen und klarere Knotenzustände im Baum (2026-11-04)

- Human request: the tree should be taller so the nodes are not so close together, and completed,
  «to be completed» and «not yet available» nodes must be distinguishable at a glance inside the
  tree (D-027).
- Height: `ZEILENABSTAND` rises from 66 to 84 px; the node button uses the layout value `--zeile`
  and the request/state badges are children of the ring, so they follow the ring if the row height
  changes. The top and bottom lanes now sit on the row edges (`zeilenabstand/2`), which keeps their
  clearance to three-line titles independent of the row height. On the 25-node APP plan the card
  grows by about 180 px at 1920 px width.
- States: `ABGESCHLOSSEN` is a solid green disc (green inner disc, white code and a ✓ badge with a
  surface ring); `NAECHSTER` keeps the S-A04 dashed frame but draws it `3·s` thick and accent
  coloured, with an accent code and a solid accent ▶ badge; `SPAETER` keeps the traffic-light ring
  but has a grey inner disc, a muted code and the grey … badge. The badges grow from 1.15 to
  1.3 rem.
- The traffic light (ring fill and colour) is unchanged and no node is blocked (R-E1). The deviation
  from SPEC 8.2's 66 px and from S-A03/S-A04's marker restriction is recorded as Q-024; the state
  semantics stay in Q-023.
- Requirements covered: S-A02, S-A03, S-A04, R-E1, D-027 (extends D-024/D-026).
- Tests: the fallback test pins `--zeile: 84px`; a new test pins that the state badge lives inside
  the ring; the lane test computes node centres from the row height; the adjacent-row cross-edge
  test uses `ZEILENABSTAND` instead of a hard-coded 66. 127 tests in 25 files green.
- Verified in headless Chrome at 1920×1200: the rows are clearly separated, the 25 APP nodes still
  show 5 ✓ / 5 ▶ / 15 …, the filled discs, dashed next frames and quiet later discs can be read
  across the tree, the legend badges match, and the IPA/Bbc lanes stay clear. At 390×900 the taller
  rows stay legible, the tree is centred and touch scrolling is unchanged.

## Baum als Seite: Belohnungsübersicht entfernt (2026-11-04)

- Human request: the milestone cards and the per-area reward board below the tree distract from the
  tree; the skill tree should be the page and carry the relevant information itself (D-028).
- Removed: the `belohnungen-uebersicht` component (template, styles, component and test) and its slot
  in `skilltree-seite`; the board-only helpers `belohnungsFortschritt` and `anteilProzent` are gone
  with it. The page now renders the header, the tree, the sidebar and the Badges tab.
- Kept: the Bbc/IPA/LAP hexagons remain the tree's milestones (S-A03), and the area sidebar still
  shows the area's `BEREICH_ABGESCHLOSSEN` reward with the concrete competences and their
  «erreicht / gesamt» counts; `badges.ausgeblendet` hides that block (N-04). Milestone badges remain
  in the Badges tab (S-A07). `belohnungen.ts` stays because the sidebar derives its reward from it.
- Requirements covered: S-A01, S-A03, S-A07, R-B3, N-04, D-028 (supersedes the board part of D-024).
- Tests: the page test asserts that neither `st-belohnungen-uebersicht` nor `.belohnungen` renders and
  that clicking an area opens the sidebar with «Belohnung für diesen Ast»; the board's component test
  and the two helper tests are removed with the board (121 tests in 24 files green).

## Decisions awaiting the human

- Q-001: npm vs pnpm (spec names pnpm).
- Q-006: `fake-indexeddb` for the second TF21 run.
- Q-018: keep trainer confirmations manual (hidden mock login) or automate them, possibly with a
  backend?
- Q-003–Q-005, Q-007–Q-017: assumptions recorded in
  [`spec/open-questions.md`](spec/open-questions.md) and
  [`architecture/DECISIONS.md`](architecture/DECISIONS.md); confirm or correct them. Q-002 and Q-007
  are obsolete because the upload/admin route was removed (D-021).
- Q-020: confirm the 284 px column cap (above the spec's 196 px); the reward board below the tree was
  removed on the human's request (D-028), the per-area reward stays in the area sidebar.
- Q-021: confirm the reduced badge set and that 5/10/15 are counted per stage, with unreachable
  thresholds omitted (D-025, supersedes R-B1/R-B2/R-B4).
- Q-022: confirm the PiBS milestone labels «Bachelorarbeit»/«Bachelorabschluss» for the stored
  `IPA`/`LAP` codes (D-025).
- Q-023: confirm the three derived node states (`ABGESCHLOSSEN` / `NAECHSTER` / `SPAETER`) as
  guidance only, without locking nodes (D-026).
- Q-024: confirm the taller 84 px rows and the stronger state styling (filled/dashed/quiet) as a
  presentation deviation from SPEC 8.2, S-A03 and S-A04 (D-027).

## Follow-ups

- Decide Q-018 (manual vs automated trainer confirmations); automation likely needs a backend.
- Add `angular-eslint` and fix the first lint run.
- Add Playwright with the two flows from SPEC 10.4 and an axe check per view.
- Move the node sidebar to `@angular/cdk` (or `<dialog showModal()>`) so the background becomes
  `inert` (D-015).
- Template versioning: code-based objective migration, archiving and cross edges (D-014, Q-011).
- The violet demo bar overflows a 390 px viewport by ~35 px (its account `<select>` keeps a fixed
  width). Pre-existing, unrelated to the tree; fix with a wrapping or full-width field at mobile
  widths.
- Run `/review-feature` with `a11y-reviewer`, `code-reviewer` and `performance-auditor` before the
  next test-participant session.
- Badge definitions: the "stored set is current, otherwise regenerate" block is duplicated in three
  services and a regenerated set is never written back, so the definition store can stay stale
  (`istAktuellesBadgeSet` only checks for one milestone rule). Extract one helper and persist the
  replacement, or drop the definition store (review finding D-025).
- Hidden tooltips extend the card's scroll area, so the tree can be panned a little into the empty
  area right of the last column. Flip the last column's tooltip to the left or clip it at the stage
  edge (D-026).

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

## Fix: PiBS start page showed «Kein Lehrberuf zugeordnet» (2026-11-04)

- Root cause: `DatenbestandSpeicherAdapter.initialisieren()` only seeded when the `benutzer` store was
  empty. A browser that had already created `skilltree-prototyp-v3` in an earlier PiBS iteration (or
  whose first seed was interrupted) kept a data set in which Mia existed without `az-mia`. Reproduced
  in headless Edge against the real IndexedDB; a fresh database always seeded correctly.
- Fix: the `meta` store records `SEED_VERSION` (D-023) and is written only after a complete seed, so a
  missing or outdated marker triggers a reseed. `IndexedDbSpeicher` opens the database at version 2
  and closes stale connections on `versionchange`. `DatenbestandSpeicherAdapter.importieren()` writes
  the marker as well, so an explicit import survives a reload.
- Regression test: `src/app/daten/lokal/speicher-adapter.spec.ts` covers the empty store, an
  incomplete store without a marker, an outdated marker and an intact current data set. Verified end
  to end in headless Edge: an old version-1 database without `meta` and without `az-mia` was upgraded,
  reseeded, and Mia's PiBS skilltree opened (35 %, 15 badges).
