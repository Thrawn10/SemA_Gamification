import type {
  BadgeDefinition,
  BadgeVergabe,
  Stufe,
  Stufenereignis,
  VorlageStruktur,
} from '@skilltree/vertraege';
import { fortschritt, punktwert } from './fortschritt';
import type { PlanIndex } from './plan';
import { aktiveBestaetigungen, stufenMap } from './stufen';

const ANTEILE = [25, 50, 75, 100] as const;

/** R-B1-R-B4 / R-B8: deterministic badge definitions for a template. */
export function erstelleBadgeDefinitionen(
  struktur: VorlageStruktur,
  vorlageId: string,
): BadgeDefinition[] {
  const definitionen: BadgeDefinition[] = [];
  let reihenfolge = 0;

  for (const bereich of [...struktur.bereiche].sort((a, b) => a.reihenfolge - b.reihenfolge)) {
    definitionen.push({
      id: `${vorlageId}:BG-${bereich.code}`,
      vorlageId,
      code: `BG-${bereich.code}`,
      titel: `Bereich ${bereich.code} gestartet`,
      kriterium: `Mindestens ein Leistungsziel von Bereich ${bereich.code} ist mindestens erklärt.`,
      regeltyp: 'BEREICH_GESTARTET',
      parameter: { bereichId: bereich.id },
      reihenfolge: reihenfolge++,
    });
  }

  for (const bereich of [...struktur.bereiche].sort((a, b) => a.reihenfolge - b.reihenfolge)) {
    for (const kompetenz of struktur.kompetenzen
      .filter((eintrag) => eintrag.bereichId === bereich.id)
      .sort((a, b) => a.reihenfolge - b.reihenfolge)) {
      definitionen.push({
        id: `${vorlageId}:KS-${kompetenz.code}`,
        vorlageId,
        code: `KS-${kompetenz.code}`,
        titel: `${kompetenz.code} selbständig`,
        kriterium: `Alle Leistungsziele von ${kompetenz.code} sind selbständig.`,
        regeltyp: 'KOMPETENZ_SELBSTAENDIG',
        parameter: { kompetenzId: kompetenz.id },
        reihenfolge: reihenfolge++,
      });
    }
  }

  for (const bereich of [...struktur.bereiche].sort((a, b) => a.reihenfolge - b.reihenfolge)) {
    definitionen.push({
      id: `${vorlageId}:BA-${bereich.code}`,
      vorlageId,
      code: `BA-${bereich.code}`,
      titel: `Bereich ${bereich.code} abgeschlossen`,
      kriterium: `Alle Leistungsziele von Bereich ${bereich.code} sind selbständig.`,
      regeltyp: 'BEREICH_ABGESCHLOSSEN',
      parameter: { bereichId: bereich.id },
      reihenfolge: reihenfolge++,
    });
  }

  for (const anteil of ANTEILE) {
    definitionen.push({
      id: `${vorlageId}:MS-${anteil}`,
      vorlageId,
      code: `MS-${anteil}`,
      titel: `Meilenstein ${anteil} %`,
      kriterium: `Mindestens ${anteil} % aller Leistungsziele sind selbständig.`,
      regeltyp: 'MEILENSTEIN',
      parameter: { anteil },
      reihenfolge: reihenfolge++,
    });
  }

  return definitionen;
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
): BadgeBedingungErgebnis {
  const ziele = zieleFuerDefinition(definition, index);
  switch (definition.regeltyp) {
    case 'BEREICH_GESTARTET': {
      const aktuell = ziele.filter((id) => (stufen.get(id) ?? 0) >= 1).length;
      return { erfuellt: aktuell > 0, aktuell, gesamt: ziele.length };
    }
    case 'KOMPETENZ_SELBSTAENDIG':
    case 'BEREICH_ABGESCHLOSSEN': {
      const aktuell = ziele.filter((id) => (stufen.get(id) ?? 0) === 3).length;
      return {
        erfuellt: ziele.length > 0 && aktuell === ziele.length,
        aktuell,
        gesamt: ziele.length,
      };
    }
    case 'MEILENSTEIN': {
      const aktuell = ziele.filter((id) => (stufen.get(id) ?? 0) === 3).length;
      const anteil = definition.parameter.anteil ?? 100;
      return {
        erfuellt: ziele.length > 0 && aktuell * 100 >= anteil * ziele.length,
        aktuell,
        gesamt: ziele.length,
      };
    }
  }
}

function zieleFuerDefinition(definition: BadgeDefinition, index: PlanIndex): string[] {
  if (definition.regeltyp === 'KOMPETENZ_SELBSTAENDIG') {
    const kompetenzId = definition.parameter.kompetenzId;
    return kompetenzId ? (index.kompetenzNachId.get(kompetenzId)?.leistungszielIds ?? []) : [];
  }
  if (definition.regeltyp === 'MEILENSTEIN') {
    // R-B4: milestone badges count all active objectives of the template.
    return [...index.aktiveLeistungszielIds];
  }
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
): string {
  const basis = `${bedingung.aktuell} von ${bedingung.gesamt} Leistungszielen`;
  switch (definition.regeltyp) {
    case 'BEREICH_GESTARTET':
      return `${basis} mindestens erklärt`;
    case 'KOMPETENZ_SELBSTAENDIG':
    case 'BEREICH_ABGESCHLOSSEN':
    case 'MEILENSTEIN':
      return `${basis} selbständig`;
  }
}

/**
 * R-B5 / R-B8: replay all events in chronological order and derive badge
 * allocations. The result equals the materialised state after the same events.
 */
export function berechneBadgeVergaben(
  definitionen: readonly BadgeDefinition[],
  index: PlanIndex,
  ereignisse: readonly Stufenereignis[],
  ausbildungId: string,
): BadgeVergabe[] {
  const sortiert = [...ereignisse].sort((a, b) => a.zeitpunkt.localeCompare(b.zeitpunkt));
  const aktive = new Map<string, Stufenereignis>();
  const vergaben = new Map<string, BadgeVergabe>();

  for (const ereignis of sortiert) {
    if (ereignis.aktion === 'ZURUECKGENOMMEN') {
      if (ereignis.refEreignisId) {
        aktive.delete(ereignis.refEreignisId);
      }
    } else {
      aktive.set(ereignis.id, ereignis);
    }

    const stufen = stufenMap([...aktive.values()]);
    for (const definition of definitionen) {
      const bedingung = badgeBedingung(definition, index, stufen);
      const vorhanden = vergaben.get(definition.id);

      if (bedingung.erfuellt && !vorhanden) {
        vergaben.set(definition.id, {
          id: `${ausbildungId}:${definition.id}`,
          ausbildungId,
          badgeId: definition.id,
          vergebenAm: ereignis.zeitpunkt,
          aktiv: true,
          ausStartstand: ereignis.aktion === 'UEBERNOMMEN',
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
          inaktivSeit: ereignis.zeitpunkt,
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
): BadgeBedingungErgebnis {
  return badgeBedingung(definition, index, stufen);
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
