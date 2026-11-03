import type { Ampel, KantenTyp, KantenZustand, MeilensteinCode, Stufe } from '@skilltree/vertraege';
import { ampel, kompetenzwert } from './fortschritt';
import type { PlanIndex } from './plan';

export interface Kante {
  von: string;
  nach: string;
  typ: KantenTyp;
}

export const MEILENSTEIN_KNOTEN: Readonly<Record<MeilensteinCode, MeilensteinCode>> = {
  BBC: 'BBC',
  IPA: 'IPA',
  LAP: 'LAP',
};

export function astKnotenId(bereichscode: string): string {
  return `AST-${bereichscode}`;
}

export function istAstKnoten(knotenId: string): boolean {
  return knotenId.startsWith('AST-');
}

/**
 * R-T1 / R-T2 / R-M1-R-M3: all edges of the tree, including Bbc -> ast bases,
 * ast ends -> IPA and IPA -> LAP.
 */
export function kanten(index: PlanIndex): Kante[] {
  const ergebnis: Kante[] = [];
  for (const bereich of index.bereiche) {
    const ast = astKnotenId(bereich.bereich.code);
    ergebnis.push({ von: MEILENSTEIN_KNOTEN.BBC, nach: ast, typ: 'MEILENSTEIN' });

    for (let i = 1; i < bereich.kompetenzen.length; i++) {
      ergebnis.push({
        von: bereich.kompetenzen[i - 1].kompetenz.id,
        nach: bereich.kompetenzen[i].kompetenz.id,
        typ: 'FOLGE',
      });
    }

    const letzte = bereich.kompetenzen[bereich.kompetenzen.length - 1];
    if (letzte) {
      ergebnis.push({ von: letzte.kompetenz.id, nach: MEILENSTEIN_KNOTEN.IPA, typ: 'MEILENSTEIN' });
    }
  }

  ergebnis.push({
    von: MEILENSTEIN_KNOTEN.IPA,
    nach: MEILENSTEIN_KNOTEN.LAP,
    typ: 'MEILENSTEIN',
  });

  for (const abhaengigkeit of index.struktur.abhaengigkeiten) {
    if (abhaengigkeit.quelle === 'REIHENFOLGE') {
      continue;
    }
    ergebnis.push({
      von: abhaengigkeit.vonKompetenzId,
      nach: abhaengigkeit.nachKompetenzId,
      typ: 'VERWEIS',
    });
  }

  return ergebnis;
}

/** R-T3: per ast the lowest competence (in plan order) whose traffic light is not green. */
export function naechsteKnoten(index: PlanIndex, stufen: ReadonlyMap<string, Stufe>): string[] {
  const ergebnis: string[] = [];
  for (const bereich of index.bereiche) {
    for (const kompetenz of bereich.kompetenzen) {
      if (ampel(kompetenzwert(kompetenz.leistungszielIds, stufen)) !== 'GRUEN') {
        ergebnis.push(kompetenz.kompetenz.id);
        break;
      }
    }
  }
  return ergebnis;
}

export type MeilensteinStatusMap = Readonly<Record<MeilensteinCode, boolean>>;

/**
 * R-T4: an edge is reached when its start node is green or its start milestone is reached.
 * The state only affects presentation and never blocks anything (R-E1).
 */
export function kantenzustand(
  kante: Kante,
  kompetenzAmpeln: ReadonlyMap<string, Ampel>,
  meilensteine: MeilensteinStatusMap,
): KantenZustand {
  return startknotenErreicht(kante.von, kompetenzAmpeln, meilensteine) ? 'ERREICHT' : 'OFFEN';
}

function startknotenErreicht(
  knotenId: string,
  kompetenzAmpeln: ReadonlyMap<string, Ampel>,
  meilensteine: MeilensteinStatusMap,
): boolean {
  if (knotenId === MEILENSTEIN_KNOTEN.BBC) {
    return meilensteine.BBC;
  }
  if (knotenId === MEILENSTEIN_KNOTEN.IPA) {
    return meilensteine.IPA;
  }
  if (knotenId === MEILENSTEIN_KNOTEN.LAP) {
    return meilensteine.LAP;
  }
  if (istAstKnoten(knotenId)) {
    return meilensteine.BBC;
  }
  return kompetenzAmpeln.get(knotenId) === 'GRUEN';
}

/** Ampel per competence id, derived from the current level map. */
export function kompetenzAmpeln(
  index: PlanIndex,
  stufen: ReadonlyMap<string, Stufe>,
): Map<string, Ampel> {
  const ergebnis = new Map<string, Ampel>();
  for (const kompetenz of index.kompetenzNachId.values()) {
    ergebnis.set(kompetenz.kompetenz.id, ampel(kompetenzwert(kompetenz.leistungszielIds, stufen)));
  }
  return ergebnis;
}
