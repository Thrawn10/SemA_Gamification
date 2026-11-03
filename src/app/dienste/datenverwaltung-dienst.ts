import { inject, Service } from '@angular/core';
import type { DatenbestandJson } from '@skilltree/vertraege';
import { FachlicherFehler } from '@skilltree/vertraege';
import { DomaenenEreignisse } from '../core/domaenen-ereignisse';
import { DEMO_MODE } from '../core/konfiguration';
import { DATENBESTAND_PORT } from '../daten/ports';
import { SitzungDienst } from './sitzung-dienst';
import { fordereRolle } from './zugriff';

/**
 * Admin-only access to the whole data set (T-W6). The UI never talks to the
 * data-set port directly (SPEC 0.7).
 */
@Service()
export class DatenverwaltungDienst {
  private readonly datenbestand = inject(DATENBESTAND_PORT);
  private readonly sitzung = inject(SitzungDienst);
  private readonly domaenenEreignisse = inject(DomaenenEreignisse);

  async exportieren(): Promise<DatenbestandJson> {
    fordereRolle(this.sitzung.fordereBenutzer(), 'ADMIN');
    return this.datenbestand.exportieren();
  }

  async importieren(daten: DatenbestandJson): Promise<void> {
    fordereRolle(this.sitzung.fordereBenutzer(), 'ADMIN');
    pruefeDatenbestand(daten);
    await this.datenbestand.importieren(daten);
    this.domaenenEreignisse.melde({ art: 'DATEN_IMPORTIERT' });
  }

  async zuruecksetzen(): Promise<void> {
    // ANNAHME: Die violette Demo-Steuerung (N-11) darf den Seed-Stand in jeder Rolle
    // wiederherstellen, weil Forschende sonst nur als Admin zurücksetzen könnten (D-013).
    if (!DEMO_MODE) {
      fordereRolle(this.sitzung.fordereBenutzer(), 'ADMIN');
    }
    await this.datenbestand.zuruecksetzen();
    this.domaenenEreignisse.melde({ art: 'DATEN_ZURUECKGESETZT' });
  }
}

/** Structural validation of an exported data set before it replaces the local one. */
export function pruefeDatenbestand(daten: unknown): asserts daten is DatenbestandJson {
  if (!daten || typeof daten !== 'object') {
    throw new FachlicherFehler(
      'UNGUELTIGE_EINGABE',
      'Die Datei enthält kein gültiges JSON-Objekt.',
    );
  }
  const bestand = daten as Partial<DatenbestandJson>;
  if (bestand.version !== 1) {
    throw new FachlicherFehler(
      'UNGUELTIGE_EINGABE',
      'Unbekannte Datenbestand-Version. Erwartet wird Version 1.',
    );
  }
  const pflichtfelder: (keyof DatenbestandJson)[] = [
    'lehrberufe',
    'vorlagen',
    'bereiche',
    'kompetenzen',
    'leistungsziele',
    'abhaengigkeiten',
    'benutzer',
    'einstellungen',
    'ausbildungen',
    'zuordnungen',
    'stufenereignisse',
    'meilensteinereignisse',
    'anfragen',
    'badgeDefinitionen',
    'badgeVergaben',
  ];
  for (const feld of pflichtfelder) {
    if (!Array.isArray(bestand[feld])) {
      throw new FachlicherFehler(
        'UNGUELTIGE_EINGABE',
        `Im Datenbestand fehlt die Liste «${feld}».`,
      );
    }
  }
}
