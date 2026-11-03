import { TestBed } from '@angular/core/testing';
import { MeineDatenSeite } from './meine-daten-seite';
import { erstelleUmgebung, type TestUmgebung } from '../../testing/dienst-umgebung';
import { element } from '../../testing/seiten-helfer';

describe('MeineDatenSeite', () => {
  let umgebung: TestUmgebung;

  beforeEach(async () => {
    umgebung = await erstelleUmgebung();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('zeigt die Sichtbarkeitstabelle der Rolle', async () => {
    await umgebung.sitzung.anmelden('nora');
    const fixture = TestBed.createComponent(MeineDatenSeite);
    fixture.detectChanges();

    const zeilen = element(fixture).querySelectorAll('tbody tr');
    expect(zeilen.length).toBe(4);
    expect(element(fixture).textContent).toContain('Name, Login, Lehrberuf, Lehrbeginn');
  });
});
