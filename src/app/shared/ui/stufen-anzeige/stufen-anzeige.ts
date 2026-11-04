import { Component, computed, input } from '@angular/core';
import type { Stufe, Stufenmodell } from '@skilltree/vertraege';
import { stufenText } from '@skilltree/vertraege';

/** Three fields E, G, S (or one completion field for binary plans, D-022; SPEC 8.5). */
@Component({
  selector: 'st-stufen',
  templateUrl: './stufen-anzeige.html',
  styleUrl: './stufen-anzeige.scss',
})
export class StufenAnzeige {
  readonly stufe = input.required<Stufe>();
  readonly stufenmodell = input<Stufenmodell>('DREI_STUFEN');

  protected readonly binaer = computed(() => this.stufenmodell() === 'BINAER');
  protected readonly felder = computed(() =>
    this.binaer()
      ? [{ stufe: 3 as const, kuerzel: 'A' }]
      : [
          { stufe: 1 as const, kuerzel: 'E' },
          { stufe: 2 as const, kuerzel: 'G' },
          { stufe: 3 as const, kuerzel: 'S' },
        ],
  );
  protected readonly text = computed(() => stufenText(this.stufenmodell(), this.stufe()));
  protected readonly label = computed(() =>
    this.binaer() ? `Status: ${this.text()}` : `Stufe: ${this.text()}`,
  );
}
