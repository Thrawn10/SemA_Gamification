import { TestBed } from '@angular/core/testing';
import { initialisiereApp } from './app-initialisierung';
import { erstelleUmgebung, type TestUmgebung } from '../testing/dienst-umgebung';

describe('initialisiereApp', () => {
  let umgebung: TestUmgebung;

  beforeEach(async () => {
    umgebung = await erstelleUmgebung();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('legt den Seed an und stellt die Sitzung wieder her, ohne den Injektionskontext zu verlieren (NG0203)', async () => {
    await umgebung.speicher.leeren('benutzer');
    expect(await umgebung.speicher.alle('benutzer')).toHaveLength(0);

    await TestBed.runInInjectionContext(initialisiereApp);

    const benutzer = await umgebung.speicher.alle<{ id: string }>('benutzer');
    expect(benutzer.length).toBe(umgebung.seed.benutzer.length);
    expect(umgebung.sitzung.istAngemeldet()).toBe(false);
  });
});
