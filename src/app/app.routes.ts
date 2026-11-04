import type { Routes } from '@angular/router';
import { angemeldetGuard, rollenGuard } from './core/rollen-guard';

/**
 * Every feature route is lazy-loaded; guards mirror the service-layer checks.
 * `title` feeds Angular's `TitleStrategy`, so each view has a distinct document title.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Skilltree – Start',
    loadComponent: () => import('./anmeldung/start-seite/start-seite').then((m) => m.StartSeite),
  },
  {
    path: 'anmeldung',
    title: 'Anmelden – Skilltree',
    loadComponent: () =>
      import('./anmeldung/anmeldung-seite/anmeldung-seite').then((m) => m.AnmeldungSeite),
  },
  {
    path: 'skilltree/:id',
    title: 'Skilltree',
    canActivate: [angemeldetGuard],
    // The tree scales with the viewport, so this view uses the wide content column (D-024).
    data: { breite: 'breit' },
    loadComponent: () =>
      import('./skilltree/skilltree-seite/skilltree-seite').then((m) => m.SkilltreeSeite),
  },
  {
    path: 'uebersicht',
    title: 'Meine Lernenden – Skilltree',
    canActivate: [rollenGuard('PRAXISBILDNER')],
    loadComponent: () =>
      import('./uebersicht/uebersicht-seite/uebersicht-seite').then((m) => m.UebersichtSeite),
  },
  {
    path: 'meine-daten',
    title: 'Meine Daten – Skilltree',
    canActivate: [angemeldetGuard],
    loadComponent: () =>
      import('./meine-daten/meine-daten-seite/meine-daten-seite').then((m) => m.MeineDatenSeite),
  },
  { path: '**', redirectTo: '' },
];
