import type { Fehlercode } from '@skilltree/vertraege';
import { FachlicherFehler, FEHLER_TEXTE } from '@skilltree/vertraege';

export { FachlicherFehler };

/** Returns the German text for a typed service error. */
export function fehlerText(fehler: unknown): string {
  if (fehler instanceof FachlicherFehler) {
    return fehler.message || FEHLER_TEXTE[fehler.code];
  }
  if (fehler instanceof Error && fehler.message) {
    return fehler.message;
  }
  return 'Unbekannter Fehler. Bitte erneut versuchen.';
}

export function istFehlerCode(fehler: unknown, code: Fehlercode): boolean {
  return fehler instanceof FachlicherFehler && fehler.code === code;
}
