import { TestBed } from '@angular/core/testing';
import { AnmeldungSeite } from './anmeldung-seite';
import { erstelleUmgebung, type TestUmgebung } from '../../testing/dienst-umgebung';
import { element, warteBis } from '../../testing/seiten-helfer';

describe('AnmeldungSeite', () => {
  let umgebung: TestUmgebung;

  beforeEach(async () => {
    umgebung = await erstelleUmgebung();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('listet alle Testkonten und meldet die gewählte Person an', async () => {
    const fixture = TestBed.createComponent(AnmeldungSeite);
    fixture.detectChanges();
    await warteBis(fixture, () => {
      expect(element(fixture).querySelectorAll('.anmeldung__konto').length).toBe(
        umgebung.seed.benutzer.length,
      );
    });

    const konten = element(fixture).querySelectorAll<HTMLButtonElement>('.anmeldung__konto');
    const nora = [...konten].find((konto) => konto.textContent?.includes('Nora Frei'));
    expect(nora).toBeDefined();
    nora?.click();

    await vi.waitFor(() => expect(umgebung.sitzung.benutzer()?.login).toBe('nora'));
  });
});
