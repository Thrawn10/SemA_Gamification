import { Component, computed, input } from '@angular/core';
import type { BadgeAnsicht } from '@skilltree/vertraege';
import { DatePipe } from '@angular/common';
import { FortschrittsAnzeige } from '../fortschritts-anzeige/fortschritts-anzeige';

/** Badge card for awarded, inactive and open badges (S-A07, SPEC 8.4). */
@Component({
  selector: 'st-badge-karte',
  imports: [DatePipe, FortschrittsAnzeige],
  templateUrl: './badge-karte.html',
  styleUrl: './badge-karte.scss',
})
export class BadgeKarte {
  readonly ansicht = input.required<BadgeAnsicht>();

  /** Milestone and area badges keep the angular medal so the badge families are distinguishable. */
  protected readonly eckig = computed(() => {
    const regeltyp = this.ansicht().definition.regeltyp;
    return regeltyp === 'MEILENSTEIN_ERREICHT' || regeltyp === 'BEREICH_ABGESCHLOSSEN';
  });
  protected readonly fortschrittText = computed(() => this.ansicht().fortschrittText);
  /** Share of the badge criterion that is already met, shown as a bar while it is open. */
  protected readonly anteil = computed(() => {
    const { aktuell, gesamt } = this.ansicht();
    return gesamt <= 0 ? 0 : Math.round((aktuell * 100) / gesamt);
  });
}
