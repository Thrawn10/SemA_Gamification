import { TestBed } from '@angular/core/testing';
import type { SkilltreeAnsicht } from '@skilltree/vertraege';
import { SkilltreeSeitenleiste } from './skilltree-seitenleiste';
import type { BaumAuswahl } from '../auswahl';
import {
  ausbildungVon,
  erstelleUmgebung,
  type TestUmgebung,
} from '../../../testing/dienst-umgebung';

describe('SkilltreeSeitenleiste', () => {
  let umgebung: TestUmgebung;
  let ansicht: SkilltreeAnsicht;

  beforeEach(async () => {
    umgebung = await erstelleUmgebung();
    await umgebung.sitzung.anmelden('nora');
    ansicht = await umgebung.skilltree.laden(ausbildungVon(umgebung, 'nora').id);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function erstelle(auswahl: BaumAuswahl) {
    const fixture = TestBed.createComponent(SkilltreeSeitenleiste);
    fixture.componentRef.setInput('ansicht', ansicht);
    fixture.componentRef.setInput('auswahl', auswahl);
    fixture.detectChanges();
    return fixture;
  }

  it('zeigt Kennzahlen und Leistungsziele der gewählten Kompetenz (SPEC 8.2)', () => {
    const bereich = ansicht.bereiche[0];
    const kompetenz = bereich.kompetenzen[0];
    const inhalt = erstelle({ art: 'kompetenz', id: kompetenz.kompetenz.id })
      .nativeElement as HTMLElement;

    const dialog = inhalt.querySelector('aside.seitenleiste');
    expect(dialog?.getAttribute('role')).toBe('dialog');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(inhalt.querySelector('#seitenleiste-titel')?.textContent).toContain(
      kompetenz.kompetenz.code,
    );
    expect(inhalt.querySelectorAll('st-leistungsziel-eintrag').length).toBe(
      kompetenz.leistungsziele.length,
    );
    expect(inhalt.querySelector('.seitenleiste__ziele')).toBeTruthy();
  });

  it('zeigt Meilenstein-Status und Verlauf (S-L06)', () => {
    const meilenstein = ansicht.meilensteine.find((eintrag) => eintrag.code === 'BBC');
    expect(meilenstein).toBeDefined();
    const inhalt = erstelle({ art: 'meilenstein', code: 'BBC' }).nativeElement as HTMLElement;

    expect(inhalt.querySelector('#seitenleiste-titel')?.textContent).toContain('Basismeilenstein');
    expect(inhalt.textContent).toContain('Bereitschaft');
    expect(inhalt.querySelector('st-verlauf-liste')).toBeTruthy();
  });

  it('schliesst per Escape und hält den Fokus per Tab im Dialog (S-A04)', () => {
    const auswahl: BaumAuswahl = { art: 'ast', code: ansicht.bereiche[0].bereich.code };
    const fixture = erstelle(auswahl);
    const inhalt = fixture.nativeElement as HTMLElement;
    document.body.appendChild(inhalt);
    try {
      let geschlossen = 0;
      fixture.componentInstance.schliessen.subscribe(() => (geschlossen += 1));

      const dialog = inhalt.querySelector<HTMLElement>('aside.seitenleiste');
      dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(geschlossen).toBe(1);

      const fokussierbar = dialog?.querySelectorAll<HTMLElement>('button:not([disabled])');
      const erstes = fokussierbar?.[0];
      const letztes = fokussierbar?.[fokussierbar.length - 1];
      letztes?.focus();
      dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

      expect(document.activeElement).toBe(erstes);
    } finally {
      inhalt.remove();
    }
  });
});
