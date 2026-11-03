export const SPEICHER_NAMEN = [
  'lehrberufe',
  'vorlagen',
  'bereiche',
  'kompetenzen',
  'leistungsziele',
  'abhaengigkeiten',
  'benutzer',
  'einstellungen',
  'ausbildungen',
  'zuordnungen',
  'stufenereignisse',
  'meilensteinereignisse',
  'anfragen',
  'badgeDefinitionen',
  'badgeVergaben',
] as const;

export type SpeicherName = (typeof SPEICHER_NAMEN)[number];

/** Key path per object store. Only settings use a natural key different from `id`. */
export function schluesselFeld(name: SpeicherName): string {
  return name === 'einstellungen' ? 'benutzerId' : 'id';
}

/**
 * Thin storage abstraction. The IndexedDB adapter and the in-memory test adapter
 * implement the same contract, so the application services never depend on a
 * concrete browser API (SPEC 0.7).
 */
export interface DatenSpeicher {
  alle<T>(name: SpeicherName): Promise<T[]>;
  holen<T>(name: SpeicherName, schluessel: string): Promise<T | undefined>;
  setzen<T>(name: SpeicherName, wert: T): Promise<void>;
  hinzufuegen<T>(name: SpeicherName, wert: T): Promise<void>;
  ersetzeAlle<T>(name: SpeicherName, werte: readonly T[]): Promise<void>;
  leeren(name: SpeicherName): Promise<void>;
}
