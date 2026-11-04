import { TestBed } from '@angular/core/testing';
import type { BadgeAnsicht, BadgeDefinition } from '@skilltree/vertraege';
import { BadgeKarte } from './badge-karte';

const DEFINITION: BadgeDefinition = {
  id: 'badge-1',
  vorlageId: 'vorlage-1',
  code: 'K3-5',
  titel: '5 Kompetenzen selbständig',
  kriterium: 'Mindestens 5 Kompetenzen haben alle Leistungsziele selbständig.',
  regeltyp: 'KOMPETENZ_ANZAHL',
  parameter: { stufe: 3, anzahl: 5 },
  reihenfolge: 1,
};

function erstelle(ansicht: BadgeAnsicht) {
  const fixture = TestBed.createComponent(BadgeKarte);
  fixture.componentRef.setInput('ansicht', ansicht);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('BadgeKarte', () => {
  it('zeigt ein erhaltenes Badge mit Vergabedatum (S-A07)', () => {
    const inhalt = erstelle({
      definition: DEFINITION,
      vergabe: {
        id: 'vergabe-1',
        ausbildungId: 'az-1',
        badgeId: 'badge-1',
        vergebenAm: '2026-03-04T09:00:00.000Z',
        aktiv: true,
        ausStartstand: true,
      },
      status: 'ERHALTEN',
      fortschrittText: '5 von 5',
      aktuell: 5,
      gesamt: 5,
    });

    expect(inhalt.textContent).toContain('5 Kompetenzen selbständig');
    expect(inhalt.textContent).toContain('Erhalten am 04.03.2026');
    expect(inhalt.textContent).toContain('aus Startstand');
    expect(inhalt.querySelector('st-fortschritt')).toBeNull();
  });

  it('markiert offene und inaktive Badges und nutzt eckige Medaillen für Meilensteine', () => {
    const offen = erstelle({
      definition: { ...DEFINITION, regeltyp: 'MEILENSTEIN_ERREICHT', code: 'M-IPA' },
      vergabe: null,
      status: 'OFFEN',
      fortschrittText: 'Meilenstein noch nicht erreicht',
      aktuell: 0,
      gesamt: 1,
    });
    expect(offen.querySelector('.badge-karte--offen')).toBeTruthy();
    expect(offen.querySelector('.badge-karte__medaille--eckig')).toBeTruthy();
    expect(offen.textContent).toContain('Meilenstein noch nicht erreicht');
    // State is not conveyed by colour or dash pattern alone (WCAG 1.3.1 / 1.4.1).
    expect(offen.textContent).toContain('Noch offen');
    expect(offen.querySelector('st-fortschritt')).toBeTruthy();

    const inaktiv = erstelle({
      definition: DEFINITION,
      vergabe: {
        id: 'vergabe-2',
        ausbildungId: 'az-1',
        badgeId: 'badge-1',
        vergebenAm: '2026-02-01T09:00:00.000Z',
        inaktivSeit: '2026-03-01T09:00:00.000Z',
        aktiv: false,
        ausStartstand: false,
      },
      status: 'INAKTIV',
      fortschrittText: '2 von 3',
      aktuell: 2,
      gesamt: 3,
    });
    expect(inaktiv.querySelector('.badge-karte--inaktiv')).toBeTruthy();
    expect(inaktiv.textContent).toContain('Derzeit nicht erfüllt seit');
    expect(inaktiv.textContent).toContain('01.03.2026');
    expect(inaktiv.querySelector('st-fortschritt')).toBeTruthy();
  });
});
