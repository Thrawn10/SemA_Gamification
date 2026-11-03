import type { Rolle } from '@skilltree/vertraege';
import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { SitzungDienst } from '../dienste/sitzung-dienst';

/** Redirects unauthenticated visitors to the local account selection. */
export const angemeldetGuard: CanActivateFn = () => {
  const sitzung = inject(SitzungDienst);
  return sitzung.istAngemeldet() ? true : inject(Router).createUrlTree(['/anmeldung']);
};

/** Restricts a route to the given roles. Services still check every operation. */
export function rollenGuard(...rollen: Rolle[]): CanActivateFn {
  return () => {
    const sitzung = inject(SitzungDienst);
    if (!sitzung.istAngemeldet()) {
      return inject(Router).createUrlTree(['/anmeldung']);
    }
    const aktuelleRolle = sitzung.rolle();
    if (!aktuelleRolle || !rollen.includes(aktuelleRolle)) {
      return inject(Router).createUrlTree(['/']);
    }
    return true;
  };
}
