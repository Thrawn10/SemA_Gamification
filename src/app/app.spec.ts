import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { SitzungDienst } from './dienste/sitzung-dienst';

const abgemeldet = {
  istAngemeldet: signal(false),
  rolle: signal(null),
  benutzer: signal(null),
  abmelden: () => Promise.resolve(),
};

describe('App', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), { provide: SitzungDienst, useValue: abgemeldet }],
    });
    await TestBed.compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('zeigt die Marke und den Anmelde-Link ohne Sitzung', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const inhalt = fixture.nativeElement as HTMLElement;

    expect(inhalt.querySelector('.app-kopf__marke')?.textContent).toContain('Skilltree');
    expect(inhalt.querySelector('.app-kopf__anmeldung')?.textContent).toContain('Anmelden');
    expect(inhalt.querySelector('nav')).toBeNull();
  });

  it('verlinkt den Hauptinhalt für Tastaturnutzung', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const inhalt = fixture.nativeElement as HTMLElement;

    expect(inhalt.querySelector('.skip-link')?.getAttribute('href')).toBe('#hauptinhalt');
    expect(inhalt.querySelector('main')?.id).toBe('hauptinhalt');
  });
});
