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
/**
 * Vertical distance between two competence centres. The spec names 66 px; D-027 raises it to 84 px
 * so rings and three-line titles no longer touch at the larger scale of D-024.
 */
export const ZEILENABSTAND = 84;

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

/** Point in stage coordinates (px, origin top left). */
export interface Punkt {
  x: number;
  y: number;
}

/**
 * Free horizontal lanes of the stage (D-026). Milestone and cross edges travel on these lanes so
 * they never pass under a node or its title: one above the top row, one between the bottom row and
 * the area row, and one between the area row and Bbc.
 */
export interface KantenLanes {
  oben: number;
  unten: number;
  bbc: number;
}

/** Corner radius of routed (orthogonal) edges. */
export const ECKEN_RADIUS = 8;

/** Clears a node ring or title box vertically; used for the boundary lanes between two rows. */
export const KANTEN_ABSTAND = 11;

function zahl(wert: number): string {
  return String(Math.round(wert * 100) / 100);
}

function abstand(a: Punkt, b: Punkt): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function richtung(von: Punkt, nach: Punkt): Punkt {
  const laenge = abstand(von, nach);
  return laenge === 0
    ? { x: 0, y: 0 }
    : { x: (nach.x - von.x) / laenge, y: (nach.y - von.y) / laenge };
}

/**
 * Rounded path through the given points (D-026). Consecutive duplicates are dropped, so a route
 * whose columns coincide collapses to a straight line instead of an S-curve.
 */
export function rundeKanten(punkte: readonly Punkt[], ecken: number): string {
  const bereinigt = punkte.filter(
    (punkt, index) =>
      index === 0 || punkt.x !== punkte[index - 1].x || punkt.y !== punkte[index - 1].y,
  );
  if (bereinigt.length < 2) {
    return '';
  }
  let d = `M ${zahl(bereinigt[0].x)} ${zahl(bereinigt[0].y)}`;
  for (let index = 1; index < bereinigt.length - 1; index++) {
    const vor = bereinigt[index - 1];
    const punkt = bereinigt[index];
    const nach = bereinigt[index + 1];
    const ein = richtung(vor, punkt);
    const aus = richtung(punkt, nach);
    const radius = Math.min(ecken, abstand(vor, punkt) / 2, abstand(punkt, nach) / 2);
    d += ` L ${zahl(punkt.x - ein.x * radius)} ${zahl(punkt.y - ein.y * radius)}`;
    d += ` Q ${zahl(punkt.x)} ${zahl(punkt.y)} ${zahl(punkt.x + aus.x * radius)} ${zahl(punkt.y + aus.y * radius)}`;
  }
  const letzter = bereinigt[bereinigt.length - 1];
  return `${d} L ${zahl(letzter.x)} ${zahl(letzter.y)}`;
}

/** Follow edge inside an area: straight up from the lower ring to the upper ring (SPEC 8.2). */
export function pfadFolge(von: Punkt, nach: Punkt, radius: number): string {
  return rundeKanten(
    [
      { x: von.x, y: von.y - radius },
      { x: nach.x, y: nach.y + radius },
    ],
    0,
  );
}

/** Milestone edge Bbc → area base: up, across the Bbc lane, up into the letter circle. */
export function pfadBbcAst(start: Punkt, ziel: Punkt, lane: number, ecken: number): string {
  return rundeKanten([start, { x: start.x, y: lane }, { x: ziel.x, y: lane }, ziel], ecken);
}

/**
 * Milestone edge top competence → IPA: straight out of the ring, then a smooth swoosh along the top
 * lane into the hexagon (D-029). Two chained quadrant curves keep the tangents continuous, so the
 * branches of all areas read as a crown instead of a dashed frame with right-angled corners.
 */
export function pfadAstIpa(start: Punkt, ziel: Punkt, lane: number, _ecken: number): string {
  const mitte = (start.x + ziel.x) / 2;
  return (
    `M ${zahl(start.x)} ${zahl(start.y)}` +
    ` Q ${zahl(start.x)} ${zahl(lane)} ${zahl(mitte)} ${zahl(lane)}` +
    ` Q ${zahl(ziel.x)} ${zahl(lane)} ${zahl(ziel.x)} ${zahl(ziel.y)}`
  );
}

/** Input of the cross-edge router; positions are stage coordinates. */
export interface VerweisKanten {
  von: Punkt;
  nach: Punkt;
  radius: number;
  spalte: number;
  skala: number;
  lanes: KantenLanes;
  ecken: number;
}

/**
 * Cross edge between two competences (R-T2). Same row or adjacent row connects through the free
 * boundary lane; longer jumps use the outer lane and the gutter between two columns (D-026).
 */
export function pfadVerweis(kanten: VerweisKanten): string {
  const { von, nach, radius, spalte, skala, lanes, ecken } = kanten;
  const seitlich = KANTEN_ABSTAND * skala;
  const hoehenAbstand = nach.y - von.y;
  const rechts = nach.x >= von.x;

  if (hoehenAbstand === 0) {
    const lane = von.y - radius - seitlich;
    return rundeKanten(
      [
        { x: von.x, y: von.y - radius },
        { x: von.x, y: lane },
        { x: nach.x, y: lane },
        { x: nach.x, y: nach.y - radius },
      ],
      ecken,
    );
  }

  if (Math.abs(hoehenAbstand) === ZEILENABSTAND * skala) {
    const oben = hoehenAbstand < 0;
    const kante = oben ? von.y - radius : von.y + radius;
    const lane = kante + (oben ? -seitlich : seitlich);
    return rundeKanten(
      [
        { x: von.x, y: kante },
        { x: von.x, y: lane },
        { x: nach.x, y: lane },
        { x: nach.x, y: oben ? nach.y + radius : nach.y - radius },
      ],
      ecken,
    );
  }

  const oben = hoehenAbstand < 0;
  const seite = oben ? -1 : 1;
  const lane = oben ? lanes.oben : lanes.unten;
  const vonKante = von.y + seite * radius;
  const vonSeite = vonKante + seite * seitlich;
  const nachKante = nach.y + seite * radius;
  const nachSeite = nachKante + seite * seitlich;
  const vonGasse = von.x + (rechts ? 1 : -1) * (spalte - 26 * skala);
  const nachGasse = nach.x + (rechts ? -1 : 1) * (spalte - 26 * skala);
  return rundeKanten(
    [
      { x: von.x, y: vonKante },
      { x: von.x, y: vonSeite },
      { x: vonGasse, y: vonSeite },
      { x: vonGasse, y: lane },
      { x: nachGasse, y: lane },
      { x: nachGasse, y: nachSeite },
      { x: nach.x, y: nachSeite },
      { x: nach.x, y: nachKante },
    ],
    ecken,
  );
}
