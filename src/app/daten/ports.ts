import type {
  AnfrageStatusAenderung,
  Ausbildung,
  AusbildungId,
  Benutzer,
  BenutzerId,
  Benutzereinstellung,
  Bestaetigungsanfrage,
  DatenbestandJson,
  Lehrberuf,
  MeilensteinEreignis,
  NeueAnfrage,
  NeuesEreignis,
  Stufenereignis,
  Vorlage,
  VorlageId,
  VorlageImport,
  VorlageStruktur,
  Zuordnung,
} from '@skilltree/vertraege';
import { InjectionToken } from '@angular/core';

export type { AusbildungId, BenutzerId, VorlageId };

export interface LehrberufRepository {
  alle(): Promise<Lehrberuf[]>;
  laden(id: string): Promise<Lehrberuf>;
}

export interface VorlageRepository {
  liste(): Promise<Vorlage[]>;
  laden(id: VorlageId): Promise<Vorlage>;
  struktur(id: VorlageId): Promise<VorlageStruktur>;
  jeLehrberuf(lehrberufId: string): Promise<Vorlage[]>;
  speichern(v: VorlageImport): Promise<VorlageId>;
}

export interface AusbildungRepository {
  fuerLernende(id: BenutzerId): Promise<Ausbildung | null>;
  fuerPraxisbildner(id: BenutzerId, stichtag: string): Promise<Ausbildung[]>;
  laden(id: AusbildungId): Promise<Ausbildung>;
  zuordnungen(id: AusbildungId): Promise<Zuordnung[]>;
  zuordnungenFuerPraxisbildner(id: BenutzerId): Promise<Zuordnung[]>;
  speichern(a: Ausbildung): Promise<void>;
  zuordnungSpeichern(z: Zuordnung): Promise<void>;
}

export interface EreignisRepository {
  stufenereignisse(az: AusbildungId): Promise<Stufenereignis[]>;
  meilensteinereignisse(az: AusbildungId): Promise<MeilensteinEreignis[]>;
  anfuegen(e: NeuesEreignis): Promise<Stufenereignis | MeilensteinEreignis>;
}

export interface AnfrageRepository {
  fuerAusbildung(az: AusbildungId): Promise<Bestaetigungsanfrage[]>;
  offeneFuerPraxisbildner(pb: BenutzerId, stichtag: string): Promise<Bestaetigungsanfrage[]>;
  laden(id: string): Promise<Bestaetigungsanfrage>;
  erstellen(a: NeueAnfrage): Promise<Bestaetigungsanfrage>;
  statusSetzen(id: string, s: AnfrageStatusAenderung): Promise<Bestaetigungsanfrage>;
}

export interface BenutzerRepository {
  alle(): Promise<Benutzer[]>;
  laden(id: BenutzerId): Promise<Benutzer>;
  nachLogin(login: string): Promise<Benutzer | null>;
  einstellungen(id: BenutzerId): Promise<Benutzereinstellung>;
  einstellungenSpeichern(e: Benutzereinstellung): Promise<void>;
}

export interface BadgeRepository {
  definitionen(vorlageId: VorlageId): Promise<import('@skilltree/vertraege').BadgeDefinition[]>;
  vergaben(az: AusbildungId): Promise<import('@skilltree/vertraege').BadgeVergabe[]>;
  vergabenSpeichern(
    az: AusbildungId,
    vergaben: import('@skilltree/vertraege').BadgeVergabe[],
  ): Promise<void>;
}

export interface DatenbestandPort {
  exportieren(): Promise<DatenbestandJson>;
  importieren(d: DatenbestandJson): Promise<void>;
  zuruecksetzen(): Promise<void>;
}

export interface SitzungPort {
  laden(): Promise<BenutzerId | null>;
  speichern(benutzerId: BenutzerId | null): Promise<void>;
}

export interface DatenInitialisierer {
  initialisieren(): Promise<void>;
}

export const LEHRBERUF_REPOSITORY = new InjectionToken<LehrberufRepository>('LehrberufRepository');
export const VORLAGE_REPOSITORY = new InjectionToken<VorlageRepository>('VorlageRepository');
export const AUSBILDUNG_REPOSITORY = new InjectionToken<AusbildungRepository>(
  'AusbildungRepository',
);
export const EREIGNIS_REPOSITORY = new InjectionToken<EreignisRepository>('EreignisRepository');
export const ANFRAGE_REPOSITORY = new InjectionToken<AnfrageRepository>('AnfrageRepository');
export const BENUTZER_REPOSITORY = new InjectionToken<BenutzerRepository>('BenutzerRepository');
export const BADGE_REPOSITORY = new InjectionToken<BadgeRepository>('BadgeRepository');
export const DATENBESTAND_PORT = new InjectionToken<DatenbestandPort>('DatenbestandPort');
export const SITZUNG_PORT = new InjectionToken<SitzungPort>('SitzungPort');
export const DATEN_INITIALISIERER = new InjectionToken<DatenInitialisierer>('DatenInitialisierer');
