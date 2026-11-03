import type { MeilensteinCode, BestaetigungsStufe } from './stufe';

export interface StufeBestaetigen {
  leistungszielId: string;
  stufe: BestaetigungsStufe;
  kommentar?: string;
}

export interface BestaetigungZuruecknehmen {
  ereignisId: string;
  begruendung: string;
}

export interface AnfrageStellen {
  leistungszielId: string;
  zielstufe: BestaetigungsStufe;
  text: string;
}

export interface AnfrageZurueckziehen {
  anfrageId: string;
}

export interface AnfrageAblehnen {
  anfrageId: string;
  antwort: string;
}

export interface MeilensteinBestaetigen {
  meilenstein: MeilensteinCode;
  kommentar?: string;
}

export interface MeilensteinZuruecknehmen {
  ereignisId: string;
  begruendung: string;
}

export interface EinstellungAendern {
  badgesAusgeblendet: boolean;
}

export type Befehl =
  | StufeBestaetigen
  | BestaetigungZuruecknehmen
  | AnfrageStellen
  | AnfrageZurueckziehen
  | AnfrageAblehnen
  | MeilensteinBestaetigen
  | MeilensteinZuruecknehmen
  | EinstellungAendern;
