import type { VorlageImport } from '@skilltree/vertraege';

const DATEIEN = ['vorlage-inf-app.json', 'vorlage-inf-pla.json', 'vorlage-med.json'];

/** Loads the generated template JSON from `public/vorlagen` (SPEC 0.3 / 7.4). */
export async function ladeVorlagen(): Promise<VorlageImport[]> {
  const antworten = await Promise.all(
    DATEIEN.map(async (datei) => {
      const antwort = await fetch(`vorlagen/${datei}`);
      if (!antwort.ok) {
        throw new Error(`Vorlage ${datei} konnte nicht geladen werden (${antwort.status}).`);
      }
      return (await antwort.json()) as VorlageImport;
    }),
  );
  return antworten;
}
