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
    expect(buehne?.style.getPropertyValue('--zeile').trim()).toBe('84px');
    expect(buehne?.style.getPropertyValue('inline-size').trim()).toBe(
      `${ansicht.bereiche.length * 196}px`,
    );
  });

  it('setzt Status- und Anfrage-Badge an den Ring, damit sie der Zeilenhöhe folgen (D-027)', () => {
    const inhalt = erstelle().nativeElement as HTMLElement;
    const ringe = [...inhalt.querySelectorAll('.graph__ring')];
    expect(ringe.length).toBeGreaterThan(0);
    for (const ring of ringe) {
      expect(ring.querySelector('.graph__zustand')).not.toBeNull();
    }
  });

  it('kennzeichnet abgeschlossene, nächste und spätere Knoten mit einem Zeichen (D-026)', () => {
    const inhalt = erstelle().nativeElement as HTMLElement;
    const kompetenzen = ansicht.bereiche.flatMap((bereich) => bereich.kompetenzen);
    const istAbgeschlossen = (kompetenz: (typeof kompetenzen)[number]) =>
      kompetenz.anzahlLeistungsziele > 0 &&
      kompetenz.abgeschlosseneLeistungsziele >= kompetenz.anzahlLeistungsziele;
    const abgeschlossen = kompetenzen.filter(istAbgeschlossen);
    const naechste = kompetenzen.filter(
      (kompetenz) => !istAbgeschlossen(kompetenz) && kompetenz.istNaechster,
    );

    expect(inhalt.querySelectorAll('.graph__knoten--abgeschlossen').length).toBe(
      abgeschlossen.length,
    );
    expect(inhalt.querySelectorAll('.graph__knoten--naechster').length).toBe(naechste.length);
    expect(inhalt.querySelectorAll('.graph__knoten .graph__zustand').length).toBe(
      kompetenzen.length,
    );

    const zeichen = (id: string) =>
      inhalt.querySelector(`[data-knoten="${id}"] .graph__zustand`)?.textContent?.trim();
    for (const kompetenz of abgeschlossen) {
      expect(zeichen(kompetenz.kompetenz.id)).toBe('✓');
    }
    for (const kompetenz of naechste) {
      expect(zeichen(kompetenz.kompetenz.id)).toBe('▶');
    }
    expect(
      inhalt
        .querySelector(`[data-knoten="${naechste[0].kompetenz.id}"]`)
        ?.getAttribute('aria-label'),
    ).toContain('Als Nächstes');
    expect(inhalt.textContent).toContain('Abgeschlossen');
    expect(inhalt.textContent).toContain('Noch nicht dran');
  });

  it('führt keine Kante waagrecht durch eine Knotenzeile (D-026)', () => {
    const id = ansicht.bereiche[0].kompetenzen[0].kompetenz.id;
    const inhalt = erstelle(id).nativeElement as HTMLElement;
    const buehne = inhalt.querySelector<HTMLElement>('.graph__buehne');
    const skala = Number(buehne?.style.getPropertyValue('--skala') || 1);
    const zeile = Number.parseFloat(buehne?.style.getPropertyValue('--zeile') || '84');
    const knotenY = [...inhalt.querySelectorAll<HTMLElement>('.graph__knoten')].map(
      (knoten) => Number.parseFloat(knoten.style.getPropertyValue('inset-block-start')) + zeile / 2,
    );
    expect(knotenY.length).toBeGreaterThan(0);

    for (const pfad of inhalt.querySelectorAll<SVGPathElement>('path.graph__kante')) {
      const d = pfad.getAttribute('d') ?? '';
      const anker = (d.match(/[MLQ][^MLQ]+/g) ?? []).map((teil) => {
        const zahlen = teil.slice(1).trim().split(/\s+/).map(Number);
        return { x: zahlen[zahlen.length - 2], y: zahlen[zahlen.length - 1] };
      });
      for (let index = 1; index < anker.length; index++) {
        const vor = anker[index - 1];
        const nach = anker[index];
        if (vor.y !== nach.y || vor.x === nach.x) {
          continue;
        }
        for (const y of knotenY) {
          expect(Math.abs(nach.y - y)).toBeGreaterThanOrEqual(22 * skala);
        }
      }
    }
  });

  it('verschiebt den Baum beim Ziehen und öffnet danach keinen Knoten (D-026)', async () => {
    const fixture = erstelle();
    const inhalt = fixture.nativeElement as HTMLElement;
    const karte = inhalt.querySelector<HTMLElement>('.graph__karte')!;
    const gewaehlt: string[] = [];
    fixture.componentInstance.knotenGewaehlt.subscribe((id) => gewaehlt.push(id));
    Object.defineProperty(karte, 'scrollWidth', { value: 2000, configurable: true });
    Object.defineProperty(karte, 'clientWidth', { value: 800, configurable: true });
    karte.scrollLeft = 300;

    expect(karte.getAttribute('tabindex')).toBe('0');
    expect(karte.getAttribute('aria-label')).toBe('Skilltree-Baum');

    karte.dispatchEvent(new MouseEvent('pointerdown', { clientX: 500, button: 0, bubbles: true }));
    karte.dispatchEvent(new MouseEvent('pointermove', { clientX: 440, buttons: 1, bubbles: true }));
    fixture.detectChanges();
    expect(karte.scrollLeft).toBe(360);
    expect(karte.classList).toContain('graph__karte--zieht');

    karte.dispatchEvent(new MouseEvent('pointerup', { clientX: 440, bubbles: true }));
    fixture.detectChanges();
    expect(karte.classList).not.toContain('graph__karte--zieht');

    const knoten = inhalt.querySelector<HTMLButtonElement>('.graph__knoten')!;
    const knotenId = knoten.getAttribute('data-knoten');
    knoten.click();
    expect(gewaehlt).toEqual([]);

    await new Promise((fertig) => setTimeout(fertig, 0));
    knoten.click();
    expect(gewaehlt).toEqual([knotenId]);
  });

  it('startet das Ziehen erst ab fünf Pixel, damit ein Klick auf den Knoten erhalten bleibt (D-026)', () => {
    const fixture = erstelle();
    const inhalt = fixture.nativeElement as HTMLElement;
    const karte = inhalt.querySelector<HTMLElement>('.graph__karte')!;
    karte.scrollLeft = 300;

    karte.dispatchEvent(new MouseEvent('pointerdown', { clientX: 500, button: 0, bubbles: true }));
    karte.dispatchEvent(new MouseEvent('pointermove', { clientX: 496, buttons: 1, bubbles: true }));
    fixture.detectChanges();
    expect(karte.scrollLeft).toBe(300);
    expect(karte.classList).not.toContain('graph__karte--zieht');
    karte.dispatchEvent(new MouseEvent('pointerup', { clientX: 496, bubbles: true }));
  });
});
