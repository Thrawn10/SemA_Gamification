import type { AbhaengigkeitsQuelle, MeilensteinCode, Taxonomie } from './stufe';

export interface Lehrberuf {
  id: string;
  code: string;
  name: string;
  fachrichtung: string | null;
  lehrdauerJahre: number;
  aktiv: boolean;
}

export interface Vorlage {
  id: string;
  lehrberufId: string;
  bildungsplanJahr: number;
  version: number;
  quelle: string;
  importiertAm: string;
  pruefsumme: string;
  aktiv: boolean;
}

export interface Bereich {
  id: string;
  vorlageId: string;
  code: string;
  titel: string;
  reihenfolge: number;
}

export interface Kompetenz {
  id: string;
  bereichId: string;
  code: string;
  titel: string;
  beschreibung: string;
  moduleBasislehrjahr: string[];
  moduleBerufsfachschule: string[];
  moduleUek: string[];
  reihenfolge: number;
}

export interface LernorteProLeistungsziel {
  basislehrjahr: string[];
  berufsfachschule: string[];
  uek: string[];
}

export interface Leistungsziel {
  id: string;
  kompetenzId: string;
  code: string;
  text: string;
  taxonomie: Taxonomie;
  lernorte: LernorteProLeistungsziel | null;
  reihenfolge: number;
  archiviert: boolean;
}

export interface KompetenzAbhaengigkeit {
  id: string;
  vorlageId: string;
  vonKompetenzId: string;
  nachKompetenzId: string;
  quelle: AbhaengigkeitsQuelle;
}

/** Flat, framework-free view of a plan used by the rules module. */
export interface VorlageStruktur {
  bereiche: Bereich[];
  kompetenzen: Kompetenz[];
  leistungsziele: Leistungsziel[];
  abhaengigkeiten: KompetenzAbhaengigkeit[];
}

export interface VorlageImport {
  lehrberuf: {
    code: string;
    name: string;
    fachrichtung: string | null;
    lehrdauerJahre: number;
  };
  bildungsplanJahr: number;
  version?: number;
  quelle: string;
  bereiche: VorlageImportBereich[];
}

export interface VorlageImportBereich {
  code: string;
  titel: string;
  kompetenzen: VorlageImportKompetenz[];
}

export interface VorlageImportKompetenz {
  code: string;
  titel: string;
  beschreibung: string;
  module: {
    basislehrjahr: string[];
    berufsfachschule: string[];
    uek: string[];
  };
  leistungsziele: VorlageImportLeistungsziel[];
}

export interface VorlageImportLeistungsziel {
  code: string;
  text: string;
  taxonomie: Taxonomie;
  lernorte?: {
    basislehrjahr: string[];
    berufsfachschule: string[];
    uek: string[];
  };
}

/** A milestone node shown in the tree. */
export interface Meilenstein {
  code: MeilensteinCode;
}

export const MEILENSTEINE: readonly MeilensteinCode[] = ['BBC', 'IPA', 'LAP'];
