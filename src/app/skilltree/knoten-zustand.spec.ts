import { KNOTEN_ZUSTAND_TEXTE, knotenZustand } from './knoten-zustand';

describe('Knotenzustand (D-026)', () => {
  it('markiert eine Kompetenz erst als abgeschlossen, wenn alle Leistungsziele oben stehen', () => {
    expect(
      knotenZustand({
        abgeschlosseneLeistungsziele: 4,
        anzahlLeistungsziele: 4,
        istNaechster: false,
      }),
    ).toBe('ABGESCHLOSSEN');
    expect(
      knotenZustand({
        abgeschlosseneLeistungsziele: 3,
        anzahlLeistungsziele: 4,
        istNaechster: true,
      }),
    ).toBe('NAECHSTER');
  });

  it('behandelt den nächsten offenen Knoten als "Als Nächstes" und alle anderen als später', () => {
    expect(
      knotenZustand({
        abgeschlosseneLeistungsziele: 1,
        anzahlLeistungsziele: 4,
        istNaechster: true,
      }),
    ).toBe('NAECHSTER');
    expect(
      knotenZustand({
        abgeschlosseneLeistungsziele: 1,
        anzahlLeistungsziele: 4,
        istNaechster: false,
      }),
    ).toBe('SPAETER');
  });

  it('lässt abgeschlossen vor "Als Nächstes" gewinnen und verkraftet Kompetenzen ohne Ziele', () => {
    expect(
      knotenZustand({
        abgeschlosseneLeistungsziele: 4,
        anzahlLeistungsziele: 4,
        istNaechster: true,
      }),
    ).toBe('ABGESCHLOSSEN');
    expect(
      knotenZustand({
        abgeschlosseneLeistungsziele: 0,
        anzahlLeistungsziele: 0,
        istNaechster: false,
      }),
    ).toBe('SPAETER');
  });

  it('gibt jedem Zustand ein Zeichen für die Legende', () => {
    expect(Object.keys(KNOTEN_ZUSTAND_TEXTE)).toEqual(['ABGESCHLOSSEN', 'NAECHSTER', 'SPAETER']);
    expect(KNOTEN_ZUSTAND_TEXTE.ABGESCHLOSSEN.zeichen).toBe('✓');
    expect(KNOTEN_ZUSTAND_TEXTE.NAECHSTER.zeichen).toBe('▶');
    expect(KNOTEN_ZUSTAND_TEXTE.SPAETER.zeichen).toBe('…');
  });
});
