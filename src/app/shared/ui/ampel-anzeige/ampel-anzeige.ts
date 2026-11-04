import { Component, computed, input } from '@angular/core';
import type { Ampel } from '@skilltree/vertraege';
import { AMPEL_SYMBOLE, AMPEL_TEXTE } from '@skilltree/vertraege';

/** Traffic light with symbol and text, never colour alone (R-F4). */
@Component({
  selector: 'st-ampel',
  templateUrl: './ampel-anzeige.html',
  styleUrl: './ampel-anzeige.scss',
})
export class AmpelAnzeige {
  readonly ampel = input.required<Ampel>();
  readonly kompakt = input(false);

  protected readonly symbol = computed(() => AMPEL_SYMBOLE[this.ampel()]);
  protected readonly text = computed(() => AMPEL_TEXTE[this.ampel()]);
}
