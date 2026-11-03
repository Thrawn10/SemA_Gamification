#!/usr/bin/env node
// Converts the official Bildungsplan workbooks into the VorlageImport JSON shape
// (SPEC 7.3). The MED plan only exists as a PDF; its JSON is the cleaned
// transcription from SPEC appendix C and is copied into the output folder.
//
// Usage: node tools/bildungsplan-import.mjs [--quelle <dir>] [--ziel <dir>] [--nur inf-app,inf-pla]
// Default source: the parent folder of this repository (where the official files live).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leseArbeitsmappe, leseSharedStrings, leseTabelle, leseZip } from './xlsx-lesen.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const projektWurzel = resolve(hier, '..');

const VORLAGEN = [
  {
    schluessel: 'inf-app',
    datei: 'Vorlage_Bildungsplan APP 2021 (1).xlsx',
    ausgabe: 'vorlage-inf-app-2021.json',
    lehrberuf: {
      code: 'INF-APP',
      name: 'Informatiker/in EFZ',
      fachrichtung: 'Applikationsentwicklung',
      lehrdauerJahre: 4,
    },
    bildungsplanJahr: 2021,
    kontrolle: { bereiche: 5, kompetenzen: 25, leistungsziele: 145 },
  },
  {
    schluessel: 'inf-pla',
    datei: 'Vorlage_Bildungsplan PLA 2021 (1).xlsx',
    ausgabe: 'vorlage-inf-pla-2021.json',
    lehrberuf: {
      code: 'INF-PLA',
      name: 'Informatiker/in EFZ',
      fachrichtung: 'Plattformentwicklung',
      lehrdauerJahre: 4,
    },
    bildungsplanJahr: 2021,
    kontrolle: { bereiche: 6, kompetenzen: 33, leistungsziele: 177 },
  },
  {
    schluessel: 'edb',
    datei: 'Vorlage_Bildungsplan EdB 2024.xlsx',
    ausgabe: 'vorlage-edb-2024.json',
    lehrberuf: {
      code: 'EDB',
      name: 'Entwickler/in digitales Business EFZ',
      fachrichtung: null,
      lehrdauerJahre: 4,
    },
    bildungsplanJahr: 2024,
    kontrolle: { bereiche: 5, kompetenzen: 28, leistungsziele: 136 },
    annahmen: [
      'lehrdauerJahre steht nicht in der Quelle; 4 Jahre angenommen (EFZ-Standard).',
      'bildungsplanJahr aus dem Dateinamen übernommen.',
    ],
  },
];

const MED_QUELLE = join(projektWurzel, 'public', 'vorlagen', 'vorlage-med.json');
const MED_AUSGABE = 'vorlage-med-2019.json';
const MED_DATEI = 'MED_BiPla_LZK_2019 (1) (1).pdf';

function argumente() {
  const werte = new Map();
  for (let index = 0; index < process.argv.length - 1; index++) {
    const argument = process.argv[index];
    if (argument.startsWith('--')) {
      werte.set(argument.slice(2), process.argv[index + 1]);
    }
  }
  return werte;
}

function zeilenMap(tabelle) {
  return new Map(tabelle.zeilen.map((zeile) => [zeile.nummer, zeile.zellen]));
}

function zelle(karte, zeile, spalte) {
  return String(karte.get(zeile)?.[spalte] ?? '').trim();
}

/** Common prefixes/compounds that must keep their hyphen. */
const HYPHEN_PREFIXE = new Set([
  'agile',
  'api',
  'back',
  'business',
  'cloud',
  'content',
  'co',
  'cross',
  'crm',
  'cms',
  'data',
  'design',
  'digital',
  'e',
  'end',
  'erp',
  'finance',
  'front',
  'full',
  'hardware',
  'hr',
  'html',
  'http',
  'https',
  'ict',
  'it',
  'json',
  'know',
  'kpi',
  'lan',
  'lean',
  'legal',
  'low',
  'make',
  'marketing',
  'media',
  'multi',
  'network',
  'nicht',
  'no',
  'non',
  'online',
  'open',
  'os',
  'post',
  'pre',
  'privacy',
  're',
  'real',
  'sales',
  'scrum',
  'security',
  'self',
  'semi',
  'social',
  'software',
  'sql',
  'start',
  'state',
  'sub',
  'super',
  'system',
  'time',
  'ui',
  'ux',
  'user',
  'vpn',
  'web',
  'wlan',
  'xml',
]);

function korrigiereTrennstriche(text) {
  return text.replace(/[A-Za-zÄÖÜäöüß]+(?:-[A-Za-zÄÖÜäöüß]+)+/g, (wort) => {
    const teile = wort.split('-');
    let ergebnis = teile[0];
    for (let index = 1; index < teile.length; index++) {
      const links = teile[index - 1].toLowerCase();
      const rechts = teile[index];
      const behalten = /^[A-ZÄÖÜ]/.test(rechts) || HYPHEN_PREFIXE.has(links);
      ergebnis += `${behalten ? '-' : ''}${rechts}`;
    }
    return ergebnis;
  });
}

/** Removes Word artefacts, soft hyphens and line-break hyphenation. */
function bereinigeText(wert) {
  return String(wert)
    .replace(/_x[0-9A-Fa-f]{4}_/g, '')
    .replace(/\u00ad/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/([a-zäöüß])-\s*\n\s*([a-zäöüß])/g, '$1$2')
    .replace(/\n+/g, ' ')
    .replace(/([A-Za-zÄÖÜäöüß])-und\b/g, '$1- und')
    .replace(/[A-Za-zÄÖÜäöüß]+(?:-[A-Za-zÄÖÜäöüß]+)+/g, (wort) => korrigiereTrennstriche(wort))
    .replace(/\/\s+/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function leseTaxonomie(blaetter, dateien, sharedStrings) {
  const blatt = blaetter.get('ERKLÄRUNG');
  if (!blatt) {
    throw new Error('Das Blatt «Erklärung» fehlt; die Taxonomie kann nicht zugeordnet werden.');
  }
  const karte = zeilenMap(leseTabelle(dateien, blatt.pfad, sharedStrings));
  const zuordnung = new Map();
  for (let zeile = 4; zeile <= 12; zeile++) {
    const stufe = zelle(karte, zeile, 0).toUpperCase();
    const begriff = zelle(karte, zeile, 1).toLowerCase();
    if (/^K[1-6]$/.test(stufe) && begriff) {
      zuordnung.set(begriff, stufe);
    }
  }
  return zuordnung;
}

function ermittleTaxonomie(rohwert, text, zuordnung, ort, warnungen) {
  const roh = rohwert.trim();
  const direkt = /\(\s*K\s*([1-6])\s*\)|^K\s*([1-6])$/i.exec(roh);
  if (direkt) {
    return `K${direkt[1] ?? direkt[2]}`;
  }

  const begriff = roh.replace(/[()]/g, '').replace(/[.,;]/g, '').trim().toLowerCase();
  const ausTabelle = zuordnung.get(begriff);
  if (ausTabelle) {
    return ausTabelle;
  }

  const imText = /\(\s*K\s*([1-6])\s*\)/i.exec(text);
  if (imText) {
    warnungen.push({
      ort,
      meldung: `Taxonomie in Spalte B fehlt oder ist unbekannt (${JSON.stringify(roh)}); (K${imText[1]}) aus dem Text übernommen.`,
    });
    return `K${imText[1]}`;
  }

  throw new Error(`${ort}: Taxonomie ${JSON.stringify(roh)} ist nicht bekannt.`);
}

function leseStart(blaetter, dateien, sharedStrings) {
  const blatt = blaetter.get('START');
  if (!blatt) {
    throw new Error('Das Blatt «Start» fehlt.');
  }
  const tabelle = leseTabelle(dateien, blatt.pfad, sharedStrings);
  const karte = zeilenMap(tabelle);
  const titel = bereinigeText(zelle(karte, 1, 0));
  const fachrichtung = bereinigeText(zelle(karte, 1, 6).replace(/^Fachrichtung\s*/i, ''));

  const bereiche = [];
  for (let zeile = 7; zeile <= 100; zeile++) {
    const code = zelle(karte, zeile, 0);
    if (!/^[A-Za-z]$/.test(code)) {
      break;
    }
    const bereich = {
      code: code.toUpperCase(),
      titel: bereinigeText(zelle(karte, zeile, 1)),
      kompetenzen: [],
    };
    for (let spalte = 2; spalte < tabelle.spalten; spalte++) {
      const wert = zelle(karte, zeile, spalte);
      if (!wert) {
        break;
      }
      const treffer = /^([a-z]\d+)\s*:\s*([\s\S]*)$/i.exec(wert);
      if (!treffer) {
        throw new Error(
          `Start, Zeile ${zeile}, Spalte ${spalte + 1}: «${wert}» ist keine Kompetenz.`,
        );
      }
      bereich.kompetenzen.push({
        code: treffer[1].toLowerCase(),
        titel: bereinigeText(treffer[2]),
      });
    }
    bereiche.push(bereich);
  }
  return { titel, fachrichtung, bereiche };
}

function leseKompetenz(blatt, dateien, sharedStrings, startKompetenz, taxonomie, warnungen) {
  const tabelle = leseTabelle(dateien, blatt.pfad, sharedStrings);
  const karte = zeilenMap(tabelle);
  const ort = `Blatt ${blatt.name}`;

  const rohTitel = zelle(karte, 2, 0);
  const titelOhneCode = bereinigeText(rohTitel.replace(/^[a-z]\d+\s*[:.]\s*/i, ''));
  const beschreibung = bereinigeText(zelle(karte, 3, 0));
  const titel = startKompetenz.titel || titelOhneCode;
  const vergleich = (wert) => wert.toLowerCase().replace(/[^a-z0-9äöüß]+/g, '');
  if (titelOhneCode && vergleich(titelOhneCode) !== vergleich(titel)) {
    warnungen.push({
      ort,
      meldung: `Titel in A2 «${titelOhneCode}» weicht von «Start» «${titel}» ab; «Start» wird verwendet.`,
    });
  }
  if (!beschreibung) {
    warnungen.push({ ort, meldung: 'Beschreibung (A3) ist leer.' });
  }

  const module = { basislehrjahr: [], berufsfachschule: [], uek: [] };
  const leistungsziele = [];
  const gesehen = new Map();
  let eintraege = 0;

  const zeilen = [...karte.keys()].filter((nummer) => nummer >= 8).sort((a, b) => a - b);
  for (const zeile of zeilen) {
    const roh = zelle(karte, zeile, 0);
    if (!roh) {
      continue;
    }
    const treffer = /^((?:[a-z])?\d+\.\d+)\s*([\s\S]*)$/i.exec(roh);
    if (!treffer) {
      warnungen.push({
        ort: `${ort}, Zeile ${zeile}`,
        meldung: `«${roh.slice(0, 60)}» ist kein Leistungsziel und wurde übersprungen.`,
      });
      continue;
    }
    eintraege++;

    let code = treffer[1].toLowerCase();
    if (!/^[a-z]/.test(code)) {
      const praefix = startKompetenz.code[0];
      warnungen.push({
        ort: `${ort}, Zeile ${zeile}`,
        meldung: `Code ${treffer[1]} ohne Buchstabenpräfix; als ${praefix}${code} übernommen.`,
      });
      code = `${praefix}${code}`;
    }

    const text = bereinigeText(treffer[2].replace(/^[\s:.]+/, ''));
    if (!text) {
      throw new Error(`${ort}, Zeile ${zeile}: Leistungsziel ${code} hat keinen Text.`);
    }

    const taxonomieWert = ermittleTaxonomie(
      zelle(karte, zeile, 1),
      text,
      taxonomie,
      `${ort}, Zeile ${zeile}`,
      warnungen,
    );
    const taxonomieImText = /\(\s*K\s*([1-6])\s*\)/i.exec(text)?.[1];
    if (taxonomieImText && taxonomieWert !== `K${taxonomieImText}`) {
      warnungen.push({
        ort: `${ort}, Zeile ${zeile}`,
        meldung: `Taxonomie Spalte B (${taxonomieWert}) weicht von (K${taxonomieImText}) im Text ab; Spalte B gilt.`,
      });
    }

    const vorhanden = gesehen.get(code);
    if (vorhanden) {
      if (vorhanden.text !== text) {
        throw new Error(
          `${ort}, Zeile ${zeile}: ${code} kommt mit unterschiedlichem Text mehrfach vor.`,
        );
      }
      warnungen.push({
        ort: `${ort}, Zeile ${zeile}`,
        meldung: `Doppelter Eintrag ${code} zusammengeführt.`,
      });
      continue;
    }
    const ziel = { code, text, taxonomie: taxonomieWert };
    gesehen.set(code, ziel);
    leistungsziele.push(ziel);
  }

  // The workbooks store the Basislehrjahr module number in columns C-E
  // ("Erklärt", "Geübt", "Selbständig"). Columns F-H carry the module lists for
  // Basislehrjahr, Berufsfachschule and ÜK respectively. See the import guide.
  for (const zeile of zeilen) {
    for (const spalte of [2, 3, 4]) {
      const wert = zelle(karte, zeile, spalte);
      if (!wert) {
        continue;
      }
      if (/^\d{1,4}$/.test(wert) && !module.basislehrjahr.includes(wert)) {
        module.basislehrjahr.push(wert);
      } else if (/^\d{1,4}$/.test(wert) === false) {
        warnungen.push({
          ort: `${ort}, Zeile ${zeile}, Spalte ${spalte + 1}`,
          meldung: `«${wert}» ist keine Modulnummer und wurde nicht übernommen.`,
        });
      }
    }
    for (const [spalte, lernort] of [
      [5, 'basislehrjahr'],
      [6, 'berufsfachschule'],
      [7, 'uek'],
    ]) {
      const wert = zelle(karte, zeile, spalte);
      if (!wert) {
        continue;
      }
      for (const teil of wert.split(/\r?\n/)) {
        const modul = bereinigeText(teil);
        if (modul && !module[lernort].includes(modul)) {
          module[lernort].push(modul);
        }
      }
    }
  }

  return {
    code: startKompetenz.code,
    titel,
    beschreibung,
    module,
    leistungsziele,
    eintraege,
  };
}

async function konvertiere(vorlage, quelle, ziel, meldungen) {
  const pfad = join(quelle, vorlage.datei);
  const dateien = leseZip(pfad);
  const sharedStrings = leseSharedStrings(dateien);
  const blaetter = new Map(
    leseArbeitsmappe(dateien).map((blatt) => [blatt.name.toUpperCase(), blatt]),
  );
  const start = leseStart(blaetter, dateien, sharedStrings);
  const taxonomie = leseTaxonomie(blaetter, dateien, sharedStrings);
  const warnungen = [];

  if (start.fachrichtung && start.fachrichtung !== vorlage.lehrberuf.fachrichtung) {
    warnungen.push({
      ort: 'Blatt Start',
      meldung: `Fachrichtung «${start.fachrichtung}» aus G1 weicht von der Konfiguration ab.`,
    });
  }

  const bereiche = [];
  let eintraege = 0;
  for (const startBereich of start.bereiche) {
    const bereich = { code: startBereich.code, titel: startBereich.titel, kompetenzen: [] };
    for (const startKompetenz of startBereich.kompetenzen) {
      const blatt = blaetter.get(startKompetenz.code.toUpperCase());
      if (!blatt) {
        throw new Error(`Kompetenz ${startKompetenz.code} steht auf «Start», hat aber kein Blatt.`);
      }
      const kompetenz = leseKompetenz(
        blatt,
        dateien,
        sharedStrings,
        startKompetenz,
        taxonomie,
        warnungen,
      );
      eintraege += kompetenz.eintraege;
      bereich.kompetenzen.push({
        code: kompetenz.code,
        titel: kompetenz.titel,
        beschreibung: kompetenz.beschreibung,
        module: kompetenz.module,
        leistungsziele: kompetenz.leistungsziele,
      });
    }
    bereiche.push(bereich);
  }

  const kompetenzen = bereiche.reduce((summe, bereich) => summe + bereich.kompetenzen.length, 0);
  const leistungsziele = bereiche.reduce(
    (summe, bereich) =>
      summe +
      bereich.kompetenzen.reduce(
        (anzahl, kompetenz) => anzahl + kompetenz.leistungsziele.length,
        0,
      ),
    0,
  );

  const erwartet = vorlage.kontrolle;
  if (erwartet) {
    const abweichungen = [];
    if (erwartet.bereiche !== undefined && bereiche.length !== erwartet.bereiche) {
      abweichungen.push(`${bereiche.length} Bereiche statt ${erwartet.bereiche}`);
    }
    if (erwartet.kompetenzen !== undefined && kompetenzen !== erwartet.kompetenzen) {
      abweichungen.push(`${kompetenzen} Kompetenzen statt ${erwartet.kompetenzen}`);
    }
    if (erwartet.leistungsziele !== undefined && leistungsziele !== erwartet.leistungsziele) {
      abweichungen.push(`${leistungsziele} Leistungsziele statt ${erwartet.leistungsziele}`);
    }
    if (abweichungen.length) {
      throw new Error(`${vorlage.lehrberuf.code}: ${abweichungen.join(', ')}.`);
    }
  }

  const json = {
    lehrberuf: {
      ...vorlage.lehrberuf,
      fachrichtung: start.fachrichtung || vorlage.lehrberuf.fachrichtung,
    },
    bildungsplanJahr: vorlage.bildungsplanJahr,
    version: 1,
    quelle: vorlage.datei,
    bereiche,
  };

  await writeFile(join(ziel, vorlage.ausgabe), `${JSON.stringify(json, null, 2)}\n`, 'utf8');

  for (const warnung of warnungen) {
    meldungen.push({ vorlage: vorlage.lehrberuf.code, ...warnung });
  }
  const offeneBfs = bereiche.flatMap((bereich) =>
    bereich.kompetenzen
      .filter((kompetenz) => kompetenz.module.berufsfachschule.length === 0)
      .map((kompetenz) => kompetenz.code),
  );

  return {
    code: vorlage.lehrberuf.code,
    quelle: vorlage.datei,
    ausgabe: vorlage.ausgabe,
    bereiche: bereiche.length,
    kompetenzen,
    leistungsziele,
    eintraege,
    warnungen: warnungen.length,
    bfsOhneModul: offeneBfs.length,
    bfsOhneModulKompetenzen: offeneBfs,
    annahmen: vorlage.annahmen ?? [],
  };
}

async function kopiereMed(ziel, meldungen) {
  const inhalt = JSON.parse(await readFile(MED_QUELLE, 'utf8'));
  inhalt.quelle = MED_DATEI;
  await writeFile(join(ziel, MED_AUSGABE), `${JSON.stringify(inhalt, null, 2)}\n`, 'utf8');
  const kompetenzen = inhalt.bereiche.reduce(
    (summe, bereich) => summe + bereich.kompetenzen.length,
    0,
  );
  const leistungsziele = inhalt.bereiche.reduce(
    (summe, bereich) =>
      summe +
      bereich.kompetenzen.reduce(
        (anzahl, kompetenz) => anzahl + kompetenz.leistungsziele.length,
        0,
      ),
    0,
  );
  meldungen.push({
    vorlage: 'MED',
    ort: MED_DATEI,
    meldung:
      'PDF-Quelle: JSON ist die bereinigte Transkription aus SPEC Anhang C (158 Leistungsziele) und wurde gegen den PDF-Text geprüft.',
  });
  return {
    code: 'MED',
    quelle: MED_DATEI,
    ausgabe: MED_AUSGABE,
    bereiche: inhalt.bereiche.length,
    kompetenzen,
    leistungsziele,
    eintraege: leistungsziele,
    warnungen: 0,
    bfsOhneModul: 0,
    bfsOhneModulKompetenzen: [],
    annahmen: [
      'PDF-Parsing ist nicht automatisiert; die Transkription aus Anhang C wird verwendet.',
    ],
  };
}

const werte = argumente();
const quelle = resolve(werte.get('quelle') ?? join(projektWurzel, '..'));
const ziel = resolve(werte.get('ziel') ?? join(projektWurzel, 'fixtures', 'bildungsplaene'));
const nur = werte
  .get('nur')
  ?.split(',')
  .map((eintrag) => eintrag.trim())
  .filter(Boolean);

await mkdir(ziel, { recursive: true });
const meldungen = [];
const bericht = { vorlagen: [] };

for (const vorlage of VORLAGEN) {
  if (nur && !nur.includes(vorlage.schluessel)) {
    continue;
  }
  const ergebnis = await konvertiere(vorlage, quelle, ziel, meldungen);
  bericht.vorlagen.push(ergebnis);
  console.log(
    `${ergebnis.code}: ${ergebnis.bereiche} Bereiche, ${ergebnis.kompetenzen} Kompetenzen, ${ergebnis.leistungsziele} Leistungsziele (${ergebnis.eintraege} Einträge), ${ergebnis.warnungen} Warnungen.`,
  );
}

if (!nur || nur.includes('med')) {
  bericht.vorlagen.push(await kopiereMed(ziel, meldungen));
  console.log('MED: JSON aus Anhang C übernommen (PDF-Transkription).');
}

await writeFile(
  join(ziel, 'bericht.json'),
  `${JSON.stringify({ ...bericht, meldungen }, null, 2)}\n`,
  'utf8',
);

for (const meldung of meldungen.slice(0, 20)) {
  console.warn(`${meldung.vorlage} · ${meldung.ort}: ${meldung.meldung}`);
}
if (meldungen.length > 20) {
  console.warn(`… ${meldungen.length - 20} weitere Meldungen in bericht.json.`);
}
console.log(`Fertig: ${bericht.vorlagen.length} Vorlagen in ${ziel}.`);
