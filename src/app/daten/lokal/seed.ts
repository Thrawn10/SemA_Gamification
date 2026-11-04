import type {
  Ausbildung,
  BadgeDefinition,
  BadgeVergabe,
  Benutzer,
  Bestaetigungsanfrage,
  DatenbestandJson,
  Kompetenz,
  KompetenzAbhaengigkeit,
  Lehrberuf,
  Leistungsziel,
  MeilensteinEreignis,
  Stufe,
  Stufenereignis,
  Stufenmodell,
  Vorlage,
  VorlageImport,
  Zuordnung,
} from '@skilltree/vertraege';
import { ABSCHLUSS_STUFE, stufenmodellFuer } from '@skilltree/vertraege';
import {
  berechneBadgeVergaben,
  erstelleBadgeDefinitionen,
  indexierePlan,
  punktwert,
  type PlanIndex,
} from '@skilltree/regeln';
import { TEXTVERWEISE } from './verweise';

const TAG = 86_400_000;

/**
 * Bump when the deterministic demo data changes in a way that existing browsers must pick up.
 * `DatenbestandSpeicherAdapter` compares it with the value stored in the `meta` store and reseeds
 * when they differ (D-023). The PiBS learner and the binary stage model are version 1.
 */
export const SEED_VERSION = 1;

/** Deterministic PRNG (mulberry32) so the demo data is stable per person. */
function zufall(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  let wert = 2166136261;
  for (let i = 0; i < text.length; i++) {
    wert ^= text.charCodeAt(i);
    wert = Math.imul(wert, 16777619);
  }
  return wert >>> 0;
}

function id(...teile: string[]): string {
  return teile.join('-');
}

function iso(datum: Date): string {
  return datum.toISOString();
}

function inTagen(jetzt: Date, tage: number): Date {
  return new Date(jetzt.getTime() - tage * TAG);
}

function zufaelligerZeitpunkt(random: () => number, von: Date, bis: Date): Date {
  if (bis.getTime() <= von.getTime()) {
    return new Date(von.getTime() + 60_000);
  }
  let zeit = von.getTime() + Math.floor(random() * (bis.getTime() - von.getTime()));
  const datum = new Date(zeit);
  const wochentag = datum.getUTCDay();
  if (wochentag === 6) {
    zeit += 2 * TAG;
  } else if (wochentag === 0) {
    zeit += TAG;
  }
  const zeitpunkt = new Date(Math.min(zeit, bis.getTime()));
  zeitpunkt.setUTCHours(6 + Math.floor(random() * 9), Math.floor(random() * 60), 0, 0);
  return zeitpunkt;
}

const KOMMENTARE = [
  'Selbständig im Projekt «Ferienplaner» umgesetzt.',
  'Mit zwei Fachpersonen besprochen und dokumentiert.',
  'Im Testlabor erfolgreich angewendet.',
  'Sorgfältig und nachvollziehbar ausgeführt.',
  'Nach der ersten Rückmeldung überarbeitet.',
  'Im Team erklärt und gemeinsam geprüft.',
];

interface Lernpfad {
  login: string;
  benutzerId: string;
  ausbildung: Ausbildung;
  index: PlanIndex;
  vorlageId: string;
  templateCode: string;
  stufenmodell: Stufenmodell;
  ziel: number;
  von: Date;
  bis: Date;
  zuordnungen: Zuordnung[];
  akteurFallback: string;
}

interface SeedErgebnis {
  daten: DatenbestandJson;
  indexes: Map<string, PlanIndex>;
}

export function erstelleSeedDaten(importe: readonly VorlageImport[], jetzt: Date): SeedErgebnis {
  const jetztIso = iso(jetzt);
  const sj = jetzt.getUTCMonth() >= 7 ? jetzt.getUTCFullYear() : jetzt.getUTCFullYear() - 1;

  const lehrberufe: Lehrberuf[] = [];
  const vorlagen: Vorlage[] = [];
  const bereiche: DatenbestandJson['bereiche'] = [];
  const kompetenzen: Kompetenz[] = [];
  const leistungsziele: Leistungsziel[] = [];
  const abhaengigkeiten: KompetenzAbhaengigkeit[] = [];
  const badgeDefinitionen: BadgeDefinition[] = [];
  const indexes = new Map<string, PlanIndex>();

  for (const importiert of importe) {
    const code = importiert.lehrberuf.code;
    const stufenmodell = stufenmodellFuer(
      importiert.stufenmodell,
      importiert.lehrberuf.stufenmodell,
    );
    const lehrberufId = id('lb', code);
    lehrberufe.push({
      id: lehrberufId,
      code,
      name: importiert.lehrberuf.name,
      fachrichtung: importiert.lehrberuf.fachrichtung,
      lehrdauerJahre: importiert.lehrberuf.lehrdauerJahre,
      stufenmodell,
      aktiv: true,
    });

    const vorlageId = id('vorlage', code, 'v1');
    vorlagen.push({
      id: vorlageId,
      lehrberufId,
      bildungsplanJahr: importiert.bildungsplanJahr,
      version: importiert.version ?? 1,
      quelle: importiert.quelle,
      importiertAm: jetztIso,
      pruefsumme: code.toLowerCase(),
      stufenmodell,
      aktiv: true,
    });

    const struktur = {
      bereiche: [] as DatenbestandJson['bereiche'],
      kompetenzen: [] as Kompetenz[],
      leistungsziele: [] as Leistungsziel[],
      abhaengigkeiten: [] as KompetenzAbhaengigkeit[],
    };

    importiert.bereiche.forEach((bereichImport, bereichsIndex) => {
      const bereichId = id('bereich', code, bereichImport.code);
      const bereich = {
        id: bereichId,
        vorlageId,
        code: bereichImport.code.toUpperCase(),
        titel: bereichImport.titel,
        reihenfolge: bereichsIndex,
      };
      bereiche.push(bereich);
      struktur.bereiche.push(bereich);

      bereichImport.kompetenzen.forEach((kompetenzImport, kompetenzIndex) => {
        const kompetenzId = id('kompetenz', code, kompetenzImport.code);
        const kompetenz: Kompetenz = {
          id: kompetenzId,
          bereichId,
          code: kompetenzImport.code,
          titel: kompetenzImport.titel,
          beschreibung: kompetenzImport.beschreibung,
          moduleBasislehrjahr: kompetenzImport.module.basislehrjahr,
          moduleBerufsfachschule: kompetenzImport.module.berufsfachschule,
          moduleUek: kompetenzImport.module.uek,
          reihenfolge: kompetenzIndex,
        };
        kompetenzen.push(kompetenz);
        struktur.kompetenzen.push(kompetenz);

        kompetenzImport.leistungsziele.forEach((zielImport, zielIndex) => {
          const leistungsziel: Leistungsziel = {
            id: id('lz', code, zielImport.code),
            kompetenzId,
            code: zielImport.code,
            text: zielImport.text,
            taxonomie: zielImport.taxonomie,
            lernorte: zielImport.lernorte ?? null,
            reihenfolge: zielIndex,
            archiviert: false,
          };
          leistungsziele.push(leistungsziel);
          struktur.leistungsziele.push(leistungsziel);
        });
      });
    });

    // Follow edges (R-T1).
    for (const bereich of struktur.bereiche) {
      const eigene = struktur.kompetenzen
        .filter((kompetenz) => kompetenz.bereichId === bereich.id)
        .sort((a, b) => a.reihenfolge - b.reihenfolge);
      for (let i = 1; i < eigene.length; i++) {
        const abhaengigkeit: KompetenzAbhaengigkeit = {
          id: id('abh', code, eigene[i - 1].code, eigene[i].code),
          vorlageId,
          vonKompetenzId: eigene[i - 1].id,
          nachKompetenzId: eigene[i].id,
          quelle: 'REIHENFOLGE',
        };
        abhaengigkeiten.push(abhaengigkeit);
        struktur.abhaengigkeiten.push(abhaengigkeit);
      }
    }

    // Cross edges documented in R-T2.
    for (const [von, nach] of TEXTVERWEISE[code] ?? []) {
      const vonKompetenz = struktur.kompetenzen.find((kompetenz) => kompetenz.code === von);
      const nachKompetenz = struktur.kompetenzen.find((kompetenz) => kompetenz.code === nach);
      if (!vonKompetenz || !nachKompetenz) {
        throw new Error(`${code}: Querverweis ${von} → ${nach} nicht auflösbar.`);
      }
      const abhaengigkeit: KompetenzAbhaengigkeit = {
        id: id('abh', code, von, nach),
        vorlageId,
        vonKompetenzId: vonKompetenz.id,
        nachKompetenzId: nachKompetenz.id,
        quelle: 'TEXTVERWEIS',
      };
      abhaengigkeiten.push(abhaengigkeit);
      struktur.abhaengigkeiten.push(abhaengigkeit);
    }

    const index = indexierePlan(struktur);
    indexes.set(code, index);
    badgeDefinitionen.push(...erstelleBadgeDefinitionen(struktur, vorlageId, stufenmodell));
  }

  // ANNAHME: The validation build shows exactly one learner per MVP profession plus one PiBS
  // student (D-022). The practice-trainer accounts stay in the seed as a hidden login, and the
  // admin account stays internal (data management tests only); neither is offered on the login
  // page (D-021).
  const benutzer: Benutzer[] = [
    {
      id: 'u-nora',
      login: 'nora',
      name: 'Nora Frei (Applikationsentwicklerin)',
      rolle: 'LERNENDE',
    },
    {
      id: 'u-luca',
      login: 'luca',
      name: 'Luca Meier (Plattformentwickler)',
      rolle: 'LERNENDE',
    },
    {
      id: 'u-sara',
      login: 'sara',
      name: 'Sara Huber (Mediamatikerin)',
      rolle: 'LERNENDE',
    },
    {
      id: 'u-mia',
      login: 'mia',
      name: 'Mia Keller (PiBS-Studentin)',
      rolle: 'LERNENDE',
    },
    { id: 'u-daniel', login: 'daniel', name: 'Daniel Roth', rolle: 'PRAXISBILDNER' },
    { id: 'u-petra', login: 'petra', name: 'Petra Lang', rolle: 'PRAXISBILDNER' },
    { id: 'u-admin', login: 'admin', name: 'Admin', rolle: 'ADMIN' },
  ];

  const ausbildungNora: Ausbildung = {
    id: 'az-nora',
    lernendeId: 'u-nora',
    lehrberufId: id('lb', 'INF-APP'),
    vorlageId: id('vorlage', 'INF-APP', 'v1'),
    lehrbeginn: `${sj - 2}-08-01`,
    aktiv: true,
  };
  const ausbildungLuca: Ausbildung = {
    id: 'az-luca',
    lernendeId: 'u-luca',
    lehrberufId: id('lb', 'INF-PLA'),
    vorlageId: id('vorlage', 'INF-PLA', 'v1'),
    lehrbeginn: `${sj}-08-03`,
    aktiv: true,
  };
  const ausbildungSara: Ausbildung = {
    id: 'az-sara',
    lernendeId: 'u-sara',
    lehrberufId: id('lb', 'MED'),
    vorlageId: id('vorlage', 'MED', 'v1'),
    lehrbeginn: `${sj - 3}-08-01`,
    aktiv: true,
  };
  const ausbildungMia: Ausbildung = {
    id: 'az-mia',
    lernendeId: 'u-mia',
    lehrberufId: id('lb', 'INF-PIBS'),
    vorlageId: id('vorlage', 'INF-PIBS', 'v1'),
    lehrbeginn: `${sj - 1}-08-01`,
    aktiv: true,
  };
  const ausbildungen = [ausbildungNora, ausbildungLuca, ausbildungSara, ausbildungMia];

  const zuordnungen: Zuordnung[] = [
    {
      id: 'z-nora-petra',
      ausbildungId: 'az-nora',
      praxisbildnerId: 'u-petra',
      gueltigVon: `${sj - 2}-08-01`,
      gueltigBis: `${sj - 1}-07-31T23:59:59.999Z`,
    },
    {
      id: 'z-nora-daniel',
      ausbildungId: 'az-nora',
      praxisbildnerId: 'u-daniel',
      gueltigVon: `${sj - 1}-08-01`,
      gueltigBis: null,
    },
    {
      id: 'z-luca-daniel',
      ausbildungId: 'az-luca',
      praxisbildnerId: 'u-daniel',
      gueltigVon: `${sj}-08-03`,
      gueltigBis: null,
    },
    {
      id: 'z-sara-petra',
      ausbildungId: 'az-sara',
      praxisbildnerId: 'u-petra',
      gueltigVon: `${sj - 3}-08-01`,
      gueltigBis: null,
    },
    {
      id: 'z-mia-daniel',
      ausbildungId: 'az-mia',
      praxisbildnerId: 'u-daniel',
      gueltigVon: `${sj - 1}-08-01`,
      gueltigBis: null,
    },
  ];

  const pfade: Lernpfad[] = [
    {
      login: 'nora',
      benutzerId: 'u-nora',
      ausbildung: ausbildungNora,
      index: indexes.get('INF-APP')!,
      vorlageId: ausbildungNora.vorlageId,
      templateCode: 'INF-APP',
      stufenmodell: 'DREI_STUFEN',
      ziel: 45,
      von: new Date(`${ausbildungNora.lehrbeginn}T00:00:00.000Z`),
      bis: inTagen(jetzt, 4),
      zuordnungen: zuordnungen.filter((zuordnung) => zuordnung.ausbildungId === 'az-nora'),
      akteurFallback: 'u-daniel',
    },
    {
      login: 'luca',
      benutzerId: 'u-luca',
      ausbildung: ausbildungLuca,
      index: indexes.get('INF-PLA')!,
      vorlageId: ausbildungLuca.vorlageId,
      templateCode: 'INF-PLA',
      stufenmodell: 'DREI_STUFEN',
      ziel: 10,
      von: new Date(`${ausbildungLuca.lehrbeginn}T00:00:00.000Z`),
      bis: inTagen(jetzt, 4),
      zuordnungen: zuordnungen.filter((zuordnung) => zuordnung.ausbildungId === 'az-luca'),
      akteurFallback: 'u-daniel',
    },
    {
      login: 'sara',
      benutzerId: 'u-sara',
      ausbildung: ausbildungSara,
      index: indexes.get('MED')!,
      vorlageId: ausbildungSara.vorlageId,
      templateCode: 'MED',
      stufenmodell: 'DREI_STUFEN',
      ziel: 80,
      von: new Date(`${ausbildungSara.lehrbeginn}T00:00:00.000Z`),
      bis: inTagen(jetzt, 4),
      zuordnungen: zuordnungen.filter((zuordnung) => zuordnung.ausbildungId === 'az-sara'),
      akteurFallback: 'u-petra',
    },
    {
      login: 'mia',
      benutzerId: 'u-mia',
      ausbildung: ausbildungMia,
      index: indexes.get('INF-PIBS')!,
      vorlageId: ausbildungMia.vorlageId,
      templateCode: 'INF-PIBS',
      // D-022: the PiBS plan only knows open/completed, so `ziel` is the completed share.
      stufenmodell: 'BINAER',
      ziel: 35,
      von: new Date(`${ausbildungMia.lehrbeginn}T00:00:00.000Z`),
      bis: inTagen(jetzt, 4),
      zuordnungen: zuordnungen.filter((zuordnung) => zuordnung.ausbildungId === 'az-mia'),
      akteurFallback: 'u-daniel',
    },
  ];

  const stufenProAusbildung = new Map<string, Map<string, Stufe>>();
  const stufenereignisse: Stufenereignis[] = [];

  for (const pfad of pfade) {
    const random = zufall(hash(pfad.login));
    const ziele: { id: string; score: number }[] = [];

    for (const bereich of pfad.index.bereiche) {
      const astFokus = random();
      const anzahlKompetenzen = bereich.kompetenzen.length;
      bereich.kompetenzen.forEach((kompetenz, kompetenzIndex) => {
        const kompetenzFokus = random();
        const astPosition = anzahlKompetenzen > 1 ? kompetenzIndex / (anzahlKompetenzen - 1) : 0;
        const anzahlZiele = kompetenz.leistungszielIds.length;
        kompetenz.leistungszielIds.forEach((zielId, zielIndex) => {
          const zielPosition = anzahlZiele > 1 ? zielIndex / (anzahlZiele - 1) : 0;
          const score =
            0.85 * (0.6 * kompetenzFokus + 0.4 * astFokus) +
            0.35 * random() -
            0.15 * zielPosition -
            0.5 * astPosition;
          ziele.push({ id: zielId, score });
        });
      });
    }

    const stufen =
      pfad.stufenmodell === 'BINAER'
        ? verteileStufenBinaer(ziele, pfad.ziel)
        : verteileStufen(
            ziele,
            Math.round((pfad.ziel / 100) * 6 * pfad.index.aktiveLeistungszielIds.length),
          );
    stufenProAusbildung.set(pfad.ausbildung.id, stufen);

    let laufendeNummer = 0;
    const zeitpunktFuer = (von: Date): Date => {
      const zeitpunkt = zufaelligerZeitpunkt(random, von, pfad.bis);
      return zeitpunkt;
    };
    const akteurFuer = (zeitpunkt: Date): string => {
      const treffer = pfad.zuordnungen.find(
        (zuordnung) =>
          zuordnung.gueltigVon <= iso(zeitpunkt) &&
          (!zuordnung.gueltigBis || zuordnung.gueltigBis >= iso(zeitpunkt)),
      );
      return treffer?.praxisbildnerId ?? pfad.akteurFallback;
    };

    for (const [zielId, stufe] of stufen) {
      if (stufe === 0) {
        continue;
      }
      if (pfad.stufenmodell === 'BINAER') {
        // D-022: one confirmation per objective, no partial levels.
        const zeitpunkt = zeitpunktFuer(new Date(pfad.von.getTime() + 25 * TAG));
        const kommentar =
          random() < 0.3 ? KOMMENTARE[Math.floor(random() * KOMMENTARE.length)] : undefined;
        stufenereignisse.push({
          id: id('seed', pfad.login, String(laufendeNummer++)),
          ausbildungId: pfad.ausbildung.id,
          leistungszielId: zielId,
          stufe: ABSCHLUSS_STUFE,
          aktion: 'BESTAETIGT',
          akteurId: akteurFuer(zeitpunkt),
          zeitpunkt: iso(zeitpunkt),
          ...(kommentar ? { kommentar } : {}),
        });
        continue;
      }
      const kandidaten: { stufe: 1 | 2 | 3 }[] = [];
      if (stufe === 3) {
        if (random() < 0.45) {
          kandidaten.push({ stufe: 2 });
        }
        if (random() < 0.45) {
          kandidaten.push({ stufe: 1 });
        }
        kandidaten.push({ stufe: 3 });
      } else if (stufe === 2) {
        if (random() < 0.45) {
          kandidaten.push({ stufe: 1 });
        }
        kandidaten.push({ stufe: 2 });
      } else {
        kandidaten.push({ stufe: 1 });
      }

      let von = new Date(pfad.von.getTime() + 25 * TAG);
      for (const kandidat of kandidaten) {
        const zeitpunkt = zeitpunktFuer(von);
        von = new Date(zeitpunkt.getTime() + 60_000);
        const kommentar =
          random() < 0.3 ? KOMMENTARE[Math.floor(random() * KOMMENTARE.length)] : undefined;
        stufenereignisse.push({
          id: id('seed', pfad.login, String(laufendeNummer++)),
          ausbildungId: pfad.ausbildung.id,
          leistungszielId: zielId,
          stufe: kandidat.stufe,
          aktion: 'BESTAETIGT',
          akteurId: akteurFuer(zeitpunkt),
          zeitpunkt: iso(zeitpunkt),
          ...(kommentar ? { kommentar } : {}),
        });
      }
    }
  }

  // Sara: events before the start-state import become UEBERNOMMEN per Leistungsziel.
  const saraCutoff = `${sj - 1}-09-01T00:00:00.000Z`;
  const saraEreignisse = stufenereignisse.filter((ereignis) => ereignis.ausbildungId === 'az-sara');
  const vorCutoff = saraEreignisse.filter((ereignis) => ereignis.zeitpunkt < saraCutoff);
  const nachCutoff = saraEreignisse.filter((ereignis) => ereignis.zeitpunkt >= saraCutoff);
  const hoechsteProZiel = new Map<string, Stufe>();
  for (const ereignis of vorCutoff) {
    if (ereignis.stufe > (hoechsteProZiel.get(ereignis.leistungszielId) ?? 0)) {
      hoechsteProZiel.set(ereignis.leistungszielId, ereignis.stufe);
    }
  }
  for (const [zielId, stufe] of hoechsteProZiel) {
    nachCutoff.push({
      id: id('seed', 'sara', 'start', zielId),
      ausbildungId: 'az-sara',
      leistungszielId: zielId,
      stufe: stufe as 1 | 2 | 3,
      aktion: 'UEBERNOMMEN',
      akteurId: 'u-admin',
      zeitpunkt: saraCutoff,
      kommentar: 'Startstand aus dem Bildungsplan übernommen.',
    });
  }
  const ohneSara = stufenereignisse.filter((ereignis) => ereignis.ausbildungId !== 'az-sara');
  stufenereignisse.length = 0;
  stufenereignisse.push(...ohneSara, ...nachCutoff);

  // Nora: a reversed confirmation stays visible in the history (SPEC 9 point 7).
  const noraStufen = stufenProAusbildung.get('az-nora')!;
  const noraZiel = [...noraStufen.entries()].find(([, stufe]) => stufe === 2)?.[0];
  if (noraZiel) {
    const t1 = iso(inTagen(jetzt, 30));
    const t2 = iso(inTagen(jetzt, 29));
    stufenereignisse.push({
      id: 'seed-nora-ruecknahme-3',
      ausbildungId: 'az-nora',
      leistungszielId: noraZiel,
      stufe: 3,
      aktion: 'BESTAETIGT',
      akteurId: 'u-daniel',
      zeitpunkt: t1,
      kommentar: 'Im Projekt selbständig umgesetzt.',
    });
    stufenereignisse.push({
      id: 'seed-nora-ruecknahme-r',
      ausbildungId: 'az-nora',
      leistungszielId: noraZiel,
      stufe: 3,
      aktion: 'ZURUECKGENOMMEN',
      akteurId: 'u-daniel',
      zeitpunkt: t2,
      begruendung: 'Versehentlich beim falschen Leistungsziel bestätigt.',
      refEreignisId: 'seed-nora-ruecknahme-3',
    });
  }

  // Milestones.
  const meilensteinereignisse: MeilensteinEreignis[] = [
    {
      id: 'seed-ms-nora-bbc',
      ausbildungId: 'az-nora',
      meilenstein: 'BBC',
      aktion: 'ERREICHT',
      akteurId: 'u-petra',
      zeitpunkt: `${sj - 1}-06-27T10:00:00.000Z`,
      kommentar: 'Basislehrjahr erfolgreich abgeschlossen.',
    },
    {
      id: 'seed-ms-sara-bbc',
      ausbildungId: 'az-sara',
      meilenstein: 'BBC',
      aktion: 'ERREICHT',
      akteurId: 'u-petra',
      zeitpunkt: `${sj - 2}-06-30T10:00:00.000Z`,
      kommentar: 'Basislehrjahr erfolgreich abgeschlossen.',
    },
  ];

  // Requests.
  const anfragen: Bestaetigungsanfrage[] = [];
  const belegt = new Set<string>();
  const naechstesZiel = (pfad: Lernpfad, zielstufe: 2 | 3, status: string): string | null => {
    const stufen = stufenProAusbildung.get(pfad.ausbildung.id)!;
    const frei = pfad.index.aktiveLeistungszielIds.filter(
      (zielId) => !belegt.has(`${pfad.ausbildung.id}:${zielId}`),
    );
    const zielId =
      frei.find((eintrag) => (stufen.get(eintrag) ?? 0) === zielstufe - 1) ??
      frei.find((eintrag) => (stufen.get(eintrag) ?? 0) < zielstufe) ??
      null;
    if (!zielId) {
      console.warn(`Seed: kein offenes Leistungsziel für Anfrage (${status})`);
      return null;
    }
    belegt.add(`${pfad.ausbildung.id}:${zielId}`);
    return zielId;
  };

  const anfrage = (
    nummer: string,
    pfad: Lernpfad,
    zielId: string | null,
    zielstufe: 2 | 3,
    text: string,
    tage: number,
  ): void => {
    if (!zielId) {
      return;
    }
    anfragen.push({
      id: `anfrage-${nummer}`,
      ausbildungId: pfad.ausbildung.id,
      leistungszielId: zielId,
      zielstufe,
      text,
      status: 'OFFEN',
      erstelltAm: iso(inTagen(jetzt, tage)),
    });
  };

  const nora = pfade[0];
  const luca = pfade[1];
  const sara = pfade[2];
  const mia = pfade[3];

  anfrage(
    'nora-1',
    nora,
    naechstesZiel(nora, 3, 'offen'),
    3,
    'Im Projekt «Ferienplaner» habe ich die Anforderungen mit zwei Fachpersonen aufgenommen und als User Stories dokumentiert.',
    9,
  );
  anfrage(
    'nora-2',
    nora,
    naechstesZiel(nora, 2, 'offen'),
    2,
    'Beim Aufbau unseres Testlabors habe ich die Netzwerkverbindungen selbständig geprüft und die Ergebnisse festgehalten.',
    3,
  );
  const noraAbgelehnt = naechstesZiel(nora, 3, 'abgelehnt');
  if (noraAbgelehnt) {
    anfragen.push({
      id: 'anfrage-nora-3',
      ausbildungId: 'az-nora',
      leistungszielId: noraAbgelehnt,
      zielstufe: 3,
      text: 'Ich habe die Datenbankmigration allein durchgeführt und alles getestet.',
      status: 'ABGELEHNT',
      erstelltAm: iso(inTagen(jetzt, 14)),
      beantwortetAm: iso(inTagen(jetzt, 12)),
      beantwortetVon: 'u-daniel',
      antwort: 'Bitte genauer beschreiben, was du gemacht hast.',
    });
  }
  anfrage(
    'luca-1',
    luca,
    naechstesZiel(luca, 2, 'offen'),
    2,
    'Ich habe den Arbeitsplatz nach Anleitung eingerichtet und die Verbindung getestet.',
    5,
  );
  anfrage(
    'sara-1',
    sara,
    naechstesZiel(sara, 3, 'offen'),
    3,
    'Für die Social-Media-Kampagne habe ich die Bildsprache festgelegt und die Entwürfe präsentiert.',
    6,
  );
  anfrage(
    'mia-1',
    mia,
    naechstesZiel(mia, 3, 'offen'),
    3,
    'Für die Transferarbeit habe ich die Anforderungen selbstständig erhoben und als User Stories dokumentiert.',
    3,
  );

  // Badge allocations derive from the events (R-B5).
  const badgeVergaben: BadgeVergabe[] = [];
  for (const pfad of pfade) {
    const definitionen = badgeDefinitionen.filter(
      (definition) => definition.vorlageId === pfad.vorlageId,
    );
    const ereignisse = stufenereignisse.filter(
      (ereignis) => ereignis.ausbildungId === pfad.ausbildung.id,
    );
    badgeVergaben.push(
      ...berechneBadgeVergaben(
        definitionen,
        pfad.index,
        ereignisse,
        pfad.ausbildung.id,
        pfad.stufenmodell,
      ),
    );
  }

  const daten: DatenbestandJson = {
    version: 1,
    exportiertAm: jetztIso,
    lehrberufe,
    vorlagen,
    bereiche,
    kompetenzen,
    leistungsziele,
    abhaengigkeiten,
    benutzer,
    einstellungen: [],
    ausbildungen,
    zuordnungen,
    stufenereignisse,
    meilensteinereignisse,
    anfragen,
    badgeDefinitionen,
    badgeVergaben,
  };

  return { daten, indexes };
}

/**
 * Distributes levels by rank until the point sum is within ±3 points of the
 * target (SPEC 9). Higher ranks are earlier in the tree, which makes the tree
 * grow from bottom to top.
 */
export function verteileStufen(
  ziele: readonly { id: string; score: number }[],
  zielPunkte: number,
): Map<string, Stufe> {
  const sortiert = [...ziele].sort((a, b) => b.score - a.score);
  const stufen = new Map<string, Stufe>();
  let summe = 0;

  for (const ziel of sortiert) {
    const rest = zielPunkte - summe;
    const stufe: Stufe = rest >= 6 ? 3 : rest >= 3 ? 2 : rest >= 1 ? 1 : 0;
    stufen.set(ziel.id, stufe);
    summe += punktwert(stufe);
  }

  let differenz = zielPunkte - summe;
  while (differenz > 3) {
    const kandidat = [...sortiert].reverse().find((ziel) => {
      const stufe = stufen.get(ziel.id) ?? 0;
      return stufe === 2 || stufe === 1 || stufe === 0;
    });
    if (!kandidat) {
      break;
    }
    const stufe = stufen.get(kandidat.id) ?? 0;
    const neu: Stufe = stufe === 2 ? 3 : stufe === 1 ? 2 : 1;
    stufen.set(kandidat.id, neu);
    differenz -= punktwert(neu) - punktwert(stufe);
  }

  return stufen;
}

/**
 * D-022: binary plans only know open/completed. The top-ranked objectives are
 * completed until the requested share is reached; there are no partial levels.
 */
export function verteileStufenBinaer(
  ziele: readonly { id: string; score: number }[],
  anteilProzent: number,
): Map<string, Stufe> {
  const sortiert = [...ziele].sort((a, b) => b.score - a.score);
  const anzahl = Math.max(
    0,
    Math.min(sortiert.length, Math.round((anteilProzent / 100) * sortiert.length)),
  );
  const stufen = new Map<string, Stufe>();
  sortiert.forEach((ziel, index) => {
    stufen.set(ziel.id, index < anzahl ? ABSCHLUSS_STUFE : 0);
  });
  return stufen;
}
