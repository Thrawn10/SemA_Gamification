import { TestBed } from '@angular/core/testing';
import { AnmeldungSeite } from './anmeldung-seite';
import { erstelleUmgebung, type TestUmgebung } from '../../../testing/dienst-umgebung';
import { element, warteBis } from '../../../testing/seiten-helfer';

describe('AnmeldungSeite', () => {
  let umgebung: TestUmgebung;

  beforeEach(async () => {
    umgebung = await erstelleUmgebung();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('zeigt genau ein Lernenden-Konto pro Beruf plus das PiBS-Konto (D-021, D-022)', async () => {
    const fixture = TestBed.createComponent(AnmeldungSeite);
    fixture.detectChanges();
    await warteBis(fixture, () => {
      expect(element(fixture).querySelectorAll('.anmeldung__gruppe .anmeldung__konto').length).toBe(
        4,
      );
    });

    const namen = [...element(fixture).querySelectorAll('.anmeldung__gruppe .anmeldung__name')].map(
      (knoten) => knoten.textContent?.trim(),
    );
    expect(namen?.sort()).toEqual([
      'Luca Meier (Plattformentwickler)',
      'Mia Keller (PiBS-Studentin)',
      'Nora Frei (Applikationsentwicklerin)',
      'Sara Huber (Mediamatikerin)',
    ]);
  });

  it('hält den Praxisbildner-Zugang standardmässig versteckt (Q-018)', async () => {
    const fixture = TestBed.createComponent(AnmeldungSeite);
    fixture.detectChanges();
    await warteBis(fixture, () => {
      expect(element(fixture).querySelector('details.anmeldung__prototyp')).not.toBeNull();
    });

    const details = element(fixture).querySelector<HTMLDetailsElement>(
      'details.anmeldung__prototyp',
    );
    expect(details?.open).toBe(false);
    expect(details?.querySelectorAll('.anmeldung__konto').length).toBe(2);
    expect(details?.textContent).toContain('Daniel Roth');
    expect(details?.textContent).toContain('Petra Lang');
  });

  it('meldet die gewählte Person an', async () => {
    const fixture = TestBed.createComponent(AnmeldungSeite);
    fixture.detectChanges();
    await warteBis(fixture, () => {
      expect(element(fixture).querySelectorAll('.anmeldung__gruppe .anmeldung__konto').length).toBe(
        4,
      );
    });

    const konten = element(fixture).querySelectorAll<HTMLButtonElement>(
      '.anmeldung__gruppe .anmeldung__konto',
    );
    const nora = [...konten].find((konto) => konto.textContent?.includes('Nora Frei'));
    expect(nora).toBeDefined();
    nora?.click();

    await vi.waitFor(() => expect(umgebung.sitzung.benutzer()?.login).toBe('nora'));
  });
});
