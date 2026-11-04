import { TestBed } from '@angular/core/testing';
import { DemoLeiste } from './demo-leiste';
import { erstelleUmgebung, type TestUmgebung } from '../../../testing/dienst-umgebung';
import { element, warteBis } from '../../../testing/seiten-helfer';

describe('DemoLeiste', () => {
  let umgebung: TestUmgebung;

  beforeEach(async () => {
    umgebung = await erstelleUmgebung();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('zeigt die vier Lernenden und den Praxisbildner-Mock, aber kein Admin-Konto (N-11, D-021, D-022)', async () => {
    await umgebung.sitzung.anmelden('luca');
    const fixture = TestBed.createComponent(DemoLeiste);
    fixture.detectChanges();

    await warteBis(fixture, () => {
      expect(element(fixture).querySelectorAll('option').length).toBe(6);
    });

    const auswahl = element(fixture).querySelector<HTMLSelectElement>('select');
    expect(auswahl?.value).toBe('luca');
    expect(auswahl?.selectedOptions[0]?.value).toBe('luca');
    expect(auswahl?.textContent).not.toContain('Admin');
    expect(auswahl?.textContent).toContain('Mia Keller');
    expect(auswahl?.textContent).toContain('Daniel Roth');
    expect(auswahl?.textContent).toContain('Petra Lang');
  });

  it('fragt vor dem Zurücksetzen nach und gibt den Fokus zurück', async () => {
    await umgebung.sitzung.anmelden('nora');
    const fixture = TestBed.createComponent(DemoLeiste);
    fixture.detectChanges();
    await warteBis(fixture, () => {
      expect(element(fixture).querySelectorAll('option').length).toBeGreaterThan(0);
    });

    const inhalt = element(fixture);
    document.body.appendChild(inhalt);
    try {
      const ausloeser = inhalt.querySelector<HTMLButtonElement>('[data-fokus="demo-reset"]');
      ausloeser?.focus();
      ausloeser?.click();
      fixture.detectChanges();

      expect(inhalt.textContent).toContain('Demo-Daten zurücksetzen?');
      expect(document.activeElement).toBe(inhalt.querySelector('[data-fokus="demo-reset-ja"]'));

      const abbrechen = [...inhalt.querySelectorAll('button')].find(
        (knopf) => knopf.textContent?.trim() === 'Abbrechen',
      );
      abbrechen?.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(inhalt.textContent).not.toContain('Demo-Daten zurücksetzen?');
      // The trigger is re-created, so compare against the new element.
      expect(document.activeElement).toBe(inhalt.querySelector('[data-fokus="demo-reset"]'));
    } finally {
      inhalt.remove();
    }
  });
});
