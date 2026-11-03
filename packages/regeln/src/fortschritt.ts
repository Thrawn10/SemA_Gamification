import type { Ampel, Stufe } from '@skilltree/vertraege';

/** R-F1: cumulative point value of a level. */
export function punktwert(stufe: Stufe): 0 | 1 | 3 | 6 {
  switch (stufe) {
    case 0:
      return 0;
    case 1:
      return 1;
    case 2:
      return 3;
    case 3:
      return 6;
  }
}

/** R-F2: arithmetic mean of the point values of all given Leistungsziele (0..6). */
export function kompetenzwert(
  leistungszielIds: readonly string[],
  stufen: ReadonlyMap<string, Stufe>,
): number {
  if (leistungszielIds.length === 0) {
    return 0;
  }
  let summe = 0;
  for (const id of leistungszielIds) {
    summe += punktwert(stufen.get(id) ?? 0);
  }
  return summe / leistungszielIds.length;
}

/** R-F3: progress in whole percent over the given Leistungsziele. */
export function fortschritt(
  leistungszielIds: readonly string[],
  stufen: ReadonlyMap<string, Stufe>,
): number {
  if (leistungszielIds.length === 0) {
    return 0;
  }
  let summe = 0;
  for (const id of leistungszielIds) {
    summe += punktwert(stufen.get(id) ?? 0);
  }
  // ANNAHME D-002: commercial rounding with an epsilon to avoid floating point artefacts.
  return Math.round((summe * 100) / (6 * leistungszielIds.length) + 1e-9);
}

/** R-F4 / R-F5: traffic light thresholds. Identical for competences and areas. */
export function ampel(wert: number): Ampel {
  if (wert < 2) {
    return 'ROT';
  }
  if (wert < 4) {
    return 'ORANGE';
  }
  return 'GRUEN';
}

/** R-F5: area value = mean of the point values of all its Leistungsziele. */
export function bereichswert(
  leistungszielIds: readonly string[],
  stufen: ReadonlyMap<string, Stufe>,
): number {
  return kompetenzwert(leistungszielIds, stufen);
}

export interface KompetenzMitZielen {
  id: string;
  leistungszielIds: readonly string[];
}

/** R-F6: number of competences whose traffic light is red. */
export function anzahlRoteKompetenzen(
  kompetenzen: readonly KompetenzMitZielen[],
  stufen: ReadonlyMap<string, Stufe>,
): number {
  let anzahl = 0;
  for (const kompetenz of kompetenzen) {
    if (ampel(kompetenzwert(kompetenz.leistungszielIds, stufen)) === 'ROT') {
      anzahl++;
    }
  }
  return anzahl;
}
