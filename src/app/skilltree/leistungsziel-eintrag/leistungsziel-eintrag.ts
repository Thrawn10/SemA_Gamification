import {
  Component,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type {
  BestaetigungsStufe,
  Kompetenz,
  LeistungszielAnsicht,
  Rolle,
  Stufenmodell,
} from '@skilltree/vertraege';
import { ANFRAGE_STATUS_TEXTE, bestaetigungsStufen, stufenText } from '@skilltree/vertraege';
import { fehlerText } from '../../core/fehler';
import { AnfrageDienst } from '../../dienste/anfrage-dienst';
import { BestaetigungDienst } from '../../dienste/bestaetigung-dienst';
import { StufenAnzeige } from '../../shared/ui/stufen-anzeige/stufen-anzeige';
import { VerlaufListe } from '../verlauf-liste/verlauf-liste';

type Modus = 'anfrage' | 'bestaetigung' | 'ruecknahme' | 'ablehnung' | null;

/** One Leistungsziel row with expandable details, actions and history (S-A05/A06, S-L02/L03/L05). */
@Component({
  selector: 'st-leistungsziel-eintrag',
  imports: [StufenAnzeige, VerlaufListe],
  templateUrl: './leistungsziel-eintrag.html',
  styleUrl: './leistungsziel-eintrag.scss',
})
export class LeistungszielEintrag implements OnInit {
  readonly ausbildungId = input.required<string>();
  readonly lz = input.required<LeistungszielAnsicht>();
  readonly kompetenz = input.required<Kompetenz>();
  readonly rolle = input.required<Rolle>();
  readonly stufenmodell = input<Stufenmodell>('DREI_STUFEN');
  readonly kannBestaetigen = input(false);
  readonly startOffen = input(false);

  readonly aktualisiert = output<void>();

  private readonly anfrageDienst = inject(AnfrageDienst);
  private readonly bestaetigungDienst = inject(BestaetigungDienst);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  /** Element that opened the inline form, so focus can return after closing it. */
  private ausloeser: HTMLElement | null = null;

  protected readonly offen = signal(false);
  protected readonly modus = signal<Modus>(null);
  protected readonly zielstufe = signal<BestaetigungsStufe>(1);
  protected readonly text = signal('');
  protected readonly kommentar = signal('');
  protected readonly begruendung = signal('');
  protected readonly antwort = signal('');
  protected readonly laeuft = signal(false);
  protected readonly meldung = signal<string | null>(null);
  protected readonly fehler = signal<string | null>(null);

  protected readonly vorschlaege = [
    'Bitte genauer beschreiben, was du gemacht hast.',
    'Noch nicht im Betrieb beobachtet.',
    'Zielstufe ist noch zu hoch.',
  ];

  protected readonly stufenOptionen = computed(() =>
    bestaetigungsStufen(this.stufenmodell()).filter((stufe) => stufe > this.lz().stufe),
  );

  protected readonly lernorte = computed(() => {
    const ziel = this.lz().leistungsziel;
    const kompetenz = this.kompetenz();
    const orte = ziel.lernorte ?? {
      basislehrjahr: kompetenz.moduleBasislehrjahr,
      berufsfachschule: kompetenz.moduleBerufsfachschule,
      uek: kompetenz.moduleUek,
    };
    return [
      { titel: 'Basislehrjahr', werte: orte.basislehrjahr },
      { titel: 'Berufsfachschule', werte: orte.berufsfachschule },
      { titel: 'ÜK', werte: orte.uek },
    ].filter((ort) => ort.werte.length > 0);
  });

  protected readonly statusText = computed(() => {
    const anfrage = this.lz().offeneAnfrage;
    return anfrage ? ANFRAGE_STATUS_TEXTE[anfrage.status] : '';
  });

  protected stufeText(stufe: BestaetigungsStufe | 0): string {
    return stufenText(this.stufenmodell(), stufe);
  }

  ngOnInit(): void {
    if (this.startOffen()) {
      this.offen.set(true);
    }
  }

  protected oeffne(modus: Exclude<Modus, null>): void {
    this.fehler.set(null);
    this.meldung.set(null);
    const aktives = this.host.nativeElement.ownerDocument.activeElement;
    // Only remember triggers inside this row; a stray focus elsewhere must not be restored.
    this.ausloeser =
      aktives instanceof HTMLElement && this.host.nativeElement.contains(aktives) ? aktives : null;
    const offeneZielstufe = this.lz().offeneAnfrage?.zielstufe;
    const erste = this.stufenOptionen()[0] ?? (this.stufenmodell() === 'BINAER' ? 3 : 1);
    this.zielstufe.set(
      offeneZielstufe && offeneZielstufe > this.lz().stufe ? offeneZielstufe : erste,
    );
    this.modus.set(modus);
    // The trigger button is replaced by the form, so focus the first field explicitly.
    afterNextRender(
      () => {
        const feld = this.host.nativeElement.querySelector<HTMLElement>(
          'form.lz__formular select, form.lz__formular textarea',
        );
        feld?.focus();
      },
      { injector: this.injector },
    );
  }

  protected abbrechen(): void {
    this.modus.set(null);
    this.fehler.set(null);
    this.fokusZurueck();
  }

  /** Returns focus to the opener, or to the row toggle when the opener is gone. */
  private fokusZurueck(): void {
    afterNextRender(
      () => {
        const ziel =
          this.ausloeser?.isConnected === true
            ? this.ausloeser
            : this.host.nativeElement.querySelector<HTMLElement>('.lz__aufklappen');
        ziel?.focus();
      },
      { injector: this.injector },
    );
  }

  protected zielstufeAendern(ereignis: Event): void {
    this.zielstufe.set(Number((ereignis.target as HTMLSelectElement).value) as BestaetigungsStufe);
  }

  protected textAendern(ereignis: Event): void {
    this.text.set((ereignis.target as HTMLTextAreaElement).value);
  }

  protected kommentarAendern(ereignis: Event): void {
    this.kommentar.set((ereignis.target as HTMLTextAreaElement).value);
  }

  protected begruendungAendern(ereignis: Event): void {
    this.begruendung.set((ereignis.target as HTMLTextAreaElement).value);
  }

  protected antwortAendern(ereignis: Event): void {
    this.antwort.set((ereignis.target as HTMLTextAreaElement).value);
  }

  protected async anfrageSenden(ereignis: Event): Promise<void> {
    ereignis.preventDefault();
    this.fehler.set(null);
    this.meldung.set(null);
    if (this.text().trim().length < 10) {
      this.fehler.set('Der Text muss mindestens 10 Zeichen enthalten.');
      return;
    }
    this.laeuft.set(true);
    try {
      await this.anfrageDienst.stellen(this.ausbildungId(), {
        leistungszielId: this.lz().leistungsziel.id,
        zielstufe: this.zielstufe(),
        text: this.text(),
      });
      this.meldung.set(
        `Anfrage für «${this.lz().leistungsziel.code}» gesendet. Zielstufe: ${this.stufeText(this.zielstufe())}.`,
      );
      this.text.set('');
      this.modus.set(null);
      this.aktualisiert.emit();
      this.fokusZurueck();
    } catch (fehler) {
      this.fehler.set(fehlerText(fehler));
    } finally {
      this.laeuft.set(false);
    }
  }

  protected async zurueckziehen(anfrageId: string): Promise<void> {
    this.fehler.set(null);
    this.meldung.set(null);
    this.laeuft.set(true);
    try {
      await this.anfrageDienst.zurueckziehen({ anfrageId });
      this.meldung.set('Anfrage zurückgezogen.');
      this.aktualisiert.emit();
    } catch (fehler) {
      this.fehler.set(fehlerText(fehler));
    } finally {
      this.laeuft.set(false);
    }
  }

  protected async bestaetigen(ereignis: Event): Promise<void> {
    ereignis.preventDefault();
    this.fehler.set(null);
    this.meldung.set(null);
    this.laeuft.set(true);
    try {
      const kommentar = this.kommentar().trim();
      const ergebnis = await this.bestaetigungDienst.bestaetigen(this.ausbildungId(), {
        leistungszielId: this.lz().leistungsziel.id,
        stufe: this.zielstufe(),
        ...(kommentar ? { kommentar } : {}),
      });
      this.meldung.set(ergebnis.hinweis);
      this.kommentar.set('');
      this.modus.set(null);
      if (ergebnis.ereignis) {
        this.aktualisiert.emit();
      }
      this.fokusZurueck();
    } catch (fehler) {
      this.fehler.set(fehlerText(fehler));
    } finally {
      this.laeuft.set(false);
    }
  }

  protected async zuruecknehmen(ereignis: Event): Promise<void> {
    ereignis.preventDefault();
    this.fehler.set(null);
    this.meldung.set(null);
    const aktiv = this.lz().aktiveBestaetigung;
    if (!aktiv) {
      return;
    }
    if (this.begruendung().trim().length < 10) {
      this.fehler.set(
        `Die Begründung muss mindestens 10 Zeichen enthalten. Aktuell ${this.begruendung().trim().length} Zeichen.`,
      );
      return;
    }
    this.laeuft.set(true);
    try {
      const ergebnis = await this.bestaetigungDienst.zuruecknehmen(this.ausbildungId(), {
        ereignisId: aktiv.id,
        begruendung: this.begruendung(),
      });
      this.meldung.set(ergebnis.hinweis);
      this.begruendung.set('');
      this.modus.set(null);
      this.aktualisiert.emit();
      this.fokusZurueck();
    } catch (fehler) {
      this.fehler.set(fehlerText(fehler));
    } finally {
      this.laeuft.set(false);
    }
  }

  protected async anfrageAblehnen(ereignis: Event): Promise<void> {
    ereignis.preventDefault();
    this.fehler.set(null);
    this.meldung.set(null);
    const anfrage = this.lz().offeneAnfrage;
    if (!anfrage) {
      return;
    }
    if (this.antwort().trim().length < 10) {
      this.fehler.set(
        `Die Begründung muss mindestens 10 Zeichen enthalten. Aktuell ${this.antwort().trim().length} Zeichen.`,
      );
      return;
    }
    this.laeuft.set(true);
    try {
      await this.anfrageDienst.ablehnen({ anfrageId: anfrage.id, antwort: this.antwort() });
      this.meldung.set('Anfrage abgelehnt.');
      this.antwort.set('');
      this.modus.set(null);
      this.aktualisiert.emit();
      this.fokusZurueck();
    } catch (fehler) {
      this.fehler.set(fehlerText(fehler));
    } finally {
      this.laeuft.set(false);
    }
  }
}
