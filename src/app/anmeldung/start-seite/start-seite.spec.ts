import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { StartSeite } from './start-seite';
import { erstelleUmgebung, type TestUmgebung } from '../../../testing/dienst-umgebung';

describe('StartSeite', () => {
  let umgebung: TestUmgebung;

  beforeEach(async () => {
    umgebung = await erstelleUmgebung();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('leitet nicht angemeldete Personen zur Anmeldung', async () => {
    TestBed.createComponent(StartSeite);
    const router = TestBed.inject(Router);

    await vi.waitFor(() => expect(router.url).toBe('/anmeldung'));
  });

  it('leitet eine Praxisbildnerin zur Übersicht', async () => {
    await umgebung.sitzung.anmelden('daniel');
    TestBed.createComponent(StartSeite);
    const router = TestBed.inject(Router);

    await vi.waitFor(() => expect(router.url).toBe('/uebersicht'));
  });

  it('meldet eine Lernende ohne Ausbildung statt weiterzuleiten', async () => {
    // The prototype seed has one trained learner per profession; remove the training temporarily
    // to cover the "no apprenticeship" branch that the removed fourth account used to provide.
    await umgebung.speicher.ersetzeAlle('ausbildungen', []);
    await umgebung.sitzung.anmelden('nora');
    const fixture = TestBed.createComponent(StartSeite);

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'Noch kein Lehrberuf zugeordnet',
      );
    });
  });
});
