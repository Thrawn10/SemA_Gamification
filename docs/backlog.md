# Backlog

Ideas that are out of scope for the current milestones. Do not implement them without an explicit
decision. The specification wins for product behaviour; anything not in it belongs here.

- **M6 Excel import (APP/PLA).** In-browser reader for the original `.xlsx` files, dry-run report
  from SPEC 7.2 and TF6/TF6b. Needs the files under `fixtures/excel/` and a decision on the `xlsx`
  dependency (Q-002).
- **`angular-eslint`.** T-W5 requires a clean lint run; the package is not installed yet. Until then
  the gate is `ng build`, `npx ng test --no-watch` and `npx prettier --check .`.
- **Playwright end-to-end tests.** SPEC 10.4 describes the learner and coach flows plus an axe run.
- **IndexedDB test adapter.** Run the service suite a second time against `IndexedDbSpeicher`
  (`fake-indexeddb`) to close TF21 (Q-006).
- **`packageManager` alignment.** If the human confirms pnpm (Q-001), add `pnpm-lock.yaml` and
  update the README and CI commands.
- **Backend (M8).** HTTP adapters for the existing ports; only after the answer to O-14.
- **Reduced badge set.** SPEC O-11 asks whether “Bereich gestartet” should be dropped and whether a
  start-state import should award badges.
- **Template migration (T-I6).** Match objectives by code across template versions, archive removed
  objectives, re-point apprenticeships and derive `TEXTVERWEIS` edges on import (D-014, Q-011).
- **Publication-grade sidebar.** `@angular/cdk` dialog (or `<dialog showModal()>`) for `inert`
  background, scroll lock and a proper focus trap (D-015).
- **Tooltip polish.** The top milestone tooltip is clipped by the graph card, and Escape does not
  dismiss a tooltip (WCAG 1.4.13). A small anchored tooltip component would fix both.
- **Graph keyboard model.** Roving tabindex per area and DOM order from crown to root would cut the
  ~33 Tab stops per skilltree visit.
- **Read the materialised badge grants.** Either use `Badge-Vergabe` for display (with replay as a
  consistency check, SPEC 5.6) or drop the write-only table (Q-012).
