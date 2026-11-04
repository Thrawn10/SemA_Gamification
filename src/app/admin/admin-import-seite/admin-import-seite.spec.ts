import { TestBed } from '@angular/core/testing';
import { AdminImportSeite } from './admin-import-seite';
import { erstelleUmgebung, type TestUmgebung } from '../../../testing/dienst-umgebung';
import { element } from '../../../testing/seiten-helfer';

describe('AdminImportSeite', () => {
  let umgebung: TestUmgebung;

  beforeEach(async () => {
    umgebung = await erstelleUmgebung();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('zeigt Vorlagen-Import und Datenbestand', async () => {
    await umgebung.sitzung.anmelden('admin');
    const fixture = TestBed.createComponent(AdminImportSeite);
    fixture.detectChanges();

    const inhalt = element(fixture);
    expect(inhalt.textContent).toContain('Vorlage importieren');
    expect(inhalt.textContent).toContain('Datenbestand exportieren');
    expect(inhalt.querySelectorAll('input[type="file"]').length).toBe(2);
  });
});
