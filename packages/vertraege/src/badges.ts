export type BadgeRegeltyp =
  'BEREICH_GESTARTET' | 'KOMPETENZ_SELBSTAENDIG' | 'BEREICH_ABGESCHLOSSEN' | 'MEILENSTEIN';

export interface BadgeParameter {
  bereichId?: string;
  kompetenzId?: string;
  anteil?: 25 | 50 | 75 | 100;
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
