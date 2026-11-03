import { TestBed } from '@angular/core/testing';
import { FortschrittsAnzeige } from './fortschritts-anzeige';

describe('FortschrittsAnzeige', () => {
  it('exponiert den Wert als Fortschrittsbalken und als Zahl (S-A02)', () => {
    const fixture = TestBed.createComponent(FortschrittsAnzeige);
    fixture.componentRef.setInput('wert', 42);
    fixture.detectChanges();

    const inhalt = fixture.nativeElement as HTMLElement;
    const balken = inhalt.querySelector('[role="progressbar"]');
    expect(balken?.getAttribute('aria-valuenow')).toBe('42');
    expect(balken?.getAttribute('aria-valuetext')).toBe('42 Prozent');
    expect(inhalt.textContent).toContain('42 %');
  });

  it('blendet die Zahl auf Wunsch aus, behält aber das Label', () => {
    const fixture = TestBed.createComponent(FortschrittsAnzeige);
    fixture.componentRef.setInput('wert', 7);
    fixture.componentRef.setInput('label', 'Gesamtfortschritt');
    fixture.componentRef.setInput('zeigeZahl', false);
    fixture.detectChanges();

    const inhalt = fixture.nativeElement as HTMLElement;
    expect(inhalt.querySelector('.fortschritt__zahl')).toBeNull();
    expect(inhalt.querySelector('[role="progressbar"]')?.getAttribute('aria-label')).toBe(
      'Gesamtfortschritt',
    );
  });
});
