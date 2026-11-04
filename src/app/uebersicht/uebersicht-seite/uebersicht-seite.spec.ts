import { TestBed } from '@angular/core/testing';
import { UebersichtSeite } from './uebersicht-seite';
import { erstelleUmgebung, type TestUmgebung } from '../../../testing/dienst-umgebung';
import { element, warteBis } from '../../../testing/seiten-helfer';

describe('UebersichtSeite', () => {
  let umgebung: TestUmgebung;

  beforeEach(async () => {
    umgebung = await erstelleUmgebung();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('zeigt die Tabelle der zugeordneten Lernenden', async () => {
    await umgebung.sitzung.anmelden('daniel');
    const fixture = TestBed.createComponent(UebersichtSeite);
    fixture.detectChanges();

    await warteBis(fixture, () => {
      expect(element(fixture).querySelectorAll('tbody tr').length).toBe(2);
    });

    const kopf = element(fixture).querySelector('.seite__titel')?.textContent;
    expect(kopf).toContain('Meine Lernenden');
    expect(element(fixture).textContent).toContain('Nora Frei');
  });

  it('Reiter «Offene Anfragen» listet die Anfragen', async () => {
    await umgebung.sitzung.anmelden('daniel');
    const fixture = TestBed.createComponent(UebersichtSeite);
    fixture.detectChanges();
    await warteBis(fixture, () => expect(element(fixture).querySelector('table')).toBeTruthy());

    const reiter = element(fixture).querySelectorAll<HTMLButtonElement>('.reiter__knopf');
    reiter[1].click();
    fixture.detectChanges();

    expect(element(fixture).querySelectorAll('.anfrage-karte').length).toBeGreaterThan(0);
  });

  it('führt den Fokus nach dem Öffnen in das Formular', async () => {
    await umgebung.sitzung.anmelden('daniel');
    const fixture = TestBed.createComponent(UebersichtSeite);
    fixture.detectChanges();
    await warteBis(fixture, () =>
      expect(element(fixture).querySelectorAll('.reiter__knopf').length).toBe(2),
    );

    element(fixture).querySelectorAll<HTMLButtonElement>('.reiter__knopf')[1].click();
    fixture.detectChanges();
    await warteBis(fixture, () =>
      expect(element(fixture).querySelectorAll('.anfrage-karte').length).toBeGreaterThan(0),
    );

    const inhalt = element(fixture);
    document.body.appendChild(inhalt);
    try {
      const oeffnen = [...inhalt.querySelectorAll<HTMLButtonElement>('.anfrage-karte button')].find(
        (knopf) => knopf.textContent?.trim() === 'Bestätigen',
      );
      oeffnen?.focus();
      oeffnen?.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(document.activeElement).toBe(
        inhalt.querySelector('form.anfrage-karte__formular textarea'),
      );
    } finally {
      inhalt.remove();
    }
  });
});
