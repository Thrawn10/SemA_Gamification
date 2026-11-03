import { Component, ElementRef, Injector, afterNextRender, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { Rolle } from '@skilltree/vertraege';
import { ROLLEN_TEXTE } from '@skilltree/vertraege';
import { DatenverwaltungDienst } from '../dienste/datenverwaltung-dienst';
import { SitzungDienst } from '../dienste/sitzung-dienst';
import { fehlerText } from '../core/fehler';
import { DemoDienst } from './demo-dienst';

/** Violet prototype control bar; not part of the application (N-11). */
@Component({
  selector: 'st-demo-leiste',
  templateUrl: './demo-leiste.html',
  styleUrl: './demo-leiste.scss',
})
export class DemoLeiste {
  protected readonly demo = inject(DemoDienst);
  protected readonly sitzung = inject(SitzungDienst);
  private readonly datenverwaltung = inject(DatenverwaltungDienst);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly loeschBestaetigung = signal(false);
  protected readonly meldung = signal<string | null>(null);

  constructor() {
    void this.demo.laden();
  }

  protected rollenText(rolle: Rolle): string {
    return ROLLEN_TEXTE[rolle];
  }

  protected async wechsle(ereignis: Event): Promise<void> {
    const login = (ereignis.target as HTMLSelectElement).value;
    try {
      await this.demo.wechsle(login);
      await this.router.navigateByUrl('/');
    } catch (fehler) {
      this.meldung.set(fehlerText(fehler));
    }
  }

  protected idsUmschalten(ereignis: Event): void {
    this.demo.idsSichtbar.set((ereignis.target as HTMLInputElement).checked);
  }

  protected async zuruecksetzen(): Promise<void> {
    this.loeschBestaetigung.set(false);
    try {
      await this.datenverwaltung.zuruecksetzen();
      this.meldung.set('Demo-Daten wurden auf den Seed-Stand zurückgesetzt.');
    } catch (fehler) {
      this.meldung.set(fehlerText(fehler));
    }
    this.fokussiere('[data-fokus="demo-reset"]');
  }

  protected resetAnfragen(): void {
    this.loeschBestaetigung.set(true);
    this.fokussiere('[data-fokus="demo-reset-ja"]');
  }

  protected resetAbbrechen(): void {
    this.loeschBestaetigung.set(false);
    this.fokussiere('[data-fokus="demo-reset"]');
  }

  /** The confirmation replaces the trigger button, so focus has to be moved explicitly. */
  private fokussiere(selektor: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selektor)?.focus(), {
      injector: this.injector,
    });
  }
}
