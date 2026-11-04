import type { Ausbildung, Benutzer, DatenbestandJson } from '@skilltree/vertraege';
import { MemorySpeicher } from './memory-speicher';
import { SEED_VERSION } from './seed';
import { DatenbestandSpeicherAdapter } from './speicher-adapter';

const JETZT = new Date('2026-11-03T09:00:00.000Z');

const MIA: Benutzer = {
  id: 'u-mia',
  login: 'mia',
  name: 'Mia Keller (PiBS-Studentin)',
  rolle: 'LERNENDE',
};

const AUSBILDUNG_MIA: Ausbildung = {
  id: 'az-mia',
  lernendeId: 'u-mia',
  lehrberufId: 'lb-INF-PIBS',
  vorlageId: 'vorlage-INF-PIBS-v1',
  lehrbeginn: '2025-08-01',
  aktiv: true,
};

function seedDaten(ausbildungen: readonly Ausbildung[]): DatenbestandJson {
  return {
    version: 1,
    exportiertAm: JETZT.toISOString(),
    lehrberufe: [],
    vorlagen: [],
    bereiche: [],
    kompetenzen: [],
    leistungsziele: [],
    abhaengigkeiten: [],
    benutzer: [MIA],
    einstellungen: [],
    ausbildungen: [...ausbildungen],
    zuordnungen: [],
    stufenereignisse: [],
    meilensteinereignisse: [],
    anfragen: [],
    badgeDefinitionen: [],
    badgeVergaben: [],
  };
}

describe('DatenbestandSpeicherAdapter.initialisieren', () => {
  it('legt den Seed an und merkt sich den Seed-Stand (D-023)', async () => {
    const speicher = new MemorySpeicher();
    const adapter = new DatenbestandSpeicherAdapter(
      speicher,
      () => JETZT,
      () => seedDaten([AUSBILDUNG_MIA]),
    );

    await adapter.initialisieren();

    expect(await speicher.alle<Benutzer>('benutzer')).toEqual([MIA]);
    expect(await speicher.alle<Ausbildung>('ausbildungen')).toEqual([AUSBILDUNG_MIA]);
    expect(await speicher.holen('meta', 'seed')).toEqual({ id: 'seed', version: SEED_VERSION });
  });

  it('ersetzt einen unvollständigen Altbestand ohne Marker (Regression: «Kein Lehrberuf zugeordnet»)', async () => {
    const speicher = new MemorySpeicher();
    // The browser was seeded by an older build: Mia exists, but her training was never written.
    await speicher.ersetzeAlle('benutzer', [MIA]);
    await speicher.ersetzeAlle('ausbildungen', []);

    const adapter = new DatenbestandSpeicherAdapter(
      speicher,
      () => JETZT,
      () => seedDaten([AUSBILDUNG_MIA]),
    );
    await adapter.initialisieren();

    expect(await speicher.alle<Ausbildung>('ausbildungen')).toEqual([AUSBILDUNG_MIA]);
    expect(await speicher.holen('meta', 'seed')).toBeDefined();
  });

  it('ersetzt den Bestand, wenn die gespeicherte Seed-Version veraltet ist', async () => {
    const speicher = new MemorySpeicher();
    await speicher.ersetzeAlle('benutzer', [MIA]);
    await speicher.ersetzeAlle('ausbildungen', []);
    await speicher.setzen('meta', { id: 'seed', version: SEED_VERSION - 1 });

    const adapter = new DatenbestandSpeicherAdapter(
      speicher,
      () => JETZT,
      () => seedDaten([AUSBILDUNG_MIA]),
    );
    await adapter.initialisieren();

    expect(await speicher.alle<Ausbildung>('ausbildungen')).toEqual([AUSBILDUNG_MIA]);
    expect(await speicher.holen('meta', 'seed')).toEqual({ id: 'seed', version: SEED_VERSION });
  });

  it('lässt einen vollständigen Bestand mit aktuellem Marker unangetastet', async () => {
    const speicher = new MemorySpeicher();
    const adapter = new DatenbestandSpeicherAdapter(
      speicher,
      () => JETZT,
      () => seedDaten([AUSBILDUNG_MIA]),
    );
    await adapter.initialisieren();
    await speicher.setzen('benutzer', { ...MIA, name: 'Geänderter Name' });

    await adapter.initialisieren();

    expect(await speicher.alle<Benutzer>('benutzer')).toEqual([
      { ...MIA, name: 'Geänderter Name' },
    ]);
  });
});
