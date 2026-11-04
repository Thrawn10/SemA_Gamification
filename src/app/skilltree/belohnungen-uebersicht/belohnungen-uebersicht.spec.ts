import { TestBed } from '@angular/core/testing';
import type { SkilltreeAnsicht } from '@skilltree/vertraege';
import { BelohnungenUebersicht } from './belohnungen-uebersicht';
import {
  ausbildungVon,
  erstelleUmgebung,
  type TestUmgebung,
} from '../../../testing/dienst-umgebung';

describe('BelohnungenUebersicht', () => {
  let ansicht: SkilltreeAnsicht;

  beforeEach(async () => {
    const umgebung: TestUmgebung = await erstelleUmgebung();
    await umgebung.sitzung.anmelden('nora');
    ansicht = await umgebung.skilltree.laden(ausbildungVon(umgebung, 'nora').id);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function erstelle(daten: SkilltreeAnsicht = ansicht) {
    const fixture = TestBed.createComponent(BelohnungenUebersicht);
    fixture.componentRef.setInput('ansicht', daten);
    fixture.detectChanges();
    return fixture;
  }

  it('zeigt pro Ast eine Belohnung mit Abschluss-Badge und Kompetenzen', () => {
    const inhalt = erstelle().nativeElement as HTMLElement;
    const abschluss = [...ansicht.badges.erhalten, ...ansicht.badges.offen].find(
      (badge) => badge.definition.regeltyp === 'BEREICH_ABGESCHLOSSEN',
    );

    expect(inhalt.querySelectorAll('.belohnung').length).toBe(ansicht.bereiche.length);
    expect(inhalt.querySelector('.belohnung__medaille')?.getAttribute('aria-hidden')).toBe('true');
    if (abschluss) {
      expect(inhalt.textContent).toContain(abschluss.definition.titel);
    }
    const anzahlKompetenzen = ansicht.bereiche.reduce(
      (summe, bereich) => summe + bereich.kompetenzen.length,
      0,
    );
    expect(inhalt.querySelectorAll('.skill').length).toBe(anzahlKompetenzen);
    expect(inhalt.querySelectorAll('.skill__balken').length).toBe(anzahlKompetenzen);
  });

  it('meldet den gewählten Ast für die Seitenleiste', () => {
    const fixture = erstelle();
    const gewaehlt: string[] = [];
    fixture.componentInstance.astGewaehlt.subscribe((code) => gewaehlt.push(code));

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.belohnung__aktion')
      ?.click();

    expect(gewaehlt).toEqual([ansicht.bereiche[0].bereich.code]);
  });

  it('blendet die Badges aus, wenn die lernende Person sie ausgeblendet hat (N-04)', () => {
    const inhalt = erstelle({
      ...ansicht,
      badges: { ...ansicht.badges, ausgeblendet: true },
    }).nativeElement as HTMLElement;

    expect(inhalt.querySelectorAll('.belohnung').length).toBe(0);
    expect(inhalt.textContent).toContain('Badges sind für deine Ansicht ausgeblendet');
  });
});
