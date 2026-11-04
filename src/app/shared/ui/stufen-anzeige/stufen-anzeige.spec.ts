import { TestBed } from '@angular/core/testing';
import { StufenAnzeige } from './stufen-anzeige';

describe('StufenAnzeige', () => {
  it('füllt die Felder bis zur erreichten Stufe (SPEC 8.5)', () => {
    const fixture = TestBed.createComponent(StufenAnzeige);
    fixture.componentRef.setInput('stufe', 2);
    fixture.detectChanges();

    const inhalt = fixture.nativeElement as HTMLElement;
    expect(inhalt.querySelectorAll('.stufen__feld--aktiv').length).toBe(2);
    expect(inhalt.querySelector('.stufen__text')?.textContent).toBe('geübt');
    expect(inhalt.querySelector('.stufen')?.getAttribute('aria-label')).toBe('Stufe: geübt');
  });

  it('zeigt keine aktiven Felder ohne Bestätigung', () => {
    const fixture = TestBed.createComponent(StufenAnzeige);
    fixture.componentRef.setInput('stufe', 0);
    fixture.detectChanges();

    const inhalt = fixture.nativeElement as HTMLElement;
    expect(inhalt.querySelectorAll('.stufen__feld--aktiv').length).toBe(0);
    expect(inhalt.querySelector('.stufen__text')?.textContent).toBe('keine');
  });

  it('zeigt im binären Modell nur offen oder abgeschlossen (D-022)', () => {
    const fixture = TestBed.createComponent(StufenAnzeige);
    fixture.componentRef.setInput('stufe', 3);
    fixture.componentRef.setInput('stufenmodell', 'BINAER');
    fixture.detectChanges();

    const inhalt = fixture.nativeElement as HTMLElement;
    expect(inhalt.querySelectorAll('.stufen__feld').length).toBe(1);
    expect(inhalt.querySelectorAll('.stufen__feld--aktiv').length).toBe(1);
    expect(inhalt.querySelector('.stufen__text')?.textContent).toBe('abgeschlossen');
    expect(inhalt.querySelector('.stufen')?.getAttribute('aria-label')).toBe(
      'Status: abgeschlossen',
    );

    fixture.componentRef.setInput('stufe', 0);
    fixture.detectChanges();
    expect(inhalt.querySelectorAll('.stufen__feld--aktiv').length).toBe(0);
    expect(inhalt.querySelector('.stufen__text')?.textContent).toBe('offen');
  });
});
