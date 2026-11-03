import { Component, inject, input, output } from '@angular/core';
import type { BadgesAnsicht, Rolle } from '@skilltree/vertraege';
import { SitzungDienst } from '../dienste/sitzung-dienst';
import { BadgeKarte } from '../shared/ui/badge-karte';
import { AnforderungId } from '../shared/ui/anforderung-id';

/** Badge tab: awarded, inactive and open badges (S-A07, R-B7). */
@Component({
  selector: 'st-badges-ansicht',
  imports: [BadgeKarte, AnforderungId],
  templateUrl: './badges-ansicht.html',
  styleUrl: './badges-ansicht.scss',
})
export class BadgesAnsichtKomponente {
  readonly badges = input.required<BadgesAnsicht>();
  readonly rolle = input.required<Rolle>();
  readonly geaendert = output<void>();

  private readonly sitzung = inject(SitzungDienst);

  protected async umschalten(ausblenden: boolean): Promise<void> {
    await this.sitzung.badgesAusblenden(ausblenden);
    this.geaendert.emit();
  }
}
