import { inject } from '@angular/core';
import { DATEN_INITIALISIERER } from './daten/ports';
import { SitzungDienst } from './dienste/sitzung-dienst';

/**
 * Bootstrap work before the first navigation: seed an empty store, then restore
 * the saved session. Both services are resolved synchronously on purpose:
 * `inject()` after an `await` loses the injection context (NG0203) and leaves
 * the application without a bootstrapped `<app-root>`.
 */
export function initialisiereApp(): Promise<void> {
  const daten = inject(DATEN_INITIALISIERER);
  const sitzung = inject(SitzungDienst);
  return daten.initialisieren().then(() => sitzung.initialisieren());
}
