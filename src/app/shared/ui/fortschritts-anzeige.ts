import { Component, input } from '@angular/core';

/** Progress bar with percentage; the number is always visible (S-A02). */
@Component({
  selector: 'st-fortschritt',
  templateUrl: './fortschritts-anzeige.html',
  styleUrl: './fortschritts-anzeige.scss',
})
export class FortschrittsAnzeige {
  readonly wert = input.required<number>();
  readonly label = input('Fortschritt');
  readonly zeigeZahl = input(true);
}
