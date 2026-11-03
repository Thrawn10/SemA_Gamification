import type { Stufe, Stufenereignis } from '@skilltree/vertraege';

/**
 * R-S1: Active confirmations are BESTAETIGT or UEBERNOMMEN events that are not
 * referenced by a ZURUECKGENOMMEN event.
 */
export function aktiveBestaetigungen(ereignisse: readonly Stufenereignis[]): Stufenereignis[] {
  const zurueckgenommen = new Set<string>();
  for (const ereignis of ereignisse) {
    if (ereignis.aktion === 'ZURUECKGENOMMEN' && ereignis.refEreignisId) {
      zurueckgenommen.add(ereignis.refEreignisId);
    }
  }
  return ereignisse.filter(
    (ereignis) =>
      (ereignis.aktion === 'BESTAETIGT' || ereignis.aktion === 'UEBERNOMMEN') &&
      !zurueckgenommen.has(ereignis.id),
  );
}

/** R-S1: Level per Leistungsziel = maximum level of its active confirmations, otherwise 0. */
export function stufenMap(ereignisse: readonly Stufenereignis[]): Map<string, Stufe> {
  const stufen = new Map<string, Stufe>();
  for (const ereignis of aktiveBestaetigungen(ereignisse)) {
    const aktuell = stufen.get(ereignis.leistungszielId) ?? 0;
    if (ereignis.stufe > aktuell) {
      stufen.set(ereignis.leistungszielId, ereignis.stufe);
    }
  }
  return stufen;
}

export function stufeFuer(stufen: ReadonlyMap<string, Stufe>, leistungszielId: string): Stufe {
  return stufen.get(leistungszielId) ?? 0;
}

/** The active confirmation that currently determines the level of a Leistungsziel. */
export function aktiveBestaetigungFuer(
  ereignisse: readonly Stufenereignis[],
  leistungszielId: string,
): Stufenereignis | null {
  const passend = aktiveBestaetigungen(ereignisse).filter(
    (ereignis) => ereignis.leistungszielId === leistungszielId,
  );
  if (passend.length === 0) {
    return null;
  }
  return passend.reduce((hoechste, aktuell) =>
    aktuell.stufe > hoechste.stufe ? aktuell : hoechste,
  );
}
