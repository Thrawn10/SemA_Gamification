// Minimal XLSX reader for the build-time importers. It reads the ZIP container
// with Node's zlib, so no third-party dependency is needed. Only the parts the
// Bildungsplan import uses are implemented: workbook metadata, shared strings and
// worksheet cells.
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const ZIP_EOCD = 0x06054b50;
const ZIP_CENTRAL = 0x02014b50;
const ZIP_LOCAL = 0x04034b50;

/** Reads every entry of a ZIP file into a map of name -> Buffer. */
export function leseZip(pfad) {
  const puffer = readFileSync(pfad);
  let eocd = -1;
  const suchStart = Math.max(0, puffer.length - 22 - 0xffff);
  for (let index = puffer.length - 22; index >= suchStart; index--) {
    if (puffer.readUInt32LE(index) === ZIP_EOCD) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) {
    throw new Error('ZIP: End-of-central-directory nicht gefunden.');
  }

  const anzahl = puffer.readUInt16LE(eocd + 10);
  const zentralOffset = puffer.readUInt32LE(eocd + 16);
  const dateien = new Map();
  let position = zentralOffset;

  for (let index = 0; index < anzahl; index++) {
    if (puffer.readUInt32LE(position) !== ZIP_CENTRAL) {
      throw new Error('ZIP: Central directory ist beschädigt.');
    }
    const methode = puffer.readUInt16LE(position + 10);
    const komprimiert = puffer.readUInt32LE(position + 20);
    const nameLaenge = puffer.readUInt16LE(position + 28);
    const extraLaenge = puffer.readUInt16LE(position + 30);
    const kommentarLaenge = puffer.readUInt16LE(position + 32);
    const lokalOffset = puffer.readUInt32LE(position + 42);
    const name = puffer.toString('utf8', position + 46, position + 46 + nameLaenge);
    position += 46 + nameLaenge + extraLaenge + kommentarLaenge;

    if (puffer.readUInt32LE(lokalOffset) !== ZIP_LOCAL) {
      throw new Error(`ZIP: Lokaler Header für ${name} ist beschädigt.`);
    }
    const lokalNameLaenge = puffer.readUInt16LE(lokalOffset + 26);
    const lokalExtraLaenge = puffer.readUInt16LE(lokalOffset + 28);
    const datenStart = lokalOffset + 30 + lokalNameLaenge + lokalExtraLaenge;
    const rohdaten = puffer.subarray(datenStart, datenStart + komprimiert);
    if (methode === 0) {
      dateien.set(name, rohdaten);
    } else if (methode === 8) {
      dateien.set(name, inflateRawSync(rohdaten));
    } else {
      throw new Error(`ZIP: Kompressionsmethode ${methode} für ${name} wird nicht unterstützt.`);
    }
  }
  return dateien;
}

/** Decodes the XML entities used by Office files. */
export function dekodiereXml(text) {
  return text
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dezimal) => String.fromCodePoint(Number(dezimal)))
    .replaceAll('&amp;', '&');
}

/** Reads xl/sharedStrings.xml. */
export function leseSharedStrings(dateien) {
  const datei = dateien.get('xl/sharedStrings.xml');
  if (!datei) {
    return [];
  }
  const xml = datei.toString('utf8');
  const strings = [];
  for (const treffer of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    const teile = [...treffer[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((teil) =>
      dekodiereXml(teil[1]),
    );
    strings.push(teile.join(''));
  }
  return strings;
}

function spalteIndex(referenz) {
  const buchstaben = referenz.match(/^[A-Z]+/)?.[0] ?? 'A';
  let index = 0;
  for (const zeichen of buchstaben) {
    index = index * 26 + (zeichen.charCodeAt(0) - 64);
  }
  return index - 1;
}

/**
 * Reads one worksheet. `zeilen` is a sparse array of `{ nummer, zellen }` where
 * `zellen` is indexed by zero-based column. Merged cells keep their value in the
 * top-left cell, exactly as Excel stores it.
 */
export function leseTabelle(dateien, sheetPfad, sharedStrings) {
  const xml = dateien.get(sheetPfad)?.toString('utf8');
  if (!xml) {
    return { zeilen: [], spalten: 0 };
  }
  const zeilen = [];
  let maxSpalte = 0;

  for (const zeileTreffer of xml.matchAll(/<row\b[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const nummer = Number(zeileTreffer[1]);
    const zellen = [];
    for (const zellTreffer of zeileTreffer[2].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attribute = zellTreffer[1];
      const inhalt = zellTreffer[2];
      const referenz = attribute.match(/\br="([A-Z]+\d+)"/)?.[1] ?? `A${nummer}`;
      const typ = attribute.match(/\bt="([^"]+)"/)?.[1] ?? 'n';
      const wertTreffer = inhalt.match(/<v>([\s\S]*?)<\/v>/);
      let wert = wertTreffer ? dekodiereXml(wertTreffer[1]) : '';

      if (typ === 's' && wert !== '') {
        wert = sharedStrings[Number(wert)] ?? '';
      } else if (typ === 'inlineStr') {
        wert = [...inhalt.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
          .map((teil) => dekodiereXml(teil[1]))
          .join('');
      } else if (typ === 'b') {
        wert = wert === '1' ? 'TRUE' : 'FALSE';
      }

      const spalte = spalteIndex(referenz);
      maxSpalte = Math.max(maxSpalte, spalte + 1);
      zellen[spalte] = wert;
    }
    zeilen.push({ nummer, zellen });
  }

  return { zeilen, spalten: maxSpalte };
}

/** Reads the sheet names and their worksheet paths from xl/workbook.xml. */
export function leseArbeitsmappe(dateien) {
  const workbook = dateien.get('xl/workbook.xml')?.toString('utf8') ?? '';
  const rels = dateien.get('xl/_rels/workbook.xml.rels')?.toString('utf8') ?? '';
  const ziele = new Map();
  for (const treffer of rels.matchAll(/<Relationship\b([^>]*)\/>/g)) {
    const id = treffer[1].match(/\bId="([^"]+)"/)?.[1];
    const ziel = treffer[1].match(/\bTarget="([^"]+)"/)?.[1];
    if (id && ziel) {
      ziele.set(id, ziel.replace(/^\/?xl\//, ''));
    }
  }

  const blaetter = [];
  for (const treffer of workbook.matchAll(/<sheet\b([^>]*)\/>/g)) {
    const name = dekodiereXml(treffer[1].match(/\bname="([^"]*)"/)?.[1] ?? '?');
    const relId = treffer[1].match(/\br:id="([^"]+)"/)?.[1];
    const ziel = ziele.get(relId);
    if (ziel) {
      blaetter.push({ name, pfad: `xl/${ziel}` });
    }
  }
  return blaetter;
}
