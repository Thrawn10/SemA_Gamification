import { TestBed } from '@angular/core/testing';
import type { BadgeAnsicht, BadgesAnsicht } from '@skilltree/vertraege';
import { BadgesAnsichtKomponente } from './badges-ansicht';
import { erstelleUmgebung, type TestUmgebung } from '../../testing/dienst-umgebung';

function badge(id: string, status: BadgeAnsicht['status']): BadgeAnsicht {
  return {
    definition: {
      id,
      vorlageId: 'vorlage-1',
      code: id,
      titel: `Badge ${id}`,
      kriterium: 'Kriterium',
      regeltyp: 'KOMPETENZ_SELBSTAENDIG',
      parameter: {},
      reihenfolge: 0,
    },
    vergabe: null,
    status,
    fortschrittText: '1 von 3',
    aktuell: 1,
    gesamt: 3,
  };
}

describe('BadgesAnsichtKomponente', () => {
  let umgebung: TestUmgebung;

  beforeEach(async () => {
    umgebung = await erstelleUmgebung();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function erstelle(badges: BadgesAnsicht, rolle: 'LERNENDE' | 'PRAXISBILDNER') {
    const fixture = TestBed.createComponent(BadgesAnsichtKomponente);
    fixture.componentRef.setInput('badges', badges);
    fixture.componentRef.setInput('rolle', rolle);
    fixture.detectChanges();
    return fixture;
  }

  it('gruppiert erhaltene, inaktive und offene Badges (S-A07)', () => {
    const fixture = erstelle(
      {
        erhalten: [badge('b1', 'ERHALTEN')],
        inaktiv: [badge('b2', 'INAKTIV')],
        offen: [badge('b3', 'OFFEN')],
        ausgeblendet: false,
      },
      'PRAXISBILDNER',
    );

    const inhalt = fixture.nativeElement as HTMLElement;
    expect(inhalt.textContent).toContain('Erhalten (1)');
    expect(inhalt.textContent).toContain('Derzeit nicht erfüllt (1)');
    expect(inhalt.textContent).toContain('Noch offen (1)');
    expect(inhalt.querySelectorAll('st-badge-karte').length).toBe(3);
    // The visibility toggle belongs to the learner view only.
    expect(inhalt.querySelector('.badges__kopf button')).toBeNull();
  });

  it('blendet Badges für Lernende aus und meldet es (S-A07)', async () => {
    await umgebung.sitzung.anmelden('nora');
    const ausgeblendet = { erhalten: [], inaktiv: [], offen: [badge('b1', 'OFFEN')] };
    const fixture = erstelle({ ...ausgeblendet, ausgeblendet: false }, 'LERNENDE');
    let geaendert = 0;
    fixture.componentInstance.geaendert.subscribe(() => (geaendert += 1));

    const knopf = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.badges__kopf button',
    );
    expect(knopf?.textContent).toContain('Badges ausblenden');
    knopf?.click();
    await fixture.whenStable();

    expect(geaendert).toBe(1);
    expect(umgebung.sitzung.einstellung()?.badgesAusgeblendet).toBe(true);

    // The parent reloads the view with the stored setting.
    fixture.componentRef.setInput('badges', { ...ausgeblendet, ausgeblendet: true });
    fixture.detectChanges();

    const inhalt = fixture.nativeElement as HTMLElement;
    expect(inhalt.textContent).toContain('Badges sind für deine Ansicht ausgeblendet.');
    expect(inhalt.querySelector('.badges__kopf button')?.textContent).toContain(
      'Badges einblenden',
    );
  });
});
