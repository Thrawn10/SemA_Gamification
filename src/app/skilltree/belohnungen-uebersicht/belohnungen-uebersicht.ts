import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import type { BadgeAnsicht, SkilltreeAnsicht } from '@skilltree/vertraege';
import { ABSCHLUSS_STUFE, stufenText } from '@skilltree/vertraege';
import { AnforderungId } from '../../shared/ui/anforderung-id/anforderung-id';
import { FortschrittsAnzeige } from '../../shared/ui/fortschritts-anzeige/fortschritts-anzeige';
import { anteilProzent, astBelohnungen } from '../belohnungen';

/**
 * Reward board under the tree: one card per area ("Ast") with its completion badge and the
 * competences that have to reach the top level. Everything is derived from the badge
 * definitions (R-B3) and the stage counts; the board adds no rule and stores nothing.
 */
@Component({
  selector: 'st-belohnungen-uebersicht',
  imports: [DatePipe, AnforderungId, FortschrittsAnzeige],
  templateUrl: './belohnungen-uebersicht.html',
  styleUrl: './belohnungen-uebersicht.scss',
})
export class BelohnungenUebersicht {
  readonly ansicht = input.required<SkilltreeAnsicht>();
  readonly astGewaehlt = output<string>();

  protected readonly belohnungen = computed(() => astBelohnungen(this.ansicht()));
  protected readonly ausgeblendet = computed(() => this.ansicht().badges.ausgeblendet);
  protected readonly hoechsteStufe = computed(() =>
    stufenText(this.ansicht().stufenmodell, ABSCHLUSS_STUFE),
  );

  protected anteil(erreicht: number, gesamt: number): number {
    return anteilProzent(erreicht, gesamt);
  }

  protected statusText(badge: BadgeAnsicht | null): string {
    if (!badge) {
      return 'Kein Badge';
    }
    switch (badge.status) {
      case 'ERHALTEN':
        return 'Erhalten';
      case 'INAKTIV':
        return 'Nicht erfüllt';
      default:
        return 'Noch offen';
    }
  }
}
