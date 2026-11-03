import { TestBed } from '@angular/core/testing';
import type { DatenbestandJson, VorlageImport } from '@skilltree/vertraege';
import { indexierePlan, meilensteinBereitschaft, meilensteinStati } from '@skilltree/regeln';
import { VORLAGE_REPOSITORY } from '../daten/ports';
import { pruefeVorlageImport } from './import-dienst';
import { erstelleUmgebung, VORLAGEN, type TestUmgebung } from '../../testing/dienst-umgebung';

function benutzerMit(umgebung: TestUmgebung, login: string) {
  const person = umgebung.seed.benutzer.find((eintrag) => eintrag.login === login);
  if (!person) {
    throw new Error(`Testbenutzer ${login} fehlt im Seed.`);
  }
  return person;
}

function ausbildungVon(umgebung: TestUmgebung, login: string) {
  const person = benutzerMit(umgebung, login);
  const ausbildung = umgebung.seed.ausbildungen.find((eintrag) => eintrag.lernendeId === person.id);
  if (!ausbildung) {
    throw new Error(`Ausbildung von ${login} fehlt im Seed.`);
  }
  return ausbildung;
}

function offeneAnfrageVon(umgebung: TestUmgebung, login: string) {
  const ausbildung = ausbildungVon(umgebung, login);
  const anfrage = umgebung.seed.anfragen.find(
    (eintrag) => eintrag.ausbildungId === ausbildung.id && eintrag.status === 'OFFEN',
  );
  if (!anfrage) {
    throw new Error(`Offene Anfrage von ${login} fehlt im Seed.`);
  }
  return anfrage;
}

function ohneExportZeit(daten: DatenbestandJson): Omit<DatenbestandJson, 'exportiertAm'> {
  const { exportiertAm: _zeitpunkt, ...rest } = daten;
  return rest;
}

describe('Anwendungsdienste und Rechte', () => {
  let umgebung: TestUmgebung;

  beforeEach(async () => {
    umgebung = await erstelleUmgebung();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('TF4: Lernende lesen keine fremde Ausbildung', async () => {
    await umgebung.sitzung.anmelden('nora');
    const fremd = ausbildungVon(umgebung, 'luca');

    await expect(umgebung.skilltree.laden(fremd.id)).rejects.toMatchObject({
      code: 'KEINE_BERECHTIGUNG',
    });
  });

  it('TF4: Praxisbildnerin ohne gültige Zuordnung liest die Ausbildung nicht', async () => {
    await umgebung.sitzung.anmelden('petra');
    const nora = ausbildungVon(umgebung, 'nora');

    await expect(umgebung.skilltree.laden(nora.id)).rejects.toMatchObject({
      code: 'KEINE_BERECHTIGUNG',
    });
  });

  it('TF5: abgelaufene Zuordnung verhindert Bestätigungen', async () => {
    await umgebung.sitzung.anmelden('petra');
    const nora = ausbildungVon(umgebung, 'nora');
    const leistungszielId = umgebung.seed.leistungsziele[0]?.id;
    expect(leistungszielId).toBeDefined();

    await expect(
      umgebung.bestaetigung.bestaetigen(nora.id, {
        leistungszielId: leistungszielId ?? '',
        stufe: 1,
      }),
    ).rejects.toMatchObject({ code: 'KEINE_BERECHTIGUNG' });
  });

  it('TF13: pro Leistungsziel ist nur eine Anfrage offen', async () => {
    await umgebung.sitzung.anmelden('nora');
    const nora = ausbildungVon(umgebung, 'nora');
    const offen = offeneAnfrageVon(umgebung, 'nora');

    await expect(
      umgebung.anfrage.stellen(nora.id, {
        leistungszielId: offen.leistungszielId,
        zielstufe: 3,
        text: 'Ich habe das im Betrieb mehrfach selbständig gemacht.',
      }),
    ).rejects.toMatchObject({ code: 'ANFRAGE_BEREITS_OFFEN' });
  });

  it('TF14: zu kurze Begründung wird abgelehnt', async () => {
    await umgebung.sitzung.anmelden('daniel');
    const offen = offeneAnfrageVon(umgebung, 'nora');

    await expect(
      umgebung.anfrage.ablehnen({ anfrageId: offen.id, antwort: 'nein' }),
    ).rejects.toMatchObject({ code: 'BEGRUENDUNG_ZU_KURZ' });
  });

  it('TF15: Lernende dürfen keine Stufe bestätigen', async () => {
    await umgebung.sitzung.anmelden('nora');
    const nora = ausbildungVon(umgebung, 'nora');

    await expect(
      umgebung.bestaetigung.bestaetigen(nora.id, {
        leistungszielId: umgebung.seed.leistungsziele[0]?.id ?? '',
        stufe: 1,
      }),
    ).rejects.toMatchObject({ code: 'KEINE_BERECHTIGUNG' });
  });

  it('TF8: Bestätigung der Zielstufe erledigt die offene Anfrage', async () => {
    await umgebung.sitzung.anmelden('daniel');
    const nora = ausbildungVon(umgebung, 'nora');
    const offen = offeneAnfrageVon(umgebung, 'nora');
    const vorher = await umgebung.skilltree.laden(nora.id);

    const ergebnis = await umgebung.bestaetigung.bestaetigen(nora.id, {
      leistungszielId: offen.leistungszielId,
      stufe: offen.zielstufe,
      kommentar: 'Im Betrieb beobachtet.',
    });

    expect(ergebnis.geaenderteAnfragen).toContain(offen.id);
    const nachher = await umgebung.skilltree.laden(nora.id);
    expect(nachher.fortschritt).toBeGreaterThanOrEqual(vorher.fortschritt);
    const ziel = nachher.bereiche
      .flatMap((bereich) => bereich.kompetenzen)
      .flatMap((kompetenz) => kompetenz.leistungsziele)
      .find((eintrag) => eintrag.leistungsziel.id === offen.leistungszielId);
    expect(ziel?.stufe).toBe(offen.zielstufe);
    expect(ziel?.offeneAnfrage).toBeNull();
  });

  it('S-L05: Ablehnung mit gültiger Begründung wird gespeichert', async () => {
    await umgebung.sitzung.anmelden('daniel');
    const offen = offeneAnfrageVon(umgebung, 'nora');

    const aktualisiert = await umgebung.anfrage.ablehnen({
      anfrageId: offen.id,
      antwort: 'Noch nicht im Betrieb beobachtet.',
    });

    expect(aktualisiert.status).toBe('ABGELEHNT');
    expect(aktualisiert.antwort).toBe('Noch nicht im Betrieb beobachtet.');
  });

  it('S-L06: Meilenstein bestätigen und mit kurzer Begründung scheitern', async () => {
    await umgebung.sitzung.anmelden('daniel');
    const nora = ausbildungVon(umgebung, 'nora');

    const ergebnis = await umgebung.meilenstein.bestaetigen(nora.id, {
      meilenstein: 'LAP',
      kommentar: 'Qualifikationsverfahren bestanden.',
    });
    expect(ergebnis.erreicht).toBe(true);
    expect(ergebnis.ereignis).not.toBeNull();

    await expect(
      umgebung.meilenstein.zuruecknehmen(nora.id, {
        ereignisId: ergebnis.ereignis?.id ?? '',
        begruendung: 'zu kurz',
      }),
    ).rejects.toMatchObject({ code: 'BEGRUENDUNG_ZU_KURZ' });

    const zurueck = await umgebung.meilenstein.zuruecknehmen(nora.id, {
      ereignisId: ergebnis.ereignis?.id ?? '',
      begruendung: 'Prüfung wurde aberkannt.',
    });
    expect(zurueck.erreicht).toBe(false);
  });

  it('S-L01: Übersicht zeigt nur aktuell zugeordnete Lernende', async () => {
    await umgebung.sitzung.anmelden('petra');

    const zeilen = await umgebung.uebersicht.lernende();

    expect(zeilen.map((zeile) => zeile.lernende.login)).toEqual(['sara']);
    expect(zeilen[0]?.lehrjahr).toBe(4);
    expect(zeilen[0]?.fortschritt).toBeGreaterThan(0);
  });

  it('S-A07: Badges ausblenden wirkt nur auf die eigene Ansicht', async () => {
    await umgebung.sitzung.anmelden('nora');
    const nora = ausbildungVon(umgebung, 'nora');

    await umgebung.sitzung.badgesAusblenden(true);
    const eigene = await umgebung.skilltree.laden(nora.id);
    expect(eigene.badges.ausgeblendet).toBe(true);

    await umgebung.sitzung.anmelden('daniel');
    const fremde = await umgebung.skilltree.laden(nora.id);
    expect(fremde.badges.ausgeblendet).toBe(false);
  });

  it('S-Q01: Meine Daten sind rollenabhängig', async () => {
    await umgebung.sitzung.anmelden('nora');
    const lernende = umgebung.uebersicht.meineDaten();
    expect(lernende.map((zeile) => zeile.datenart)).toContain('Badges');

    await umgebung.sitzung.anmelden('admin');
    const admin = umgebung.uebersicht.meineDaten();
    expect(admin).not.toEqual(lernende);
  });

  it('TF20: Export, Zurücksetzen und Import ergeben denselben Stand', async () => {
    await umgebung.sitzung.anmelden('admin');
    const exportiert = await umgebung.datenverwaltung.exportieren();

    await umgebung.datenverwaltung.zuruecksetzen();
    await umgebung.datenverwaltung.importieren(exportiert);
    const erneut = await umgebung.datenverwaltung.exportieren();

    expect(ohneExportZeit(erneut)).toEqual(ohneExportZeit(exportiert));
  });

  it('TF20: Import ersetzt den Bestand vollständig', async () => {
    await umgebung.sitzung.anmelden('admin');
    const exportiert = await umgebung.datenverwaltung.exportieren();
    const leer: DatenbestandJson = {
      ...exportiert,
      benutzer: [],
      ausbildungen: [],
      stufenereignisse: [],
    };

    await umgebung.datenverwaltung.importieren(leer);

    expect(await umgebung.speicher.alle('benutzer')).toHaveLength(0);
    expect(await umgebung.speicher.alle('stufenereignisse')).toHaveLength(0);
  });

  it('T-W6: nur die Administration verwaltet den Datenbestand', async () => {
    await umgebung.sitzung.anmelden('nora');

    await expect(umgebung.datenverwaltung.exportieren()).rejects.toMatchObject({
      code: 'KEINE_BERECHTIGUNG',
    });
  });

  it('D-013: die Demo-Steuerung setzt den Seed-Stand in jeder Rolle zurück', async () => {
    await umgebung.sitzung.anmelden('admin');
    const exportiert = await umgebung.datenverwaltung.exportieren();
    const seedAnzahl = (await umgebung.speicher.alle('stufenereignisse')).length;

    // A coach appends an event …
    await umgebung.sitzung.anmelden('daniel');
    const nora = ausbildungVon(umgebung, 'nora');
    const offen = offeneAnfrageVon(umgebung, 'nora');
    await umgebung.bestaetigung.bestaetigen(nora.id, {
      leistungszielId: offen.leistungszielId,
      stufe: offen.zielstufe,
    });
    expect((await umgebung.speicher.alle('stufenereignisse')).length).toBe(seedAnzahl + 1);

    // … and the demo reset removes it even for a learner.
    await umgebung.sitzung.anmelden('nora');
    await umgebung.datenverwaltung.zuruecksetzen();

    expect((await umgebung.speicher.alle('stufenereignisse')).length).toBe(seedAnzahl);
    // The reset is demo-only; importing a data set stays admin-only.
    await expect(umgebung.datenverwaltung.importieren(exportiert)).rejects.toMatchObject({
      code: 'KEINE_BERECHTIGUNG',
    });
  });
});

describe('Vorlagen-Import', () => {
  let umgebung: TestUmgebung;

  beforeEach(async () => {
    umgebung = await erstelleUmgebung();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('TF6c: Vorlagen-JSON MED importiert 6 Bereiche, 24 Kompetenzen, 158 Leistungsziele', async () => {
    await umgebung.sitzung.anmelden('admin');
    const med = VORLAGEN[2] as VorlageImport;

    const bericht = await umgebung.importDienst.trockenlauf(med);
    expect(bericht.fehler).toBe(0);
    expect(bericht.bereiche).toBe(6);
    expect(bericht.kompetenzen).toBe(24);
    expect(bericht.leistungsziele).toBe(158);

    const { vorlageId } = await umgebung.importDienst.importieren(med);
    const struktur = await TestBed.inject(VORLAGE_REPOSITORY).struktur(vorlageId);

    expect(struktur.bereiche).toHaveLength(6);
    expect(struktur.kompetenzen).toHaveLength(24);
    expect(struktur.leistungsziele).toHaveLength(158);
    expect(struktur.leistungsziele.some((ziel) => ziel.lernorte !== null)).toBe(true);
  });

  it('T-I3: Trockenlauf verändert keine Daten', async () => {
    await umgebung.sitzung.anmelden('admin');
    const vorher = await umgebung.speicher.alle('leistungsziele');

    await umgebung.importDienst.trockenlauf(VORLAGEN[2] as VorlageImport);

    expect(await umgebung.speicher.alle('leistungsziele')).toEqual(vorher);
  });

  it('T-I1: Import ist nur für die Administration erlaubt', async () => {
    await umgebung.sitzung.anmelden('nora');

    await expect(
      umgebung.importDienst.trockenlauf(VORLAGEN[2] as VorlageImport),
    ).rejects.toMatchObject({ code: 'KEINE_BERECHTIGUNG' });
  });

  it('T-I4: fehlerhafte Vorlagen werden mit Fehlern gemeldet', () => {
    const bericht = pruefeVorlageImport({
      lehrberuf: { code: '', name: '', lehrdauerJahre: 0 },
      bildungsplanJahr: 2021,
      quelle: 'Test',
      bereiche: [
        {
          code: 'A',
          titel: 'Bereich A',
          kompetenzen: [
            {
              code: 'a1',
              titel: 'Kompetenz a1',
              beschreibung: '',
              module: { basislehrjahr: [], berufsfachschule: [], uek: [] },
              leistungsziele: [{ code: 'a1.1', text: '', taxonomie: 'K9' }],
            },
          ],
        },
      ],
    });

    expect(bericht.fehler).toBeGreaterThanOrEqual(3);
    expect(bericht.meldungen.every((meldung) => meldung.art === 'FEHLER')).toBe(true);
  });

  it('R-M1: MED zählt 126 Leistungsziele mit Lernort Basislehrjahr', async () => {
    await umgebung.sitzung.anmelden('admin');
    const { vorlageId } = await umgebung.importDienst.importieren(VORLAGEN[2] as VorlageImport);
    const struktur = await TestBed.inject(VORLAGE_REPOSITORY).struktur(vorlageId);
    const index = indexierePlan(struktur);

    // 122 objectives name a Basislehrjahr module explicitly, 4 have no learning-location
    // record and inherit it from their competence; 32 explicitly are not taught there.
    expect(meilensteinBereitschaft('BBC', index, new Map(), meilensteinStati([]), 0)).toBe(
      '0 von 126 Leistungszielen mit Lernort Basislehrjahr mindestens erklärt.',
    );
  });

  it('T-I4: ein Code in zwei Kompetenzen ist ein Fehler im Trockenlauf', () => {
    const bericht = pruefeVorlageImport({
      lehrberuf: { code: 'INF', name: 'Informatiker/in', lehrdauerJahre: 4 },
      bildungsplanJahr: 2021,
      quelle: 'Test',
      bereiche: [
        {
          code: 'A',
          titel: 'Bereich A',
          kompetenzen: [
            {
              code: 'a1',
              titel: 'Kompetenz a1',
              beschreibung: '',
              module: { basislehrjahr: [], berufsfachschule: [], uek: [] },
              leistungsziele: [
                { code: 'a1.1', text: 'Ziel a1.1', taxonomie: 'K3' },
                { code: 'a1.1', text: 'Ziel a1.1', taxonomie: 'K3' },
              ],
            },
            {
              code: 'a2',
              titel: 'Kompetenz a2',
              beschreibung: '',
              module: { basislehrjahr: [], berufsfachschule: [], uek: [] },
              leistungsziele: [{ code: 'a1.1', text: 'Ziel a1.1', taxonomie: 'K3' }],
            },
          ],
        },
      ],
    });

    expect(bericht.warnungen).toBe(1);
    expect(
      bericht.meldungen.some(
        (meldung) => meldung.art === 'FEHLER' && meldung.text.includes('«a1.1»'),
      ),
    ).toBe(true);
    expect(bericht.fehler).toBe(1);
  });

  it('TF21: die Dienst-Testsuite läuft gegen den In-Memory-Adapter', async () => {
    // Der IndexedDB-Adapter braucht eine echte IndexedDB-Umgebung; jsdom stellt
    // keine bereit. Der zweite Lauf ist als offene Frage dokumentiert.
    expect(umgebung.speicher).toBeDefined();
    await umgebung.sitzung.anmelden('nora');
    const nora = ausbildungVon(umgebung, 'nora');
    const ansicht = await umgebung.skilltree.laden(nora.id);
    expect(ansicht.bereiche.length).toBeGreaterThan(0);
  });
});
