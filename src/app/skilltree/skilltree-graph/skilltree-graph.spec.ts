import { TestBed } from '@angular/core/testing';
import type { SkilltreeAnsicht } from '@skilltree/vertraege';
import { SkilltreeGraph } from './skilltree-graph';
import {
  ausbildungVon,
  erstelleUmgebung,
  type TestUmgebung,
} from '../../../testing/dienst-umgebung';

describe('SkilltreeGraph', () => {
  let umgebung: TestUmgebung;
  let ansicht: SkilltreeAnsicht;

  beforeEach(async () => {
    umgebung = await erstelleUmgebung();
    await umgebung.sitzung.anmelden('nora');
    ansicht = await umgebung.skilltree.laden(ausbildungVon(umgebung, 'nora').id);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function erstelle(aktiv: string | null = null) {
    const fixture = TestBed.createComponent(SkilltreeGraph);
    fixture.componentRef.setInput('ansicht', ansicht);
    fixture.componentRef.setInput('aktiv', aktiv);
    fixture.detectChanges();
    return fixture;
  }

  it('zeichnet alle Kompetenzen, drei Meilensteine und die Ampel-Legende (SPEC 8.2)', () => {
    const inhalt = erstelle().nativeElement as HTMLElement;
    const anzahlKompetenzen = ansicht.bereiche.reduce(
      (summe, bereich) => summe + bereich.kompetenzen.length,
      0,
    );

    expect(inhalt.querySelectorAll('.graph__knoten').length).toBe(anzahlKompetenzen);
    expect(inhalt.querySelectorAll('.graph__meilenstein').length).toBe(3);
    expect(inhalt.querySelectorAll('.legende-ampel').length).toBe(3);
    expect(inhalt.textContent).toContain('nicht – kaum');
    expect(inhalt.textContent).toContain('teilweise');
    expect(inhalt.textContent).toContain('mehrheitlich – vollständig');
    expect(inhalt.querySelector('svg.graph__kanten')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('meldet gewählte Knoten, Äste und Meilensteine nach aussen', () => {
    const fixture = erstelle();
    const inhalt = fixture.nativeElement as HTMLElement;
    const knotenGewaehlt: string[] = [];
    const astGewaehlt: string[] = [];
    const meilensteinGewaehlt: string[] = [];
    fixture.componentInstance.knotenGewaehlt.subscribe((id) => knotenGewaehlt.push(id));
    fixture.componentInstance.astGewaehlt.subscribe((code) => astGewaehlt.push(code));
    fixture.componentInstance.meilensteinGewaehlt.subscribe((code) =>
      meilensteinGewaehlt.push(code),
    );

    inhalt.querySelector<HTMLButtonElement>('.graph__knoten')?.click();
    inhalt.querySelector<HTMLButtonElement>('.graph__ast')?.click();
    inhalt.querySelector<HTMLButtonElement>('.graph__meilenstein')?.click();

    expect(knotenGewaehlt).toEqual([ansicht.bereiche[0].kompetenzen[0].kompetenz.id]);
    expect(astGewaehlt).toEqual([ansicht.bereiche[0].bereich.code]);
    expect(meilensteinGewaehlt).toEqual([ansicht.meilensteine[0].code]);
  });

  it('hebt den extern gewählten Knoten hervor und zeigt seine Verweise', () => {
    const id = ansicht.bereiche[0].kompetenzen[0].kompetenz.id;
    const inhalt = erstelle(id).nativeElement as HTMLElement;

    expect(inhalt.querySelector(`[data-knoten="${id}"]`)?.classList).toContain(
      'graph__knoten--beteiligt',
    );
    expect(inhalt.querySelectorAll('.graph__kante--verweis').length).toBeGreaterThan(0);
  });

  it('skaliert die Bühne über die Kartenbreite und fällt ohne Messung auf die Referenz zurück (D-024)', () => {
    const inhalt = erstelle().nativeElement as HTMLElement;
    const buehne = inhalt.querySelector<HTMLElement>('.graph__buehne');

    expect(buehne?.style.getPropertyValue('--skala').trim()).toBe('1');
    expect(buehne?.style.getPropertyValue('--spalte').trim()).toBe('196px');
    expect(buehne?.style.getPropertyValue('inline-size').trim()).toBe(
      `${ansicht.bereiche.length * 196}px`,
    );
  });
});
