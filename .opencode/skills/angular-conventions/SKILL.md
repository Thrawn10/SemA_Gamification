---
name: angular-conventions
description: Project conventions for writing Angular components, templates, services, routes, forms and tests (file layout, signals, control flow, DI, accessibility, testing). Use when creating or modifying any Angular component, service, route, or template in this project.
---

# Angular conventions

This complements, and never contradicts, the official guidance in `docs/angular/best-practices.md`
and the official `angular-developer` skill. If they disagree with this file, the official guidance
wins unless an ADR in `docs/architecture/DECISIONS.md` records a deviation.

Project facts (Angular 22.x): do not write `standalone: true`; do not write
`changeDetection: ChangeDetectionStrategy.OnPush` (OnPush is the default); Signal Forms are stable;
`@Service` is available. There is no lint yet; the gate is `ng build`, `npx ng test --no-watch`,
`npx prettier --check .` and `npm run check:components`.

## File layout

```text
shared/ui/button/
  button.ts            standalone component (templateUrl + styleUrl)
  button.html          template (always a separate file)
  button.scss          styles using tokens
  button.spec.ts       tests
skilltree/
  skilltree-seite/     one folder per component, named after the component
    skilltree-seite.ts
    skilltree-seite.html
    skilltree-seite.scss
    skilltree-seite.spec.ts
  skilltree-graph/
    skilltree-graph.ts
    skilltree-graph.html
    skilltree-graph.scss
    skilltree-graph.spec.ts
  data/                feature services, models (when the feature grows)
```

Every component has its own folder named after it and contains exactly these four files. Folders
follow the subject (feature or component), not the file type: do not create `components/`, `pages/`
or `services/` directories. Never put the template or the styles inside the TypeScript file, even for
small components: use `templateUrl` and `styleUrl` with relative paths. `npm run check:components`
enforces the folder and four-file rules (D-018, D-020).

Match the file naming the workspace schematics produce (`ng generate`); do not mix styles within one
project.

## Component pattern

```ts
@Component({
  selector: 'app-price-tag',
  templateUrl: './price-tag.html',
  styleUrl: './price-tag.scss',
  host: { class: 'price-tag' },
})
export class PriceTag {
  readonly amount = input.required<number>();
  readonly currency = input('EUR');
  readonly onSale = input(false);
  protected readonly formatted = computed(() =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: this.currency() }).format(
      this.amount(),
    ),
  );
}
```

Do not add `standalone` or `changeDetection` for Angular 22.x.

## Rules of thumb

- Presentational components: inputs/outputs only, no data fetching, no feature stores.
- Routed (page) components: inject services, compose presentational components, own route-level
  state.
- Services: single responsibility, `inject()`, singleton (`@Service`) unless a narrower scope is
  needed.
- State: `signal` for writable, `computed` for derived, `linkedSignal` for state that resets from
  other state, `effect` only for side effects such as logging or syncing to non-Angular APIs.
- Templates: `@if` / `@for` (with `track`) / `@switch` / `@defer`; `@empty` branch for lists;
  loading and error branches for async data.
- RxJS: keep it for streams (events, websockets, debounced input); convert to signals at the edge
  with `toSignal`; clean up with `takeUntilDestroyed`.
- HTTP: only in services; functional interceptors for cross-cutting concerns; map API DTOs to view
  models at the boundary.
- Routing: lazy `loadComponent` / `loadChildren`, functional guards, a `title` on every route.
- Forms: Signal Forms for new forms; otherwise typed Reactive forms.
- Authorisation: check role and assignment in the service layer, not only by hiding UI.
- Stage events: append-only; derive stage, progress, traffic light, recommendations and badges from
  events. Never update or delete an event.

## Required states for every data-driven view

Loading, empty, error (with retry), success, and long-content/overflow.

## Accessibility baseline

- Native elements before ARIA; every control has an accessible name.
- Visible focus style from tokens; never remove an outline without a replacement.
- Dialogs and menus use CDK primitives for focus trap, focus restore and keyboard handling.
- Announce async results with `LiveAnnouncer` or `aria-live`.
- UI copy is German with Swiss spelling (`ss` instead of `ß`, « » quotes); domain terms keep German
  umlauts written out (`Stufenereignis`, `BESTAETIGT`).

## Testing baseline

- `TestBed` with standalone components; CDK harnesses for UI interaction;
  `provideHttpClientTesting` for HTTP.
- Query by role/label/text; assert behaviour, not implementation.
- Test names include the requirement ID when one applies, e.g.
  `R-014: shows error when email is invalid`.
- No `fdescribe` / `fit` / `.only` committed.
- Run with `npx ng test --no-watch`.
