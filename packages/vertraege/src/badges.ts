import type { MeilensteinCode, Stufe } from './stufe';

/**
 * Badge rules of the reduced set (D-025): primary milestones, one badge per completed
 * Handlungskompetenzbereich, stage counts (5/10/15 competences) and all competences.
 * The former per-competence and area-started badges are no longer generated.
 */
export type BadgeRegeltyp =
  'MEILENSTEIN_ERREICHT' | 'BEREICH_ABGESCHLOSSEN' | 'KOMPETENZ_ANZAHL' | 'ALLE_KOMPETENZEN';

export interface BadgeParameter {
  bereichId?: string;
  meilenstein?: MeilensteinCode;
  /** Minimum stage a competence must reach completely (1, 2 or 3). */
  stufe?: Stufe;
  /** Number of competences required by the badge (5, 10 or 15). */
  anzahl?: number;
}

export interface BadgeDefinition {
  id: string;
  vorlageId: string;
  code: string;
  titel: string;
  kriterium: string;
  regeltyp: BadgeRegeltyp;
  parameter: BadgeParameter;
  reihenfolge: number;
}

export interface BadgeVergabe {
  id: string;
  ausbildungId: string;
  badgeId: string;
  vergebenAm: string;
  aktiv: boolean;
  inaktivSeit?: string;
  ausStartstand: boolean;
}
