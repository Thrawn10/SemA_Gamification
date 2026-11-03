import {
  schluesselFeld,
  SPEICHER_NAMEN,
  type DatenSpeicher,
  type SpeicherName,
} from './daten-speicher';

const DB_NAME = 'skilltree-prototyp';
const DB_VERSION = 1;

export class IndexedDbSpeicher implements DatenSpeicher {
  private datenbank: Promise<IDBDatabase> | null = null;

  private oeffnen(): Promise<IDBDatabase> {
    if (this.datenbank) {
      return this.datenbank;
    }
    this.datenbank = new Promise<IDBDatabase>((resolve, reject) => {
      const anfrage = indexedDB.open(DB_NAME, DB_VERSION);
      anfrage.onupgradeneeded = () => {
        const db = anfrage.result;
        for (const name of SPEICHER_NAMEN) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: schluesselFeld(name) });
          }
        }
      };
      anfrage.onsuccess = () => resolve(anfrage.result);
      anfrage.onerror = () =>
        reject(anfrage.error ?? new Error('IndexedDB konnte nicht geöffnet werden.'));
      anfrage.onblocked = () => reject(new Error('IndexedDB ist blockiert.'));
    });
    return this.datenbank;
  }

  async alle<T>(name: SpeicherName): Promise<T[]> {
    const db = await this.oeffnen();
    return new Promise<T[]>((resolve, reject) => {
      const anfrage = db.transaction(name, 'readonly').objectStore(name).getAll();
      anfrage.onsuccess = () => resolve(anfrage.result as T[]);
      anfrage.onerror = () => reject(anfrage.error);
    });
  }

  async holen<T>(name: SpeicherName, schluessel: string): Promise<T | undefined> {
    const db = await this.oeffnen();
    return new Promise<T | undefined>((resolve, reject) => {
      const anfrage = db.transaction(name, 'readonly').objectStore(name).get(schluessel);
      anfrage.onsuccess = () => resolve(anfrage.result as T | undefined);
      anfrage.onerror = () => reject(anfrage.error);
    });
  }

  async setzen<T>(name: SpeicherName, wert: T): Promise<void> {
    const db = await this.oeffnen();
    return new Promise<void>((resolve, reject) => {
      const transaktion = db.transaction(name, 'readwrite');
      transaktion.objectStore(name).put(wert);
      transaktion.oncomplete = () => resolve();
      transaktion.onerror = () => reject(transaktion.error);
    });
  }

  async hinzufuegen<T>(name: SpeicherName, wert: T): Promise<void> {
    const db = await this.oeffnen();
    return new Promise<void>((resolve, reject) => {
      const transaktion = db.transaction(name, 'readwrite');
      transaktion.objectStore(name).add(wert);
      transaktion.oncomplete = () => resolve();
      transaktion.onerror = () => reject(transaktion.error);
    });
  }

  async ersetzeAlle<T>(name: SpeicherName, werte: readonly T[]): Promise<void> {
    const db = await this.oeffnen();
    return new Promise<void>((resolve, reject) => {
      const transaktion = db.transaction(name, 'readwrite');
      const store = transaktion.objectStore(name);
      store.clear();
      for (const wert of werte) {
        store.put(wert);
      }
      transaktion.oncomplete = () => resolve();
      transaktion.onerror = () => reject(transaktion.error);
    });
  }

  async leeren(name: SpeicherName): Promise<void> {
    const db = await this.oeffnen();
    return new Promise<void>((resolve, reject) => {
      const transaktion = db.transaction(name, 'readwrite');
      transaktion.objectStore(name).clear();
      transaktion.oncomplete = () => resolve();
      transaktion.onerror = () => reject(transaktion.error);
    });
  }
}
