import { TestBed } from '@angular/core/testing';
import { AnforderungId } from './anforderung-id';
import { DemoDienst } from '../../demo-steuerung/demo-dienst';
import { erstelleUmgebung } from '../../../testing/dienst-umgebung';

describe('AnforderungId', () => {
  beforeEach(async () => {
    await erstelleUmgebung();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('bleibt unsichtbar, solange die Demo-IDs ausgeschaltet sind (N-11)', () => {
    const fixture = TestBed.createComponent(AnforderungId);
    fixture.componentRef.setInput('id', 'S-A03');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.anforderung-id')).toBeNull();
  });

  it('zeigt die ID nur als violetten Marker, nicht für Screenreader', () => {
    TestBed.inject(DemoDienst).idsSichtbar.set(true);
    const fixture = TestBed.createComponent(AnforderungId);
    fixture.componentRef.setInput('id', 'S-A03');
    fixture.detectChanges();

    const inhalt = fixture.nativeElement as HTMLElement;
    expect(inhalt.textContent).toContain('S-A03');
    expect(inhalt.querySelector('.anforderung-id')?.getAttribute('aria-hidden')).toBe('true');
  });
});
