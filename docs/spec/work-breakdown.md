# Work breakdown

Ordered tasks derived from [`SPEC.md`](SPEC.md) and mapped to [`requirements.md`](requirements.md).
Status mirrors [`../PROGRESS.md`](../PROGRESS.md).

| Task | Title                                                | Requirements                                | Depends on      | Status  |
| ---- | ---------------------------------------------------- | ------------------------------------------- | --------------- | ------- |
| T-01 | Angular 22 workspace, Prettier, package aliases      | T-W3, T-W4, N-13                            | —               | done    |
| T-02 | Contracts package (DTOs, commands, error codes)      | Kap. 6, T-W4                                | T-01            | done    |
| T-03 | Rules package with tests first                       | R-S*, R-F*, R-E*, R-T*, R-M*, R-B*, T-W1    | T-02            | done    |
| T-04 | Generate APP/PLA/MED fixtures from the appendices    | T-V5, T-W2, TF6c                            | T-01            | done    |
| T-05 | Storage contract, IndexedDB and in-memory adapters   | N-12, T-W4, TF21                            | T-02            | done    |
| T-06 | Deterministic seed with 3 plans and 7 accounts       | Kap. 9, T-V5                                | T-03–T-05       | done    |
| T-07 | Clock, IDs, domain events, role guards               | T-D3, N-11                                  | T-01            | done    |
| T-08 | Application services with permission checks          | S-A08, S-L*, TF4, TF5, TF8, TF13–TF15, TF20 | T-05–T-07       | done    |
| T-09 | App shell, design tokens, global component styles    | T-A1, 8.1, 8.5                              | T-01            | done    |
| T-10 | Shared UI: traffic light, progress, stages, badges   | R-F4, R-F5, S-A02, S-A07                    | T-09            | done    |
| T-11 | Login and role-based entry page                      | S-A01, N-09                                 | T-08–T-10       | done    |
| T-12 | Skilltree graph with edges, “next” and milestones    | S-A03, S-A04, R-T1–R-T4, R-M1–R-M3          | T-08–T-10       | done    |
| T-13 | Sidebar, objective forms and history                 | S-A05, S-A06, S-L02–S-L06                   | T-12            | done    |
| T-14 | Badge tab and hide setting                           | S-A07, R-B5, R-B7, N-04                     | T-10, T-12      | done    |
| T-15 | Coach overview and collected requests                | S-L01, S-L05                                | T-08, T-10      | done    |
| T-16 | “Meine Daten” page                                   | S-Q01, T-D1                                 | T-08, T-09      | done    |
| T-17 | Admin template import and data set management        | T-I1, T-I3, T-I4, T-I6, T-W6                | T-08            | done    |
| T-18 | Violet prototype control bar and requirement markers | N-11                                        | T-09            | done    |
| T-19 | Service and page tests                               | TF4, TF5, TF8, TF13–TF15, TF20, TF21        | T-08, T-11–T-17 | done    |
| T-20 | Progress, ADRs, open questions, requirements docs    | AGENTS.md definition of done                | T-19            | done    |
| T-21 | Excel reader for APP/PLA with dry run                | T-I1, T-I3, T-I6, TF6, TF6b                 | T-17, fixtures  | blocked |
| T-22 | Playwright flows and axe checks                      | 10.4, T-A1                                  | T-21            | todo    |
| T-23 | `angular-eslint` and clean lint run                  | T-W5                                        | T-19            | todo    |
| T-24 | Performance check for T-P1                           | T-P1                                        | T-22            | todo    |
