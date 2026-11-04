import { Component, computed, inject, input, output } from '@angular/core';
import type { BadgesAnsicht, Rolle } from '@skilltree/vertraege';
import { SitzungDienst } from '../../dienste/sitzung-dienst';
import { BadgeKarte } from '../../shared/ui/badge-karte/badge-karte';
import { AnforderungId } from '../../shared/ui/anforderung-id/anforderung-id';
import { FortschrittsAnzeige } from '../../shared/ui/fortschritts-anzeige/fortschritts-anzeige';

/** Badge tab: awarded, inactive and open badges (S-A07, R-B7). */
@Component({
  selector: 'st-badges-ansicht',
  imports: [BadgeKarte, AnforderungId, FortschrittsAnzeige],
  templateUrl: './badges-ansicht.html',
  styleUrl: './badges-ansicht.scss',
})
export class BadgesAnsichtKomponente {
  readonly badges = input.required<BadgesAnsicht>();
  readonly rolle = input.required<Rolle>();
  readonly geaendert = output<void>();

  private readonly sitzung = inject(SitzungDienst);

  protected readonly gesamt = computed(() => {
    const badges = this.badges();
    return badges.erhalten.length + badges.inaktiv.length + badges.offen.length;
  });
  protected readonly erhalten = computed(() => this.badges().erhalten.length);
  protected readonly anteil = computed(() => {
    const gesamt = this.gesamt();
    return gesamt <= 0 ? 0 : Math.round((this.erhalten() * 100) / gesamt);
  });

  protected async umschalten(ausblenden: boolean): Promise<void> {
    await this.sitzung.badgesAusblenden(ausblenden);
    this.geaendert.emit();
  }
}
