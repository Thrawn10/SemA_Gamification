import { TestBed } from '@angular/core/testing';
import type { SkilltreeAnsicht } from '@skilltree/vertraege';
import { anteilProzent, astBelohnungen, belohnungFuerAst, kompetenzStandText } from './belohnungen';
import { ausbildungVon, erstelleUmgebung, type TestUmgebung } from '../../testing/dienst-umgebung';

describe('Belohnungen pro Ast', () => {
  let ansicht: SkilltreeAnsicht;

  beforeEach(async () => {
    const umgebung: TestUmgebung = await erstelleUmgebung();
    await umgebung.sitzung.anmelden('nora');
    ansicht = await umgebung.skilltree.laden(ausbildungVon(umgebung, 'nora').id);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('ordnet jedem Ast genau sein Abschluss-Badge zu (R-B3)', () => {
    const belohnungen = astBelohnungen(ansicht);

    expect(belohnungen.map((eintrag) => eintrag.code)).toEqual(
      ansicht.bereiche.map((bereich) => bereich.bereich.code),
    );
    for (const [index, belohnung] of belohnungen.entries()) {
      const bereich = ansicht.bereiche[index];
      expect(belohnung.abschluss?.definition.regeltyp).toBe('BEREICH_ABGESCHLOSSEN');
      expect(belohnung.abschluss?.definition.parameter.bereichId).toBe(bereich.bereich.id);
      expect(belohnung.titel).toBe(bereich.bereich.titel);
    }
  });

  it('listet die Kompetenzen des Asts mit ihren abgeschlossenen Leistungszielen', () => {
    const belohnung = astBelohnungen(ansicht)[0];
    const bereich = ansicht.bereiche[0];

    expect(belohnung.skills.map((skill) => skill.code)).toEqual(
      bereich.kompetenzen.map((kompetenz) => kompetenz.kompetenz.code),
    );
    for (const [index, skill] of belohnung.skills.entries()) {
      expect(skill.erreicht).toBe(bereich.kompetenzen[index].abgeschlosseneLeistungsziele);
      expect(skill.gesamt).toBe(bereich.kompetenzen[index].anzahlLeistungsziele);
    }
    expect(belohnung.offeneSkills).toBe(
      belohnung.skills.filter((skill) => skill.erreicht < skill.gesamt).length,
    );
  });

  it('liefert einen einzelnen Ast und null für unbekannte Codes', () => {
    const code = ansicht.bereiche[1].bereich.code;

    expect(belohnungFuerAst(ansicht, code)?.code).toBe(code);
    expect(belohnungFuerAst(ansicht, 'ZZ')).toBeNull();
  });

  it('rundet Anteile und behandelt leere Kompetenzen als 0 %', () => {
    expect(anteilProzent(1, 3)).toBe(33);
    expect(anteilProzent(3, 3)).toBe(100);
    expect(anteilProzent(0, 0)).toBe(0);
  });

  it('formuliert den Kompetenzstand im Singular und Plural korrekt', () => {
    expect(kompetenzStandText(1, 1, 'abgeschlossen')).toBe('Die Kompetenz ist abgeschlossen');
    expect(kompetenzStandText(0, 1, 'selbständig')).toBe('0 von 1 Kompetenz selbständig');
    expect(kompetenzStandText(4, 4, 'abgeschlossen')).toBe('Alle 4 Kompetenzen sind abgeschlossen');
    expect(kompetenzStandText(3, 5, 'selbständig')).toBe('3 von 5 Kompetenzen selbständig');
    expect(kompetenzStandText(0, 0, 'abgeschlossen')).toBe('Keine Kompetenzen abgeschlossen');
  });

  it('setzt den Kompetenzstand in jedem Ast auf die oberste Stufe', () => {
    for (const belohnung of astBelohnungen(ansicht)) {
      const erreicht = belohnung.skills.length - belohnung.offeneSkills;
      expect(belohnung.skillsText).toBe(
        kompetenzStandText(erreicht, belohnung.skills.length, 'selbständig'),
      );
    }
  });
});
