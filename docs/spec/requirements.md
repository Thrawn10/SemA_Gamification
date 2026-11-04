# Requirements

Derived from [`SPEC.md`](SPEC.md). This is a traceability index, not a replacement: the spec wins for
every detail. IDs are the stable IDs used in the spec and in test names. Status values: `done`,
`partial`, `open`.

## 1 Rules (`packages/regeln`)

| ID    | Requirement (short)                                                                                                                                                                        | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| R-S1  | Stufe = maximum of active `BESTAETIGT`/`UEBERNOMMEN` events without a `ZURUECKGENOMMEN` referencing them.                                                                                  | done   |
| R-S2  | A higher stage includes the lower ones.                                                                                                                                                    | done   |
| R-S3  | Only a currently assigned practice trainer may confirm or withdraw.                                                                                                                        | done   |
| R-S4  | Withdrawing a confirmation falls back to the previous active confirmation, otherwise to stage 0 (TF3b).                                                                                    | done   |
| R-S5  | Confirming a stage marks open requests with target level ≤ confirmed level as `ERLEDIGT`.                                                                                                  | done   |
| R-S6  | At most one open request per training and learning objective.                                                                                                                              | done   |
| R-F1  | Point value: 0 → 0, 1 → 1, 2 → 3, 3 → 6.                                                                                                                                                   | done   |
| R-F2  | Competence value = mean point value of its non-archived learning objectives (0–6).                                                                                                         | done   |
| R-F3  | Progress % = points ÷ (6 × objectives) × 100, rounded half-up with epsilon 1e-9.                                                                                                           | done   |
| R-F4  | Traffic light per competence: < 2 red, 2–< 4 orange, ≥ 4 green; always with symbol and text (graph: ring colour plus tooltip/aria).                                                        | done   |
| R-F5  | Traffic light per area uses the area mean with the same thresholds.                                                                                                                        | done   |
| R-F6  | Red competences are visible in the tree; area tooltip and coach table show the count.                                                                                                      | done   |
| R-E1  | Nothing is locked; every objective can be requested and confirmed at any time.                                                                                                             | done   |
| R-E2  | Recommendation candidates: stage < 3, no open request, predecessor stage ≥ 2.                                                                                                              | done   |
| R-E3  | Replaced by R-T3 (node-level “next” per branch).                                                                                                                                           | done   |
| R-T1  | Follow edges within an area in template order (`REIHENFOLGE`).                                                                                                                             | done   |
| R-T2  | Cross edges from text references (`TEXTVERWEIS`): APP a1→g1, a3→g4, a3→h3; PLA a1→d1, a7→d4, a1→e1; MED none.                                                                              | done   |
| R-T3  | “Als Nächstes” = lowest non-green node per branch, at most one per branch.                                                                                                                 | done   |
| R-T4  | Edge state: solid when the source is green/reached, dashed otherwise; cross edges dotted and only visible while involved.                                                                  | done   |
| R-M1  | Milestone Bbc: root, readiness from Basislehrjahr objectives or a manual hint; reached manually.                                                                                           | done   |
| R-M2  | Milestone IPA: above the top nodes, readiness “n of N competences not red”; reached manually. PiBS labels it «Bachelorarbeit».                                                             | done   |
| R-M3  | Milestone Lehrabschluss (LAP): top, readiness “IPA passed/open · total progress”; reached manually. PiBS labels it «Bachelorabschluss».                                                    | done   |
| R-B1  | Superseded by D-025: no `BEREICH_GESTARTET` badge is generated.                                                                                                                            | done   |
| R-B2  | Superseded by D-025: no per-competence badge is generated.                                                                                                                                 | done   |
| R-B3  | Badge `BEREICH_ABGESCHLOSSEN`: all objectives of the area at the top level; one badge per area.                                                                                            | done   |
| R-B4  | Badge `MEILENSTEIN_ERREICHT`: one badge per primary node (Bbc, IPA/Lehrabschluss; PiBS: Bachelorarbeit/Bachelorabschluss). Redefined by D-025; the former 25/50/75/100 % rule was dropped. | done   |
| R-B5  | Recompute after every event; inactive badges are kept and reactivated; `vergeben_am` stays at the first fulfilment.                                                                        | done   |
| R-B6  | No badges for time, speed, rank, logins or activity.                                                                                                                                       | done   |
| R-B7  | Badges visible to the learner and assigned trainers; hiding only changes the learner's view.                                                                                               | done   |
| R-B8  | `UEBERNOMMEN` events award badges marked `aus_startstand`.                                                                                                                                 | done   |
| R-B9  | Badge `KOMPETENZ_ANZAHL`: 5/10/15 competences per stage; a competence counts when all its objectives reach at least that stage.                                                            | done   |
| R-B10 | Badge `ALLE_KOMPETENZEN`: every competence reaches the top level.                                                                                                                          | done   |

## 2 Learner stories

| ID    | Requirement (short)                                                                                            | Status |
| ----- | -------------------------------------------------------------------------------------------------------------- | ------ |
| S-A01 | After login the skilltree appears; header with name, profession, year, plan year, trainers; year computed.     | done   |
| S-A02 | Total progress bar, per-area percent/traffic light/red count, visible legend.                                  | done   |
| S-A03 | Bottom-up graph with Bbc, IPA and LAP, justified titles, tooltips, legend, sidebar, mobile horizontal scroll.  | done   |
| S-A04 | Per branch the lowest non-green node is marked as “Als Nächstes”.                                              | done   |
| S-A05 | History per objective, newest first, with actor, time, comment/reason; withdrawn entries struck through.       | done   |
| S-A06 | Request form with target level and 10–1000 character text; status, withdrawal, one open request per objective. | done   |
| S-A07 | Badge tab with awarded, inactive and open badges plus the saved “hide badges” switch.                          | done   |
| S-A08 | No comparisons with other learners; services return only own data and reject foreign trainings.                | done   |

## 3 Coach stories

| ID    | Requirement (short)                                                                                                  | Status |
| ----- | -------------------------------------------------------------------------------------------------------------------- | ------ |
| S-L01 | Table of assigned learners with profession, year, progress, area traffic lights, red nodes, open requests; sortable. | done   |
| S-L02 | Same skilltree view with “Bestätigen” per objective, pre-selected target level, instant refresh and message.         | done   |
| S-L03 | Withdraw a confirmation with a reason of at least 10 characters; history keeps both entries; badge message.          | done   |
| S-L04 | Optional comment (max. 500 characters) visible to the learner.                                                       | done   |
| S-L05 | Collected open requests, oldest first, inline confirm/reject with three suggestions and a mandatory reason.          | done   |
| S-L06 | Milestone sidebar with description, readiness, status, history, confirm and withdraw with reason.                    | done   |

## 4 All roles

| ID    | Requirement (short)                                                                                        | Status |
| ----- | ---------------------------------------------------------------------------------------------------------- | ------ |
| S-Q01 | “Meine Daten” reachable from the header, role-dependent data/permission table, no tracking note.           | done   |
| N-03  | `UEBERNOMMEN` counts as confirmed and can be withdrawn.                                                    | done   |
| N-04  | `Benutzereinstellung.badgesAusgeblendet`.                                                                  | done   |
| N-05  | Learning locations optional per objective, fallback to the competence.                                     | done   |
| N-06  | Rejection requires a reason visible to the learner.                                                        | done   |
| N-07  | One open request per objective.                                                                            | done   |
| N-08  | Taxonomy column is authoritative.                                                                          | done   |
| N-09  | Role name “Praxisbildner/in”.                                                                              | done   |
| N-10  | Three apprenticeship professions in the MVP (APP, PLA, MED); PiBS is a fourth plan added by D-022 (Q-019). | done   |
| N-11  | Violet prototype control bar with role switch, requirement IDs, review and reset; app never uses violet.   | done   |
| N-12  | Frontend-first MVP with IndexedDB and replaceable adapters.                                                | done   |
| N-13  | Angular 22 and the Angular style guide.                                                                    | done   |

## 5 Import

| ID   | Requirement (short)                                                                                                        | Status  |
| ---- | -------------------------------------------------------------------------------------------------------------------------- | ------- |
| T-I1 | Import only via the admin route; guard and `ImportDienst` reject other roles; files are read in the browser, not uploaded. | removed |
| T-I3 | Dry run produces a report without changing data.                                                                           | removed |
| T-I4 | Dry-run report lists counts, errors and warnings in German.                                                                | removed |
| T-I6 | Template versioning (new version deactivates the previous one).                                                            | removed |
| T-I7 | Configuration per template type; PLA works without code changes.                                                           | removed |
| T-I8 | Taxonomy, learning locations and modules are imported and visible in the objective.                                        | done    |
| T-I9 | Optional start state from an individual plan as `UEBERNOMMEN`.                                                             | partial |
| —    | Excel reader for the original APP/PLA files.                                                                               | removed |

`removed` means the validation build intentionally drops the feature (D-021): the admin route and
every file upload were deleted, and the seed ships the APP/PLA/MED plans with a start state already
applied for Sara. T-I8 and T-I9 remain covered by the seeded data.

## 6 Non-functional

| ID   | Requirement (short)                                                             | Status  |
| ---- | ------------------------------------------------------------------------------- | ------- |
| T-D1 | Data minimisation: only the listed fields, no analytics, no tracking.           | done    |
| T-D2 | Swiss DSG/BIT requirements; hosting in Switzerland.                             | open    |
| T-D3 | Append-only history with actor, action and timestamp.                           | done    |
| T-D4 | Deletion concept after the retention period; pseudonymised validation data.     | open    |
| T-W1 | Rules as pure functions with unit tests, coverage ≥ 90 %.                       | partial |
| T-W2 | Import tests with the real APP and PLA templates as fixtures.                   | removed |
| T-W3 | Start with one command; README with setup.                                      | done    |
| T-W4 | Backend-ready architecture per 0.7 with automated checks.                       | done    |
| T-W5 | Angular guidelines per 0.8; `angular-eslint` without errors or warnings.        | open    |
| T-W6 | Data set exportable and importable as JSON.                                     | partial |
| T-P1 | PLA tree (177 objectives) loads < 1 s; overview with 30 learners < 2 s.         | open    |
| T-A1 | WCAG 2.1 AA / eCH-0059; stage and traffic light never conveyed by colour alone. | partial |

## 7 Test cases

| ID        | Covered by                                           |
| --------- | ---------------------------------------------------- |
| TF1–TF3c  | `packages/regeln/src/regeln.spec.ts`                 |
| TF4, TF5  | `src/app/dienste/dienste.spec.ts`                    |
| TF6, TF6b | removed with the upload route (D-021)                |
| TF6c      | removed with the upload route; MED stays in the seed |
| TF7–TF12  | `packages/regeln/src/regeln.spec.ts`                 |
| TF13–TF15 | `src/app/dienste/dienste.spec.ts`                    |
| TF16–TF19 | `packages/regeln/src/regeln.spec.ts`                 |
| TF20      | `src/app/dienste/dienste.spec.ts`                    |
| TF21      | memory adapter only (Q-006)                          |
