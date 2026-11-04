import {
  baumSkala,
  ECKEN_RADIUS,
  pfadAstIpa,
  pfadBbcAst,
  pfadFolge,
  pfadVerweis,
  rundeKanten,
  SPALTEN_MAX,
  SPALTEN_MIN,
  SPALTEN_REFERENZ,
  spaltenbreite,
  type Punkt,
  ZEILENABSTAND,
} from './baum-geometrie';

describe('Baumgeometrie (D-024)', () => {
  it('nutzt die Referenzspalte, solange die Karte nicht messbar ist', () => {
    expect(spaltenbreite(0, 6)).toBe(SPALTEN_REFERENZ);
    expect(spaltenbreite(-1, 0)).toBe(SPALTEN_REFERENZ);
  });

  it('wächst mit der Kartenbreite und vergrössert so den Baum auf grossen Bildschirmen', () => {
    const breit = spaltenbreite(1688, 6);
    expect(breit).toBeGreaterThan(SPALTEN_REFERENZ);
    expect(baumSkala(breit)).toBeGreaterThan(1.3);
  });

  it('bleibt zwischen 150 und 284 px pro Ast', () => {
    expect(spaltenbreite(800, 6)).toBe(SPALTEN_MIN);
    expect(spaltenbreite(4000, 6)).toBe(SPALTEN_MAX);
  });

  it('skaliert nie unter das Referenzlayout', () => {
    expect(baumSkala(SPALTEN_MIN)).toBe(1);
    expect(baumSkala(SPALTEN_REFERENZ)).toBe(1);
  });
});

/** Anchor points of a path (start, corner ends, end) for geometric assertions. */
function ankerpunkte(d: string): Punkt[] {
  return (d.match(/[MLQ][^MLQ]+/g) ?? []).map((teil) => {
    const zahlen = teil.slice(1).trim().split(/\s+/).map(Number);
    return { x: zahlen[zahlen.length - 2], y: zahlen[zahlen.length - 1] };
  });
}

describe('Kantenführung (D-026)', () => {
  const lanes = { oben: 100, unten: 400, bbc: 500 };

  it('rundet Ecken und lässt doppelte Punkte weg', () => {
    expect(
      rundeKanten(
        [
          { x: 0, y: 0 },
          { x: 0, y: 40 },
          { x: 60, y: 40 },
        ],
        ECKEN_RADIUS,
      ),
    ).toBe('M 0 0 L 0 32 Q 0 40 8 40 L 60 40');
    expect(
      rundeKanten(
        [
          { x: 10, y: 20 },
          { x: 10, y: 20 },
          { x: 10, y: 80 },
        ],
        ECKEN_RADIUS,
      ),
    ).toBe('M 10 20 L 10 80');
  });

  it('führt Folgekanten senkrecht von Ring zu Ring', () => {
    expect(pfadFolge({ x: 100, y: 300 }, { x: 100, y: 234 }, 22)).toBe('M 100 278 L 100 256');
  });

  it('führt die Bbc-Kanten auf der freien Gasse unter der Bereichszeile', () => {
    const d = pfadBbcAst({ x: 100, y: 600 }, { x: 60, y: 530 }, lanes.bbc, 8);
    const anker = ankerpunkte(d);
    expect(anker[0]).toEqual({ x: 100, y: 600 });
    expect(anker.at(-1)).toEqual({ x: 60, y: 530 });
    expect(anker.some((punkt) => punkt.y === 500)).toBe(true);
    expect(anker.every((punkt) => punkt.y >= 500)).toBe(true);
  });

  it('führt die Kanten zum IPA auf der freien Gasse über der obersten Zeile', () => {
    const d = pfadAstIpa({ x: 100, y: 300 }, { x: 400, y: 126 }, lanes.oben, 8);
    const anker = ankerpunkte(d);
    expect(anker[0]).toEqual({ x: 100, y: 300 });
    expect(anker.at(-1)).toEqual({ x: 400, y: 126 });
    expect(anker.some((punkt) => punkt.y === 100)).toBe(true);
    expect(anker.every((punkt) => punkt.y <= 300)).toBe(true);
  });

  it('verbindet Verweise derselben Zeile über die freie Zeilengasse', () => {
    const d = pfadVerweis({
      von: { x: 100, y: 300 },
      nach: { x: 400, y: 300 },
      radius: 22,
      spalte: 196,
      skala: 1,
      lanes,
      ecken: 8,
    });
    const anker = ankerpunkte(d);
    expect(anker[0]).toEqual({ x: 100, y: 278 });
    expect(anker.at(-1)).toEqual({ x: 400, y: 278 });
    expect(anker.filter((punkt) => punkt.y === 267).length).toBeGreaterThanOrEqual(2);
    expect(anker.every((punkt) => punkt.y >= 267)).toBe(true);
  });

  it('verbindet Verweise in Nachbarzeilen ohne Umweg über die Aussenbahn', () => {
    const d = pfadVerweis({
      von: { x: 100, y: 300 },
      nach: { x: 400, y: 300 - ZEILENABSTAND },
      radius: 22,
      spalte: 196,
      skala: 1,
      lanes,
      ecken: 8,
    });
    const anker = ankerpunkte(d);
    expect(anker.at(-1)).toEqual({ x: 400, y: 300 - ZEILENABSTAND + 22 });
    expect(anker.every((punkt) => punkt.y >= 300 - ZEILENABSTAND + 22)).toBe(true);
    expect(anker.every((punkt) => punkt.y <= 278)).toBe(true);
  });

  it('führt weit entfernte Verweise über die Aussenbahn und die Spaltengasse', () => {
    const d = pfadVerweis({
      von: { x: 100, y: 300 },
      nach: { x: 500, y: 168 },
      radius: 22,
      spalte: 196,
      skala: 1,
      lanes,
      ecken: 8,
    });
    const anker = ankerpunkte(d);
    expect(anker[0]).toEqual({ x: 100, y: 278 });
    expect(anker.at(-1)).toEqual({ x: 500, y: 146 });
    expect(anker.some((punkt) => punkt.y === 100)).toBe(true);
    expect(anker.some((punkt) => punkt.x === 270)).toBe(true);
    expect(anker.some((punkt) => punkt.x === 330)).toBe(true);
  });
});
