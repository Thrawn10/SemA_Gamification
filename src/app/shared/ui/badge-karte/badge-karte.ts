import { Component, computed, input } from '@angular/core';
import type { BadgeAnsicht } from '@skilltree/vertraege';
import { DatePipe } from '@angular/common';

/** Badge card for awarded, inactive and open badges (S-A07, SPEC 8.4). */
@Component({
  selector: 'st-badge-karte',
  imports: [DatePipe],
  templateUrl: './badge-karte.html',
  styleUrl: './badge-karte.scss',
})
export class BadgeKarte {
  readonly ansicht = input.required<BadgeAnsicht>();

  protected readonly eckig = computed(() => {
    const regeltyp = this.ansicht().definition.regeltyp;
    return regeltyp === 'MEILENSTEIN' || regeltyp === 'BEREICH_ABGESCHLOSSEN';
  });
  protected readonly fortschrittText = computed(() => this.ansicht().fortschrittText);
}
