import { Component, computed, input } from '@angular/core';
import type { Stufe } from '@skilltree/vertraege';
import { STUFEN_TEXTE } from '@skilltree/vertraege';

/** Three fields E, G, S filled up to the reached cumulative level (SPEC 8.5). */
@Component({
  selector: 'st-stufen',
  templateUrl: './stufen-anzeige.html',
  styleUrl: './stufen-anzeige.scss',
})
export class StufenAnzeige {
  readonly stufe = input.required<Stufe>();

  protected readonly felder = [
    { stufe: 1 as const, kuerzel: 'E' },
    { stufe: 2 as const, kuerzel: 'G' },
    { stufe: 3 as const, kuerzel: 'S' },
  ];
  protected readonly text = computed(() => STUFEN_TEXTE[this.stufe()]);
}
