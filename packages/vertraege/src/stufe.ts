/** Cumulative competence level: 0 none, 1 explained, 2 practised, 3 independent. */
export type Stufe = 0 | 1 | 2 | 3;

/** Confirmed level that can be granted by a practical trainer. */
export type BestaetigungsStufe = 1 | 2 | 3;

/**
 * How a plan expresses competence: the three cumulative levels or a single
 * completed/not-completed state (PiBS). The model is a property of the plan,
 * never of a single confirmation.
 */
export type Stufenmodell = 'DREI_STUFEN' | 'BINAER';

/** Stage that means "completed" in the binary model; also the top level of the three-stage model. */
export const ABSCHLUSS_STUFE = 3;

/** Fallback for stored plans that predate the stage model (D-022). */
export function normalisiereStufenmodell(wert: unknown): Stufenmodell {
  return wert === 'BINAER' ? 'BINAER' : 'DREI_STUFEN';
}

/** First defined model wins; binary plans may declare it on the plan or the profession. */
export function stufenmodellFuer(
  ...quellen: readonly (Stufenmodell | null | undefined)[]
): Stufenmodell {
  return normalisiereStufenmodell(quellen.find((wert) => wert != null));
}

/** Levels a practical trainer may confirm for the given model. */
export function bestaetigungsStufen(modell: Stufenmodell): readonly BestaetigungsStufe[] {
  return modell === 'BINAER' ? [3] : [1, 2, 3];
}

export type Aktion = 'BESTAETIGT' | 'ZURUECKGENOMMEN' | 'UEBERNOMMEN';

export type Ampel = 'ROT' | 'ORANGE' | 'GRUEN';

export type Taxonomie = 'K1' | 'K2' | 'K3' | 'K4' | 'K5' | 'K6';

export type Lernort = 'BASISLEHRJAHR' | 'BERUFSFACHSCHULE' | 'UEK' | 'LEHRBETRIEB';

export type MeilensteinCode = 'BBC' | 'IPA' | 'LAP';

export type MeilensteinAktion = 'ERREICHT' | 'ZURUECKGENOMMEN';

export type KantenTyp = 'FOLGE' | 'VERWEIS' | 'MEILENSTEIN';

export type KantenZustand = 'ERREICHT' | 'OFFEN';

export type AbhaengigkeitsQuelle = 'REIHENFOLGE' | 'TEXTVERWEIS' | 'MANUELL';

/** Human readable German labels for the cumulative levels. */
export const STUFEN_TEXTE: Readonly<Record<Stufe, string>> = {
  0: 'keine',
  1: 'erklärt',
  2: 'geübt',
  3: 'selbständig',
};

/** Human readable German labels for the binary model. */
export const BINAER_TEXTE: Readonly<Record<'OFFEN' | 'ABGESCHLOSSEN', string>> = {
  OFFEN: 'offen',
  ABGESCHLOSSEN: 'abgeschlossen',
};

/** Label of a level in the given model; binary plans only distinguish open and completed. */
export function stufenText(modell: Stufenmodell, stufe: Stufe): string {
  if (modell === 'DREI_STUFEN') {
    return STUFEN_TEXTE[stufe];
  }
  return stufe >= ABSCHLUSS_STUFE ? BINAER_TEXTE.ABGESCHLOSSEN : BINAER_TEXTE.OFFEN;
}

/** Human readable German labels for the traffic light. */
export const AMPEL_TEXTE: Readonly<Record<Ampel, string>> = {
  ROT: 'nicht – kaum',
  ORANGE: 'teilweise',
  GRUEN: 'mehrheitlich – vollständig',
};

/** Text representation of a traffic light symbol that is not colour-only. */
export const AMPEL_SYMBOLE: Readonly<Record<Ampel, string>> = {
  ROT: '○',
  ORANGE: '◐',
  GRUEN: '●',
};

export const MEILENSTEIN_TEXTE: Readonly<
  Record<MeilensteinCode, { kuerzel: string; name: string; untertitel: string }>
> = {
  BBC: { kuerzel: 'Bbc', name: 'Bbc', untertitel: 'Basismeilenstein' },
  IPA: { kuerzel: 'IPA', name: 'IPA', untertitel: 'Individuelle praktische Arbeit' },
  LAP: { kuerzel: 'LAP', name: 'Lehrabschluss', untertitel: 'Qualifikationsverfahren' },
};

/**
 * Plan-specific milestone labels. A binary study plan (PiBS) has no IPA and no
 * apprenticeship qualification: the middle milestone is the bachelor thesis and the top
 * milestone is the bachelor's degree (D-025).
 */
export function meilensteinTexteFuer(
  code: MeilensteinCode,
  modell: Stufenmodell,
): { kuerzel: string; name: string; untertitel: string } {
  if (modell === 'BINAER') {
    if (code === 'IPA') {
      return { kuerzel: 'BA', name: 'Bachelorarbeit', untertitel: 'Abschlussarbeit im Studium' };
    }
    if (code === 'LAP') {
      return { kuerzel: 'BSc', name: 'Bachelorabschluss', untertitel: 'Abschluss des Studiums' };
    }
  }
  return MEILENSTEIN_TEXTE[code];
}
