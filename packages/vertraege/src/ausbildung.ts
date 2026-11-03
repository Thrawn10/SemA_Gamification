export interface Ausbildung {
  id: string;
  lernendeId: string;
  lehrberufId: string;
  vorlageId: string;
  lehrbeginn: string;
  aktiv: boolean;
}

export interface Zuordnung {
  id: string;
  ausbildungId: string;
  praxisbildnerId: string;
  gueltigVon: string;
  gueltigBis: string | null;
}
