import { Component, computed, inject, input } from '@angular/core';
import { DemoDienst } from '../../../demo-steuerung/demo-dienst';

/** Small violet requirement marker, visible only in prototype mode (N-11). */
@Component({
  selector: 'st-anforderung',
  templateUrl: './anforderung-id.html',
  styleUrl: './anforderung-id.scss',
})
export class AnforderungId {
  readonly id = input.required<string>();
  private readonly demo = inject(DemoDienst);
  protected readonly sichtbar = computed(() => this.demo.idsSichtbar());
}
