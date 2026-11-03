import { inject, Service, signal } from '@angular/core';
import type { Benutzer } from '@skilltree/vertraege';
import { SitzungDienst } from '../dienste/sitzung-dienst';

/**
 * State of the prototype control bar (N-11). Only rendered when DEMO_MODE is
 * true; every control uses the violet control tokens, never the app palette.
 */
@Service()
export class DemoDienst {
  private readonly sitzung = inject(SitzungDienst);

  readonly idsSichtbar = signal(false);
  readonly reviewOffen = signal(false);
  readonly konten = signal<Benutzer[]>([]);

  async laden(): Promise<void> {
    this.konten.set(await this.sitzung.konten());
  }

  async wechsle(login: string): Promise<Benutzer> {
    return this.sitzung.anmelden(login);
  }
}
