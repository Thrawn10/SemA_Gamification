import type {
  BadgeDefinition,
  BadgeVergabe,
  MeilensteinCode,
  MeilensteinEreignis,
  Stufe,
  Stufenereignis,
  Stufenmodell,
  VorlageStruktur,
} from '@skilltree/vertraege';
import {
  ABSCHLUSS_STUFE,
  MEILENSTEINE,
  meilensteinTexteFuer,
  stufenText,
} from '@skilltree/vertraege';
import { fortschritt, punktwert } from './fortschritt';
import { meilensteinStati, meilensteinStatusMap } from './meilensteine';
import type { PlanIndex } from './plan';
import { aktiveBestaetigungen, stufenMapFuerModell } from './stufen';

/** Competence-count thresholds of the reduced badge set (D-025). */
const SCHWELLEN = [5, 10, 15] as const;

type MeilensteinErreicht = Readonly<Record<MeilensteinCode, boolean>>;

const KEINE_MEILENSTEINE: MeilensteinErreicht = { BBC: false, IPA: false, LAP: false };

function stufenFuerModell(modell: Stufenmodell): readonly Stufe[] {
  return modell === 'BINAER' ? [ABSCHLUSS_STUFE] : [1, 2, 3];
}

function kompetenzenAufStufe(
  index: PlanIndex,
  stufen: ReadonlyMap<string, Stufe>,
  mindestStufe: Stufe,
): number {
  let anzahl = 0;
  for (const kompetenz of index.kompetenzNachId.values()) {
    if (
      kompetenz.leistungszielIds.length > 0 &&
      kompetenz.leistungszielIds.every((id) => (stufen.get(id) ?? 0) >= mindestStufe)
    ) {
      anzahl += 1;
    }
  }
  return anzahl;
}

/** Competences that carry at least one active objective and can therefore count for a badge. */
function kompetenzenMitZielen(index: PlanIndex): number {
  let anzahl = 0;
  for (const kompetenz of index.kompetenzNachId.values()) {
    if (kompetenz.leistungszielIds.length > 0) {
      anzahl += 1;
    }
  }
  return anzahl;
}

/**
 * R-B1-R-B4 / R-B8: deterministic badge definitions for a template. The reduced set
 * contains milestone badges, one badge per area, three stage-count badges per stage
 * (5/10/15 competences) and one badge for all competences.
 */
export function erstelleBadgeDefinitionen(
  struktur: VorlageStruktur,
  vorlageId: string,
  modell: Stufenmodell = 'DREI_STUFEN',
): BadgeDefinition[] {
  const definitionen: BadgeDefinition[] = [];
  const bereiche = [...struktur.bereiche].sort((a, b) => a.reihenfolge - b.reihenfolge);
  const topLevel = stufenText(modell, ABSCHLUSS_STUFE);
  // A competence without active objectives can never reach a stage and must not raise a threshold.
  // Restricting the ids to the plan structure keeps the threshold in sync with the evaluation.
  const bekannteKompetenzen = new Set(struktur.kompetenzen.map((kompetenz) => kompetenz.id));
  const kompetenzAnzahl = new Set(
    struktur.leistungsziele
      .filter((ziel) => !ziel.archiviert && bekannteKompetenzen.has(ziel.kompetenzId))
      .map((ziel) => ziel.kompetenzId),
  ).size;
  let reihenfolge = 0;

  for (const code of MEILENSTEINE) {
    const texte = meilensteinTexteFuer(code, modell);
    definitionen.push({
      id: `${vorlageId}:M-${code}`,
      vorlageId,
      code: `M-${code}`,
      titel: `${texte.name} erreicht`,
      kriterium: `Der Meilenstein «${texte.name}» ist erreicht.`,
      regeltyp: 'MEILENSTEIN_ERREICHT',
      parameter: { meilenstein: code },
      reihenfolge: reihenfolge++,
    });
  }

  for (const bereich of bereiche) {
    definitionen.push({
      id: `${vorlageId}:BA-${bereich.code}`,
      vorlageId,
      code: `BA-${bereich.code}`,
      titel: `Bereich ${bereich.code} abgeschlossen`,
      kriterium: `Alle Leistungsziele von Bereich ${bereich.code} sind ${topLevel}.`,
      regeltyp: 'BEREICH_ABGESCHLOSSEN',
      parameter: { bereichId: bereich.id },
      reihenfolge: reihenfolge++,
    });
  }

  for (const stufe of stufenFuerModell(modell)) {
    const wort = stufenText(modell, stufe);
    for (const anzahl of SCHWELLEN) {
      // A badge for 10 or 15 competences is unreachable in a plan with fewer competences.
      if (anzahl > kompetenzAnzahl) {
        continue;
      }
      definitionen.push({
        id: `${vorlageId}:K${stufe}-${anzahl}`,
        vorlageId,
        code: `K${stufe}-${anzahl}`,
        titel: `${anzahl} Kompetenzen ${wort}`,
        kriterium: `Mindestens ${anzahl} Kompetenzen haben alle Leistungsziele ${wort}.`,
        regeltyp: 'KOMPETENZ_ANZAHL',
        parameter: { stufe, anzahl },
        reihenfolge: reihenfolge++,
      });
    }
  }

  definitionen.push({
    id: `${vorlageId}:K-ALLE`,
    vorlageId,
    code: 'K-ALLE',
    titel: `Alle Kompetenzen ${topLevel}`,
    kriterium: `Alle Kompetenzen haben alle Leistungsziele ${topLevel}.`,
    regeltyp: 'ALLE_KOMPETENZEN',
    parameter: {},
    reihenfolge: reihenfolge++,
  });

  return definitionen;
}

/** True for a stored badge set that already uses the reduced rules (D-025). */
export function istAktuellesBadgeSet(definitionen: readonly BadgeDefinition[]): boolean {
  return definitionen.some((definition) => definition.regeltyp === 'MEILENSTEIN_ERREICHT');
}

export interface BadgeBedingungErgebnis {
  erfuellt: boolean;
  aktuell: number;
  gesamt: number;
}

export function badgeBedingung(
  definition: BadgeDefinition,
  index: PlanIndex,
  stufen: ReadonlyMap<string, Stufe>,
  meilensteine: MeilensteinErreicht = KEINE_MEILENSTEINE,
): BadgeBedingungErgebnis {
  switch (definition.regeltyp) {
    case 'MEILENSTEIN_ERREICHT': {
      const code = definition.parameter.meilenstein;
      const erfuellt = code ? meilensteine[code] === true : false;
      return { erfuellt, aktuell: erfuellt ? 1 : 0, gesamt: 1 };
    }
    case 'BEREICH_ABGESCHLOSSEN': {
      const ziele = zieleFuerBereich(definition, index);
      const aktuell = ziele.filter((id) => (stufen.get(id) ?? 0) === ABSCHLUSS_STUFE).length;
      return {
        erfuellt: ziele.length > 0 && aktuell === ziele.length,
        aktuell,
        gesamt: ziele.length,
      };
    }
    case 'KOMPETENZ_ANZAHL': {
      const stufe = definition.parameter.stufe ?? ABSCHLUSS_STUFE;
      const anzahl = definition.parameter.anzahl ?? 0;
      const erreicht = kompetenzenAufStufe(index, stufen, stufe);
      // Progress is measured against the badge threshold, not against the whole plan.
      return {
        erfuellt: anzahl > 0 && erreicht >= anzahl,
        aktuell: anzahl > 0 ? Math.min(erreicht, anzahl) : erreicht,
        gesamt: anzahl,
      };
    }
    case 'ALLE_KOMPETENZEN': {
      const aktuell = kompetenzenAufStufe(index, stufen, ABSCHLUSS_STUFE);
      const gesamt = kompetenzenMitZielen(index);
      return { erfuellt: gesamt > 0 && aktuell === gesamt, aktuell, gesamt };
    }
  }
}

function zieleFuerBereich(definition: BadgeDefinition, index: PlanIndex): string[] {
  const bereichId = definition.parameter.bereichId;
  if (!bereichId) {
    return [];
  }
  return (index.bereichNachId.get(bereichId)?.kompetenzen ?? []).flatMap(
    (kompetenz) => kompetenz.leistungszielIds,
  );
}

export function badgeFortschrittText(
  definition: BadgeDefinition,
  bedingung: BadgeBedingungErgebnis,
  modell: Stufenmodell = 'DREI_STUFEN',
): string {
  switch (definition.regeltyp) {
    case 'MEILENSTEIN_ERREICHT':
      return bedingung.erfuellt ? 'Meilenstein erreicht' : 'Meilenstein noch nicht erreicht';
    case 'BEREICH_ABGESCHLOSSEN':
      return `${bedingung.aktuell} von ${bedingung.gesamt} Leistungszielen ${stufenText(modell, ABSCHLUSS_STUFE)}`;
    case 'KOMPETENZ_ANZAHL': {
      if (bedingung.gesamt <= 0) {
        return 'Kein Schwellenwert für dieses Badge definiert';
      }
      const stufe = definition.parameter.stufe ?? ABSCHLUSS_STUFE;
      // "nötigen" makes clear the second number is the badge threshold, not the plan size (D-025).
      return `${bedingung.aktuell} von ${bedingung.gesamt} nötigen Kompetenzen ${stufenText(modell, stufe)}`;
    }
    case 'ALLE_KOMPETENZEN':
      if (bedingung.gesamt <= 0) {
        return 'Keine Kompetenzen für dieses Badge erfasst';
      }
      return `${bedingung.aktuell} von ${bedingung.gesamt} Kompetenzen ${stufenText(modell, ABSCHLUSS_STUFE)}`;
  }
}

type ZeitlinieEintrag =
  | { art: 'STUFE'; zeitpunkt: string; ereignis: Stufenereignis }
  | { art: 'MEILENSTEIN'; zeitpunkt: string; ereignis: MeilensteinEreignis };

/**
 * R-B5 / R-B8: replay all stage and milestone events in chronological order and derive
 * badge allocations. The result equals the materialised state after the same events.
 */
export function berechneBadgeVergaben(
  definitionen: readonly BadgeDefinition[],
  index: PlanIndex,
  ereignisse: readonly Stufenereignis[],
  ausbildungId: string,
  modell: Stufenmodell = 'DREI_STUFEN',
  meilensteinereignisse: readonly MeilensteinEreignis[] = [],
): BadgeVergabe[] {
  const zeitlinie: ZeitlinieEintrag[] = [
    ...ereignisse.map((ereignis) => ({
      art: 'STUFE' as const,
      zeitpunkt: ereignis.zeitpunkt,
      ereignis,
    })),
    ...meilensteinereignisse.map((ereignis) => ({
      art: 'MEILENSTEIN' as const,
      zeitpunkt: ereignis.zeitpunkt,
      ereignis,
    })),
  ].sort((a, b) => a.zeitpunkt.localeCompare(b.zeitpunkt));

  const aktiveStufen = new Map<string, Stufenereignis>();
  const aktiveMeilensteine: MeilensteinEreignis[] = [];
  const vergaben = new Map<string, BadgeVergabe>();

  for (const eintrag of zeitlinie) {
    if (eintrag.art === 'STUFE') {
      const ereignis = eintrag.ereignis;
      if (ereignis.aktion === 'ZURUECKGENOMMEN') {
        if (ereignis.refEreignisId) {
          aktiveStufen.delete(ereignis.refEreignisId);
        }
      } else {
        aktiveStufen.set(ereignis.id, ereignis);
      }
    } else {
      aktiveMeilensteine.push(eintrag.ereignis);
    }

    const stufen = stufenMapFuerModell([...aktiveStufen.values()], modell);
    const meilensteine = meilensteinStatusMap(meilensteinStati(aktiveMeilensteine));

    for (const definition of definitionen) {
      const bedingung = badgeBedingung(definition, index, stufen, meilensteine);
      const vorhanden = vergaben.get(definition.id);

      if (bedingung.erfuellt && !vorhanden) {
        vergaben.set(definition.id, {
          id: `${ausbildungId}:${definition.id}`,
          ausbildungId,
          badgeId: definition.id,
          vergebenAm: eintrag.zeitpunkt,
          aktiv: true,
          ausStartstand: eintrag.art === 'STUFE' && eintrag.ereignis.aktion === 'UEBERNOMMEN',
        });
      } else if (bedingung.erfuellt && vorhanden && !vorhanden.aktiv) {
        // Reactivation keeps the original award date (R-B5, TF3c).
        vergaben.set(definition.id, {
          ...vorhanden,
          aktiv: true,
          inaktivSeit: undefined,
        });
      } else if (!bedingung.erfuellt && vorhanden?.aktiv) {
        vergaben.set(definition.id, {
          ...vorhanden,
          aktiv: false,
          inaktivSeit: eintrag.zeitpunkt,
        });
      }
    }
  }

  return [...vergaben.values()];
}

/** Badge progress when no badge has been awarded yet. */
export function offenerBadgeFortschritt(
  definition: BadgeDefinition,
  index: PlanIndex,
  stufen: ReadonlyMap<string, Stufe>,
  meilensteine: MeilensteinErreicht = KEINE_MEILENSTEINE,
): BadgeBedingungErgebnis {
  return badgeBedingung(definition, index, stufen, meilensteine);
}

/** Only used by tests and the seed to verify that replay equals a stored state. */
export function summePunktwerte(index: PlanIndex, stufen: ReadonlyMap<string, Stufe>): number {
  let summe = 0;
  for (const id of index.aktiveLeistungszielIds) {
    summe += punktwert(stufen.get(id) ?? 0);
  }
  return summe;
}

export function gesamtfortschritt(index: PlanIndex, stufen: ReadonlyMap<string, Stufe>): number {
  return fortschritt(index.aktiveLeistungszielIds, stufen);
}

/** True when the given events contain at least one active confirmation. */
export function hatAktiveBestaetigung(ereignisse: readonly Stufenereignis[]): boolean {
  return aktiveBestaetigungen(ereignisse).length > 0;
}
