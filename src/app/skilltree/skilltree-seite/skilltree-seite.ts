import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { SkilltreeAnsicht } from '@skilltree/vertraege';
import { DomaenenEreignisse } from '../../core/domaenen-ereignisse';
import { fehlerText } from '../../core/fehler';
import { SkilltreeDienst } from '../../dienste/skilltree-dienst';
import { BadgesAnsichtKomponente } from '../badges-ansicht/badges-ansicht';
import { BelohnungenUebersicht } from '../belohnungen-uebersicht/belohnungen-uebersicht';
import type { BaumAuswahl } from '../auswahl';
import { SkilltreeGraph } from '../skilltree-graph/skilltree-graph';
import { SkilltreeSeitenleiste } from '../skilltree-seitenleiste/skilltree-seitenleiste';
import { AnforderungId } from '../../shared/ui/anforderung-id/anforderung-id';
import { FortschrittsAnzeige } from '../../shared/ui/fortschritts-anzeige/fortschritts-anzeige';

/** Learner and coach skilltree page (S-A01–S-A08, S-L02). */
@Component({
  selector: 'st-skilltree-seite',
  imports: [
    RouterLink,
    SkilltreeGraph,
    SkilltreeSeitenleiste,
    BadgesAnsichtKomponente,
    BelohnungenUebersicht,
    AnforderungId,
    FortschrittsAnzeige,
  ],
  templateUrl: './skilltree-seite.html',
  styleUrl: './skilltree-seite.scss',
})
export class SkilltreeSeite {
  readonly id = input<string>();
  readonly knoten = input<string>();
  readonly lz = input<string>();

  private readonly skilltree = inject(SkilltreeDienst);
  private readonly domaenenEreignisse = inject(DomaenenEreignisse);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly ansicht = signal<SkilltreeAnsicht | null>(null);
  protected readonly fehler = signal<string | null>(null);
  protected readonly auswahl = signal<BaumAuswahl | null>(null);
  protected readonly reiter = signal<'skilltree' | 'badges'>('skilltree');
  protected readonly startLz = computed(() => this.lz() ?? null);

  private startAngewendet = false;
  private geladeneId: string | undefined;

  protected readonly aktiveKnotenId = computed(() => {
    const auswahl = this.auswahl();
    return auswahl?.art === 'kompetenz' ? auswahl.id : null;
  });

  constructor() {
    effect(() => {
      // Reload after every domain event and whenever the route id changes.
      this.domaenenEreignisse.version();
      void this.laden();
    });
  }

  private async laden(): Promise<void> {
    const ausbildungId = this.id();
    if (!ausbildungId) {
      return;
    }
    if (this.geladeneId !== ausbildungId) {
      // A different learner: drop the previous selection and deep-link handling.
      this.geladeneId = ausbildungId;
      this.auswahl.set(null);
      this.startAngewendet = false;
    }
    try {
      const geladen = await this.skilltree.laden(ausbildungId);
      this.ansicht.set(geladen);
      this.fehler.set(null);
      this.auswahlBereinigen(geladen);
      if (!this.startAngewendet && this.knoten()) {
        this.startAngewendet = true;
        this.auswahl.set({ art: 'kompetenz', id: this.knoten() ?? '' });
      }
    } catch (fehler) {
      this.fehler.set(fehlerText(fehler));
    }
  }

  protected neuLaden(): void {
    void this.laden();
  }

  /** Clears a selection that no longer exists in the loaded plan (e.g. after a template import). */
  private auswahlBereinigen(ansicht: SkilltreeAnsicht): void {
    const auswahl = this.auswahl();
    if (!auswahl) {
      return;
    }
    const vorhanden =
      auswahl.art === 'meilenstein'
        ? ansicht.meilensteine.some((eintrag) => eintrag.code === auswahl.code)
        : auswahl.art === 'ast'
          ? ansicht.bereiche.some((eintrag) => eintrag.bereich.code === auswahl.code)
          : ansicht.bereiche.some((eintrag) =>
              eintrag.kompetenzen.some((kompetenz) => kompetenz.kompetenz.id === auswahl.id),
            );
    if (!vorhanden) {
      this.auswahl.set(null);
    }
  }

  protected knotenOeffnen(id: string): void {
    this.auswahl.set({ art: 'kompetenz', id });
  }

  protected astOeffnen(code: string): void {
    this.auswahl.set({ art: 'ast', code });
  }

  protected meilensteinOeffnen(code: 'BBC' | 'IPA' | 'LAP'): void {
    this.auswahl.set({ art: 'meilenstein', code });
  }

  protected schliessen(): void {
    const letzte = this.auswahl();
    this.auswahl.set(null);
    if (!letzte) {
      return;
    }
    const selektor =
      letzte.art === 'kompetenz'
        ? `[data-knoten="${letzte.id}"]`
        : letzte.art === 'ast'
          ? `[data-ast="${letzte.code}"]`
          : `[data-meilenstein="${letzte.code}"]`;
    // The sidebar is removed on close, so return focus to the node that opened it.
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selektor)?.focus(), {
      injector: this.injector,
    });
  }

  protected praxisbildnerText(ansicht: SkilltreeAnsicht): string {
    return ansicht.praxisbildner.map((person) => person.name).join(', ');
  }
}
