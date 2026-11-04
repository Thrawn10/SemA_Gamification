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

  /** The four learner accounts, one per MVP profession plus the PiBS student (N-10, D-021, D-022). */
  protected readonly gruppen = computed<Kontogruppe[]>(() => {
    const lernende = this.konten().filter((konto) => konto.rolle === 'LERNENDE');
    return lernende.length > 0
      ? [
          {
            rolle: 'LERNENDE',
            titel: 'Lernende',
            hinweis:
              'Je ein Testkonto für Applikationsentwicklung, Plattformentwicklung, Media und das PiBS-Studium.',
            konten: lernende,
          },
        ]
      : [];
  });

  /**
   * ANNAHME: the practice-trainer role is not part of the participant flow yet. The accounts stay
   * reachable behind a collapsed panel so a facilitator can demo the coach view (D-021, Q-018).
   */
  protected readonly trainerKonten = computed(() =>
    this.konten().filter((konto) => konto.rolle === 'PRAXISBILDNER'),
  );

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
