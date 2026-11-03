import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { DatenbestandJson, VorlageImport } from '@skilltree/vertraege';
import { UHR } from '../app/core/uhr';
import { AnfrageDienst } from '../app/dienste/anfrage-dienst';
import { BestaetigungDienst } from '../app/dienste/bestaetigung-dienst';
import { DatenverwaltungDienst } from '../app/dienste/datenverwaltung-dienst';
import { ImportDienst } from '../app/dienste/import-dienst';
import { MeilensteinDienst } from '../app/dienste/meilenstein-dienst';
import { SitzungDienst } from '../app/dienste/sitzung-dienst';
import { SkilltreeDienst } from '../app/dienste/skilltree-dienst';
import { UebersichtDienst } from '../app/dienste/uebersicht-dienst';
import { erstelleSeedDaten } from '../app/daten/lokal/seed';
import { MemorySpeicher } from '../app/daten/lokal/memory-speicher';
import {
  AnfrageSpeicherAdapter,
  AusbildungSpeicherAdapter,
  BadgeSpeicherAdapter,
  BenutzerSpeicherAdapter,
  DatenbestandSpeicherAdapter,
  EreignisSpeicherAdapter,
  LehrberufSpeicherAdapter,
  VorlageSpeicherAdapter,
} from '../app/daten/lokal/speicher-adapter';
import {
  ANFRAGE_REPOSITORY,
  AUSBILDUNG_REPOSITORY,
  BADGE_REPOSITORY,
  BENUTZER_REPOSITORY,
  DATEN_INITIALISIERER,
  DATENBESTAND_PORT,
  EREIGNIS_REPOSITORY,
  LEHRBERUF_REPOSITORY,
  SITZUNG_PORT,
  VORLAGE_REPOSITORY,
} from '../app/daten/ports';
import appVorlage from '../../public/vorlagen/vorlage-inf-app.json';
import plaVorlage from '../../public/vorlagen/vorlage-inf-pla.json';
import medVorlage from '../../public/vorlagen/vorlage-med.json';

/** Template fixtures used by the deterministic seed (SPEC 7.4). */
export const VORLAGEN: readonly VorlageImport[] = [
  appVorlage as unknown as VorlageImport,
  plaVorlage as unknown as VorlageImport,
  medVorlage as unknown as VorlageImport,
];

export const TEST_ZEITPUNKT = new Date('2026-11-03T09:00:00.000Z');

export function benutzerMit(umgebung: TestUmgebung, login: string) {
  const person = umgebung.seed.benutzer.find((eintrag) => eintrag.login === login);
  if (!person) {
    throw new Error(`Testbenutzer ${login} fehlt im Seed.`);
  }
  return person;
}

export function ausbildungVon(umgebung: TestUmgebung, login: string) {
  const person = benutzerMit(umgebung, login);
  const ausbildung = umgebung.seed.ausbildungen.find((eintrag) => eintrag.lernendeId === person.id);
  if (!ausbildung) {
    throw new Error(`Ausbildung von ${login} fehlt im Seed.`);
  }
  return ausbildung;
}

export interface TestUmgebung {
  speicher: MemorySpeicher;
  sitzung: SitzungDienst;
  skilltree: SkilltreeDienst;
  bestaetigung: BestaetigungDienst;
  anfrage: AnfrageDienst;
  meilenstein: MeilensteinDienst;
  uebersicht: UebersichtDienst;
  datenverwaltung: DatenverwaltungDienst;
  importDienst: ImportDienst;
  zeit: { jetzt: Date };
  seed: DatenbestandJson;
}

/**
 * Wires the application services against the in-memory adapter (TF21) with a
 * fixed clock and the real template fixtures.
 */
export async function erstelleUmgebung(): Promise<TestUmgebung> {
  const speicher = new MemorySpeicher();
  const zeit = { jetzt: TEST_ZEITPUNKT };
  const uhr = () => zeit.jetzt;
  const seed = erstelleSeedDaten(VORLAGEN, TEST_ZEITPUNKT).daten;

  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      { provide: UHR, useValue: uhr },
      { provide: LEHRBERUF_REPOSITORY, useFactory: () => new LehrberufSpeicherAdapter(speicher) },
      {
        provide: VORLAGE_REPOSITORY,
        useFactory: () => new VorlageSpeicherAdapter(speicher, uhr),
      },
      {
        provide: AUSBILDUNG_REPOSITORY,
        useFactory: () => new AusbildungSpeicherAdapter(speicher),
      },
      { provide: EREIGNIS_REPOSITORY, useFactory: () => new EreignisSpeicherAdapter(speicher) },
      { provide: ANFRAGE_REPOSITORY, useFactory: () => new AnfrageSpeicherAdapter(speicher) },
      { provide: BENUTZER_REPOSITORY, useFactory: () => new BenutzerSpeicherAdapter(speicher) },
      { provide: BADGE_REPOSITORY, useFactory: () => new BadgeSpeicherAdapter(speicher) },
      {
        provide: DATENBESTAND_PORT,
        useFactory: () => new DatenbestandSpeicherAdapter(speicher, uhr, () => seed),
      },
      {
        provide: DATEN_INITIALISIERER,
        useFactory: () => new DatenbestandSpeicherAdapter(speicher, uhr, () => seed),
      },
      {
        provide: SITZUNG_PORT,
        useValue: {
          laden: () => Promise.resolve(null),
          speichern: () => Promise.resolve(),
        },
      },
    ],
  });

  await TestBed.inject(DATEN_INITIALISIERER).initialisieren();

  return {
    speicher,
    sitzung: TestBed.inject(SitzungDienst),
    skilltree: TestBed.inject(SkilltreeDienst),
    bestaetigung: TestBed.inject(BestaetigungDienst),
    anfrage: TestBed.inject(AnfrageDienst),
    meilenstein: TestBed.inject(MeilensteinDienst),
    uebersicht: TestBed.inject(UebersichtDienst),
    datenverwaltung: TestBed.inject(DatenverwaltungDienst),
    importDienst: TestBed.inject(ImportDienst),
    zeit,
    seed,
  };
}
