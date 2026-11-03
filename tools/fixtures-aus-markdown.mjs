#!/usr/bin/env node
// Generates the three template JSON files (APP, PLA, MED) from the appendices of
// docs/spec/SPEC.md. See SPEC chapter 7.4. The script aborts when the documented
// control numbers (areas, competences, Leistungsziele) do not match.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const specPath = join(root, 'docs', 'spec', 'SPEC.md');
const outDirs = [join(root, 'public', 'vorlagen'), join(root, 'fixtures')];

const nachAnhang = {
  'INF-APP': {
    datei: 'vorlage-inf-app.json',
    name: 'Informatiker/in EFZ',
    fachrichtung: 'Applikationsentwicklung',
    bildungsplanJahr: 2021,
  },
  'INF-PLA': {
    datei: 'vorlage-inf-pla.json',
    name: 'Informatiker/in EFZ',
    fachrichtung: 'Plattformentwicklung',
    bildungsplanJahr: 2021,
  },
  MED: {
    datei: 'vorlage-med.json',
    name: 'Mediamatiker/in EFZ',
    fachrichtung: null,
    bildungsplanJahr: 2018,
  },
};

const warnungen = [];

function leerModule() {
  return { basislehrjahr: [], berufsfachschule: [], uek: [] };
}

function parseModule(zeile, kompetenzCode) {
  const module = leerModule();
  const rest = zeile.replace(/^Module \(pro Kompetenz\):\s*/, '').trim();
  if (!rest || rest === 'keine') {
    return module;
  }
  for (const teil of rest.split('|')) {
    const treffer = /^(Basislehrjahr|Berufsfachschule|ÜK|Uek|UEK)\s*:\s*(.*)$/.exec(teil.trim());
    if (!treffer) {
      warnungen.push(`${kompetenzCode}: unbekannter Modulort «${teil.trim()}»`);
      continue;
    }
    const ort = treffer[1];
    const werte = treffer[2]
      .split(';')
      .map((eintrag) => eintrag.trim())
      .filter(Boolean);
    if (ort === 'Basislehrjahr') {
      module.basislehrjahr.push(...werte);
    } else if (ort === 'Berufsfachschule') {
      module.berufsfachschule.push(...werte);
    } else {
      module.uek.push(...werte);
    }
  }
  return module;
}

function parseLernorte(zeile) {
  const lernorte = leerModule();
  const rest = zeile.replace(/^\s*Lernorte:\s*/, '').trim();
  for (const teil of rest.split('|')) {
    const treffer = /^(BLJ|BFS|ÜK|UEK)\s*:\s*(.*)$/.exec(teil.trim());
    if (!treffer) {
      continue;
    }
    const werte = treffer[2]
      .split(';')
      .map((eintrag) => eintrag.trim())
      .filter(Boolean);
    if (treffer[1] === 'BLJ') {
      lernorte.basislehrjahr.push(...werte);
    } else if (treffer[1] === 'BFS') {
      lernorte.berufsfachschule.push(...werte);
    } else {
      lernorte.uek.push(...werte);
    }
  }
  return lernorte;
}

function parseKontrollzeile(zeile) {
  const code = /Lehrberuf-Code `([^`]+)`/.exec(zeile)?.[1];
  const quelle = /Quelle `([^`]+)`/.exec(zeile)?.[1];
  const bereiche = /(\d+) Bereiche/.exec(zeile)?.[1];
  const kompetenzen = /(\d+) Kompetenzen/.exec(zeile)?.[1];
  const leistungsziele = /(\d+) Leistungsziele/.exec(zeile)?.[1];
  if (!code || !quelle || !bereiche || !kompetenzen || !leistungsziele) {
    throw new Error(`Kontrollzeile nicht lesbar: ${zeile}`);
  }
  return {
    code,
    quelle,
    bereiche: Number(bereiche),
    kompetenzen: Number(kompetenzen),
    leistungsziele: Number(leistungsziele),
  };
}

function parseSpec(text) {
  const zeilen = text.split(/\r?\n/);
  const start = zeilen.findIndex((zeile) => zeile.startsWith('# Anhänge: Bildungspläne'));
  if (start < 0) {
    throw new Error('Überschrift «# Anhänge: Bildungspläne (Seed-Daten)» nicht gefunden.');
  }

  const vorlagen = [];
  let vorlage = null;
  let bereich = null;
  let kompetenz = null;

  for (let index = start; index < zeilen.length; index++) {
    const zeile = zeilen[index];
    const anhang = /^## Anhang [A-C]:/.exec(zeile);
    if (anhang) {
      const titel = zeile.replace(/^## Anhang [A-C]:\s*/, '');
      const kontrollzeile = zeilen[index + 2] ?? '';
      const kontrolle = parseKontrollzeile(kontrollzeile);
      const konfiguration = nachAnhang[kontrolle.code];
      if (!konfiguration) {
        throw new Error(`Unbekannter Lehrberuf-Code ${kontrolle.code}`);
      }
      const titelFachrichtung = /Fachrichtung ([^(]+)/.exec(titel)?.[1]?.trim() ?? null;
      vorlage = {
        lehrberuf: {
          code: kontrolle.code,
          name: konfiguration.name,
          fachrichtung: konfiguration.fachrichtung ?? titelFachrichtung,
          lehrdauerJahre: 4,
        },
        bildungsplanJahr: konfiguration.bildungsplanJahr,
        version: 1,
        quelle: kontrolle.quelle,
        bereiche: [],
        kontrolle,
      };
      vorlagen.push(vorlage);
      bereich = null;
      kompetenz = null;
      continue;
    }

    if (!vorlage) {
      continue;
    }

    const bereichsTreffer = /^### Bereich ([^:]+):\s*(.+)$/.exec(zeile);
    if (bereichsTreffer) {
      bereich = {
        code: bereichsTreffer[1].trim().toUpperCase(),
        titel: bereichsTreffer[2].trim(),
        kompetenzen: [],
      };
      vorlage.bereiche.push(bereich);
      kompetenz = null;
      continue;
    }

    const kompetenzTreffer = /^#### ([^:]+):\s*(.+)$/.exec(zeile);
    if (kompetenzTreffer) {
      kompetenz = {
        code: kompetenzTreffer[1].trim(),
        titel: kompetenzTreffer[2].trim(),
        beschreibung: '',
        module: leerModule(),
        leistungsziele: [],
      };
      bereich.kompetenzen.push(kompetenz);
      continue;
    }

    if (!kompetenz) {
      continue;
    }

    if (zeile.startsWith('> ')) {
      kompetenz.beschreibung = zeile.slice(2).trim();
      continue;
    }

    if (zeile.startsWith('Module (pro Kompetenz):')) {
      kompetenz.module = parseModule(zeile, kompetenz.code);
      continue;
    }

    const lzTreffer = /^- `([^`]+)` \[(K[1-6])\]\s*(.*)$/.exec(zeile);
    if (lzTreffer) {
      let text = lzTreffer[3].trim();
      // The warning marker is not part of the text (SPEC 7.4).
      text = text.replace(/\s*⚠.*$/, '').trim();
      kompetenz.leistungsziele.push({
        code: lzTreffer[1].trim(),
        text,
        taxonomie: lzTreffer[2],
      });
      continue;
    }

    if (/^\s*Lernorte:/.test(zeile)) {
      const ziel = kompetenz.leistungsziele[kompetenz.leistungsziele.length - 1];
      if (ziel) {
        const lernorte = parseLernorte(zeile);
        if (
          lernorte.basislehrjahr.length ||
          lernorte.berufsfachschule.length ||
          lernorte.uek.length
        ) {
          ziel.lernorte = lernorte;
        }
      }
    }
  }

  return vorlagen;
}

function bereinigeVorlage(vorlage) {
  const gesehen = new Map();
  let eintraege = 0;

  for (const bereich of vorlage.bereiche) {
    for (const kompetenz of bereich.kompetenzen) {
      const eindeutig = [];
      for (const ziel of kompetenz.leistungsziele) {
        eintraege++;
        const schluessel = `${kompetenz.code}:${ziel.code}`;
        const vorhanden = gesehen.get(schluessel);
        if (vorhanden) {
          warnungen.push(`${schluessel}: doppelter Eintrag zusammengeführt`);
          if (vorhanden.text !== ziel.text) {
            throw new Error(`${schluessel}: gleicher Code mit unterschiedlichem Text`);
          }
          continue;
        }
        if (!/^[a-z]/.test(ziel.code)) {
          warnungen.push(`${schluessel}: Code ohne Buchstabenpräfix`);
        }
        gesehen.set(schluessel, ziel);
        eindeutig.push(ziel);
      }
      kompetenz.leistungsziele = eindeutig;

      if (vorlage.lehrberuf.code === 'MED') {
        // SPEC 7.3: MED modules are the union of the learning locations per competence.
        const module = leerModule();
        for (const ziel of kompetenz.leistungsziele) {
          if (!ziel.lernorte) {
            continue;
          }
          module.basislehrjahr.push(...ziel.lernorte.basislehrjahr);
          module.berufsfachschule.push(...ziel.lernorte.berufsfachschule);
          module.uek.push(...ziel.lernorte.uek);
        }
        kompetenz.module = {
          basislehrjahr: [...new Set(module.basislehrjahr)],
          berufsfachschule: [...new Set(module.berufsfachschule)],
          uek: [...new Set(module.uek)],
        };
      }
    }
  }

  const kompetenzen = vorlage.bereiche.reduce(
    (summe, bereich) => summe + bereich.kompetenzen.length,
    0,
  );
  const leistungsziele = vorlage.bereiche.reduce(
    (summe, bereich) =>
      summe +
      bereich.kompetenzen.reduce(
        (anzahl, kompetenz) => anzahl + kompetenz.leistungsziele.length,
        0,
      ),
    0,
  );

  const abweichungen = [];
  if (vorlage.bereiche.length !== vorlage.kontrolle.bereiche) {
    abweichungen.push(`Bereiche ${vorlage.bereiche.length} statt ${vorlage.kontrolle.bereiche}`);
  }
  if (kompetenzen !== vorlage.kontrolle.kompetenzen) {
    abweichungen.push(`Kompetenzen ${kompetenzen} statt ${vorlage.kontrolle.kompetenzen}`);
  }
  if (leistungsziele !== vorlage.kontrolle.leistungsziele) {
    abweichungen.push(`Leistungsziele ${leistungsziele} statt ${vorlage.kontrolle.leistungsziele}`);
  }
  if (abweichungen.length) {
    throw new Error(
      `${vorlage.lehrberuf.code}: ${abweichungen.join(', ')} (Einträge: ${eintraege})`,
    );
  }

  const { kontrolle, ...json } = vorlage;
  console.log(
    `${json.lehrberuf.code}: ${json.bereiche.length} Bereiche, ${kompetenzen} Kompetenzen, ${leistungsziele} Leistungsziele (${eintraege} Einträge)`,
  );
  return json;
}

const text = await readFile(specPath, 'utf8');
const vorlagen = parseSpec(text).map(bereinigeVorlage);

for (const dir of outDirs) {
  await mkdir(dir, { recursive: true });
}

for (const vorlage of vorlagen) {
  const konfiguration = nachAnhang[vorlage.lehrberuf.code];
  const inhalt = `${JSON.stringify(vorlage, null, 2)}\n`;
  for (const dir of outDirs) {
    await writeFile(join(dir, konfiguration.datei), inhalt, 'utf8');
  }
}

for (const warnung of warnungen) {
  console.warn(`Warnung: ${warnung}`);
}
console.log(`Fertig: ${vorlagen.length} Vorlagen geschrieben.`);
