import type { Aktion, BestaetigungsStufe, MeilensteinAktion, MeilensteinCode } from './stufe';

export interface Stufenereignis {
  id: string;
  ausbildungId: string;
  leistungszielId: string;
  stufe: BestaetigungsStufe;
  aktion: Aktion;
  akteurId: string;
  zeitpunkt: string;
  kommentar?: string;
  begruendung?: string;
  refEreignisId?: string;
}

export interface MeilensteinEreignis {
  id: string;
  ausbildungId: string;
  meilenstein: MeilensteinCode;
  aktion: MeilensteinAktion;
  akteurId: string;
  zeitpunkt: string;
  kommentar?: string;
  begruendung?: string;
  refEreignisId?: string;
}

export type NeuesEreignis = Omit<Stufenereignis, 'id'> | Omit<MeilensteinEreignis, 'id'>;
