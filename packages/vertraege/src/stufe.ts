/** Cumulative competence level: 0 none, 1 explained, 2 practised, 3 independent. */
export type Stufe = 0 | 1 | 2 | 3;

/** Confirmed level that can be granted by a practical trainer. */
export type BestaetigungsStufe = 1 | 2 | 3;

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
