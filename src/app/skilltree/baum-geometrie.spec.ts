import {
  baumSkala,
  SPALTEN_MAX,
  SPALTEN_MIN,
  SPALTEN_REFERENZ,
  spaltenbreite,
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
