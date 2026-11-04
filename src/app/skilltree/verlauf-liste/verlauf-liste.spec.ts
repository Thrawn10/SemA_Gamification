import { TestBed } from '@angular/core/testing';
import type { VerlaufEintrag } from '@skilltree/vertraege';
import { VerlaufListe } from './verlauf-liste';

const EINTRAG: VerlaufEintrag = {
  id: 'eintrag-1',
  art: 'EREIGNIS',
  aktion: 'Stufe 2 bestätigt',
  zeitpunkt: '2026-03-04T09:15:00.000Z',
  akteurId: 'u-daniel',
  akteurName: 'Daniel Brunner',
  kommentar: 'Im Betrieb beobachtet.',
  stufe: 2,
  aktiv: true,
};

describe('VerlaufListe', () => {
  it('meldet den leeren Verlauf', () => {
    const fixture = TestBed.createComponent(VerlaufListe);
    fixture.componentRef.setInput('eintraege', []);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Noch kein Verlauf.');
  });

  it('zeigt Einträge neueste zuerst inklusive Rücknahme (S-A05)', () => {
    const fixture = TestBed.createComponent(VerlaufListe);
    fixture.componentRef.setInput('eintraege', [
      EINTRAG,
      {
        ...EINTRAG,
        id: 'eintrag-2',
        aktion: 'Rücknahme Stufe 3',
        aktiv: false,
        kommentar: undefined,
        begruendung: 'Prüfung wurde aberkannt.',
        anfrageStatus: 'ABGELEHNT',
      },
    ]);
    fixture.detectChanges();

    const inhalt = fixture.nativeElement as HTMLElement;
    expect(inhalt.querySelectorAll('.verlauf__eintrag').length).toBe(2);
    expect(inhalt.querySelector('.verlauf__eintrag--inaktiv')).toBeTruthy();
    expect(inhalt.textContent).toContain('Im Betrieb beobachtet.');
    expect(inhalt.textContent).toContain('Prüfung wurde aberkannt.');
    expect(inhalt.textContent).toContain('(abgelehnt)');
    expect(inhalt.textContent).toContain('04.03.2026');
  });
});
