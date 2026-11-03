import type { BenutzerId } from '@skilltree/vertraege';
import type { SitzungPort } from '../ports';

const SCHLUESSEL = 'skilltree.sitzung';

/** Local session persistence. Browser storage stays inside the adapter (SPEC 0.7). */
export class LokalerSitzungSpeicher implements SitzungPort {
  async laden(): Promise<BenutzerId | null> {
    try {
      return localStorage.getItem(SCHLUESSEL);
    } catch {
      return null;
    }
  }

  async speichern(benutzerId: BenutzerId | null): Promise<void> {
    try {
      if (benutzerId) {
        localStorage.setItem(SCHLUESSEL, benutzerId);
      } else {
        localStorage.removeItem(SCHLUESSEL);
      }
    } catch {
      // Private mode or blocked storage: the in-memory session still works.
    }
  }
}
