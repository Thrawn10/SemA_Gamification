import { TestBed } from '@angular/core/testing';
import { SkilltreeSeite } from './skilltree-seite';
import {
  ausbildungVon,
  erstelleUmgebung,
  type TestUmgebung,
} from '../../../testing/dienst-umgebung';
import { element, warteBis } from '../../../testing/seiten-helfer';

describe('SkilltreeSeite', () => {
  let umgebung: TestUmgebung;

  beforeEach(async () => {
    umgebung = await erstelleUmgebung();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('zeichnet den Baum und öffnet die Seitenleiste per Klick', async () => {
    await umgebung.sitzung.anmelden('nora');
    const fixture = TestBed.createComponent(SkilltreeSeite);
    fixture.componentRef.setInput('id', ausbildungVon(umgebung, 'nora').id);
    fixture.detectChanges();

    await warteBis(fixture, () => {
      expect(element(fixture).querySelectorAll('.graph__knoten').length).toBeGreaterThan(0);
    });

    expect(element(fixture).querySelectorAll('.graph__meilenstein').length).toBe(3);

    const knoten = element(fixture).querySelector<HTMLButtonElement>('.graph__knoten');
    knoten?.click();
    fixture.detectChanges();

    expect(element(fixture).querySelector('aside.seitenleiste')).toBeTruthy();
    expect(element(fixture).querySelector('.seitenleiste__ziele')).toBeTruthy();
  });

  it('Reiter «Badges» zeigt erhaltene und offene Badges', async () => {
    await umgebung.sitzung.anmelden('nora');
    const fixture = TestBed.createComponent(SkilltreeSeite);
    fixture.componentRef.setInput('id', ausbildungVon(umgebung, 'nora').id);
    fixture.detectChanges();
    await warteBis(fixture, () => {
      expect(element(fixture).querySelectorAll('.reiter__knopf').length).toBe(2);
    });

    element(fixture).querySelectorAll<HTMLButtonElement>('.reiter__knopf')[1].click();
    fixture.detectChanges();

    expect(element(fixture).querySelector('st-badges-ansicht')).toBeTruthy();
    expect(element(fixture).querySelectorAll('.badge-karte').length).toBeGreaterThan(0);
  });

  it('zeigt unter dem Baum die Belohnungen pro Ast und öffnet den Ast (D-024)', async () => {
    await umgebung.sitzung.anmelden('nora');
    const fixture = TestBed.createComponent(SkilltreeSeite);
    fixture.componentRef.setInput('id', ausbildungVon(umgebung, 'nora').id);
    fixture.detectChanges();
    await warteBis(fixture, () => {
      expect(element(fixture).querySelectorAll('.belohnung').length).toBeGreaterThan(0);
    });

    expect(element(fixture).querySelectorAll('.belohnung').length).toBe(
      element(fixture).querySelectorAll('.graph__ast').length,
    );

    element(fixture).querySelector<HTMLButtonElement>('.belohnung__aktion')?.click();
    fixture.detectChanges();

    const dialog = element(fixture).querySelector('aside.seitenleiste');
    expect(dialog?.textContent).toContain('Belohnung für diesen Ast');
  });
});
