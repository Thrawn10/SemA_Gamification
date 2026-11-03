import { DatePipe } from '@angular/common';
import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import type { DatenbestandJson } from '@skilltree/vertraege';
import { fehlerText } from '../core/fehler';
import { DatenverwaltungDienst, pruefeDatenbestand } from '../dienste/datenverwaltung-dienst';
import type { ImportBericht } from '../dienste/import-dienst';
import { ImportDienst } from '../dienste/import-dienst';
import { AnforderungId } from '../shared/ui/anforderung-id';

/**
 * Admin route: template import with dry run plus backup, restore and reset of the
 * local data set (T-I1, T-I3, T-W6).
 */
@Component({
  selector: 'st-admin-import-seite',
  imports: [AnforderungId, DatePipe],
  templateUrl: './admin-import-seite.html',
  styleUrl: './admin-import-seite.scss',
})
export class AdminImportSeite {
  private readonly datenverwaltung = inject(DatenverwaltungDienst);
  private readonly importDienst = inject(ImportDienst);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly meldung = signal<string | null>(null);
  protected readonly fehler = signal<string | null>(null);
  protected readonly laeuft = signal(false);

  protected readonly vorlageName = signal<string | null>(null);
  protected readonly vorlage = signal<unknown | null>(null);
  protected readonly bericht = signal<ImportBericht | null>(null);

  protected readonly importVorschau = signal<DatenbestandJson | null>(null);
  protected readonly resetOffen = signal(false);

  protected readonly kannImportieren = computed(() => {
    const pruefung = this.bericht();
    return pruefung !== null && pruefung.fehler === 0;
  });

  protected async vorlageDateiGewaehlt(ereignis: Event): Promise<void> {
    const datei = dateiAus(ereignis);
    if (!datei) {
      return;
    }
    this.zuruecksetzenMeldungen();
    this.bericht.set(null);
    try {
      this.vorlage.set(await leseJson(datei));
      this.vorlageName.set(datei.name);
    } catch (fehler) {
      this.vorlage.set(null);
      this.vorlageName.set(null);
      this.fehler.set(fehlerText(fehler));
    }
  }

  protected async trockenlauf(): Promise<void> {
    const vorlage = this.vorlage();
    if (!vorlage) {
      return;
    }
    this.laeuft.set(true);
    this.zuruecksetzenMeldungen();
    try {
      this.bericht.set(await this.importDienst.trockenlauf(vorlage));
    } catch (fehler) {
      this.fehler.set(fehlerText(fehler));
    } finally {
      this.laeuft.set(false);
    }
  }

  protected async vorlageImportieren(): Promise<void> {
    const vorlage = this.vorlage();
    if (!vorlage) {
      return;
    }
    this.laeuft.set(true);
    this.zuruecksetzenMeldungen();
    try {
      const ergebnis = await this.importDienst.importieren(vorlage);
      this.meldung.set(
        `Vorlage «${ergebnis.bericht.lehrberuf}» übernommen: ${ergebnis.bericht.bereiche} Bereiche, ` +
          `${ergebnis.bericht.kompetenzen} Kompetenzen, ${ergebnis.bericht.leistungsziele} Leistungsziele.`,
      );
      this.bericht.set(null);
      this.vorlage.set(null);
      this.vorlageName.set(null);
      this.fokussiere('[data-fokus="vorlage-datei"]');
    } catch (fehler) {
      this.fehler.set(fehlerText(fehler));
    } finally {
      this.laeuft.set(false);
    }
  }

  protected async datenbestandDateiGewaehlt(ereignis: Event): Promise<void> {
    const datei = dateiAus(ereignis);
    if (!datei) {
      return;
    }
    this.zuruecksetzenMeldungen();
    this.importVorschau.set(null);
    try {
      const daten = await leseJson(datei);
      pruefeDatenbestand(daten);
      this.importVorschau.set(daten);
    } catch (fehler) {
      this.fehler.set(fehlerText(fehler));
    }
  }

  protected importVerwerfen(): void {
    this.importVorschau.set(null);
    this.fokussiere('[data-fokus="bestand-datei"]');
  }

  protected async datenbestandErsetzen(): Promise<void> {
    const daten = this.importVorschau();
    if (!daten) {
      return;
    }
    this.laeuft.set(true);
    this.zuruecksetzenMeldungen();
    try {
      await this.datenverwaltung.importieren(daten);
      this.importVorschau.set(null);
      this.meldung.set('Datenbestand ersetzt. Alle Kennzahlen stammen jetzt aus der Datei.');
      this.fokussiere('[data-fokus="bestand-datei"]');
    } catch (fehler) {
      this.fehler.set(fehlerText(fehler));
    } finally {
      this.laeuft.set(false);
    }
  }

  protected async exportieren(): Promise<void> {
    this.laeuft.set(true);
    this.zuruecksetzenMeldungen();
    try {
      const daten = await this.datenverwaltung.exportieren();
      const blob = new Blob([JSON.stringify(daten, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `skilltree-datenbestand-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      this.meldung.set('Datenbestand exportiert.');
    } catch (fehler) {
      this.fehler.set(fehlerText(fehler));
    } finally {
      this.laeuft.set(false);
    }
  }

  protected async zuruecksetzen(): Promise<void> {
    this.laeuft.set(true);
    this.zuruecksetzenMeldungen();
    try {
      await this.datenverwaltung.zuruecksetzen();
      this.resetOffen.set(false);
      this.meldung.set('Demo-Daten wiederhergestellt.');
      this.fokussiere('[data-fokus="reset-knopf"]');
    } catch (fehler) {
      this.fehler.set(fehlerText(fehler));
    } finally {
      this.laeuft.set(false);
    }
  }

  protected resetAnfragen(): void {
    this.resetOffen.set(true);
    this.fokussiere('[data-fokus="reset-bestaetigen"]');
  }

  protected resetAbbrechen(): void {
    this.resetOffen.set(false);
    this.fokussiere('[data-fokus="reset-knopf"]');
  }

  /** Moves focus to a control that stays mounted after the previous one disappeared. */
  private fokussiere(selektor: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selektor)?.focus(), {
      injector: this.injector,
    });
  }

  private zuruecksetzenMeldungen(): void {
    this.meldung.set(null);
    this.fehler.set(null);
  }
}

function dateiAus(ereignis: Event): File | null {
  const eingabe = ereignis.target as HTMLInputElement;
  return eingabe.files?.[0] ?? null;
}

async function leseJson(datei: File): Promise<unknown> {
  const text = await datei.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Die Datei «${datei.name}» enthält kein gültiges JSON.`);
  }
}
