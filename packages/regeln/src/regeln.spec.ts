import type {
  BadgeDefinition,
  Bereich,
  Kompetenz,
  KompetenzAbhaengigkeit,
  Leistungsziel,
  MeilensteinEreignis,
  Stufenereignis,
  VorlageStruktur,
} from '@skilltree/vertraege';
import {
  badgeBedingung,
  badgeFortschrittText,
  berechneBadgeVergaben,
  erstelleBadgeDefinitionen,
} from './badges';
import { ampel, anzahlRoteKompetenzen, fortschritt, kompetenzwert, punktwert } from './fortschritt';
import { berechneLehrjahr, istZuordnungGueltig } from './lehrjahr';
import { meilensteinBereitschaft, meilensteinStati, meilensteinStatusMap } from './meilensteine';
import { indexierePlan } from './plan';
import { kantenzustand, kanten, kompetenzAmpeln, naechsteKnoten } from './struktur';
import { aktiveBestaetigungen, stufeFuer, stufenMap, stufenMapFuerModell } from './stufen';

function ereignis(
  id: string,
  leistungszielId: string,
  stufe: 1 | 2 | 3,
  aktion: 'BESTAETIGT' | 'ZURUECKGENOMMEN' | 'UEBERNOMMEN',
  zeitpunkt: string,
  refEreignisId?: string,
): Stufenereignis {
  return {
    id,
    ausbildungId: 'az-1',
    leistungszielId,
    stufe,
    aktion,
    akteurId: 'pb-1',
    zeitpunkt,
    ...(refEreignisId ? { refEreignisId } : {}),
  };
}

function plan(
  kuerzel: string,
  verteilung: readonly number[],
  verweise: readonly [string, string][] = [],
): VorlageStruktur {
  const bereiche: Bereich[] = [];
  const kompetenzen: Kompetenz[] = [];
  const leistungsziele: Leistungsziel[] = [];
  const abhaengigkeiten: KompetenzAbhaengigkeit[] = [];

  verteilung.forEach((anzahl, bereichsIndex) => {
    const bereichsCode = String.fromCharCode(65 + bereichsIndex);
    const bereichId = `${kuerzel}-bereich-${bereichsCode}`;
    bereiche.push({
      id: bereichId,
      vorlageId: kuerzel,
      code: bereichsCode,
      titel: `Bereich ${bereichsCode}`,
      reihenfolge: bereichsIndex,
    });

    for (let i = 0; i < anzahl; i++) {
      const kompetenzCode = `${bereichsCode.toLowerCase()}${i + 1}`;
      const kompetenzId = `${kuerzel}-kompetenz-${kompetenzCode}`;
      kompetenzen.push({
        id: kompetenzId,
        bereichId,
        code: kompetenzCode,
        titel: `Kompetenz ${kompetenzCode}`,
        beschreibung: '',
        moduleBasislehrjahr: [],
        moduleBerufsfachschule: [],
        moduleUek: [],
        reihenfolge: i,
      });
      for (let j = 0; j < 3; j++) {
        leistungsziele.push({
          id: `${kompetenzId}-lz${j}`,
          kompetenzId,
          code: `${kompetenzCode}.${j + 1}`,
          text: `Leistungsziel ${kompetenzCode}.${j + 1}`,
          taxonomie: 'K3',
          lernorte: null,
          reihenfolge: j,
          archiviert: false,
        });
      }
    }
  });

  for (const [vonCode, nachCode] of verweise) {
    abhaengigkeiten.push({
      id: `${kuerzel}-verweis-${vonCode}-${nachCode}`,
      vorlageId: kuerzel,
      vonKompetenzId: `${kuerzel}-kompetenz-${vonCode}`,
      nachKompetenzId: `${kuerzel}-kompetenz-${nachCode}`,
      quelle: 'TEXTVERWEIS',
    });
  }

  return { bereiche, kompetenzen, leistungsziele, abhaengigkeiten };
}

function stufen(werte: Readonly<Record<string, 0 | 1 | 2 | 3>>): Map<string, 0 | 1 | 2 | 3> {
  return new Map(Object.entries(werte));
}

describe('TF1 / TF2 – Stufen, Kompetenzwert und Fortschritt', () => {
  it('TF1 computes point values, competence value, traffic light and progress', () => {
    const werte = stufen({ 'a2.1': 3, 'a2.2': 2, 'a2.3': 0 });
    expect(punktwert(3)).toBe(6);
    expect(punktwert(2)).toBe(3);
    expect(kompetenzwert(['a2.1', 'a2.2', 'a2.3'], werte)).toBe(3);
    expect(ampel(3)).toBe('ORANGE');
    expect(fortschritt(['a2.1', 'a2.2', 'a2.3'], werte)).toBe(50);
  });

  it('TF2 recomputes a competence after confirming the missing level', () => {
    const werte = stufen({ 'a2.1': 3, 'a2.2': 2, 'a2.3': 3 });
    expect(kompetenzwert(['a2.1', 'a2.2', 'a2.3'], werte)).toBe(5);
    expect(ampel(5)).toBe('GRUEN');
    expect(fortschritt(['a2.1', 'a2.2', 'a2.3'], werte)).toBe(83);
  });
});

describe('R-S1 – active confirmations', () => {
  it('TF3 keeps the lower confirmation after a reversal and deactivates the badge', () => {
    const struktur = plan('app', [1]);
    const index = indexierePlan(struktur);
    const ziele = index.aktiveLeistungszielIds;
    const definitionen = erstelleBadgeDefinitionen(struktur, 'app');

    const verlauf: Stufenereignis[] = [
      ereignis('c', ziele[1], 3, 'BESTAETIGT', '2026-01-02T08:00:00.000Z'),
      ereignis('d', ziele[2], 3, 'BESTAETIGT', '2026-01-02T08:00:00.000Z'),
      ereignis('a', ziele[0], 2, 'BESTAETIGT', '2026-01-03T08:00:00.000Z'),
      ereignis('b', ziele[0], 3, 'BESTAETIGT', '2026-01-04T08:00:00.000Z'),
      ereignis('r', ziele[0], 3, 'ZURUECKGENOMMEN', '2026-01-05T08:00:00.000Z', 'b'),
    ];

    expect(stufeFuer(stufenMap(verlauf), ziele[0])).toBe(2);
    expect(aktiveBestaetigungen(verlauf).map((eintrag) => eintrag.id)).toEqual(['c', 'd', 'a']);

    const vergaben = berechneBadgeVergaben(definitionen, index, verlauf, 'az-1');
    const bereichsBadge = vergaben.find((vergabe) => vergabe.badgeId === 'app:BA-A');
    expect(bereichsBadge?.aktiv).toBe(false);
    expect(bereichsBadge?.inaktivSeit).toBe('2026-01-05T08:00:00.000Z');
    expect(bereichsBadge?.vergebenAm).toBe('2026-01-04T08:00:00.000Z');
  });

  it('TF3b falls back to zero when the only confirmation is reversed', () => {
    const verlauf = [
      ereignis('b', 'a2.1', 3, 'BESTAETIGT', '2026-01-04T08:00:00.000Z'),
      ereignis('r', 'a2.1', 3, 'ZURUECKGENOMMEN', '2026-01-05T08:00:00.000Z', 'b'),
    ];
    expect(stufeFuer(stufenMap(verlauf), 'a2.1')).toBe(0);
  });

  it('TF3c reactivates a badge and keeps the original award date', () => {
    const struktur = plan('app', [1]);
    const index = indexierePlan(struktur);
    const ziele = index.aktiveLeistungszielIds;
    const definitionen = erstelleBadgeDefinitionen(struktur, 'app');
    const verlauf: Stufenereignis[] = [
      ereignis('c', ziele[1], 3, 'BESTAETIGT', '2026-01-02T08:00:00.000Z'),
      ereignis('d', ziele[2], 3, 'BESTAETIGT', '2026-01-02T08:00:00.000Z'),
      ereignis('b', ziele[0], 3, 'BESTAETIGT', '2026-01-04T08:00:00.000Z'),
      ereignis('r', ziele[0], 3, 'ZURUECKGENOMMEN', '2026-01-05T08:00:00.000Z', 'b'),
      ereignis('n', ziele[0], 3, 'BESTAETIGT', '2026-01-06T08:00:00.000Z'),
    ];
    const vergaben = berechneBadgeVergaben(definitionen, index, verlauf, 'az-1');
    const badge = vergaben.find((vergabe) => vergabe.badgeId === 'app:BA-A');
    expect(badge?.aktiv).toBe(true);
    expect(badge?.vergebenAm).toBe('2026-01-04T08:00:00.000Z');
  });
});

describe('R-F5 / R-F6 / R-F3 – area traffic light, deficits and rounding', () => {
  it('TF10 computes an orange area with one red competence', () => {
    const zieleKompetenzA = ['a1.1', 'a1.2'];
    const zieleKompetenzB = ['b1.1', 'b1.2'];
    const werte = stufen({
      'a1.1': 3,
      'a1.2': 3,
      'b1.1': 0,
      'b1.2': 0,
    });
    const alle = [...zieleKompetenzA, ...zieleKompetenzB];
    expect(kompetenzwert(alle, werte)).toBe(3);
    expect(ampel(3)).toBe('ORANGE');
    expect(
      anzahlRoteKompetenzen(
        [
          { id: 'a1', leistungszielIds: zieleKompetenzA },
          { id: 'b1', leistungszielIds: zieleKompetenzB },
        ],
        werte,
      ),
    ).toBe(1);
  });

  it('TF11 rounds 1 of 72 points to 1 percent', () => {
    const ziele = Array.from({ length: 12 }, (_, index) => `lz-${index}`);
    const werte = stufen({ 'lz-0': 1 });
    expect(fortschritt(ziele, werte)).toBe(1);
  });

  it('TF12 picks the first non-green competence per ast', () => {
    const kompetenzen = [
      { id: 'k1', leistungszielIds: ['k1.1', 'k1.2', 'k1.3'] },
      { id: 'k2', leistungszielIds: ['k2.1', 'k2.2', 'k2.3'] },
      { id: 'k3', leistungszielIds: ['k3.1', 'k3.2', 'k3.3', 'k3.4'] },
      { id: 'k4', leistungszielIds: ['k4.1', 'k4.2'] },
    ];
    const struktur: VorlageStruktur = {
      bereiche: [{ id: 'bereich-a', vorlageId: 'p', code: 'A', titel: 'A', reihenfolge: 0 }],
      kompetenzen: kompetenzen.map((kompetenz, index) => ({
        id: kompetenz.id,
        bereichId: 'bereich-a',
        code: `a${index + 1}`,
        titel: `a${index + 1}`,
        beschreibung: '',
        moduleBasislehrjahr: [],
        moduleBerufsfachschule: [],
        moduleUek: [],
        reihenfolge: index,
      })),
      leistungsziele: kompetenzen.flatMap((kompetenz) =>
        kompetenz.leistungszielIds.map((id, index) => ({
          id,
          kompetenzId: kompetenz.id,
          code: id,
          text: id,
          taxonomie: 'K3' as const,
          lernorte: null,
          reihenfolge: index,
          archiviert: false,
        })),
      ),
      abhaengigkeiten: [],
    };
    const index = indexierePlan(struktur);
    const werte = stufen({
      'k1.1': 3,
      'k1.2': 3,
      'k1.3': 3,
      'k2.1': 3,
      'k2.2': 3,
      'k2.3': 2,
      'k3.1': 2,
      'k3.2': 2,
      'k3.3': 2,
      'k3.4': 1,
    });
    expect(naechsteKnoten(index, werte)).toEqual(['k3']);
  });
});

describe('TF16 / TF19 – tree edges', () => {
  it('TF16 builds 20 follow edges, 3 cross edges and 11 milestone edges for APP', () => {
    const struktur = plan(
      'app',
      [7, 4, 4, 6, 4],
      [
        ['a1', 'g1'],
        ['a3', 'g4'],
        ['a3', 'h3'],
      ],
    );
    const ergebnis = kanten(indexierePlan(struktur));
    expect(ergebnis.filter((kante) => kante.typ === 'FOLGE')).toHaveLength(20);
    expect(ergebnis.filter((kante) => kante.typ === 'VERWEIS')).toHaveLength(3);
    expect(ergebnis.filter((kante) => kante.typ === 'MEILENSTEIN')).toHaveLength(11);
  });

  it('TF19 builds the documented edge counts for PLA and MED', () => {
    const pla = kanten(
      indexierePlan(
        plan(
          'pla',
          [7, 4, 4, 5, 6, 7],
          [
            ['a1', 'd1'],
            ['a7', 'd4'],
            ['a1', 'e1'],
          ],
        ),
      ),
    );
    expect(pla.filter((kante) => kante.typ === 'FOLGE')).toHaveLength(27);
    expect(pla.filter((kante) => kante.typ === 'VERWEIS')).toHaveLength(3);

    const med = kanten(indexierePlan(plan('med', [4, 4, 4, 4, 4, 4])));
    expect(med.filter((kante) => kante.typ === 'FOLGE')).toHaveLength(18);
    expect(med.filter((kante) => kante.typ === 'VERWEIS')).toHaveLength(0);
  });

  it('TF17 computes the state of a follow edge from its start node', () => {
    const struktur = plan('p', [3]);
    const index = indexierePlan(struktur);
    const [k1, k2, k3] = index.bereiche[0].kompetenzen;
    const werte = stufen({
      [k1.leistungszielIds[0]]: 3,
      [k1.leistungszielIds[1]]: 3,
      [k1.leistungszielIds[2]]: 3,
      [k2.leistungszielIds[0]]: 2,
    });
    const ampeln = kompetenzAmpeln(index, werte);
    const kantenListe = kanten(index);
    const kante12 = kantenListe.find(
      (kante) => kante.von === k1.kompetenz.id && kante.nach === k2.kompetenz.id,
    );
    const kante23 = kantenListe.find(
      (kante) => kante.von === k2.kompetenz.id && kante.nach === k3.kompetenz.id,
    );
    expect(kante12).toBeDefined();
    expect(kante23).toBeDefined();
    expect(kantenzustand(kante12!, ampeln, { BBC: false, IPA: false, LAP: false })).toBe(
      'ERREICHT',
    );
    expect(kantenzustand(kante23!, ampeln, { BBC: false, IPA: false, LAP: false })).toBe('OFFEN');
  });

  it('TF18 reverses a milestone and opens the Bbc edges again', () => {
    const ereignisse: MeilensteinEreignis[] = [
      {
        id: 'm1',
        ausbildungId: 'az-1',
        meilenstein: 'BBC',
        aktion: 'ERREICHT',
        akteurId: 'pb-1',
        zeitpunkt: '2026-01-01T08:00:00.000Z',
      },
      {
        id: 'm2',
        ausbildungId: 'az-1',
        meilenstein: 'BBC',
        aktion: 'ZURUECKGENOMMEN',
        akteurId: 'pb-1',
        zeitpunkt: '2026-01-02T08:00:00.000Z',
        refEreignisId: 'm1',
      },
    ];
    const stati = meilensteinStati(ereignisse);
    expect(stati.BBC.erreicht).toBe(false);

    const index = indexierePlan(plan('p', [2]));
    const bbcKante = kanten(index).find(
      (kante) => kante.von === 'BBC' && kante.typ === 'MEILENSTEIN',
    );
    expect(kantenzustand(bbcKante!, new Map(), meilensteinStatusMap(stati))).toBe('OFFEN');
  });
});

describe('R-B8 / TF9 – badges from a start state', () => {
  it('TF9 counts UEBERNOMMEN as a confirmation and marks the badge', () => {
    const struktur = plan('app', [1]);
    const index = indexierePlan(struktur);
    const ziele = index.aktiveLeistungszielIds;
    const definitionen = erstelleBadgeDefinitionen(struktur, 'app');
    const verlauf = ziele.map((ziel, index2) =>
      ereignis(`u${index2}`, ziel, 3, 'UEBERNOMMEN', '2026-01-01T08:00:00.000Z'),
    );

    expect(stufeFuer(stufenMap(verlauf), ziele[0])).toBe(3);
    const badge = berechneBadgeVergaben(definitionen, index, verlauf, 'az-1').find(
      (vergabe) => vergabe.badgeId === 'app:BA-A',
    );
    expect(badge?.ausStartstand).toBe(true);
    expect(badge?.vergebenAm).toBe('2026-01-01T08:00:00.000Z');
  });

  it('creates 18 badge definitions for APP, 19 for PLA and 19 for MED (D-025)', () => {
    const anzahl = (struktur: VorlageStruktur) => {
      const definitionen: BadgeDefinition[] = erstelleBadgeDefinitionen(struktur, 'x');
      return definitionen.length;
    };
    expect(anzahl(plan('app', [7, 4, 4, 6, 4]))).toBe(18);
    expect(anzahl(plan('pla', [7, 4, 4, 5, 6, 7]))).toBe(19);
    expect(anzahl(plan('med', [4, 4, 4, 4, 4, 4]))).toBe(19);
  });
});

describe('R-M1 / N-05 – Bbc readiness', () => {
  it('falls back to the competence modules when a Leistungsziel has no learning locations', () => {
    const struktur = plan('p', [1]);
    struktur.kompetenzen[0].moduleBasislehrjahr = ['123: Modul im Basislehrjahr'];
    const index = indexierePlan(struktur);
    const stati = meilensteinStati([]);

    expect(meilensteinBereitschaft('BBC', index, stufen({}), stati, 0)).toBe(
      '0 von 3 Leistungszielen mit Lernort Basislehrjahr mindestens erklärt.',
    );

    const teilweise = stufen({ [index.aktiveLeistungszielIds[0]]: 1 });
    expect(meilensteinBereitschaft('BBC', index, teilweise, stati, 0)).toBe(
      '1 von 3 Leistungszielen mit Lernort Basislehrjahr mindestens erklärt.',
    );
  });

  it('does not fall back when the Leistungsziel explicitly has no Basislehrjahr location', () => {
    const struktur = plan('p', [1]);
    struktur.kompetenzen[0].moduleBasislehrjahr = ['123: Modul im Basislehrjahr'];
    for (const ziel of struktur.leistungsziele) {
      ziel.lernorte = { basislehrjahr: [], berufsfachschule: ['456: BFS'], uek: [] };
    }
    const index = indexierePlan(struktur);
    const stati = meilensteinStati([]);

    // An explicit empty list means "not taught in the Basislehrjahr", so no objective
    // counts towards the Basismeilenstein (N-05).
    expect(meilensteinBereitschaft('BBC', index, stufen({}), stati, 0)).toBe(
      'Die Praxisbildnerin / der Praxisbildner bestätigt den Basismeilenstein.',
    );
  });

  it('counts only objectives with an explicit Basislehrjahr location or a null record', () => {
    const struktur = plan('p', [1]);
    struktur.kompetenzen[0].moduleBasislehrjahr = ['123: Modul im Basislehrjahr'];
    // The first objective has an explicit Basislehrjahr module …
    struktur.leistungsziele[0].lernorte = {
      basislehrjahr: ['123'],
      berufsfachschule: [],
      uek: [],
    };
    // … the second is only taught at the Berufsfachschule …
    struktur.leistungsziele[1].lernorte = {
      basislehrjahr: [],
      berufsfachschule: ['456'],
      uek: [],
    };
    // … and the third has no record at all and therefore inherits the competence modules.
    struktur.leistungsziele[2].lernorte = null;
    const index = indexierePlan(struktur);
    const stati = meilensteinStati([]);

    expect(meilensteinBereitschaft('BBC', index, stufen({}), stati, 0)).toBe(
      '0 von 2 Leistungszielen mit Lernort Basislehrjahr mindestens erklärt.',
    );
  });
});

describe('R-B4 / D-025 – milestone, count and all-competences badges', () => {
  it('awards a milestone badge only while the milestone is reached', () => {
    const struktur = plan('app', [1]);
    const index = indexierePlan(struktur);
    const definitionen = erstelleBadgeDefinitionen(struktur, 'app');
    const ereignisse: MeilensteinEreignis[] = [
      {
        id: 'ms-1',
        ausbildungId: 'az-1',
        meilenstein: 'BBC',
        aktion: 'ERREICHT',
        akteurId: 'pb-1',
        zeitpunkt: '2026-02-01T08:00:00.000Z',
      },
    ];

    const ohne = berechneBadgeVergaben(definitionen, index, [], 'az-1');
    expect(ohne.some((vergabe) => vergabe.badgeId === 'app:M-BBC')).toBe(false);

    const mit = berechneBadgeVergaben(definitionen, index, [], 'az-1', 'DREI_STUFEN', ereignisse);
    const badge = mit.find((vergabe) => vergabe.badgeId === 'app:M-BBC');
    expect(badge?.aktiv).toBe(true);
    expect(badge?.vergebenAm).toBe('2026-02-01T08:00:00.000Z');

    const ruecknahme: MeilensteinEreignis[] = [
      ...ereignisse,
      {
        id: 'ms-2',
        ausbildungId: 'az-1',
        meilenstein: 'BBC',
        aktion: 'ZURUECKGENOMMEN',
        akteurId: 'pb-1',
        zeitpunkt: '2026-02-02T08:00:00.000Z',
        begruendung: 'Irrtum, bitte zurücknehmen.',
        refEreignisId: 'ms-1',
      },
    ];
    const inaktiv = berechneBadgeVergaben(
      definitionen,
      index,
      [],
      'az-1',
      'DREI_STUFEN',
      ruecknahme,
    ).find((vergabe) => vergabe.badgeId === 'app:M-BBC');
    expect(inaktiv?.aktiv).toBe(false);
    expect(inaktiv?.inaktivSeit).toBe('2026-02-02T08:00:00.000Z');
  });

  it('awards the 5/10/15 badges by completed competences, not by objectives', () => {
    const struktur = plan('app', [16]);
    const index = indexierePlan(struktur);
    const definitionen = erstelleBadgeDefinitionen(struktur, 'app');
    const kompetenzen = [...index.kompetenzNachId.values()];
    // Four competences are complete (12 objectives); a fifth has every objective at stage 2.
    const verlauf = [
      ...kompetenzen
        .slice(0, 4)
        .flatMap((kompetenz, position) =>
          kompetenz.leistungszielIds.map((zielId, zielIndex) =>
            ereignis(
              `v${position}-${zielIndex}`,
              zielId,
              3,
              'BESTAETIGT',
              '2026-01-02T08:00:00.000Z',
            ),
          ),
        ),
      ...kompetenzen[4].leistungszielIds.map((zielId, zielIndex) =>
        ereignis(`t${zielIndex}`, zielId, 2, 'BESTAETIGT', '2026-01-02T08:00:00.000Z'),
      ),
    ];

    // 15 confirmed objectives would pass a threshold of 5 objectives; only 4 competences are complete.
    const vergaben = berechneBadgeVergaben(definitionen, index, verlauf, 'az-1');
    expect(vergaben.some((vergabe) => vergabe.badgeId === 'app:K3-5' && vergabe.aktiv)).toBe(false);

    const fuenf = definitionen.find((definition) => definition.code === 'K3-5');
    if (!fuenf) {
      throw new Error('Expected badge K3-5 in the generated definitions.');
    }
    // Progress is measured against the badge threshold, not against the 16 competences of the plan.
    const offen = badgeBedingung(fuenf, index, stufenMap(verlauf));
    expect(offen).toEqual({ erfuellt: false, aktuell: 4, gesamt: 5 });
    expect(badgeFortschrittText(fuenf, offen)).toBe('4 von 5 nötigen Kompetenzen selbständig');

    const komplett = [
      ...verlauf,
      ...kompetenzen[4].leistungszielIds.map((zielId, zielIndex) =>
        ereignis(`w${zielIndex}`, zielId, 3, 'BESTAETIGT', '2026-01-03T08:00:00.000Z'),
      ),
    ];
    const danach = berechneBadgeVergaben(definitionen, index, komplett, 'az-1');
    expect(danach.find((vergabe) => vergabe.badgeId === 'app:K3-5')?.aktiv).toBe(true);
    expect(danach.some((vergabe) => vergabe.badgeId === 'app:K3-10' && vergabe.aktiv)).toBe(false);
    // The all-competences badge is never awarded while one competence is still open.
    expect(danach.some((vergabe) => vergabe.badgeId === 'app:K-ALLE' && vergabe.aktiv)).toBe(false);
  });

  it('replays stage and milestone events in chronological order regardless of array order', () => {
    const struktur = plan('app', [1]);
    const index = indexierePlan(struktur);
    const definitionen = erstelleBadgeDefinitionen(struktur, 'app');
    const frueh = {
      id: 'm-frueh',
      ausbildungId: 'az-1',
      meilenstein: 'BBC',
      aktion: 'ERREICHT',
      akteurId: 'pb-1',
      zeitpunkt: '2026-01-01T08:00:00.000Z',
    } satisfies MeilensteinEreignis;
    const spaet = {
      id: 'm-spaet',
      ausbildungId: 'az-1',
      meilenstein: 'IPA',
      aktion: 'ERREICHT',
      akteurId: 'pb-1',
      zeitpunkt: '2026-05-01T08:00:00.000Z',
    } satisfies MeilensteinEreignis;
    const stufenEreignisse = [
      ereignis('s1', index.aktiveLeistungszielIds[0], 3, 'BESTAETIGT', '2026-03-01T08:00:00.000Z'),
    ];

    const vergaben = berechneBadgeVergaben(
      definitionen,
      index,
      stufenEreignisse,
      'az-1',
      'DREI_STUFEN',
      [spaet, frueh],
    );

    expect(vergaben.find((vergabe) => vergabe.badgeId === 'app:M-BBC')?.vergebenAm).toBe(
      frueh.zeitpunkt,
    );
    expect(vergaben.find((vergabe) => vergabe.badgeId === 'app:M-IPA')?.vergebenAm).toBe(
      spaet.zeitpunkt,
    );
  });

  it('deactivates the all-competences badge when a confirmation is withdrawn', () => {
    const struktur = plan('app', [1]);
    const index = indexierePlan(struktur);
    const ziele = index.aktiveLeistungszielIds;
    const definitionen = erstelleBadgeDefinitionen(struktur, 'app');
    const verlauf: Stufenereignis[] = [
      ...ziele.map((ziel, position) =>
        ereignis(`v${position}`, ziel, 3, 'BESTAETIGT', `2026-01-0${position + 2}T08:00:00.000Z`),
      ),
      ereignis('r', ziele[0], 3, 'ZURUECKGENOMMEN', '2026-01-09T08:00:00.000Z', 'v0'),
    ];

    const vergaben = berechneBadgeVergaben(definitionen, index, verlauf, 'az-1');
    expect(vergaben.find((vergabe) => vergabe.badgeId === 'app:K-ALLE')?.aktiv).toBe(false);
    expect(vergaben.find((vergabe) => vergabe.badgeId === 'app:BA-A')?.aktiv).toBe(false);
  });

  it('omits count thresholds that a small plan can never reach', () => {
    const definitionen = erstelleBadgeDefinitionen(plan('app', [1]), 'app');
    expect(definitionen.some((definition) => definition.regeltyp === 'KOMPETENZ_ANZAHL')).toBe(
      false,
    );
    expect(definitionen.some((definition) => definition.code === 'K-ALLE')).toBe(true);
  });
});

describe('S-A01 / R-S3 – apprenticeship year and assignment validity', () => {
  it('computes the apprenticeship year and caps it at the duration', () => {
    expect(berechneLehrjahr('2023-08-01', new Date('2026-11-03T00:00:00Z'), 4)).toBe(4);
    expect(berechneLehrjahr('2026-08-03', new Date('2026-11-03T00:00:00Z'), 4)).toBe(1);
    expect(berechneLehrjahr('2023-08-01', new Date('2026-07-31T00:00:00Z'), 4)).toBe(3);
  });

  it('accepts only currently valid assignments', () => {
    const zuordnung = {
      id: 'z1',
      ausbildungId: 'az-1',
      praxisbildnerId: 'pb-1',
      gueltigVon: '2025-08-01',
      gueltigBis: '2026-07-31',
    };
    expect(istZuordnungGueltig(zuordnung, new Date('2026-03-01T00:00:00Z'))).toBe(true);
    expect(istZuordnungGueltig(zuordnung, new Date('2026-11-03T00:00:00Z'))).toBe(false);
  });
});

describe('D-022 – binary stage model', () => {
  it('treats every confirmation as completed and keeps open objectives at zero', () => {
    const verlauf = [
      ereignis('b1', 'a1.1', 1, 'BESTAETIGT', '2026-01-01T08:00:00.000Z'),
      ereignis('b2', 'a1.2', 2, 'BESTAETIGT', '2026-01-02T08:00:00.000Z'),
      ereignis('b3', 'a1.3', 3, 'BESTAETIGT', '2026-01-03T08:00:00.000Z'),
    ];

    const binaer = stufenMapFuerModell(verlauf, 'BINAER');
    expect(binaer.get('a1.1')).toBe(3);
    expect(binaer.get('a1.2')).toBe(3);
    expect(binaer.get('a1.3')).toBe(3);
    expect(binaer.get('a1.4')).toBeUndefined();
    expect(stufenMapFuerModell(verlauf, 'DREI_STUFEN').get('a1.1')).toBe(1);
  });

  it('uses completion wording in badge definitions and progress texts', () => {
    const struktur = plan('p', [1]);
    const definitionen = erstelleBadgeDefinitionen(struktur, 'p', 'BINAER');
    const meilenstein = definitionen.find((definition) => definition.code === 'M-IPA');
    const bereich = definitionen.find((definition) => definition.code === 'BA-A');
    expect(meilenstein?.titel).toBe('Bachelorarbeit erreicht');
    expect(bereich?.kriterium).toContain('abgeschlossen');

    const bedingung = { erfuellt: false, aktuell: 1, gesamt: 3 };
    expect(badgeFortschrittText(bereich!, bedingung, 'BINAER')).toBe(
      '1 von 3 Leistungszielen abgeschlossen',
    );
    expect(badgeFortschrittText(bereich!, bedingung)).toBe('1 von 3 Leistungszielen selbständig');
    expect(badgeFortschrittText(meilenstein!, { erfuellt: false, aktuell: 0, gesamt: 1 })).toBe(
      'Meilenstein noch nicht erreicht',
    );
  });

  it('awards the area badge only when every objective of the area is completed', () => {
    const struktur = plan('p', [1]);
    const index = indexierePlan(struktur);
    const definitionen = erstelleBadgeDefinitionen(struktur, 'p', 'BINAER');
    const [erstesZiel, zweitesZiel, drittesZiel] = index.aktiveLeistungszielIds;

    const teilweise = berechneBadgeVergaben(
      definitionen,
      index,
      [ereignis('b1', erstesZiel, 1, 'BESTAETIGT', '2026-01-01T08:00:00.000Z')],
      'az-1',
      'BINAER',
    );
    expect(teilweise.some((vergabe) => vergabe.badgeId === 'p:BA-A' && vergabe.aktiv)).toBe(false);

    const alle = berechneBadgeVergaben(
      definitionen,
      index,
      [
        ereignis('b1', erstesZiel, 1, 'BESTAETIGT', '2026-01-01T08:00:00.000Z'),
        ereignis('b2', zweitesZiel, 3, 'BESTAETIGT', '2026-01-02T08:00:00.000Z'),
        ereignis('b3', drittesZiel, 3, 'BESTAETIGT', '2026-01-03T08:00:00.000Z'),
      ],
      'az-1',
      'BINAER',
    );
    expect(alle.find((vergabe) => vergabe.badgeId === 'p:BA-A')?.aktiv).toBe(true);
    // D-025: per-competence and area-started badges are no longer generated.
    expect(definitionen.some((definition) => definition.code.startsWith('KS-'))).toBe(false);
    expect(definitionen.some((definition) => definition.code.startsWith('BG-'))).toBe(false);
  });

  it('reports milestone readiness as completed objectives', () => {
    const struktur = plan('p', [1]);
    struktur.kompetenzen[0].moduleBasislehrjahr = ['M1'];
    const index = indexierePlan(struktur);
    const [erstesZiel, zweitesZiel] = index.aktiveLeistungszielIds;
    const stufen = stufenMapFuerModell(
      [
        ereignis('b1', erstesZiel, 1, 'BESTAETIGT', '2026-01-01T08:00:00.000Z'),
        ereignis('b2', zweitesZiel, 3, 'BESTAETIGT', '2026-01-02T08:00:00.000Z'),
      ],
      'BINAER',
    );
    const stati = meilensteinStati([]);

    expect(meilensteinBereitschaft('BBC', index, stufen, stati, 33, 'BINAER')).toBe(
      '2 von 3 Leistungszielen mit Lernort Basislehrjahr abgeschlossen.',
    );
  });
});
