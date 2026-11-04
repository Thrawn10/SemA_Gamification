import { TestBed } from '@angular/core/testing';
import { AmpelAnzeige } from './ampel-anzeige';

describe('AmpelAnzeige', () => {
  function erstelle(ampel: 'ROT' | 'ORANGE' | 'GRUEN', kompakt = false) {
    const fixture = TestBed.createComponent(AmpelAnzeige);
    fixture.componentRef.setInput('ampel', ampel);
    fixture.componentRef.setInput('kompakt', kompakt);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('zeigt Symbol und Text, nicht nur die Farbe (R-F4)', () => {
    const inhalt = erstelle('ROT');
    expect(inhalt.querySelector('.ampel--rot')).toBeTruthy();
    expect(inhalt.textContent).toContain('nicht – kaum');
    expect(inhalt.querySelector('[aria-hidden="true"]')?.textContent).toBe('○');
  });

  it('meldet den Zustand in der kompakten Variante für Screenreader', () => {
    const inhalt = erstelle('GRUEN', true);
    expect(inhalt.querySelector('.ampel--kompakt')).toBeTruthy();
    expect(inhalt.querySelector('.nur-screenreader')?.textContent).toContain('Ampel');
    expect(inhalt.querySelector('.nur-screenreader')?.textContent).toContain('mehrheitlich');
  });
});
