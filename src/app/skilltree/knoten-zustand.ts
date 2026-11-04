import type { KompetenzAnsicht } from '@skilltree/vertraege';

/**
 * Visual state of a competence node (D-026). It is derived from the stage events only:
 *
 * - `ABGESCHLOSSEN`: all objectives of the competence are on the top level.
 * - `NAECHSTER`: the competence is the next open one of its area (R-T3, "Als Nächstes").
 * - `SPAETER`: everything else; the tree suggests finishing the lower competences first (R-E1 keeps
 *   the node usable, the state is a recommendation, not a lock).
 */
export type KnotenZustand = 'ABGESCHLOSSEN' | 'NAECHSTER' | 'SPAETER';

type ZustandsQuelle = Pick<
  KompetenzAnsicht,
  'abgeschlosseneLeistungsziele' | 'anzahlLeistungsziele' | 'istNaechster'
>;

/** Short label, glyph and legend text of each node state. */
export const KNOTEN_ZUSTAND_TEXTE: Readonly<
  Record<KnotenZustand, { kurz: string; zeichen: string }>
> = {
  ABGESCHLOSSEN: { kurz: 'Abgeschlossen', zeichen: '✓' },
  NAECHSTER: { kurz: 'Als Nächstes', zeichen: '▶' },
  SPAETER: { kurz: 'Noch nicht dran', zeichen: '…' },
};

/** State of a competence node; completed wins over "next" so a finished node never shows ▶. */
export function knotenZustand(kompetenz: ZustandsQuelle): KnotenZustand {
  if (
    kompetenz.anzahlLeistungsziele > 0 &&
    kompetenz.abgeschlosseneLeistungsziele >= kompetenz.anzahlLeistungsziele
  ) {
    return 'ABGESCHLOSSEN';
  }
  return kompetenz.istNaechster ? 'NAECHSTER' : 'SPAETER';
}
