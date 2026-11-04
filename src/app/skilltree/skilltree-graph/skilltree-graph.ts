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
import { AMPEL_SYMBOLE, AMPEL_TEXTE, meilensteinTexteFuer } from '@skilltree/vertraege';
import { AnforderungId } from '../../shared/ui/anforderung-id/anforderung-id';
import {
  baumSkala,
  ECKEN_RADIUS,
  KREIS_RADIUS,
  pfadAstIpa,
  pfadBbcAst,
  pfadFolge,
  pfadVerweis,
  rundeKanten,
  spaltenbreite as spaltenbreiteFuer,
  ZEILENABSTAND,
  type KantenLanes,
  type Punkt,
} from '../baum-geometrie';
import { KNOTEN_ZUSTAND_TEXTE, knotenZustand, type KnotenZustand } from '../knoten-zustand';

interface KompetenzKnoten {
  id: string;
  code: string;
  titel: string;
  fortschritt: number;
  ampel: KompetenzAnsicht['ampel'];
  istNaechster: boolean;
  zustand: KnotenZustand;
  zustandszeichen: string;
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

interface BaumLayout {
  breite: number;
  hoehe: number;
  spaltenbreite: number;
  skala: number;
  radius: number;
  zeilenabstand: number;
  lanes: KantenLanes;
  astBasen: AstBasis[];
  kompetenzen: KompetenzKnoten[];
  meilensteine: MeilensteinKnoten[];
  punkte: Map<string, Punkt>;
}

/**
 * HTML buttons above an SVG edge layer (SPEC 8.2). The column width follows the available card
 * width between 150 and 284 px (D-024); all node geometry scales with it, so large screens show a
 * larger tree. Edges are routed on free lanes (D-026), nodes carry a derived state badge, and the
 * card can be dragged with the mouse, scrolled with the arrow keys or with native touch scrolling.
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
  protected readonly zieht = signal(false);
  private zug: { x: number; scrollLeft: number; griff: boolean; pointerId: number } | null = null;
  private klickUnterdruecken = false;
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

  protected readonly layout = computed<BaumLayout>(() => {
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
    // D-026: an extra gap below the area row gives the Bbc edges their own free lane.
    const bbcY = astBasisY + 96 * skala;
    // D-027: the lanes sit on the top and bottom edge of a row, so they keep their clearance to a
    // three-line title when the row spacing changes.
    const lanes: KantenLanes = {
      oben: obersteZeile - zeilenabstand / 2,
      unten: untersteZeile + zeilenabstand / 2,
      bbc: astBasisY + 52 * skala,
    };

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
        const zustand = knotenZustand(kompetenz);
        const zustandsText = KNOTEN_ZUSTAND_TEXTE[zustand].kurz;
        kompetenzen.push({
          id: kompetenz.kompetenz.id,
          code: kompetenz.kompetenz.code,
          titel: kompetenz.kompetenz.titel,
          fortschritt: kompetenz.fortschritt,
          ampel: kompetenz.ampel,
          istNaechster: kompetenz.istNaechster,
          zustand,
          zustandszeichen: KNOTEN_ZUSTAND_TEXTE[zustand].zeichen,
          offeneAnfragen: kompetenz.offeneAnfragen,
          punkt,
          astCode: bereich.bereich.code,
          tooltip: [
            `${kompetenz.kompetenz.code}: ${kompetenz.kompetenz.titel}`,
            `${kompetenz.fortschritt} %`,
            `Ampel: ${AMPEL_TEXTE[kompetenz.ampel]}`,
            zustandsText,
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
      // D-025: the binary study plan shows the bachelor milestone labels instead of IPA/LAP.
      const texte = meilensteinTexteFuer(meilenstein.code, ansicht.stufenmodell);
      return {
        code: meilenstein.code,
        kuerzel: texte.kuerzel,
        name: texte.name,
        untertitel: texte.untertitel,
        erreicht: meilenstein.erreicht,
        punkt: { x: breite / 2, y },
        tooltip: `${texte.kuerzel} · ${texte.name} · ${texte.untertitel} · ${
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
      zeilenabstand,
      lanes,
      astBasen,
      kompetenzen,
      meilensteine,
      punkte,
    };
  });

  protected readonly sichtbarePfade = computed<Pfad[]>(() => {
    const aktiv = this.aktiverKnoten() ?? this.aktiv();
    const layout = this.layout();
    const { punkte } = layout;
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
        d: this.pfad(von, nach, kante, layout),
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

  private pfad(von: Punkt, nach: Punkt, kante: KantenAnsicht, layout: BaumLayout): string {
    const { radius, skala, lanes, spaltenbreite: spalte } = layout;
    const ecken = ECKEN_RADIUS * skala;

    if (kante.typ === 'VERWEIS') {
      return pfadVerweis({ von, nach, radius, spalte, skala, lanes, ecken });
    }

    if (kante.von === 'BBC') {
      // D-026: the milestone fan runs on its own lane below the area row instead of through it.
      return pfadBbcAst(
        { x: von.x, y: von.y - 26 * skala },
        { x: nach.x, y: nach.y + 6 * skala },
        lanes.bbc,
        ecken,
      );
    }

    if (kante.nach === 'IPA') {
      return pfadAstIpa(
        { x: von.x, y: von.y - radius },
        { x: nach.x, y: nach.y + 26 * skala },
        lanes.oben,
        ecken,
      );
    }

    if (kante.von === 'IPA' || kante.von === 'LAP' || kante.nach === 'LAP') {
      return rundeKanten(
        [
          { x: von.x, y: von.y - 26 * skala },
          { x: nach.x, y: nach.y + 26 * skala },
        ],
        0,
      );
    }

    return pfadFolge(von, nach, radius);
  }

  /** Grabs the card with the mouse and scrolls it sideways while the pointer moves (D-026). */
  protected starteZiehen(event: PointerEvent): void {
    if (event.button !== 0 || event.pointerType === 'touch') {
      return;
    }
    const element = this.baumkarte()?.nativeElement;
    if (!element) {
      return;
    }
    this.zug = {
      x: event.clientX,
      scrollLeft: element.scrollLeft,
      griff: false,
      pointerId: event.pointerId,
    };
    this.zieht.set(false);
  }

  protected ziehe(event: PointerEvent): void {
    const zug = this.zug;
    const element = this.baumkarte()?.nativeElement;
    if (!zug || !element) {
      return;
    }
    if (event.buttons === 0) {
      // The pointer was released outside the card before the threshold; do not pan on hover.
      this.beendeZiehen(event);
      return;
    }
    const strecke = event.clientX - zug.x;
    if (!zug.griff) {
      if (Math.abs(strecke) <= 4) {
        return;
      }
      // Capture only once the pointer really drags, so a plain click still reaches the node button.
      zug.griff = true;
      this.klickUnterdruecken = true;
      this.zieht.set(true);
      element.style.scrollBehavior = 'auto';
      if (typeof element.setPointerCapture === 'function') {
        element.setPointerCapture(zug.pointerId);
      }
    }
    element.scrollLeft = zug.scrollLeft - strecke;
    event.preventDefault();
  }

  protected beendeZiehen(event: PointerEvent): void {
    const zug = this.zug;
    const element = this.baumkarte()?.nativeElement;
    if (!zug || !element) {
      return;
    }
    this.zug = null;
    this.zieht.set(false);
    if (zug.griff) {
      element.style.scrollBehavior = '';
      if (
        typeof element.hasPointerCapture === 'function' &&
        element.hasPointerCapture(event.pointerId)
      ) {
        element.releasePointerCapture(event.pointerId);
      }
      // The click that follows a drag must not open a node; reset after that click was dispatched.
      setTimeout(() => {
        this.klickUnterdruecken = false;
      });
    }
  }

  protected knotenWaehlen(knotenId: string): void {
    if (this.klickUnterdruecken) {
      return;
    }
    this.knotenGewaehlt.emit(knotenId);
  }

  protected astWaehlen(astId: string): void {
    if (this.klickUnterdruecken) {
      return;
    }
    this.astGewaehlt.emit(astId);
  }

  protected meilensteinWaehlen(code: MeilensteinCode): void {
    if (this.klickUnterdruecken) {
      return;
    }
    this.meilensteinGewaehlt.emit(code);
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
    if (!element || element.clientWidth === 0) {
      return;
    }
    // Centre the stage itself, not `scrollWidth`: the invisible tooltips extend the scrollable
    // area, so `scrollWidth` would start narrow screens at the right edge of the tree (D-026).
    element.scrollLeft = Math.max(0, (this.layout().breite - element.clientWidth) / 2);
    this.zentriert = true;
  }
}
