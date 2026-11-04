/**
 * Layout constants and sizing rules of the skill tree (SPEC 8.2). Kept in a plain module so the
 * responsive rule is testable without a browser layout.
 */

/** Reference column width of the prototype layout; scale 1 renders exactly this value. */
export const SPALTEN_REFERENZ = 196;
/** Narrowest column of the spec range; below it the card scrolls sideways. */
export const SPALTEN_MIN = 150;
/** D-024: on wide screens the tree grows beyond the prototype reference up to this column width. */
export const SPALTEN_MAX = 284;
export const KREIS_RADIUS = 22;
export const ZEILENABSTAND = 66;

/** Column width for the measured card width; 196 px while the card cannot be measured. */
export function spaltenbreite(verfuegbareBreite: number, anzahlAeste: number): number {
  const anzahl = Math.max(1, anzahlAeste);
  if (verfuegbareBreite <= 0) {
    return SPALTEN_REFERENZ;
  }
  return Math.min(SPALTEN_MAX, Math.max(SPALTEN_MIN, (verfuegbareBreite - 16) / anzahl));
}

/** Scale factor for circles, rows and fonts; never below the reference layout. */
export function baumSkala(spalte: number): number {
  return Math.max(1, spalte / SPALTEN_REFERENZ);
}
