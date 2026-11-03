import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { fehlerText } from '../core/fehler';
import { SitzungDienst } from '../dienste/sitzung-dienst';
import { UebersichtDienst } from '../dienste/uebersicht-dienst';

/** Role-based entry point after login or when clicking the product name. */
@Component({
  selector: 'st-start-seite',
  templateUrl: './start-seite.html',
  styleUrl: './start-seite.scss',
})
export class StartSeite {
  private readonly sitzung = inject(SitzungDienst);
  private readonly uebersicht = inject(UebersichtDienst);
  private readonly router = inject(Router);

  protected readonly ohneAusbildung = signal(false);
  protected readonly fehler = signal<string | null>(null);

  constructor() {
    void this.weiterleiten();
  }

  private async weiterleiten(): Promise<void> {
    if (!this.sitzung.istAngemeldet()) {
      await this.router.navigate(['/anmeldung']);
      return;
    }
    try {
      const rolle = this.sitzung.rolle();
      if (rolle === 'PRAXISBILDNER') {
        await this.router.navigate(['/uebersicht']);
        return;
      }
      if (rolle === 'ADMIN') {
        await this.router.navigate(['/admin/import']);
        return;
      }
      const ausbildung = await this.uebersicht.eigeneAusbildung();
      if (!ausbildung) {
        this.ohneAusbildung.set(true);
        return;
      }
      await this.router.navigate(['/skilltree', ausbildung.id]);
    } catch (fehler) {
      this.fehler.set(fehlerText(fehler));
    }
  }
}
