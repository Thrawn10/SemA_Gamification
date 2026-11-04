import type { Ausbildung, Zuordnung } from './ausbildung';
import type { AnfrageStatus, Bestaetigungsanfrage } from './anfragen';
import type { BadgeDefinition, BadgeVergabe } from './badges';
import type { MeilensteinEreignis, Stufenereignis } from './ereignisse';
import type { Benutzer, Benutzereinstellung, Rolle } from './rollen';
import type {
  Bereich,
  Kompetenz,
  KompetenzAbhaengigkeit,
  Lehrberuf,
  Leistungsziel,
  Vorlage,
} from './stammdaten';
import type {
  Ampel,
  BestaetigungsStufe,
  KantenTyp,
  KantenZustand,
  MeilensteinCode,
  Stufe,
  Stufenmodell,
} from './stufe';

export interface DatenbestandJson {
  version: number;
  exportiertAm: string;
  lehrberufe: Lehrberuf[];
  vorlagen: Vorlage[];
  bereiche: Bereich[];
  kompetenzen: Kompetenz[];
  leistungsziele: Leistungsziel[];
  abhaengigkeiten: KompetenzAbhaengigkeit[];
  benutzer: Benutzer[];
  einstellungen: Benutzereinstellung[];
  ausbildungen: Ausbildung[];
  zuordnungen: Zuordnung[];
  stufenereignisse: Stufenereignis[];
  meilensteinereignisse: MeilensteinEreignis[];
  anfragen: Bestaetigungsanfrage[];
  badgeDefinitionen: BadgeDefinition[];
  badgeVergaben: BadgeVergabe[];
}

export interface VerlaufEintrag {
  id: string;
  art: 'EREIGNIS' | 'ANFRAGE';
  aktion: string;
  zeitpunkt: string;
  akteurId: string;
  akteurName: string;
  kommentar?: string;
  begruendung?: string;
  stufe?: Stufe;
  aktiv: boolean;
  refEreignisId?: string;
  anfrageStatus?: AnfrageStatus;
}

export interface LeistungszielAnsicht {
  leistungsziel: Leistungsziel;
  stufe: Stufe;
  aktiveBestaetigung: Stufenereignis | null;
  offeneAnfrage: Bestaetigungsanfrage | null;
  offeneAnfrageAnzahl: number;
  verlauf: VerlaufEintrag[];
}

export interface KompetenzAnsicht {
  kompetenz: Kompetenz;
  leistungsziele: LeistungszielAnsicht[];
  wert: number;
  fortschritt: number;
  ampel: Ampel;
  istNaechster: boolean;
  offeneAnfragen: number;
  /** Completed objectives, used by the binary model instead of the 0–6 competence value. */
  abgeschlosseneLeistungsziele: number;
  anzahlLeistungsziele: number;
}

export interface BereichAnsicht {
  bereich: Bereich;
  kompetenzen: KompetenzAnsicht[];
  wert: number;
  fortschritt: number;
  ampel: Ampel;
  roteKompetenzen: number;
  offeneAnfragen: number;
  abgeschlosseneLeistungsziele: number;
  anzahlLeistungsziele: number;
}

export interface KantenAnsicht {
  von: string;
  nach: string;
  typ: KantenTyp;
  zustand: KantenZustand;
}

export interface MeilensteinAnsicht {
  code: MeilensteinCode;
  erreicht: boolean;
  erreichtAm: string | null;
  aktivesEreignis: MeilensteinEreignis | null;
  bereitschaft: string;
  verlauf: VerlaufEintrag[];
}

export interface AktiveAnfrageAnsicht {
  anfrage: Bestaetigungsanfrage;
  ausbildung: Ausbildung;
  lernende: Benutzer;
  lehrberuf: Lehrberuf;
  leistungsziel: Leistungsziel;
  kompetenz: Kompetenz;
  bereich: Bereich;
  aktuelleStufe: Stufe;
  stufenmodell: Stufenmodell;
}

export interface BadgeAnsicht {
  definition: BadgeDefinition;
  vergabe: BadgeVergabe | null;
  status: 'ERHALTEN' | 'INAKTIV' | 'OFFEN';
  fortschrittText: string;
  aktuell: number;
  gesamt: number;
}

export interface BadgesAnsicht {
  erhalten: BadgeAnsicht[];
  inaktiv: BadgeAnsicht[];
  offen: BadgeAnsicht[];
  ausgeblendet: boolean;
}

export interface SkilltreeAnsicht {
  ausbildung: Ausbildung;
  lernende: Benutzer;
  lehrberuf: Lehrberuf;
  vorlage: Vorlage;
  stufenmodell: Stufenmodell;
  rolle: Rolle;
  lehrjahr: number;
  fortschritt: number;
  bereiche: BereichAnsicht[];
  kanten: KantenAnsicht[];
  meilensteine: MeilensteinAnsicht[];
  naechsteKnoten: string[];
  offeneAnfragen: number;
  praxisbildner: Benutzer[];
  kannBestaetigen: boolean;
  badges: BadgesAnsicht;
}

export interface BestaetigungsErgebnis {
  ereignis: Stufenereignis | null;
  stufe: Stufe;
  fortschritt: number;
  ampel: Ampel;
  neueBadges: BadgeDefinition[];
  inaktiveBadges: BadgeDefinition[];
  hinweis: string;
  geaenderteAnfragen: string[];
}

export interface AnfrageErgebnis {
  anfrage: Bestaetigungsanfrage;
  offeneAnfrageAnzahl: number;
}

export interface MeilensteinErgebnis {
  ereignis: MeilensteinEreignis | null;
  erreicht: boolean;
  neueBadges: BadgeDefinition[];
  inaktiveBadges: BadgeDefinition[];
  hinweis: string;
}

export interface UebersichtZeile {
  ausbildung: Ausbildung;
  lernende: Benutzer;
  lehrberuf: Lehrberuf;
  stufenmodell: Stufenmodell;
  lehrjahr: number;
  fortschritt: number;
  bereiche: { code: string; ampel: Ampel; fortschritt: number }[];
  roteKompetenzen: number;
  offeneAnfragen: number;
}

export interface MeineDatenZeile {
  datenart: string;
  sichtbarkeit: string;
}

export interface StufeBestaetigenErgebnis extends BestaetigungsErgebnis {
  zielstufe: BestaetigungsStufe;
}
