import type {
  MeilensteinCode,
  MeilensteinEreignis,
  Stufe,
  Stufenmodell,
} from '@skilltree/vertraege';
import { MEILENSTEINE } from '@skilltree/vertraege';
import { ampel, fortschritt, kompetenzwert } from './fortschritt';
import type { PlanIndex } from './plan';

export interface MeilensteinStatus {
  erreicht: boolean;
  erreichtAm: string | null;
  aktivesEreignis: MeilensteinEreignis | null;
}

export type MeilensteinStati = Record<MeilensteinCode, MeilensteinStatus>;

/**
 * A milestone is reached when there is an active ERREICHT event. Reversals are
 * append-only and reference exactly one ERREICHT event.
 */
export function meilensteinStati(ereignisse: readonly MeilensteinEreignis[]): MeilensteinStati {
  const zurueckgenommen = new Set<string>();
  for (const ereignis of ereignisse) {
    if (ereignis.aktion === 'ZURUECKGENOMMEN' && ereignis.refEreignisId) {
      zurueckgenommen.add(ereignis.refEreignisId);
    }
  }

  const statuse: MeilensteinStati = {
    BBC: { erreicht: false, erreichtAm: null, aktivesEreignis: null },
    IPA: { erreicht: false, erreichtAm: null, aktivesEreignis: null },
    LAP: { erreicht: false, erreichtAm: null, aktivesEreignis: null },
  };

  for (const ereignis of ereignisse) {
    if (ereignis.aktion !== 'ERREICHT' || zurueckgenommen.has(ereignis.id)) {
      continue;
    }
    const vorher = statuse[ereignis.meilenstein];
    if (!vorher.erreicht) {
      statuse[ereignis.meilenstein] = {
        erreicht: true,
        erreichtAm: ereignis.zeitpunkt,
        aktivesEreignis: ereignis,
      };
    }
  }

  return statuse;
}

export function meilensteinStatusMap(stati: MeilensteinStati): Record<MeilensteinCode, boolean> {
  return {
    BBC: stati.BBC.erreicht,
    IPA: stati.IPA.erreicht,
    LAP: stati.LAP.erreicht,
  };
}

/**
 * R-M1-R-M3: readiness text shown in the milestone sidebar.
 */
export function meilensteinBereitschaft(
  code: MeilensteinCode,
  index: PlanIndex,
  stufen: ReadonlyMap<string, Stufe>,
  stati: MeilensteinStati,
  gesamtfortschritt: number,
  modell: Stufenmodell = 'DREI_STUFEN',
): string {
  switch (code) {
    case 'BBC': {
      const ziele = index.aktiveLeistungszielIds
        .map((id) => index.leistungszielNachId.get(id))
        .filter((ziel) => {
          if (!ziel) {
            return false;
          }
          // N-05 / D-016: only a missing learning-location record falls back to the competence's
          // modules. An explicit empty list means "not taught in the Basislehrjahr".
          const eigene = ziel.lernorte ? (ziel.lernorte.basislehrjahr ?? []) : null;
          const kompetenz = index.kompetenzNachId.get(ziel.kompetenzId)?.kompetenz;
          const orte = eigene ?? kompetenz?.moduleBasislehrjahr ?? [];
          return orte.length > 0;
        });
      if (ziele.length === 0) {
        return 'Die Praxisbildnerin / der Praxisbildner bestätigt den Basismeilenstein.';
      }
      const erreicht = ziele.filter((ziel) =>
        ziel ? (stufen.get(ziel.id) ?? 0) >= 1 : false,
      ).length;
      return modell === 'BINAER'
        ? `${erreicht} von ${ziele.length} Leistungszielen mit Lernort Basislehrjahr abgeschlossen.`
        : `${erreicht} von ${ziele.length} Leistungszielen mit Lernort Basislehrjahr mindestens erklärt.`;
    }
    case 'IPA': {
      const nichtRot = index.bereiche
        .flatMap((bereich) => bereich.kompetenzen)
        .filter(
          (kompetenz) => ampel(kompetenzwert(kompetenz.leistungszielIds, stufen)) !== 'ROT',
        ).length;
      const gesamt = index.kompetenzNachId.size;
      return `${nichtRot} von ${gesamt} Kompetenzen nicht rot.`;
    }
    case 'LAP': {
      const ipa = stati.IPA.erreicht ? 'IPA bestanden' : 'IPA offen';
      return `${ipa} · Gesamtfortschritt ${fortschritt(index.aktiveLeistungszielIds, stufen)} %`;
    }
  }
}

export function alleMeilensteinErgebnisse(
  index: PlanIndex,
  stufen: ReadonlyMap<string, Stufe>,
  stati: MeilensteinStati,
  modell: Stufenmodell = 'DREI_STUFEN',
): { code: MeilensteinCode; bereitschaft: string }[] {
  const gesamt = fortschritt(index.aktiveLeistungszielIds, stufen);
  return MEILENSTEINE.map((code) => ({
    code,
    bereitschaft: meilensteinBereitschaft(code, index, stufen, stati, gesamt, modell),
  }));
}
