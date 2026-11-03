# Bildungsplan-Import: Excel/PDF → JSON

Dieses Dokument beschreibt, wie die offiziellen Bildungsplan-Dateien in das
normalisierte Vorlagen-JSON (`VorlageImport`, SPEC 7.3) übertragen werden. Es
enthält die effektive Excel-Zuordnung, den Umgang mit dem MED-PDF sowie die
Prüfregeln. Das JSON-Schema liegt unter
[`bildungsplan.schema.json`](./bildungsplan.schema.json); der Zieltyp ist
`VorlageImport` in `packages/vertraege/src/stammdaten.ts`.

## Schnellstart

```bash
# Quellen liegen standardmässig im Elternordner des Repositories.
npm run import:bildungsplaene

# Andere Quelle / anderes Ziel:
npm run import:bildungsplaene -- --quelle "E:/DEV/FFHS" --ziel "fixtures/bildungsplaene"

# Nur einzelne Vorlagen:
npm run import:bildungsplaene -- --nur inf-app,edb
```

Der Konverter liest die `.xlsx`-Dateien mit einem kleinen, abhängigkeitsfreien
ZIP/XML-Leser (`tools/xlsx-lesen.mjs`). Er schreibt die JSON-Dateien und einen
`bericht.json` mit Zählern, Warnungen und offenen Berufsfachschul-Modulen.

## Ergebnis

| Datei                       | Quelle                                      | Bereiche | Kompetenzen | Leistungsziele | Warnungen |
| --------------------------- | ------------------------------------------- | -------: | ----------: | -------------: | --------: |
| `vorlage-inf-app-2021.json` | `Vorlage_Bildungsplan APP 2021 (1).xlsx`    |        5 |          25 |            145 |        35 |
| `vorlage-inf-pla-2021.json` | `Vorlage_Bildungsplan PLA 2021 (1).xlsx`    |        6 |          33 |            177 |         2 |
| `vorlage-edb-2024.json`     | `Vorlage_Bildungsplan EdB 2024.xlsx`        |        5 |          28 |            136 |         2 |
| `vorlage-med-2019.json`     | `MED_BiPla_LZK_2019 (1) (1).pdf` (Anhang C) |        6 |          24 |            158 |         0 |

Die Zahlen entsprechen den Kontrollwerten aus SPEC 10.2 (APP 145 statt 146
Einträge wegen des doppelten `a5.2`; PLA 177 statt 178). Die erzeugten Dateien
liegen unter `fixtures/bildungsplaene/`. Sie ersetzen die bestehenden
`public/vorlagen/*.json` **nicht**; ein Einspielen in die App erfolgt bewusst
separat.

## Excel-Zuordnung (APP, PLA, EdB)

Alle drei Arbeitsmappen sind gleich aufgebaut. Die Blattnamen entsprechen den
Kompetenzcodes in Grossbuchstaben (`A1`, `B2`, …).

### Blatt `Start`

| Ort                         | Inhalt                                  | Ziel                               |
| --------------------------- | --------------------------------------- | ---------------------------------- |
| `A1`                        | Titel des Bildungsplans                 | Kontrolle, nicht direkt übernommen |
| `G1` (APP/PLA)              | `Fachrichtung …`                        | `lehrberuf.fachrichtung`           |
| Zeile 7 bis vor die Legende | `A` = Bereichscode, `B` = Bereichstitel | `bereiche[]`                       |
| Zeile 7, Spalten `C`…       | `a1: Titel`, `a2: Titel`, …             | `kompetenzen[]`, Reihenfolge       |

Die Kompetenzreihenfolge und die Titel stammen aus `Start`. Weicht der Titel in
`A2` eines Kompetenzblatts ab, wird `Start` verwendet und eine Warnung
geschrieben. Grund: Im EdB-Blatt `A5` steht in `A2` versehentlich der APP-Titel
«Varianten für ICT-Lösungen visualisieren und präsentieren», während
Beschreibung und Leistungsziele zum EdB-Titel «Fortschritt von Projekten im
Bereich digitales Business überprüfen und festhalten» gehören.

### Blatt `Erklärung`

Die Taxonomiestufen werden aus den Zeilen 4–9 gelesen (`K1`–`K6` mit den
Begriffen `Wissen`, `Verstehen`, `Anwenden`, `Analyse`, `Synthese`,
`Beurteilen`). In den Kompetenzblättern steht in Spalte `B` entweder der
Begriff (`Anwenden`) oder direkt `(K3)`/`K3`. Beides wird auf `K1`–`K6`
normalisiert.

### Kompetenzblatt

| Ort     | Inhalt                                                                      | Ziel                                          |
| ------- | --------------------------------------------------------------------------- | --------------------------------------------- |
| `A1`    | `Handlungskompetenz:`                                                       | nicht übernommen                              |
| `A2`    | `a1: Titel`                                                                 | Kontrolle gegen `Start`                       |
| `A3`    | Beschreibung (verbunden `A3:I3`)                                            | `beschreibung`                                |
| Zeile 6 | Kopfkonstanten (z. B. `21`, `36`) und Lernort-Labels                        | **ignoriert** (Vorlagenkopf, keine Fachdaten) |
| Zeile 7 | Spaltenlabels (`Taxonomie`, `Erklärt`, `Geübt`, `Selbständig`, `Modul`, …)  | Struktur                                      |
| `A8`…   | `a1.1: Text`                                                                | `leistungsziele[].code` / `.text`             |
| `B8`…   | Taxonomie                                                                   | `leistungsziele[].taxonomie`                  |
| `C8:E…` | Modulnummern des Basislehrjahrs (Spalten «Erklärt», «Geübt», «Selbständig») | `module.basislehrjahr` (Union)                |
| `F8:F…` | Modulliste Basislehrjahr (verbunden, in den gelieferten Dateien leer)       | `module.basislehrjahr`                        |
| `G8:G…` | Modulliste Berufsfachschule (verbunden, in den gelieferten Dateien leer)    | `module.berufsfachschule`                     |
| `H8:H…` | Modulliste Überbetriebliche Kurse (verbunden)                               | `module.uek`                                  |
| `I8:I…` | «Ausgeführte Arbeiten»                                                      | nicht übernommen                              |

Wichtig: Die Modulnummern des Basislehrjahrs stehen in den gelieferten
Vorlagen in `C`–`E`, nicht in `F`. `F` ist leer. Der Konverter übernimmt die
numerischen Werte aus `C`–`E` als `module.basislehrjahr`. Das ist eine
Abweichung von der vereinfachten Beschreibung in SPEC 7.2 (dort `F`–`H`) und
ist als offene Frage Q-016 festgehalten.

Die Spalten `G` (Berufsfachschule) sind in allen drei gelieferten Excel-Dateien
leer. Der Konverter erfindet keine Module: `module.berufsfachschule` bleibt
leer, und `bericht.json` listet die betroffenen Kompetenzen unter
`bfsOhneModulKompetenzen`. Die BFS-Module müssen bei Bedarf aus dem offiziellen
BFS-Modulkatalog ergänzt werden (oder aus dem bestehenden, manuell gepflegten
`public/vorlagen/vorlage-inf-app.json` / `vorlage-inf-pla.json`). Das ist
Inhalt von Q-002/Q-016.

### Textbereinigung

Der Konverter entfernt reproduzierbare Word-Artefakte:

- `_x0002_`-Platzhalter und weiche Trennzeichen (`U+00AD`),
- Zeilenumbrüche und Trennstriche am Zeilenende,
- überflüssige Leerzeichen nach `/`,
- Trennstriche innerhalb von Wörtern, ausser bei einer dokumentierten Liste
  von Präfixen/Komposita (`nicht-`, `non-`, `pre-`, `IT-`, `E-`, `Multi-`,
  `Web-`, `Open-`, …; siehe `HYPHEN_PREFIXE` in
  `tools/bildungsplan-import.mjs`).

Nicht automatisch korrigierbar sind Worttrennungen, bei denen die Quelle ein
**Leerzeichen** statt eines Bindestrichs enthält (z. B. «anzustre benden» in
APP `a1`). Solche Stellen bleiben quellentreu; sie sind bei einer redaktionellen
Nachbearbeitung zu glätten. Wird ein legitimes Kompositum fälschlich
zusammengezogen, genügt es, den linken Wortteil in `HYPHEN_PREFIXE` zu
ergänzen und neu zu generieren.

### Codes, Duplikate und Kontrollen

- Codes werden kleingeschrieben. Fehlt der Buchstabe (z. B. `6.3`), wird er aus
  dem Kompetenzcode ergänzt (`a6.3`) und eine Warnung geschrieben.
- Doppelte Codes mit identischem Text werden zusammengeführt (APP/PLA `a5.2`).
  Doppelte Codes mit abweichendem Text brechen den Lauf ab.
- Die erwarteten Zähler stehen in `VORLAGEN` (`kontrolle`). Abweichungen brechen
  den Lauf ab, damit ein stiller Datenverlust auffällt.
- Taxonomie-Abweichungen zwischen Spalte `B` und einem `(Kx)` im Text werden
  gemeldet; Spalte `B` gilt. APP hat 33 solche Fälle (SPEC 10.2).

## MED-PDF

Das MED-JSON ist die bereinigte Transkription aus SPEC Anhang C. Es wurde gegen
den aus dem PDF extrahierten Text geprüft:

- 24 Kompetenzen, 158 Leistungsziele, 158 Codes,
- alle Kompetenztitel und alle Leistungszieltexte (erste 80 Zeichen,
  normalisiert) im PDF-Text gefunden.

Eine vollautomatische PDF-Extraktion ist im Projekt bewusst nicht
implementiert:

- Es gibt keine PDF-Bibliothek als Abhängigkeit (D-010; keine neue Abhängigkeit
  ohne ADR).
- Die PDF-Tabelle verliert beim reinen Textexport die Spaltenpositionen. Die
  Modullisten von Berufsfachschule und ÜK stehen in benachbarten Spalten und
  erscheinen im Text hintereinander, z. B.
  `… 264 Digitale Medienproduktionen vorbereiten 269 Fotografieprojekt realisieren`.
  Ohne x-Koordinaten ist die Zuordnung BFS/ÜK nicht sicher.
- Die Seitenköpfe wiederholen sich auf jeder Seite; Texte können über
  Seitenumbrüche laufen.

Wenn eine neue MED-Version oder ein weiterer PDF-Bildungsplan ankommt:

1. Text extrahieren, z. B. mit `pdftotext -layout` (nicht installiert) oder über
   den PDF-Viewer (Alles markieren, kopieren) und als UTF-8 speichern.
2. Seitenköpfe und Fusszeilen entfernen.
3. Pro Kompetenz `code`, `titel`, `beschreibung`, `leistungsziele` mit
   `code`, `text`, `taxonomie` erfassen.
4. `lernorte` nur setzen, wenn die Spaltenzuordnung sicher ist; sonst leer
   lassen und die Unsicherheit in `docs/spec/open-questions.md` festhalten.
5. Gegen die Kontrollzahlen prüfen (MED: 6 Bereiche, 24 Kompetenzen,
   158 Leistungsziele) und das JSON gegen das Schema validieren.

## Zielstruktur (Kurzbeispiel)

```json
{
  "lehrberuf": {
    "code": "INF-APP",
    "name": "Informatiker/in EFZ",
    "fachrichtung": "Applikationsentwicklung",
    "lehrdauerJahre": 4
  },
  "bildungsplanJahr": 2021,
  "version": 1,
  "quelle": "Vorlage_Bildungsplan APP 2021 (1).xlsx",
  "bereiche": [
    {
      "code": "A",
      "titel": "Begleiten von ICT-Projekten",
      "kompetenzen": [
        {
          "code": "a1",
          "titel": "Bedürfnisse von Stakeholdern im Rahmen eines ICT-Projekts abklären und dokumentieren",
          "beschreibung": "…",
          "module": {
            "basislehrjahr": ["175"],
            "berufsfachschule": [],
            "uek": []
          },
          "leistungsziele": [
            {
              "code": "a1.1",
              "text": "…",
              "taxonomie": "K4"
            }
          ]
        }
      ]
    }
  ]
}
```

`lernorte` ist pro Leistungsziel optional und nur bei Quellen sinnvoll, die den
Lernort wirklich pro Ziel ausweisen (MED). Bei APP/PLA/EdB gelten die
Modullisten pro Kompetenz; ein leeres `lernorte` würde sonst fälschlich als
«nicht unterrichtet» interpretiert.

## Validierung

Nach dem Lauf:

```bash
npm run import:bildungsplaene
npx prettier --check fixtures/bildungsplaene docs/import tools
```

Prüfliste:

- [ ] Zähler stimmen mit `bericht.json` und den Kontrollwerten überein.
- [ ] Jede Kompetenz hat `code`, `titel`, `beschreibung`, `module`,
      `leistungsziele`.
- [ ] Jedes Leistungsziel hat `code`, `text`, `taxonomie` (`K1`–`K6`).
- [ ] Codes sind innerhalb einer Kompetenz eindeutig.
- [ ] `module` enthält alle drei Listen, auch wenn sie leer sind.
- [ ] `lernorte` ist nur gesetzt, wenn die Quelle es pro Ziel hergibt.
- [ ] BFS-Lücken sind bewusst: `bericht.json` → `bfsOhneModulKompetenzen`.
- [ ] Textbereinigung: keine `_x0002_`, keine `-\n`-Trennungen; Leerzeichen-
      Trennungen sind dokumentiert.

## Offene Punkte

- **Q-002/Q-016:** BFS-Module fehlen in den Excel-Dateien; BLJ-Module stehen in
  `C`–`E` statt `F`. Bestätigung durch die Fachseite ausstehend.
- **EdB:** `lehrdauerJahre = 4` und `bildungsplanJahr = 2024` sind aus dem
  EFZ-Standard bzw. dem Dateinamen abgeleitet (im Bericht als Annahme
  ausgewiesen).
- **EdB A5:** Titel in `A2` ist ein Kopierfehler; `Start` ist massgebend
  (Warnung im Bericht).
- **APP/PLA-Bestandsfixtures:** Die neuen JSONs weichen in wenigen Texten von
  `public/vorlagen/*.json` ab: `a6.1` ist vollständig (Bestand war abgeschnitten),
  `nicht-funkti-onal` / `IT-Grund-schutz` sind bereinigt, `anzustre benden` bleibt
  quellentreu. Vor einem Austausch der App-Fixtures sind diese Stellen zu
  prüfen.

## Referenzen

- SPEC 7.1–7.3 (Import, Vorlagen-JSON), SPEC 10.2 (Kontrollzahlen), Anhang C
  (MED).
- `packages/vertraege/src/stammdaten.ts` (`VorlageImport`).
- `tools/bildungsplan-import.mjs`, `tools/xlsx-lesen.mjs`.
- `docs/architecture/DECISIONS.md` (D-010, D-016, D-017).
- `docs/spec/open-questions.md` (Q-002, Q-016).
