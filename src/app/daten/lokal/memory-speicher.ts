import {
  schluesselFeld,
  SPEICHER_NAMEN,
  type DatenSpeicher,
  type SpeicherName,
} from './daten-speicher';

/** In-memory implementation of the storage contract for tests (TF21). */
export class MemorySpeicher implements DatenSpeicher {
  private readonly daten = new Map<SpeicherName, Map<string, unknown>>();

  constructor() {
    for (const name of SPEICHER_NAMEN) {
      this.daten.set(name, new Map());
    }
  }

  private store(name: SpeicherName): Map<string, unknown> {
    const store = this.daten.get(name);
    if (!store) {
      throw new Error(`Unbekannter Speicher ${name}`);
    }
    return store;
  }

  async alle<T>(name: SpeicherName): Promise<T[]> {
    return [...this.store(name).values()] as T[];
  }

  async holen<T>(name: SpeicherName, schluessel: string): Promise<T | undefined> {
    return this.store(name).get(schluessel) as T | undefined;
  }

  async setzen<T>(name: SpeicherName, wert: T): Promise<void> {
    const schluessel = String((wert as Record<string, unknown>)[schluesselFeld(name)]);
    this.store(name).set(schluessel, structuredClone(wert));
  }

  async hinzufuegen<T>(name: SpeicherName, wert: T): Promise<void> {
    const schluessel = String((wert as Record<string, unknown>)[schluesselFeld(name)]);
    if (this.store(name).has(schluessel)) {
      throw new Error(`Doppelter Schlüssel ${schluessel} in ${name}`);
    }
    this.store(name).set(schluessel, structuredClone(wert));
  }

  async ersetzeAlle<T>(name: SpeicherName, werte: readonly T[]): Promise<void> {
    const store = this.store(name);
    store.clear();
    for (const wert of werte) {
      const schluessel = String((wert as Record<string, unknown>)[schluesselFeld(name)]);
      store.set(schluessel, structuredClone(wert));
    }
  }

  async leeren(name: SpeicherName): Promise<void> {
    this.store(name).clear();
  }
}
