import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type {
  AktiveAnfrageAnsicht,
  Stufe,
  Stufenmodell,
  UebersichtZeile,
} from '@skilltree/vertraege';
import { stufenText } from '@skilltree/vertraege';
import { DomaenenEreignisse } from '../../core/domaenen-ereignisse';
import { fehlerText } from '../../core/fehler';
import { UHR } from '../../core/uhr';
import { AnfrageDienst } from '../../dienste/anfrage-dienst';
import { BestaetigungDienst } from '../../dienste/bestaetigung-dienst';
import { UebersichtDienst } from '../../dienste/uebersicht-dienst';
import { AmpelAnzeige } from '../../shared/ui/ampel-anzeige/ampel-anzeige';
import { AnforderungId } from '../../shared/ui/anforderung-id/anforderung-id';
import { FortschrittsAnzeige } from '../../shared/ui/fortschritts-anzeige/fortschritts-anzeige';

type Sortierschluessel =
  'name' | 'lehrberuf' | 'lehrjahr' | 'fortschritt' | 'roteKompetenzen' | 'offeneAnfragen';

const SORTIER_TEXTE: Readonly<Record<Sortierschluessel, string>> = {
  name: 'Name',
  lehrberuf: 'Lehrberuf',
  lehrjahr: 'Lehrjahr',
  fortschritt: 'Fortschritt',
  roteKompetenzen: 'Rote Knoten',
  offeneAnfragen: 'Offene Anfragen',
};

type AnfrageModus = { id: string; art: 'bestaetigen' | 'ablehnen' };

/** Coach overview with sortable table and collected requests (S-L01, S-L05). */
@Component({
  selector: 'st-uebersicht-seite',
  imports: [RouterLink, AmpelAnzeige, FortschrittsAnzeige, AnforderungId],
  templateUrl: './uebersicht-seite.html',
  styleUrl: './uebersicht-seite.scss',
})
export class UebersichtSeite {
  private readonly uebersicht = inject(UebersichtDienst);
  private readonly bestaetigung = inject(BestaetigungDienst);
  private readonly anfrageDienst = inject(AnfrageDienst);
  private readonly domaenenEreignisse = inject(DomaenenEreignisse);
  private readonly uhr = inject(UHR);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** Button that opened the inline request form, so focus can return after closing it. */
  private ausloeser: HTMLElement | null = null;
  private readonly anfrageReiter = viewChild<ElementRef<HTMLButtonElement>>('anfrageReiter');

  protected readonly reiter = signal<'lernende' | 'anfragen'>('lernende');
  protected readonly zeilen = signal<UebersichtZeile[]>([]);
  protected readonly anfragen = signal<AktiveAnfrageAnsicht[]>([]);
  protected readonly fehler = signal<string | null>(null);
  protected readonly meldung = signal<string | null>(null);

  protected readonly offenerModus = signal<AnfrageModus | null>(null);
  protected readonly kommentar = signal('');
  protected readonly antwort = signal('');
  protected readonly anfrageFehler = signal<string | null>(null);
  protected readonly laeuft = signal(false);

  protected readonly vorschlaege = [
    'Bitte genauer beschreiben, was du gemacht hast.',
    'Noch nicht im Betrieb beobachtet.',
    'Zielstufe ist noch zu hoch.',
  ];

  private readonly sortierschluessel = signal<Sortierschluessel>('name');
  private readonly richtung = signal<'auf' | 'ab'>('auf');

  protected readonly sortierMeldung = computed(
    () =>
      `Sortiert nach ${SORTIER_TEXTE[this.sortierschluessel()]}, ${
        this.richtung() === 'auf' ? 'aufsteigend' : 'absteigend'
      }.`,
  );

  protected readonly zeilenSortiert = computed(() => {
    const schluessel = this.sortierschluessel();
    const faktor = this.richtung() === 'auf' ? 1 : -1;
    return [...this.zeilen()].sort((a, b) => {
      const links = this.wert(a, schluessel);
      const rechts = this.wert(b, schluessel);
      if (typeof links === 'number' && typeof rechts === 'number') {
        return (links - rechts) * faktor;
      }
      return String(links).localeCompare(String(rechts), 'de') * faktor;
    });
  });

  constructor() {
    effect(() => {
      this.domaenenEreignisse.version();
      void this.laden();
    });
  }

  private async laden(): Promise<void> {
    try {
      const [zeilen, anfragen] = await Promise.all([
        this.uebersicht.lernende(),
        this.uebersicht.offeneAnfragen(),
      ]);
      this.zeilen.set(zeilen);
      this.anfragen.set(anfragen);
      this.fehler.set(null);
    } catch (fehler) {
      this.fehler.set(fehlerText(fehler));
    }
  }

  private wert(zeile: UebersichtZeile, schluessel: Sortierschluessel): string | number {
    switch (schluessel) {
      case 'name':
        return zeile.lernende.name;
      case 'lehrberuf':
        return `${zeile.lehrberuf.name} ${zeile.lehrberuf.fachrichtung ?? ''}`;
      case 'lehrjahr':
        return zeile.lehrjahr;
      case 'fortschritt':
        return zeile.fortschritt;
      case 'roteKompetenzen':
        return zeile.roteKompetenzen;
      case 'offeneAnfragen':
        return zeile.offeneAnfragen;
    }
  }

  protected sortiere(schluessel: Sortierschluessel): void {
    if (this.sortierschluessel() === schluessel) {
      this.richtung.set(this.richtung() === 'auf' ? 'ab' : 'auf');
      return;
    }
    this.sortierschluessel.set(schluessel);
    this.richtung.set('auf');
  }

  protected ariaSort(schluessel: Sortierschluessel): 'ascending' | 'descending' | 'none' {
    if (this.sortierschluessel() !== schluessel) {
      return 'none';
    }
    return this.richtung() === 'auf' ? 'ascending' : 'descending';
  }

  protected pfeil(schluessel: Sortierschluessel): string {
    if (this.sortierschluessel() !== schluessel) {
      return '↕';
    }
    return this.richtung() === 'auf' ? '↑' : '↓';
  }

  protected stufeText(modell: Stufenmodell, stufe: Stufe): string {
    return stufenText(modell, stufe);
  }

  protected alterText(eintrag: AktiveAnfrageAnsicht): string {
    const tage = Math.max(
      0,
      Math.floor((this.uhr().getTime() - Date.parse(eintrag.anfrage.erstelltAm)) / 86_400_000),
    );
    if (tage === 0) {
      return 'heute';
    }
    return tage === 1 ? 'vor 1 Tag' : `vor ${tage} Tagen`;
  }

  protected oeffne(eintrag: AktiveAnfrageAnsicht, art: 'bestaetigen' | 'ablehnen'): void {
    const aktives = this.host.nativeElement.ownerDocument.activeElement;
    this.ausloeser =
      aktives instanceof HTMLElement && this.host.nativeElement.contains(aktives) ? aktives : null;
    this.offenerModus.set({ id: eintrag.anfrage.id, art });
    this.anfrageFehler.set(null);
    this.kommentar.set('');
    this.antwort.set('');
    // The trigger buttons are replaced by the form, so focus its first field explicitly.
    afterNextRender(
      () =>
        this.host.nativeElement
          .querySelector<HTMLElement>('form.anfrage-karte__formular textarea')
          ?.focus(),
      { injector: this.injector },
    );
  }

  protected abbrechen(): void {
    this.offenerModus.set(null);
    this.anfrageFehler.set(null);
    afterNextRender(
      () => {
        const ziel =
          this.ausloeser?.isConnected === true
            ? this.ausloeser
            : this.anfrageReiter()?.nativeElement;
        ziel?.focus();
      },
      { injector: this.injector },
    );
  }

  /** After a decision the card disappears; focus stays on the requests tab. */
  private fokusAufReiter(): void {
    afterNextRender(() => this.anfrageReiter()?.nativeElement.focus(), {
      injector: this.injector,
    });
  }

  protected kommentarAendern(ereignis: Event): void {
    this.kommentar.set((ereignis.target as HTMLTextAreaElement).value);
  }

  protected antwortAendern(ereignis: Event): void {
    this.antwort.set((ereignis.target as HTMLTextAreaElement).value);
  }

  protected async bestaetigen(ereignis: Event, eintrag: AktiveAnfrageAnsicht): Promise<void> {
    ereignis.preventDefault();
    this.anfrageFehler.set(null);
    this.laeuft.set(true);
    try {
      const kommentar = this.kommentar().trim();
      const ergebnis = await this.bestaetigung.bestaetigen(eintrag.ausbildung.id, {
        leistungszielId: eintrag.leistungsziel.id,
        stufe: eintrag.anfrage.zielstufe,
        ...(kommentar ? { kommentar } : {}),
      });
      this.meldung.set(ergebnis.hinweis);
      this.offenerModus.set(null);
      this.kommentar.set('');
      this.fokusAufReiter();
    } catch (fehler) {
      this.anfrageFehler.set(fehlerText(fehler));
    } finally {
      this.laeuft.set(false);
    }
  }

  protected async ablehnen(ereignis: Event, eintrag: AktiveAnfrageAnsicht): Promise<void> {
    ereignis.preventDefault();
    this.anfrageFehler.set(null);
    if (this.antwort().trim().length < 10) {
      this.anfrageFehler.set(
        `Die Begründung muss mindestens 10 Zeichen enthalten. Aktuell ${this.antwort().trim().length} Zeichen.`,
      );
      return;
    }
    this.laeuft.set(true);
    try {
      await this.anfrageDienst.ablehnen({
        anfrageId: eintrag.anfrage.id,
        antwort: this.antwort(),
      });
      this.meldung.set(`Anfrage von ${eintrag.lernende.name} abgelehnt.`);
      this.offenerModus.set(null);
      this.antwort.set('');
      this.fokusAufReiter();
    } catch (fehler) {
      this.anfrageFehler.set(fehlerText(fehler));
    } finally {
      this.laeuft.set(false);
    }
  }
}
