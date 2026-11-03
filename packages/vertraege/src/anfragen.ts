import type { BestaetigungsStufe } from './stufe';

export type AnfrageStatus = 'OFFEN' | 'ERLEDIGT' | 'ABGELEHNT' | 'ZURUECKGEZOGEN';

export interface Bestaetigungsanfrage {
  id: string;
  ausbildungId: string;
  leistungszielId: string;
  zielstufe: BestaetigungsStufe;
  text: string;
  status: AnfrageStatus;
  erstelltAm: string;
  beantwortetAm?: string;
  beantwortetVon?: string;
  antwort?: string;
  ergebnisEreignisId?: string;
}

export interface NeueAnfrage {
  ausbildungId: string;
  leistungszielId: string;
  zielstufe: BestaetigungsStufe;
  text: string;
  erstelltAm: string;
}

export interface AnfrageStatusAenderung {
  status: AnfrageStatus;
  beantwortetAm?: string;
  beantwortetVon?: string;
  antwort?: string;
  ergebnisEreignisId?: string;
}

export const ANFRAGE_STATUS_TEXTE: Readonly<Record<AnfrageStatus, string>> = {
  OFFEN: 'offen',
  ERLEDIGT: 'erledigt',
  ABGELEHNT: 'abgelehnt',
  ZURUECKGEZOGEN: 'zurückgezogen',
};
