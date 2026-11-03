import type { Bereich, Kompetenz, Leistungsziel, VorlageStruktur } from '@skilltree/vertraege';

export interface KompetenzIndex {
  kompetenz: Kompetenz;
  leistungszielIds: string[];
}

export interface BereichIndex {
  bereich: Bereich;
  kompetenzen: KompetenzIndex[];
}

export interface PlanIndex {
  struktur: VorlageStruktur;
  bereiche: BereichIndex[];
  bereichNachId: Map<string, BereichIndex>;
  kompetenzNachId: Map<string, KompetenzIndex>;
  leistungszielNachId: Map<string, Leistungsziel>;
  /** All Leistungsziele that count for calculations (not archived), in plan order. */
  aktiveLeistungszielIds: string[];
}

function nachReihenfolge<T extends { reihenfolge: number; code: string }>(a: T, b: T): number {
  return a.reihenfolge - b.reihenfolge || a.code.localeCompare(b.code);
}

/** Builds a stable, read-only index over a plan structure. */
export function indexierePlan(struktur: VorlageStruktur): PlanIndex {
  const leistungszielNachId = new Map<string, Leistungsziel>();
  for (const leistungsziel of struktur.leistungsziele) {
    leistungszielNachId.set(leistungsziel.id, leistungsziel);
  }

  const kompetenzenNachBereich = new Map<string, Kompetenz[]>();
  for (const kompetenz of struktur.kompetenzen) {
    const liste = kompetenzenNachBereich.get(kompetenz.bereichId) ?? [];
    liste.push(kompetenz);
    kompetenzenNachBereich.set(kompetenz.bereichId, liste);
  }

  const zieleNachKompetenz = new Map<string, string[]>();
  for (const leistungsziel of struktur.leistungsziele) {
    if (leistungsziel.archiviert) {
      continue;
    }
    const liste = zieleNachKompetenz.get(leistungsziel.kompetenzId) ?? [];
    liste.push(leistungsziel.id);
    zieleNachKompetenz.set(leistungsziel.kompetenzId, liste);
  }

  const bereiche: BereichIndex[] = [...struktur.bereiche].sort(nachReihenfolge).map((bereich) => {
    const kompetenzen = (kompetenzenNachBereich.get(bereich.id) ?? [])
      .sort(nachReihenfolge)
      .map((kompetenz) => ({
        kompetenz,
        leistungszielIds: [...(zieleNachKompetenz.get(kompetenz.id) ?? [])].sort((a, b) => {
          const links = leistungszielNachId.get(a);
          const rechts = leistungszielNachId.get(b);
          if (!links || !rechts) {
            return 0;
          }
          return nachReihenfolge(links, rechts);
        }),
      }));
    return { bereich, kompetenzen };
  });

  const kompetenzNachId = new Map<string, KompetenzIndex>();
  const aktiveLeistungszielIds: string[] = [];
  for (const bereich of bereiche) {
    for (const kompetenz of bereich.kompetenzen) {
      kompetenzNachId.set(kompetenz.kompetenz.id, kompetenz);
      aktiveLeistungszielIds.push(...kompetenz.leistungszielIds);
    }
  }

  return {
    struktur,
    bereiche,
    bereichNachId: new Map(bereiche.map((bereich) => [bereich.bereich.id, bereich])),
    kompetenzNachId,
    leistungszielNachId,
    aktiveLeistungszielIds,
  };
}
