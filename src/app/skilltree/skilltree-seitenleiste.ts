import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import type {
  BereichAnsicht,
  KompetenzAnsicht,
  MeilensteinAnsicht,
  MeilensteinCode,
  SkilltreeAnsicht,
} from '@skilltree/vertraege';
import { MEILENSTEIN_TEXTE } from '@skilltree/vertraege';
import { fehlerText } from '../core/fehler';
import { MeilensteinDienst } from '../dienste/meilenstein-dienst';
import { AmpelAnzeige } from '../shared/ui/ampel-anzeige';
import { AnforderungId } from '../shared/ui/anforderung-id';
import type { BaumAuswahl } from './auswahl';
import { LeistungszielEintrag } from './leistungsziel-eintrag';
import { VerlaufListe } from './verlauf-liste';

interface KompetenzInhalt {
  art: 'kompetenz';
  bereich: BereichAnsicht;
  kompetenz: KompetenzAnsicht;
  davor: KompetenzAnsicht | null;
  danach: KompetenzAnsicht | null;
}

interface AstInhalt {
  art: 'ast';
  bereich: BereichAnsicht;
}

interface MeilensteinInhalt {
  art: 'meilenstein';
  meilenstein: MeilensteinAnsicht;
}

type Inhalt = KompetenzInhalt | AstInhalt | MeilensteinInhalt;

const MEILENSTEIN_BESCHREIBUNGEN: Readonly<Record<MeilensteinCode, string>> = {
  BBC: 'Der Basismeilenstein schliesst das Basislehrjahr ab. Er wird durch die Praxisbildnerin oder den Praxisbildner bestätigt.',
  IPA: 'Die individuelle praktische Arbeit (IPA) wird nach bestandener Prüfung durch die Praxisbildnerin oder den Praxisbildner bestätigt.',
  LAP: 'Der Lehrabschluss (Qualifikationsverfahren) ist der oberste Meilenstein des Baums.',
};

/** Node and milestone sidebar (SPEC 8.2); closes with ×, backdrop or Esc. */
@Component({
  selector: 'st-skilltree-seitenleiste',
  imports: [AmpelAnzeige, AnforderungId, LeistungszielEintrag, VerlaufListe, DatePipe],
  templateUrl: './skilltree-seitenleiste.html',
  styleUrl: './skilltree-seitenleiste.scss',
})
export class SkilltreeSeitenleiste {
  readonly ansicht = input.required<SkilltreeAnsicht>();
  readonly auswahl = input.required<BaumAuswahl>();
  readonly startLz = input<string | null>(null);

  readonly schliessen = output<void>();
  readonly knotenGewaehlt = output<string>();
  readonly aktualisiert = output<void>();

  private readonly meilensteinDienst = inject(MeilensteinDienst);
  private readonly injector = inject(Injector);
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  private readonly kommentarFeld = viewChild<ElementRef<HTMLTextAreaElement>>('kommentarFeld');
  private readonly begruendungFeld = viewChild<ElementRef<HTMLTextAreaElement>>('begruendungFeld');

  protected readonly modus = signal<'bestaetigen' | 'zuruecknehmen' | null>(null);
  protected readonly kommentar = signal('');
  protected readonly begruendung = signal('');
  protected readonly laeuft = signal(false);
  protected readonly meldung = signal<string | null>(null);
  protected readonly fehler = signal<string | null>(null);

  protected readonly inhalt = computed<Inhalt | null>(() => {
    const auswahl = this.auswahl();
    const ansicht = this.ansicht();
    if (auswahl.art === 'meilenstein') {
      const meilenstein = ansicht.meilensteine.find((eintrag) => eintrag.code === auswahl.code);
      // A stale selection must not break change detection; the page closes the panel instead.
      return meilenstein ? { art: 'meilenstein', meilenstein } : null;
    }
    const bereich = ansicht.bereiche.find((eintrag) =>
      auswahl.art === 'ast'
        ? eintrag.bereich.code === auswahl.code
        : eintrag.kompetenzen.some((kompetenz) => kompetenz.kompetenz.id === auswahl.id),
    );
    if (!bereich) {
      return null;
    }
    if (auswahl.art === 'ast') {
      return { art: 'ast', bereich };
    }
    const index = bereich.kompetenzen.findIndex(
      (kompetenz) => kompetenz.kompetenz.id === auswahl.id,
    );
    const kompetenz = bereich.kompetenzen[index];
    if (!kompetenz) {
      return null;
    }
    return {
      art: 'kompetenz',
      bereich,
      kompetenz,
      davor: bereich.kompetenzen[index - 1] ?? null,
      danach: bereich.kompetenzen[index + 1] ?? null,
    };
  });

  constructor() {
    // Focus the dialog itself so its accessible name (the heading) is announced first.
    afterNextRender(() => this.dialog()?.nativeElement.focus());
  }

  /** Keeps Tab inside the modal panel while it is open. */
  protected tabFangen(ereignis: Event): void {
    if (!(ereignis instanceof KeyboardEvent)) {
      return;
    }
    const dialog = this.dialog()?.nativeElement;
    if (!dialog) {
      return;
    }
    const fokussierbar = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), select:not([disabled]), textarea:not([disabled]), input:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (fokussierbar.length === 0) {
      return;
    }
    const erstes = fokussierbar[0];
    const letztes = fokussierbar[fokussierbar.length - 1];
    const aktiv = dialog.ownerDocument.activeElement;
    if (!ereignis.shiftKey && aktiv === letztes) {
      ereignis.preventDefault();
      erstes.focus();
    } else if (ereignis.shiftKey && (aktiv === erstes || aktiv === dialog)) {
      ereignis.preventDefault();
      letztes.focus();
    }
  }

  protected meilensteinText(code: MeilensteinCode): { name: string; untertitel: string } {
    return MEILENSTEIN_TEXTE[code];
  }

  /** Opens the inline form and moves focus into its first field. */
  protected formularOeffnen(modus: 'bestaetigen' | 'zuruecknehmen'): void {
    this.fehler.set(null);
    this.meldung.set(null);
    this.modus.set(modus);
    afterNextRender(
      () => {
        const feld =
          modus === 'bestaetigen'
            ? this.kommentarFeld()?.nativeElement
            : this.begruendungFeld()?.nativeElement;
        feld?.focus();
      },
      { injector: this.injector },
    );
  }

  /** Closing the form removes the focused button, so focus returns to the dialog. */
  protected abbrechen(): void {
    this.modus.set(null);
    this.fehler.set(null);
    this.fokusZurueck();
  }

  private fokusZurueck(): void {
    afterNextRender(() => this.dialog()?.nativeElement.focus(), { injector: this.injector });
  }

  protected beschreibung(code: MeilensteinCode): string {
    return MEILENSTEIN_BESCHREIBUNGEN[code];
  }

  protected kommentarAendern(ereignis: Event): void {
    this.kommentar.set((ereignis.target as HTMLTextAreaElement).value);
  }

  protected begruendungAendern(ereignis: Event): void {
    this.begruendung.set((ereignis.target as HTMLTextAreaElement).value);
  }

  protected async meilensteinBestaetigen(ereignis: Event): Promise<void> {
    ereignis.preventDefault();
    const inhalt = this.inhalt();
    if (inhalt?.art !== 'meilenstein') {
      return;
    }
    this.fehler.set(null);
    this.meldung.set(null);
    this.laeuft.set(true);
    try {
      const kommentar = this.kommentar().trim();
      const ergebnis = await this.meilensteinDienst.bestaetigen(this.ansicht().ausbildung.id, {
        meilenstein: inhalt.meilenstein.code,
        ...(kommentar ? { kommentar } : {}),
      });
      this.meldung.set(ergebnis.hinweis);
      this.kommentar.set('');
      this.modus.set(null);
      this.fokusZurueck();
      this.aktualisiert.emit();
    } catch (fehler) {
      this.fehler.set(fehlerText(fehler));
    } finally {
      this.laeuft.set(false);
    }
  }

  protected async meilensteinZuruecknehmen(ereignis: Event, ereignisId: string): Promise<void> {
    ereignis.preventDefault();
    const inhalt = this.inhalt();
    if (inhalt?.art !== 'meilenstein') {
      return;
    }
    this.fehler.set(null);
    this.meldung.set(null);
    if (this.begruendung().trim().length < 10) {
      this.fehler.set(
        `Die Begründung muss mindestens 10 Zeichen enthalten. Aktuell ${this.begruendung().trim().length} Zeichen.`,
      );
      return;
    }
    this.laeuft.set(true);
    try {
      const ergebnis = await this.meilensteinDienst.zuruecknehmen(this.ansicht().ausbildung.id, {
        ereignisId,
        begruendung: this.begruendung(),
      });
      this.meldung.set(ergebnis.hinweis);
      this.begruendung.set('');
      this.modus.set(null);
      this.fokusZurueck();
      this.aktualisiert.emit();
    } catch (fehler) {
      this.fehler.set(fehlerText(fehler));
    } finally {
      this.laeuft.set(false);
    }
  }
}
