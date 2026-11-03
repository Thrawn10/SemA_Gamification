import { TestBed } from '@angular/core/testing';
import type { Bestaetigungsanfrage, LeistungszielAnsicht } from '@skilltree/vertraege';
import { LeistungszielEintrag } from './leistungsziel-eintrag';
import { ausbildungVon, erstelleUmgebung, type TestUmgebung } from '../../testing/dienst-umgebung';

describe('LeistungszielEintrag', () => {
  let umgebung: TestUmgebung;

  beforeEach(async () => {
    umgebung = await erstelleUmgebung();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('S-L02: wählt beim Bestätigen die angefragte Zielstufe vor', async () => {
    await umgebung.sitzung.anmelden('daniel');
    const ausbildung = ausbildungVon(umgebung, 'nora');
    const ansicht = await umgebung.skilltree.laden(ausbildung.id);
    const kompetenz = ansicht.bereiche[0].kompetenzen[0];
    const ziel = kompetenz.leistungsziele[0].leistungsziel;
    const anfrage: Bestaetigungsanfrage = {
      id: 'anfrage-1',
      ausbildungId: ausbildung.id,
      leistungszielId: ziel.id,
      zielstufe: 3,
      text: 'Ich habe die Aufgabe selbständig durchgeführt.',
      status: 'OFFEN',
      erstelltAm: '2026-11-02T09:00:00.000Z',
    };
    const lz: LeistungszielAnsicht = {
      leistungsziel: ziel,
      stufe: 1,
      aktiveBestaetigung: null,
      offeneAnfrage: anfrage,
      offeneAnfrageAnzahl: 1,
      verlauf: [],
    };

    const fixture = TestBed.createComponent(LeistungszielEintrag);
    fixture.componentRef.setInput('ausbildungId', ausbildung.id);
    fixture.componentRef.setInput('lz', lz);
    fixture.componentRef.setInput('kompetenz', kompetenz.kompetenz);
    fixture.componentRef.setInput('rolle', 'PRAXISBILDNER');
    fixture.componentRef.setInput('kannBestaetigen', true);
    fixture.componentRef.setInput('startOffen', true);
    fixture.detectChanges();

    const inhalt = fixture.nativeElement as HTMLElement;
    const bestaetigen = [...inhalt.querySelectorAll('button')].find(
      (knopf) => knopf.textContent?.trim() === 'Bestätigen',
    );
    expect(bestaetigen).toBeDefined();
    bestaetigen?.click();
    fixture.detectChanges();

    const auswahl = inhalt.querySelector<HTMLSelectElement>('form.lz__formular select');
    expect(auswahl).toBeTruthy();
    // Regression: the preselected stage must also be the submitted stage.
    expect(auswahl?.value).toBe('3');
  });

  it('setzt den Fokus ins Formular und gibt ihn nach Abbrechen zurück', async () => {
    await umgebung.sitzung.anmelden('daniel');
    const ausbildung = ausbildungVon(umgebung, 'nora');
    const ansicht = await umgebung.skilltree.laden(ausbildung.id);
    const kompetenz = ansicht.bereiche[0].kompetenzen[0];
    const ziel = kompetenz.leistungsziele[0].leistungsziel;
    const lz: LeistungszielAnsicht = {
      leistungsziel: ziel,
      stufe: 1,
      aktiveBestaetigung: null,
      offeneAnfrage: null,
      offeneAnfrageAnzahl: 0,
      verlauf: [],
    };

    const fixture = TestBed.createComponent(LeistungszielEintrag);
    fixture.componentRef.setInput('ausbildungId', ausbildung.id);
    fixture.componentRef.setInput('lz', lz);
    fixture.componentRef.setInput('kompetenz', kompetenz.kompetenz);
    fixture.componentRef.setInput('rolle', 'PRAXISBILDNER');
    fixture.componentRef.setInput('kannBestaetigen', true);
    fixture.detectChanges();

    const inhalt = fixture.nativeElement as HTMLElement;
    document.body.appendChild(inhalt);
    try {
      const aufklappen = inhalt.querySelector<HTMLButtonElement>('.lz__aufklappen');
      const knopf = (text: string) =>
        [...inhalt.querySelectorAll('button')].find(
          (eintrag) => eintrag.textContent?.trim() === text,
        );

      aufklappen?.click();
      fixture.detectChanges();
      knopf('Bestätigen')?.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(document.activeElement).toBe(
        inhalt.querySelector('form.lz__formular select, form.lz__formular textarea'),
      );

      knopf('Abbrechen')?.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(document.activeElement).toBe(aufklappen);
    } finally {
      inhalt.remove();
    }
  });
});
