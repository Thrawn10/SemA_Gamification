import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { Benutzer, Rolle } from '@skilltree/vertraege';
import { ROLLEN_TEXTE } from '@skilltree/vertraege';
import { fehlerText } from '../../core/fehler';
import { SitzungDienst } from '../../dienste/sitzung-dienst';
import { AnforderungId } from '../../shared/ui/anforderung-id/anforderung-id';

interface Kontogruppe {
  rolle: Rolle;
  titel: string;
  hinweis: string;
  konten: Benutzer[];
}

@Component({
  selector: 'st-anmeldung-seite',
  imports: [AnforderungId],
  templateUrl: './anmeldung-seite.html',
  styleUrl: './anmeldung-seite.scss',
})
export class AnmeldungSeite {
  private readonly sitzung = inject(SitzungDienst);
  private readonly router = inject(Router);

  protected readonly konten = signal<Benutzer[]>([]);
  protected readonly laeuft = signal(false);
  protected readonly fehler = signal<string | null>(null);

  protected readonly gruppen = computed<Kontogruppe[]>(() => {
    const alle = this.konten();
    const gruppen: Kontogruppe[] = [
      {
        rolle: 'LERNENDE',
        titel: 'Lernende',
        hinweis: 'Eigener Skilltree, Anfragen und Badges.',
        konten: alle.filter((konto) => konto.rolle === 'LERNENDE'),
      },
      {
        rolle: 'PRAXISBILDNER',
        titel: 'Praxisbildner/innen',
        hinweis: 'Übersicht der zugeordneten Lernenden und offene Anfragen.',
        konten: alle.filter((konto) => konto.rolle === 'PRAXISBILDNER'),
      },
      {
        rolle: 'ADMIN',
        titel: 'Administration',
        hinweis: 'Import, Datenbestand und Support.',
        konten: alle.filter((konto) => konto.rolle === 'ADMIN'),
      },
    ];
    return gruppen.filter((gruppe) => gruppe.konten.length > 0);
  });

  constructor() {
    void this.laden();
  }

  private async laden(): Promise<void> {
    try {
      this.konten.set(await this.sitzung.konten());
    } catch (fehler) {
      this.fehler.set(fehlerText(fehler));
    }
  }

  protected rollenText(rolle: Rolle): string {
    return ROLLEN_TEXTE[rolle];
  }

  protected async anmelden(konto: Benutzer): Promise<void> {
    this.laeuft.set(true);
    this.fehler.set(null);
    try {
      await this.sitzung.anmelden(konto.login);
      await this.router.navigateByUrl('/');
    } catch (fehler) {
      this.fehler.set(fehlerText(fehler));
    } finally {
      this.laeuft.set(false);
    }
  }
}
