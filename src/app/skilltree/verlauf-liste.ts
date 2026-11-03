import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { VerlaufEintrag } from '@skilltree/vertraege';
import { ANFRAGE_STATUS_TEXTE } from '@skilltree/vertraege';

/** Newest-first history; revoked confirmations stay visible and struck through (S-A05). */
@Component({
  selector: 'st-verlauf-liste',
  imports: [DatePipe],
  templateUrl: './verlauf-liste.html',
  styleUrl: './verlauf-liste.scss',
})
export class VerlaufListe {
  readonly eintraege = input.required<VerlaufEintrag[]>();

  protected statusText(eintrag: VerlaufEintrag): string {
    return eintrag.anfrageStatus ? ANFRAGE_STATUS_TEXTE[eintrag.anfrageStatus] : '';
  }
}
