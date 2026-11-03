import { inject, Service } from '@angular/core';
import type { VorlageId, VorlageImport } from '@skilltree/vertraege';
import { FachlicherFehler } from '@skilltree/vertraege';
import { VORLAGE_REPOSITORY } from '../daten/ports';
import { SitzungDienst } from './sitzung-dienst';
import { fordereRolle } from './zugriff';

export interface ImportMeldung {
  art: 'FEHLER' | 'WARNUNG';
  text: string;
}

export interface ImportBericht {
  lehrberuf: string;
  bereiche: number;
  kompetenzen: number;
  leistungsziele: number;
  meldungen: ImportMeldung[];
  fehler: number;
  warnungen: number;
}

/** Admin-only template import with a mandatory dry run (T-I1, T-I3, T-I6). */
@Service()
export class ImportDienst {
  private readonly vorlageRepository = inject(VORLAGE_REPOSITORY);
  private readonly sitzung = inject(SitzungDienst);

  async trockenlauf(vorlage: unknown): Promise<ImportBericht> {
    fordereRolle(this.sitzung.fordereBenutzer(), 'ADMIN');
    return pruefeVorlageImport(vorlage);
  }

  async importieren(vorlage: unknown): Promise<{ vorlageId: VorlageId; bericht: ImportBericht }> {
    fordereRolle(this.sitzung.fordereBenutzer(), 'ADMIN');
    const bericht = pruefeVorlageImport(vorlage);
    if (bericht.fehler > 0) {
      throw new FachlicherFehler(
        'UNGUELTIGE_EINGABE',
        `Der Import enthält ${bericht.fehler} Fehler. Bitte zuerst korrigieren.`,
      );
    }
    const vorlageId = await this.vorlageRepository.speichern(vorlage as VorlageImport);
    return { vorlageId, bericht };
  }
}

const TAXONOMIEN = new Set(['K1', 'K2', 'K3', 'K4', 'K5', 'K6']);

/** Validates a template JSON and produces the German dry-run report (T-I4). */
export function pruefeVorlageImport(wert: unknown): ImportBericht {
  const meldungen: ImportMeldung[] = [];
  const fehler = (text: string): void => {
    meldungen.push({ art: 'FEHLER', text });
  };
  const warnung = (text: string): void => {
    meldungen.push({ art: 'WARNUNG', text });
  };

  if (!wert || typeof wert !== 'object') {
    fehler('Die Datei enthält kein gültiges JSON-Objekt.');
    return bericht('', 0, 0, 0, meldungen);
  }

  const vorlage = wert as Partial<VorlageImport>;
  if (!vorlage.lehrberuf || typeof vorlage.lehrberuf !== 'object') {
    fehler('Der Lehrberuf fehlt.');
  } else {
    if (!vorlage.lehrberuf.code) {
      fehler('Der Lehrberuf-Code fehlt.');
    }
    if (!vorlage.lehrberuf.name) {
      fehler('Der Lehrberuf-Name fehlt.');
    }
    if (!Number.isFinite(vorlage.lehrberuf.lehrdauerJahre)) {
      fehler('Die Lehrdauer fehlt.');
    }
  }
  if (!Number.isFinite(vorlage.bildungsplanJahr)) {
    fehler('Das Bildungsplanjahr fehlt.');
  }
  if (!vorlage.quelle) {
    fehler('Die Quellenangabe fehlt.');
  }
  if (!Array.isArray(vorlage.bereiche) || vorlage.bereiche.length === 0) {
    fehler('Es sind keine Bereiche vorhanden.');
    return bericht(vorlage.lehrberuf?.name ?? '', 0, 0, 0, meldungen);
  }

  const bereichCodes = new Set<string>();
  const kompetenzCodes = new Set<string>();
  const zielCodes = new Map<string, { text: string; kompetenz: string }>();
  let kompetenzen = 0;
  let leistungsziele = 0;

  for (const [bereichIndex, bereich] of vorlage.bereiche.entries()) {
    const ort = `Bereich ${bereichIndex + 1}`;
    if (!bereich?.code) {
      fehler(`${ort}: Der Bereichscode fehlt.`);
    } else {
      const code = bereich.code.toUpperCase();
      if (bereichCodes.has(code)) {
        fehler(`${ort}: Der Bereichscode «${code}» kommt mehrfach vor.`);
      }
      bereichCodes.add(code);
    }
    if (!bereich?.titel) {
      warnung(`${ort}: Der Bereichstitel fehlt.`);
    }
    if (!Array.isArray(bereich?.kompetenzen) || bereich.kompetenzen.length === 0) {
      fehler(`${ort}: Es sind keine Kompetenzen vorhanden.`);
      continue;
    }

    for (const [kompetenzIndex, kompetenz] of bereich.kompetenzen.entries()) {
      kompetenzen++;
      const kompetenzOrt = `${ort}, Kompetenz ${kompetenzIndex + 1}`;
      if (!kompetenz?.code) {
        fehler(`${kompetenzOrt}: Der Kompetenzcode fehlt.`);
      } else {
        if (kompetenzCodes.has(kompetenz.code)) {
          fehler(`${kompetenzOrt}: Der Kompetenzcode «${kompetenz.code}» kommt mehrfach vor.`);
        }
        kompetenzCodes.add(kompetenz.code);
      }
      if (!kompetenz?.titel) {
        warnung(`${kompetenzOrt}: Der Kompetenztitel fehlt.`);
      }
      if (!kompetenz?.module || typeof kompetenz.module !== 'object') {
        fehler(`${kompetenzOrt}: Die Module fehlen.`);
      } else {
        for (const [name, liste] of [
          ['Basislehrjahr', kompetenz.module.basislehrjahr],
          ['Berufsfachschule', kompetenz.module.berufsfachschule],
          ['ÜK', kompetenz.module.uek],
        ] as const) {
          if (!Array.isArray(liste)) {
            fehler(`${kompetenzOrt}: Die Module «${name}» sind keine Liste.`);
          }
        }
      }
      if (!Array.isArray(kompetenz?.leistungsziele) || kompetenz.leistungsziele.length === 0) {
        fehler(`${kompetenzOrt}: Es sind keine Leistungsziele vorhanden.`);
        continue;
      }
      const kompetenzKennung = kompetenz.code || kompetenzOrt;
      for (const [zielIndex, ziel] of kompetenz.leistungsziele.entries()) {
        leistungsziele++;
        const zielOrt = `${kompetenzOrt}, Leistungsziel ${zielIndex + 1}`;
        if (!ziel?.code) {
          fehler(`${zielOrt}: Der Leistungsziel-Code fehlt.`);
        } else {
          const vorhanden = zielCodes.get(ziel.code);
          if (!vorhanden) {
            zielCodes.set(ziel.code, { text: ziel.text ?? '', kompetenz: kompetenzKennung });
          } else if (vorhanden.kompetenz !== kompetenzKennung) {
            fehler(
              `${zielOrt}: Der Code «${ziel.code}» kommt bereits in der Kompetenz «${vorhanden.kompetenz}» vor.`,
            );
          } else if (vorhanden.text !== ziel.text) {
            fehler(
              `${zielOrt}: Der Code «${ziel.code}» kommt mit unterschiedlichem Text mehrfach vor.`,
            );
          } else {
            warnung(
              `${zielOrt}: Der Code «${ziel.code}» ist in dieser Kompetenz doppelt und wird zusammengeführt.`,
            );
          }
        }
        if (!ziel?.text) {
          fehler(`${zielOrt}: Der Text fehlt.`);
        }
        if (!ziel?.taxonomie || !TAXONOMIEN.has(ziel.taxonomie)) {
          fehler(`${zielOrt}: Die Taxonomiestufe fehlt oder ist ungültig.`);
        }
      }
    }
  }

  return bericht(
    vorlage.lehrberuf?.name ?? '',
    vorlage.bereiche.length,
    kompetenzen,
    leistungsziele,
    meldungen,
  );
}

function bericht(
  lehrberuf: string,
  bereiche: number,
  kompetenzen: number,
  leistungsziele: number,
  meldungen: ImportMeldung[],
): ImportBericht {
  return {
    lehrberuf,
    bereiche,
    kompetenzen,
    leistungsziele,
    meldungen,
    fehler: meldungen.filter((meldung) => meldung.art === 'FEHLER').length,
    warnungen: meldungen.filter((meldung) => meldung.art === 'WARNUNG').length,
  };
}
