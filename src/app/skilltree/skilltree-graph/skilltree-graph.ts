import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type {
  KantenAnsicht,
  KompetenzAnsicht,
  MeilensteinCode,
  SkilltreeAnsicht,
} from '@skilltree/vertraege';
import { AMPEL_SYMBOLE, AMPEL_TEXTE, MEILENSTEIN_TEXTE } from '@skilltree/vertraege';
import { AnforderungId } from '../../shared/ui/anforderung-id/anforderung-id';
import {
  baumSkala,
  KREIS_RADIUS,
  spaltenbreite as spaltenbreiteFuer,
  ZEILENABSTAND,
} from '../baum-geometrie';

interface Punkt {
  x: number;
  y: number;
}

interface KompetenzKnoten {
  id: string;
  code: string;
  titel: string;
  fortschritt: number;
  ampel: KompetenzAnsicht['ampel'];
  istNaechster: boolean;
  offeneAnfragen: number;
  punkt: Punkt;
  astCode: string;
  tooltip: string;
}

interface AstBasis {
  id: string;
  code: string;
  titel: string;
  fortschritt: number;
  roteKompetenzen: number;
  punkt: Punkt;
  tooltip: string;
}

interface MeilensteinKnoten {
  code: MeilensteinCode;
  kuerzel: string;
  name: string;
  untertitel: string;
  erreicht: boolean;
  punkt: Punkt;
  tooltip: string;
}

interface Pfad {
  id: string;
  d: string;
  typ: KantenAnsicht['typ'];
  zustand: KantenAnsicht['zustand'];
  beteiligt: boolean;
  sichtbar: boolean;
  marker: 'erreicht' | 'offen';
}

/**
 * HTML buttons above an SVG edge layer (SPEC 8.2). The column width follows the available card
 * width between 150 and 284 px (D-024); all node geometry scales with it, so large screens show a
 * larger tree. The card scrolls sideways on narrow screens and starts centred.
 */
@Component({
  selector: 'st-skilltree-graph',
  imports: [AnforderungId],
  templateUrl: './skilltree-graph.html',
  styleUrl: './skilltree-graph.scss',
})
export class SkilltreeGraph {
  readonly ansicht = input.required<SkilltreeAnsicht>();
  readonly aktiv = input<string | null>(null);

  readonly knotenGewaehlt = output<string>();
  readonly astGewaehlt = output<string>();
  readonly meilensteinGewaehlt = output<MeilensteinCode>();

  private readonly baumkarte = viewChild<ElementRef<HTMLDivElement>>('baumkarte');
  private readonly zerstoerer = inject(DestroyRef);
  private readonly kartenBreite = signal(0);
  private readonly aktiverKnoten = signal<string | null>(null);
  private zentriert = false;

  /** S-A02: visible legend of the three traffic-light levels with symbol and text. */
  protected readonly ampelStufen = (['ROT', 'ORANGE', 'GRUEN'] as const).map((ampel) => ({
    ampel,
    symbol: AMPEL_SYMBOLE[ampel],
    text: AMPEL_TEXTE[ampel],
  }));

  constructor() {
    afterNextRender(() => {
      this.beobachteBreite();
      this.zentriere();
    });
    effect(() => {
      // Re-centre once the data is rendered after the first async load.
      this.ansicht();
      if (!this.zentriert) {
        queueMicrotask(() => this.zentriere());
      }
    });
  }

  /** Column width for the current card width; 196 px until the layout can be measured. */
  protected readonly spaltenbreite = computed(() =>
    spaltenbreiteFuer(this.kartenBreite(), this.ansicht().bereiche.length),
  );

  /** Scale factor for circles, rows and fonts; never below the reference layout. */
  protected readonly skala = computed(() => baumSkala(this.spaltenbreite()));

  protected readonly layout = computed(() => {
    const ansicht = this.ansicht();
    const skala = this.skala();
    const spaltenbreite = this.spaltenbreite();
    const spalten = Math.max(1, ansicht.bereiche.length);
    const breite = spalten * spaltenbreite;
    const radius = KREIS_RADIUS * skala;
    const zeilenabstand = ZEILENABSTAND * skala;
    const maxZeilen = Math.max(1, ...ansicht.bereiche.map((bereich) => bereich.kompetenzen.length));
    const ipaY = 104 * skala;
    const obersteZeile = ipaY + 56 * skala + radius;
    const untersteZeile = obersteZeile + (maxZeilen - 1) * zeilenabstand;
    const astBasisY = untersteZeile + zeilenabstand;
    const bbcY = astBasisY + 54 * skala;

    const astBasen: AstBasis[] = ansicht.bereiche.map((bereich, index) => {
      const punkt = { x: index * spaltenbreite + 32 * skala, y: astBasisY };
      return {
        id: `AST-${bereich.bereich.code}`,
        code: bereich.bereich.code,
        titel: bereich.bereich.titel,
        fortschritt: bereich.fortschritt,
        roteKompetenzen: bereich.roteKompetenzen,
        punkt,
        tooltip: `Bereich ${bereich.bereich.code}: ${bereich.bereich.titel} · ${bereich.fortschritt} % · ${bereich.roteKompetenzen} rot · Ampel: ${AMPEL_TEXTE[bereich.ampel]}`,
      };
    });

    const kompetenzen: KompetenzKnoten[] = [];
    for (const [index, bereich] of ansicht.bereiche.entries()) {
      for (const [zeile, kompetenz] of bereich.kompetenzen.entries()) {
        const punkt = {
          x: index * spaltenbreite + 32 * skala,
          y: untersteZeile - zeile * zeilenabstand,
        };
        kompetenzen.push({
          id: kompetenz.kompetenz.id,
          code: kompetenz.kompetenz.code,
          titel: kompetenz.kompetenz.titel,
          fortschritt: kompetenz.fortschritt,
          ampel: kompetenz.ampel,
          istNaechster: kompetenz.istNaechster,
          offeneAnfragen: kompetenz.offeneAnfragen,
          punkt,
          astCode: bereich.bereich.code,
          tooltip: [
            `${kompetenz.kompetenz.code}: ${kompetenz.kompetenz.titel}`,
            `${kompetenz.fortschritt} %`,
            `Ampel: ${AMPEL_TEXTE[kompetenz.ampel]}`,
            kompetenz.istNaechster ? 'Als Nächstes' : '',
            kompetenz.offeneAnfragen > 0
              ? `${kompetenz.offeneAnfragen} offene Anfrage${kompetenz.offeneAnfragen === 1 ? '' : 'n'}`
              : '',
          ]
            .filter(Boolean)
            .join(' · '),
        });
      }
    }

    const meilensteine = ansicht.meilensteine.map((meilenstein) => {
      const y = meilenstein.code === 'LAP' ? 40 * skala : meilenstein.code === 'IPA' ? ipaY : bbcY;
      return {
        code: meilenstein.code,
        kuerzel: MEILENSTEIN_TEXTE[meilenstein.code].kuerzel,
        name: MEILENSTEIN_TEXTE[meilenstein.code].name,
        untertitel: MEILENSTEIN_TEXTE[meilenstein.code].untertitel,
        erreicht: meilenstein.erreicht,
        punkt: { x: breite / 2, y },
        tooltip: `${MEILENSTEIN_TEXTE[meilenstein.code].kuerzel} · ${
          MEILENSTEIN_TEXTE[meilenstein.code].name
        } · ${MEILENSTEIN_TEXTE[meilenstein.code].untertitel} · ${
          meilenstein.erreicht ? 'erreicht' : meilenstein.bereitschaft
        }`,
      };
    });

    const punkte = new Map<string, Punkt>();
    for (const ast of astBasen) {
      punkte.set(ast.id, ast.punkt);
    }
    for (const kompetenz of kompetenzen) {
      punkte.set(kompetenz.id, kompetenz.punkt);
    }
    for (const meilenstein of meilensteine) {
      punkte.set(meilenstein.code, meilenstein.punkt);
    }

    return {
      breite,
      hoehe: bbcY + 48 * skala,
      spaltenbreite,
      skala,
      radius,
      astBasen,
      kompetenzen,
      meilensteine,
      punkte,
    };
  });

  protected readonly sichtbarePfade = computed<Pfad[]>(() => {
    const aktiv = this.aktiverKnoten() ?? this.aktiv();
    const { punkte, skala } = this.layout();
    const pfade: Pfad[] = [];
    for (const [index, kante] of this.ansicht().kanten.entries()) {
      const von = punkte.get(kante.von);
      const nach = punkte.get(kante.nach);
      if (!von || !nach) {
        continue;
      }
      const beteiligt = aktiv !== null && (kante.von === aktiv || kante.nach === aktiv);
      const sichtbar = kante.typ !== 'VERWEIS' || beteiligt;
      if (!sichtbar) {
        continue;
      }
      pfade.push({
        id: `${kante.von}-${kante.nach}-${index}`,
        d: this.pfad(von, nach, kante, skala),
        typ: kante.typ,
        zustand: kante.zustand,
        beteiligt,
        sichtbar,
        marker: kante.zustand === 'ERREICHT' ? 'erreicht' : 'offen',
      });
    }
    return pfade;
  });

  protected istBeteiligt(knotenId: string): boolean {
    const aktiv = this.aktiverKnoten() ?? this.aktiv();
    return aktiv === knotenId;
  }

  protected aktiviere(knotenId: string): void {
    this.aktiverKnoten.set(knotenId);
  }

  protected deaktiviere(knotenId: string): void {
    if (this.aktiverKnoten() === knotenId) {
      this.aktiverKnoten.set(null);
    }
  }

  private pfad(von: Punkt, nach: Punkt, kante: KantenAnsicht, skala: number): string {
    const radius = KREIS_RADIUS * skala;

    if (kante.typ === 'VERWEIS') {
      const richtung = nach.x >= von.x ? 1 : -1;
      const startX = von.x + richtung * radius;
      const zielX = nach.x - richtung * radius;
      return `M ${startX} ${von.y} C ${startX + richtung * 60 * skala} ${von.y}, ${zielX - richtung * 60 * skala} ${nach.y}, ${zielX} ${nach.y}`;
    }

    if (kante.von === 'BBC') {
      const start = { x: von.x, y: von.y - 30 * skala };
      const ziel = { x: nach.x, y: nach.y + 18 * skala };
      return `M ${start.x} ${start.y} C ${start.x} ${start.y - 70 * skala}, ${ziel.x} ${ziel.y + 70 * skala}, ${ziel.x} ${ziel.y}`;
    }

    if (kante.nach === 'IPA') {
      const start = { x: von.x, y: von.y - radius };
      const ziel = { x: nach.x, y: nach.y + 26 * skala };
      return `M ${start.x} ${start.y} C ${start.x} ${start.y - 50 * skala}, ${ziel.x} ${ziel.y + 50 * skala}, ${ziel.x} ${ziel.y}`;
    }

    if (kante.von === 'IPA' || kante.von === 'LAP' || kante.nach === 'LAP') {
      return `M ${von.x} ${von.y - 26 * skala} L ${nach.x} ${nach.y + 26 * skala}`;
    }

    const start = { x: von.x, y: von.y - radius };
    const ziel = { x: nach.x, y: nach.y + radius };
    return `M ${start.x} ${start.y} C ${start.x} ${start.y - 18 * skala}, ${ziel.x} ${ziel.y + 18 * skala}, ${ziel.x} ${ziel.y}`;
  }

  /** Tracks the card width so the tree can use the space of large screens (D-024). */
  private beobachteBreite(): void {
    const element = this.baumkarte()?.nativeElement;
    if (!element) {
      return;
    }
    this.kartenBreite.set(Math.round(element.clientWidth));
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const beobachter = new ResizeObserver(() => {
      this.kartenBreite.set(Math.round(element.clientWidth));
      if (!this.zentriert) {
        queueMicrotask(() => this.zentriere());
      }
    });
    beobachter.observe(element);
    this.zerstoerer.onDestroy(() => beobachter.disconnect());
  }

  private zentriere(): void {
    const element = this.baumkarte()?.nativeElement;
    if (!element) {
      return;
    }
    element.scrollLeft = Math.max(0, (element.scrollWidth - element.clientWidth) / 2);
    if (element.clientWidth > 0) {
      this.zentriert = true;
    }
  }
}
