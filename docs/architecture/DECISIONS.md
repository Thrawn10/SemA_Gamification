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
- Hinweis: im Validierungsbuild durch D-021 abgelöst — Admin-Route und `ImportDienst` wurden
  entfernt.
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
- Hinweis: die Regel bleibt im Adapter (`VorlageSpeicherAdapter`) erhalten, auch nachdem D-021 den
  `ImportDienst` und die Admin-Route entfernt hat.
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

## D-020 One folder per component, folders by subject not by type

- Bezug: SPEC 0.8 ("Ordner nach Fachthema, nicht nach Typ"), AGENTS.md conventions, D-018,
  `tools/pruefe-komponenten.mjs`
- Entscheid: every Angular component lives in its own folder named after the component
  (`<feature>/<name>/<name>.ts`, `.html`, `.scss`, `.spec.ts`; shared components under
  `shared/ui/<name>/`). Several components never share a feature folder. Folders follow the subject
  (feature or component), not the file type, so there are no `components/`, `pages/` or `services/`
  directories. The bootstrap root component stays at `src/app/app.ts` with its four files, because
  `src/app` is already its named folder and Angular's schematic generates it there.
  `npm run check:components` fails the gate when a component's parent folder name differs from the
  component name.
- Grund: the feature folders had accumulated several components in one directory, which made the
  four-file rule hard to see and imports ambiguous. A folder per component keeps the local context
  (template, styles, test) together, matches the schematic naming, and stays consistent with the
  spec's subject-based folder rule.
- Status: BESTÄTIGT

## D-021 Validation build: preloaded seed, three learner accounts, hidden trainer login

- Bezug: SPEC N-10, N-11, S-L01–S-L06, T-I1–T-I4, T-W6
- Entscheid: the validation build ships no admin route and no in-browser Excel/PDF or template-JSON
  import. The seed already contains the APP, PLA and MED plans plus one learner per profession
  (Nora/Applikationsentwicklung, Luca/Plattformentwicklung, Sara/Media), so every account has a
  populated skilltree without any upload step. The login page lists exactly those three learner
  accounts. The practice-trainer accounts stay in the seed and remain reachable through a collapsed
  "Prototyp-Zugang Praxisbildner/in" panel on the login page and through the violet prototype bar,
  so the coach view (S-L01–S-L06) can still be demonstrated. The admin account is kept for the
  data-management service tests, but it has no route and is hidden from the prototype switcher.
  Whether trainer confirmations are entered by a facilitator or automated (which may need a backend)
  is explicitly undecided (Q-018).
- Hinweis: D-022 erweitert den Seed auf vier Lernende und fügt das PiBS-Studium als vierten Plan
  hinzu.
- Grund: test participants only exercise the learner flow; a visible trainer login would invite them
  into the wrong role, and the original template upload was a setup step that added no value once the
  seed was fixed. Keeping the hidden trainer login preserves the confirmation demo without committing
  to an automation strategy.
- Status: ANNAHME

## D-022 PiBS as a fourth plan with a binary stage model

- Bezug: `DeveloperFindings.md` point 3, SPEC N-10, N-13, R-S1, R-B5, Q-019
- Entscheid: the validation build ships a fourth plan `INF-PIBS` (Praxisintegriertes Bachelor-Studium
  Informatik, FFHS) and one learner (Mia), so test participants see a plan that is not an
  apprenticeship. A plan and its Lehrberuf carry `stufenmodell: 'DREI_STUFEN' | 'BINAER'`. PiBS is
  binary: an objective is either open or completed (`ABSCHLUSS_STUFE = 3`), a request targets stage 3
  only, the confirmation UI offers only stage 3, progress, traffic light and badges use
  «offen»/«abgeschlossen», and the seeded events contain only `BESTAETIGT` at stage 3.
  `stufenmodellFuer`/`normalisiereStufenmodell` fall back to `DREI_STUFEN` for stored plans without
  the field, so APP/PLA/MED keep working. The plan reuses the existing rules, services and UI; only
  the stage labels and the allowed confirmation levels are model-dependent.
- Grund: the PiBS study model has no cumulative apprenticeship levels, so mapping it onto
  «erklärt/geübt/selbständig» would invent competence levels the study regulations do not define.
  A per-plan model keeps the rules module pure and avoids a second data path.
- Hinweis: apprenticeship concepts that PiBS does not use (Lehrjahr, Bbc/IPA/Lehrabschluss, the
  Basislehrjahr fallback text) are still shown; see Q-019.
- Status: ANNAHME

## D-023 Seed version marker in the `meta` store

- Bezug: D-002, D-021, D-022, SPEC N-12, T-W6
- Entscheid: `DatenbestandSpeicherAdapter.initialisieren()` writes the deterministic seed when the
  `benutzer` store is empty, when `meta/seed.version` differs from `SEED_VERSION`, or when the marker
  is missing. The marker is written **after** `datenbestandSetzen` completes, so an interrupted seed
  has no marker and is rebuilt on the next start. `IndexedDbSpeicher` opens the database at version 2
  and creates the new `meta` store in `onupgradeneeded`; `onversionchange` closes stale connections so
  an older tab cannot block the upgrade. `DatenbestandSpeicherAdapter.importieren` also writes the
  marker, so an explicit import is not replaced on the next start. The marker is not part of
  `DatenbestandJson` and is not exported.
- Grund: the `skilltree-prototyp-v3` database name was a one-off reseed switch. Browsers that had
  already created a v3 database from an earlier iteration (or whose first seed was interrupted) kept
  an incomplete data set; concretely Mia existed without `az-mia`, so the start page showed «Noch kein
  Lehrberuf zugeordnet» forever. A version marker makes seed changes explicit, heals partial writes
  without heuristics about data completeness, and replaces the manual database-name bump.
- Status: BESTÄTIGT

## D-024 Larger, responsive skill tree plus per-area reward board

- Bezug: SPEC 8.2, 8.3, R-B3, N-04, human request 2026-11-04, supersedes D-007, extends D-008
- Entscheid: the skill-tree route opts into a wider content column with route
  `data: { breite: 'breit' }`; the shell maps it to `.app-inhalt--breit` with the token
  `--max-breite-breit: 1720px`. All other routes keep `--max-breite: 1280px`, so tables and forms stay
  readable. The graph measures its card with a `ResizeObserver` and derives the column width as
  `spaltenbreite(breite, aeste) = clamp(150, (breite − 16) / aeste, 284)`; without a measurement it
  falls back to the 196 px reference. `baumSkala(spalte) = max(1, spalte / 196)` scales circle
  radius, row height, font sizes and edge offsets through the `--skala` and `--spalte` custom
  properties; below the measured minimum the card scrolls horizontally as before. The node button is
  positioned at `punkt.x − radius`, so the ring centre sits exactly on the SVG edge endpoint (the old
  offset was 20 px off at every scale). Below the graph a new presentational component
  `belohnungen-uebersicht` shows one card per area with the existing `BEREICH_ABGESCHLOSSEN` badge
  (R-B3), its progress, award date or inactivity, and the concrete competences of that area with
  «erreicht / gesamt» on the top level plus a mini bar. The area sidebar shows the same badge and the
  same per-competence counts. Everything is derived from the stage events by the pure helpers in
  `belohnungen.ts`; no badge definition, no event and no stored field is added. Only
  `BEREICH_ABGESCHLOSSEN` is presented as an area reward; `BEREICH_GESTARTET` stays in the Badges tab.
  When `badges.ausgeblendet` is set, the board and the sidebar block hide their badge content and
  show a note instead (N-04).
- Grund: test participants asked for a tree they can read on a large screen and for a more
  game-like sense of progress. The spec's 150–196 px range was chosen for the 1280 px column, so the
  upper bound is deliberately raised to 284 px for the wide column only; below 196 px the layout is
  unchanged. Reusing R-B3 keeps the reward board free of new business rules, and a derived-only
  component keeps the «compute, never store» constraint.
- Hinweis: `anyComponentStyle.maximumWarning` rises from 6 kB to 7 kB (error stays 8 kB), because the
  graph stylesheet holds the scale rules and measures 6.7 kB. The 284 px cap and the board layout are
  an assumption; the request for a larger tree itself is confirmed by the human.
- Status: ANNAHME

## D-025 Reduced badge set with milestone, stage-count and all-competences badges

- Bezug: SPEC §5.4 (R-B1–R-B8), S-A07, N-04, human request 2026-11-04, supersedes R-B1/R-B2/R-B4,
  extends D-024
- Entscheid: the generated badge set is reduced to four rule types. (1) `MEILENSTEIN_ERREICHT`
  creates one badge per primary milestone (`M-BBC`, `M-IPA`, `M-LAP`); it is fulfilled while the
  corresponding milestone has an active `ERREICHT` event, so milestone events are merged
  chronologically with stage events during every badge replay. (2)
  `BEREICH_ABGESCHLOSSEN` stays exactly as before: every objective of the area at the top level
  (`BA-<code>`). (3) `KOMPETENZ_ANZAHL` creates three badges per stage (5, 10 and 15 competences,
  `K<stufe>-<anzahl>`); a competence counts when it has objectives and all of them are at least that
  stage. Thresholds above the plan's competence count are not generated, so a badge is never
  unreachable by construction. The binary model (PiBS) has only stage 3. (4) `ALLE_KOMPETENZEN`
  creates one `K-ALLE` badge when every competence is at the top level.
  `BEREICH_GESTARTET` and `KOMPETENZ_SELBSTAENDIG` are no longer generated; old stored definition
  sets are recognised with `istAktuellesBadgeSet` and replaced by freshly generated definitions.
  `SEED_VERSION` rises to 2 so existing browsers reseed. The milestone badges for PiBS keep the
  codes `IPA`/`LAP` but use the labels «Bachelorarbeit»/«Bachelorabschluss»
  (`meilensteinTexteFuer`), because the binary study plan has neither an IPA nor an apprenticeship
  qualification; graph, sidebar and readiness text use the same helper.
- Grund: test participants should feel rewarded by a small, legible set of goals instead of dozens
  of per-competence badges, and every badge must show visible progress. Counting 5/10/15 per stage
  keeps the same threshold for each stage, matching the human's «of the same category» wording. The
  milestone badge is derived from the existing append-only milestone events, so it obeys the
  «compute, never store» constraint.
- Hinweis: badge progress and the reward board read `BadgeAnsicht` and add no rule. Confirming or
  withdrawing a milestone now returns `neueBadges`/`inaktiveBadges` and recomputes the stored grants
  through the same `ermittleBadgeAenderungen` helper as stage confirmations. Per-area badges appear
  both on the reward board and in the Badges tab; the deliberate duplication is presentation only.
  The PiBS «Basisphase» wording for `BBC` is an assumption because the spec only names the
  Basislehrjahr.
- Status: ANNAHME

## D-026 Orthogonal edge lanes, derived node states and mouse panning

- Bezug: SPEC 8.2, 8.3, R-E1, R-T2, human request 2026-11-04, extends D-024
- Entscheid: the graph routes every non-trivial edge with rounded orthogonal segments on reserved
  free lanes instead of cubic beziers. `baum-geometrie.ts` exports `rundeKanten` plus `pfadFolge`,
  `pfadBbcAst`, `pfadAstIpa` and `pfadVerweis`; the corner radius is `ECKEN_RADIUS = 8·s`, the
  clearance between a lane and a ring/title is `KANTEN_ABSTAND = 11·s`, where `s` is the `--skala`
  scale from D-024. Lanes: top competences → IPA at `ipaY + 36·s` (above the top row), Bbc → area at
  `astBasisY + 52·s` (between the area row and the Bbc hexagon, which moves down to
  `astBasisY + 96·s`), lowest cross edge at `untersteZeile + 33·s`. `FOLGE` edges and `IPA → LAP`
  stay straight vertical. A `VERWEIS` edge (R-T2) uses the boundary lane when both competences share
  a row or are one row apart; longer jumps use the outer lane (`oben`/`unten`) and the 8 px gutter
  between two columns (`spalte − 26·s`), so no route crosses a ring or a competence title.
  The node state is derived in `knoten-zustand.ts` from the existing view data:
  `ABGESCHLOSSEN` when every top-level objective of the competence is confirmed, otherwise
  `NAECHSTER` when the rules mark it as `istNaechster`, otherwise `SPAETER`. The graph shows a corner
  badge ✓ / ▶ / … (`graph__zustand`) and an accent outline for `NAECHSTER`; the legend reuses the
  same badge class so symbol and colours cannot drift. The card can be panned with mouse or pen:
  `pointerdown`/`pointermove` on `.graph__karte` record the start, a move beyond 5 px sets pointer
  capture, switches the smooth scroll behaviour to `auto`, scrolls `scrollLeft` and suppresses the
  click that follows the drag; `pointerType === 'touch'` is ignored so native touch scrolling keeps
  working. The card is `tabindex="0"` with `role="group"` and an aria-label, so the arrow keys scroll
  it. The initial centring uses the measured stage width (`layout().breite`) instead of
  `scrollWidth`, because the invisible tooltips extend the scrollable area and previously started
  narrow screens at the right edge of the tree. `anyComponentStyle.maximumWarning` rises from 7 kB to
  8 kB (error 9 kB).
- Grund: the beziers crossed rings and competence titles at the start and end of the tree, which was
  hard to read at the larger scale of D-024. Reserved lanes are predictable, keep all text uncovered
  and degrade gracefully when an area has fewer competences. The three states answer the human's
  request for visibly distinct «completed / can be completed / cannot yet be completed» nodes, but
  they add no lock: every node stays clickable and requestable (R-E1). Panning removes the need to
  hit the scrollbar on narrow screens, and skipping touch preserves the platform's momentum
  scrolling. Reusing the node badge in the legend keeps the two views identical.
- Hinweis: `SPAETER` is labelled «Noch nicht dran», not «gesperrt», because no rule blocks a request
  (R-E1); the wording is a recommendation. The state depends on confirmed objectives, not on the
  percentage: a competence with a green ring (≥ 67 %) can still be `SPAETER` (g1 is 88 % and
  `SPAETER`); `NAECHSTER` is the rules' lowest non-green competence (S-A04). The state semantics are
  recorded as Q-023. The
  hidden tooltips still extend `scrollWidth`, so the card can be panned or scrolled a little into the
  empty area right of the last column; flipping or clipping those tooltips is a follow-up. The state
  glyphs are `aria-hidden`; the accessible name of the button carries the state text, and the legend
  repeats it visibly.
- Status: ANNAHME

## D-027 Taller rows and a three-level node language inside the tree

- Bezug: SPEC 8.2 (row spacing 66), S-A03, S-A04, R-E1, human request 2026-11-04, extends D-024/D-026
- Entscheid: `ZEILENABSTAND` rises from 66 to 84 px; the node button spans the row (`--zeile` from
  the layout instead of a CSS literal) and the request/state badges are children of the ring, so
  they follow the ring when the row height changes. The top and bottom lanes are the row edges
  (`obersteZeile − zeilenabstand/2`, `untersteZeile + zeilenabstand/2`), which keeps their clearance
  to three-line titles independent of the row height. The three states get one shared visual
  language: `ABGESCHLOSSEN` fills the inner disc green (`--ampel-gruen`), sets the code in
  `--farbe-akzent-text` and separates the ✓ badge with a 2 px surface ring; `NAECHSTER` keeps the
  dashed frame that S-A04 requires but draws it `3·s` thick in `--farbe-akzent` with a `4·s` offset,
  sets the code in the accent colour and uses a solid accent ▶ badge; `SPAETER` keeps the
  traffic-light ring but turns the inner disc `--farbe-flaeche-leise` and the code
  `--farbe-text-leise`, with the grey … badge. The badges grow from 1.15 rem to 1.3 rem.
- Grund: at the larger scale of D-024 the 66 px rows let three-line titles almost touch, which made
  the tree hard to read; the human asked for more height. The three states were only distinguishable
  through small corner badges; a filled disc (done), a bold dashed frame (next) and a quiet grey disc
  (later) can be read across the whole tree without hovering, while the traffic-light ring still
  shows progress and colour.
- Hinweis: this deviates from SPEC 8.2's 66 px row spacing and extends the S-A03/S-A04 restriction
  («no status in the tree, only the dashed frame and the request count», «all other nodes stay
  normal»). It is presentation only: every node stays clickable and requestable (R-E1), the dashed
  frame remains the «Als Nächstes» marker, and no rule or event is added. The bottom lane moves from
  `+33·s` to the row edge (`+42·s` at the new spacing), so D-026's lane offsets are superseded here.
  Contrast checked: the muted code is 5.6:1 on the grey disc, white on the completed green is about
  6.5:1, the accent code/dashes are about 6:1 on white. The deviation is recorded as Q-024.
- Status: ANNAHME

## D-028 The skill tree is the page; the reward board below it is removed

- Bezug: S-A01, S-A03, S-A07, R-B3, N-04, human request 2026-11-04, supersedes the board part of D-024
- Entscheid: the skilltree page no longer renders the `belohnungen-uebersicht` board below the graph;
  the component, its styles and its tests are deleted and the page imports only the tree, the sidebar,
  the badges view and the header. The tree stays the core of the page. The per-area reward
  (`BEREICH_ABGESCHLOSSEN`, R-B3) and the concrete competences of an area remain reachable _inside_
  the tree through the existing area sidebar, which already shows the badge and the same
  «erreicht / gesamt» counts; `badges.ausgeblendet` still hides that block (N-04). Milestone badges
  stay in the Badges tab (S-A07); the Bbc/IPA/LAP hexagons remain the milestones of the tree (S-A03).
- Grund: the human found the separate milestone cards and the per-area reward board below the tree
  distracting and wants the tree itself to carry the relevant information. The board duplicated what
  the tree and its sidebar already show and pushed the tree out of focus.
- Hinweis: «Milestones» here means the board's badge group, not the Bbc/IPA/LAP nodes; those are part
  of the tree and stay. No rule, event, badge definition or stored field changes. The board-only
  helpers `belohnungsFortschritt` and `anteilProzent` are deleted; `belohnungen.ts` keeps
  `astBelohnungen`/`belohnungFuerAst` for the sidebar. Q-020's reward-board part is resolved
  (removed); the 284 px column cap is unaffected.
- Status: BESTÄTIGT
