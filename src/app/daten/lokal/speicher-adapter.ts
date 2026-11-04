import type {
  AnfrageStatusAenderung,
  Ausbildung,
  AusbildungId,
  BadgeDefinition,
  BadgeVergabe,
  Benutzer,
  BenutzerId,
  Benutzereinstellung,
  Bestaetigungsanfrage,
  DatenbestandJson,
  KompetenzAbhaengigkeit,
  Lehrberuf,
  Leistungsziel,
  MeilensteinEreignis,
  NeueAnfrage,
  NeuesEreignis,
  Stufenereignis,
  Vorlage,
  VorlageId,
  VorlageImport,
  VorlageStruktur,
  Zuordnung,
} from '@skilltree/vertraege';
import { stufenmodellFuer } from '@skilltree/vertraege';
import { erstelleBadgeDefinitionen } from '@skilltree/regeln';
import { erzeugeId, pruefsumme } from '../../core/ids';
import type { UhrFn } from '../../core/uhr';
import { SEED_VERSION } from './seed';
import type {
  AnfrageRepository,
  AusbildungRepository,
  BadgeRepository,
  BenutzerRepository,
  DatenbestandPort,
  DatenInitialisierer,
  EreignisRepository,
  LehrberufRepository,
  VorlageRepository,
} from '../ports';
import type { DatenSpeicher } from './daten-speicher';

export type SeedFabrik = () => DatenbestandJson | Promise<DatenbestandJson>;

/**
 * Adapters over the storage contract. Each class implements exactly one
 * repository port so a future HTTP adapter can replace it one-to-one
 * (SPEC 0.7). They contain no business rules.
 */
export class LehrberufSpeicherAdapter implements LehrberufRepository {
  constructor(private readonly speicher: DatenSpeicher) {}

  alle(): Promise<Lehrberuf[]> {
    return this.speicher.alle<Lehrberuf>('lehrberufe');
  }

  async laden(id: string): Promise<Lehrberuf> {
    const lehrberuf = await this.speicher.holen<Lehrberuf>('lehrberufe', id);
    if (!lehrberuf) {
      throw new Error(`Lehrberuf ${id} nicht gefunden`);
    }
    return lehrberuf;
  }
}

export class VorlageSpeicherAdapter implements VorlageRepository {
  constructor(
    private readonly speicher: DatenSpeicher,
    private readonly jetzt: UhrFn,
  ) {}

  liste(): Promise<Vorlage[]> {
    return this.speicher.alle<Vorlage>('vorlagen');
  }

  async laden(id: VorlageId): Promise<Vorlage> {
    const vorlage = await this.speicher.holen<Vorlage>('vorlagen', id);
    if (!vorlage) {
      throw new Error(`Vorlage ${id} nicht gefunden`);
    }
    return vorlage;
  }

  jeLehrberuf(lehrberufId: string): Promise<Vorlage[]> {
    return this.speicher
      .alle<Vorlage>('vorlagen')
      .then((vorlagen) => vorlagen.filter((vorlage) => vorlage.lehrberufId === lehrberufId));
  }

  async struktur(id: VorlageId): Promise<VorlageStruktur> {
    const bereiche = (
      await this.speicher.alle<VorlageStruktur['bereiche'][number]>('bereiche')
    ).filter((bereich) => bereich.vorlageId === id);
    const bereichIds = new Set(bereiche.map((bereich) => bereich.id));
    const kompetenzen = (
      await this.speicher.alle<VorlageStruktur['kompetenzen'][number]>('kompetenzen')
    ).filter((kompetenz) => bereichIds.has(kompetenz.bereichId));
    const kompetenzIds = new Set(kompetenzen.map((kompetenz) => kompetenz.id));
    const leistungsziele = (
      await this.speicher.alle<VorlageStruktur['leistungsziele'][number]>('leistungsziele')
    ).filter((leistungsziel) => kompetenzIds.has(leistungsziel.kompetenzId));
    const abhaengigkeiten = (
      await this.speicher.alle<KompetenzAbhaengigkeit>('abhaengigkeiten')
    ).filter((abhaengigkeit) => abhaengigkeit.vorlageId === id);

    return { bereiche, kompetenzen, leistungsziele, abhaengigkeiten };
  }

  async speichern(importiert: VorlageImport): Promise<VorlageId> {
    const jetzt = this.jetzt().toISOString();
    const stufenmodell = stufenmodellFuer(
      importiert.stufenmodell,
      importiert.lehrberuf.stufenmodell,
    );
    let lehrberuf = (await this.speicher.alle<Lehrberuf>('lehrberufe')).find(
      (eintrag) => eintrag.code === importiert.lehrberuf.code,
    );
    if (!lehrberuf) {
      lehrberuf = {
        id: erzeugeId(),
        code: importiert.lehrberuf.code,
        name: importiert.lehrberuf.name,
        fachrichtung: importiert.lehrberuf.fachrichtung,
        lehrdauerJahre: importiert.lehrberuf.lehrdauerJahre,
        stufenmodell,
        aktiv: true,
      };
      await this.speicher.setzen('lehrberufe', lehrberuf);
    }

    const bestehende = await this.jeLehrberuf(lehrberuf.id);
    const version = Math.max(0, ...bestehende.map((eintrag) => eintrag.version)) + 1;
    for (const eintrag of bestehende) {
      if (eintrag.aktiv) {
        await this.speicher.setzen('vorlagen', { ...eintrag, aktiv: false });
      }
    }

    const vorlage: Vorlage = {
      id: erzeugeId(),
      lehrberufId: lehrberuf.id,
      bildungsplanJahr: importiert.bildungsplanJahr,
      version,
      quelle: importiert.quelle,
      importiertAm: jetzt,
      pruefsumme: pruefsumme(JSON.stringify(importiert)),
      stufenmodell,
      aktiv: true,
    };
    await this.speicher.setzen('vorlagen', vorlage);

    const struktur: VorlageStruktur = {
      bereiche: [],
      kompetenzen: [],
      leistungsziele: [],
      abhaengigkeiten: [],
    };

    for (const [bereichsIndex, bereichImport] of importiert.bereiche.entries()) {
      const bereich = {
        id: erzeugeId(),
        vorlageId: vorlage.id,
        code: bereichImport.code.toUpperCase(),
        titel: bereichImport.titel,
        reihenfolge: bereichsIndex,
      };
      struktur.bereiche.push(bereich);
      await this.speicher.setzen('bereiche', bereich);

      for (const [kompetenzIndex, kompetenzImport] of bereichImport.kompetenzen.entries()) {
        const module = kompetenzImport.module ?? {
          basislehrjahr: [],
          berufsfachschule: [],
          uek: [],
        };
        const kompetenz = {
          id: erzeugeId(),
          bereichId: bereich.id,
          code: kompetenzImport.code,
          titel: kompetenzImport.titel,
          beschreibung: kompetenzImport.beschreibung,
          moduleBasislehrjahr: module.basislehrjahr ?? [],
          moduleBerufsfachschule: module.berufsfachschule ?? [],
          moduleUek: module.uek ?? [],
          reihenfolge: kompetenzIndex,
        };
        struktur.kompetenzen.push(kompetenz);
        await this.speicher.setzen('kompetenzen', kompetenz);

        let zielReihenfolge = 0;
        const bekannteCodes = new Set<string>();
        for (const zielImport of kompetenzImport.leistungsziele) {
          // T-I4 / D-017: identical duplicate codes inside one competence are merged, exactly as
          // the import report announces. Repeats across competences are rejected in the dry run.
          if (bekannteCodes.has(zielImport.code)) {
            continue;
          }
          bekannteCodes.add(zielImport.code);
          const leistungsziel: Leistungsziel = {
            id: erzeugeId(),
            kompetenzId: kompetenz.id,
            code: zielImport.code,
            text: zielImport.text,
            taxonomie: zielImport.taxonomie,
            lernorte: zielImport.lernorte ?? null,
            reihenfolge: zielReihenfolge++,
            archiviert: false,
          };
          struktur.leistungsziele.push(leistungsziel);
          await this.speicher.setzen('leistungsziele', leistungsziel);
        }
      }
    }

    for (const bereich of struktur.bereiche) {
      const kompetenzen = struktur.kompetenzen
        .filter((kompetenz) => kompetenz.bereichId === bereich.id)
        .sort((a, b) => a.reihenfolge - b.reihenfolge);
      for (let index = 1; index < kompetenzen.length; index++) {
        const abhaengigkeit: KompetenzAbhaengigkeit = {
          id: erzeugeId(),
          vorlageId: vorlage.id,
          vonKompetenzId: kompetenzen[index - 1].id,
          nachKompetenzId: kompetenzen[index].id,
          quelle: 'REIHENFOLGE',
        };
        struktur.abhaengigkeiten.push(abhaengigkeit);
        await this.speicher.setzen('abhaengigkeiten', abhaengigkeit);
      }
    }

    const badgeDefinitionen = erstelleBadgeDefinitionen(struktur, vorlage.id, stufenmodell);
    for (const definition of badgeDefinitionen) {
      await this.speicher.setzen('badgeDefinitionen', definition);
    }

    return vorlage.id;
  }
}

export class AusbildungSpeicherAdapter implements AusbildungRepository {
  constructor(private readonly speicher: DatenSpeicher) {}

  async fuerLernende(id: BenutzerId): Promise<Ausbildung | null> {
    const ausbildungen = await this.speicher.alle<Ausbildung>('ausbildungen');
    return (
      ausbildungen.find((ausbildung) => ausbildung.lernendeId === id && ausbildung.aktiv) ?? null
    );
  }

  async fuerPraxisbildner(id: BenutzerId, stichtag: string): Promise<Ausbildung[]> {
    const zuordnungen = (await this.speicher.alle<Zuordnung>('zuordnungen')).filter(
      (zuordnung) => zuordnung.praxisbildnerId === id && istGueltig(zuordnung, stichtag),
    );
    const ids = new Set(zuordnungen.map((zuordnung) => zuordnung.ausbildungId));
    return (await this.speicher.alle<Ausbildung>('ausbildungen')).filter(
      (ausbildung) => ids.has(ausbildung.id) && ausbildung.aktiv,
    );
  }

  async laden(id: AusbildungId): Promise<Ausbildung> {
    const ausbildung = await this.speicher.holen<Ausbildung>('ausbildungen', id);
    if (!ausbildung) {
      throw new Error(`Ausbildung ${id} nicht gefunden`);
    }
    return ausbildung;
  }

  zuordnungen(id: AusbildungId): Promise<Zuordnung[]> {
    return this.speicher
      .alle<Zuordnung>('zuordnungen')
      .then((zuordnungen) => zuordnungen.filter((zuordnung) => zuordnung.ausbildungId === id));
  }

  zuordnungenFuerPraxisbildner(id: BenutzerId): Promise<Zuordnung[]> {
    return this.speicher
      .alle<Zuordnung>('zuordnungen')
      .then((zuordnungen) => zuordnungen.filter((zuordnung) => zuordnung.praxisbildnerId === id));
  }

  async speichern(ausbildung: Ausbildung): Promise<void> {
    await this.speicher.setzen('ausbildungen', ausbildung);
  }

  async zuordnungSpeichern(zuordnung: Zuordnung): Promise<void> {
    await this.speicher.setzen('zuordnungen', zuordnung);
  }
}

export class EreignisSpeicherAdapter implements EreignisRepository {
  constructor(private readonly speicher: DatenSpeicher) {}

  stufenereignisse(az: AusbildungId): Promise<Stufenereignis[]> {
    return this.speicher
      .alle<Stufenereignis>('stufenereignisse')
      .then((ereignisse) => ereignisse.filter((ereignis) => ereignis.ausbildungId === az));
  }

  meilensteinereignisse(az: AusbildungId): Promise<MeilensteinEreignis[]> {
    return this.speicher
      .alle<MeilensteinEreignis>('meilensteinereignisse')
      .then((ereignisse) => ereignisse.filter((ereignis) => ereignis.ausbildungId === az));
  }

  async anfuegen(ereignis: NeuesEreignis): Promise<Stufenereignis | MeilensteinEreignis> {
    if ('leistungszielId' in ereignis) {
      const neu: Stufenereignis = { ...ereignis, id: erzeugeId() };
      await this.speicher.hinzufuegen('stufenereignisse', neu);
      return neu;
    }
    const neu: MeilensteinEreignis = { ...ereignis, id: erzeugeId() };
    await this.speicher.hinzufuegen('meilensteinereignisse', neu);
    return neu;
  }
}

export class AnfrageSpeicherAdapter implements AnfrageRepository {
  constructor(private readonly speicher: DatenSpeicher) {}

  fuerAusbildung(az: AusbildungId): Promise<Bestaetigungsanfrage[]> {
    return this.speicher
      .alle<Bestaetigungsanfrage>('anfragen')
      .then((anfragen) => anfragen.filter((anfrage) => anfrage.ausbildungId === az));
  }

  async offeneFuerPraxisbildner(pb: BenutzerId, stichtag: string): Promise<Bestaetigungsanfrage[]> {
    const zuordnungen = (await this.speicher.alle<Zuordnung>('zuordnungen')).filter(
      (zuordnung) => zuordnung.praxisbildnerId === pb && istGueltig(zuordnung, stichtag),
    );
    const ids = new Set(zuordnungen.map((zuordnung) => zuordnung.ausbildungId));
    return (await this.speicher.alle<Bestaetigungsanfrage>('anfragen')).filter(
      (anfrage) => ids.has(anfrage.ausbildungId) && anfrage.status === 'OFFEN',
    );
  }

  async laden(id: string): Promise<Bestaetigungsanfrage> {
    const anfrage = await this.speicher.holen<Bestaetigungsanfrage>('anfragen', id);
    if (!anfrage) {
      throw new Error(`Anfrage ${id} nicht gefunden`);
    }
    return anfrage;
  }

  async erstellen(anfrage: NeueAnfrage): Promise<Bestaetigungsanfrage> {
    const neu: Bestaetigungsanfrage = {
      ...anfrage,
      id: erzeugeId(),
      status: 'OFFEN',
    };
    await this.speicher.hinzufuegen('anfragen', neu);
    return neu;
  }

  async statusSetzen(id: string, aenderung: AnfrageStatusAenderung): Promise<Bestaetigungsanfrage> {
    const anfrage = await this.laden(id);
    const neu: Bestaetigungsanfrage = { ...anfrage, ...aenderung };
    await this.speicher.setzen('anfragen', neu);
    return neu;
  }
}

export class BenutzerSpeicherAdapter implements BenutzerRepository {
  constructor(private readonly speicher: DatenSpeicher) {}

  alle(): Promise<Benutzer[]> {
    return this.speicher.alle<Benutzer>('benutzer');
  }

  async laden(id: BenutzerId): Promise<Benutzer> {
    const benutzer = await this.speicher.holen<Benutzer>('benutzer', id);
    if (!benutzer) {
      throw new Error(`Benutzer ${id} nicht gefunden`);
    }
    return benutzer;
  }

  async nachLogin(login: string): Promise<Benutzer | null> {
    const benutzer = await this.alle();
    return benutzer.find((eintrag) => eintrag.login === login) ?? null;
  }

  async einstellungen(id: BenutzerId): Promise<Benutzereinstellung> {
    return (
      (await this.speicher.holen<Benutzereinstellung>('einstellungen', id)) ?? {
        benutzerId: id,
        badgesAusgeblendet: false,
      }
    );
  }

  async einstellungenSpeichern(einstellung: Benutzereinstellung): Promise<void> {
    await this.speicher.setzen('einstellungen', einstellung);
  }
}

export class BadgeSpeicherAdapter implements BadgeRepository {
  constructor(private readonly speicher: DatenSpeicher) {}

  definitionen(vorlageId: VorlageId): Promise<BadgeDefinition[]> {
    return this.speicher
      .alle<BadgeDefinition>('badgeDefinitionen')
      .then((definitionen) =>
        definitionen.filter((definition) => definition.vorlageId === vorlageId),
      );
  }

  vergaben(az: AusbildungId): Promise<BadgeVergabe[]> {
    return this.speicher
      .alle<BadgeVergabe>('badgeVergaben')
      .then((vergaben) => vergaben.filter((vergabe) => vergabe.ausbildungId === az));
  }

  async vergabenSpeichern(az: AusbildungId, vergaben: BadgeVergabe[]): Promise<void> {
    const alle = await this.speicher.alle<BadgeVergabe>('badgeVergaben');
    await this.speicher.ersetzeAlle('badgeVergaben', [
      ...alle.filter((vergabe) => vergabe.ausbildungId !== az),
      ...vergaben,
    ]);
  }
}

/** Record in the `meta` store that marks a completely written seed (D-023). */
interface SeedStand {
  id: string;
  version: number;
}

const SEED_STAND_ID = 'seed';

export class DatenbestandSpeicherAdapter implements DatenbestandPort, DatenInitialisierer {
  constructor(
    private readonly speicher: DatenSpeicher,
    private readonly jetzt: UhrFn,
    private readonly seed: SeedFabrik,
  ) {}

  async initialisieren(): Promise<void> {
    const benutzer = await this.speicher.alle<Benutzer>('benutzer');
    const stand = await this.speicher.holen<SeedStand>('meta', SEED_STAND_ID);
    if (benutzer.length > 0 && stand?.version === SEED_VERSION) {
      return;
    }
    // Rebuild when the browser has no data, when the seed changed since it was written (D-022),
    // or when an earlier start was interrupted before the marker was written (D-023). Without
    // this, a browser that once stored an incomplete seed keeps a learner without a training and
    // the start page shows "Kein Lehrberuf zugeordnet" forever.
    await this.seedAnwenden();
  }

  async exportieren(): Promise<DatenbestandJson> {
    return {
      version: 1,
      exportiertAm: this.jetzt().toISOString(),
      lehrberufe: await this.speicher.alle<Lehrberuf>('lehrberufe'),
      vorlagen: await this.speicher.alle<Vorlage>('vorlagen'),
      bereiche: await this.speicher.alle('bereiche'),
      kompetenzen: await this.speicher.alle('kompetenzen'),
      leistungsziele: await this.speicher.alle('leistungsziele'),
      abhaengigkeiten: await this.speicher.alle('abhaengigkeiten'),
      benutzer: await this.speicher.alle('benutzer'),
      einstellungen: await this.speicher.alle('einstellungen'),
      ausbildungen: await this.speicher.alle('ausbildungen'),
      zuordnungen: await this.speicher.alle('zuordnungen'),
      stufenereignisse: await this.speicher.alle('stufenereignisse'),
      meilensteinereignisse: await this.speicher.alle('meilensteinereignisse'),
      anfragen: await this.speicher.alle('anfragen'),
      badgeDefinitionen: await this.speicher.alle('badgeDefinitionen'),
      badgeVergaben: await this.speicher.alle('badgeVergaben'),
    };
  }

  async importieren(daten: DatenbestandJson): Promise<void> {
    await datenbestandSetzen(this.speicher, daten);
    // An explicit import is the current state; do not replace it on the next start.
    await this.seedStandSchreiben();
  }

  async zuruecksetzen(): Promise<void> {
    await this.seedAnwenden();
  }

  private async seedAnwenden(): Promise<void> {
    await datenbestandSetzen(this.speicher, await this.seed());
    // Written last, so an interrupted seed has no marker and is rebuilt on the next start.
    await this.seedStandSchreiben();
  }

  private seedStandSchreiben(): Promise<void> {
    return this.speicher.setzen<SeedStand>('meta', {
      id: SEED_STAND_ID,
      version: SEED_VERSION,
    });
  }
}

async function datenbestandSetzen(speicher: DatenSpeicher, daten: DatenbestandJson): Promise<void> {
  await speicher.ersetzeAlle('lehrberufe', daten.lehrberufe ?? []);
  await speicher.ersetzeAlle('vorlagen', daten.vorlagen ?? []);
  await speicher.ersetzeAlle('bereiche', daten.bereiche ?? []);
  await speicher.ersetzeAlle('kompetenzen', daten.kompetenzen ?? []);
  await speicher.ersetzeAlle('leistungsziele', daten.leistungsziele ?? []);
  await speicher.ersetzeAlle('abhaengigkeiten', daten.abhaengigkeiten ?? []);
  await speicher.ersetzeAlle('benutzer', daten.benutzer ?? []);
  await speicher.ersetzeAlle('einstellungen', daten.einstellungen ?? []);
  await speicher.ersetzeAlle('ausbildungen', daten.ausbildungen ?? []);
  await speicher.ersetzeAlle('zuordnungen', daten.zuordnungen ?? []);
  await speicher.ersetzeAlle('stufenereignisse', daten.stufenereignisse ?? []);
  await speicher.ersetzeAlle('meilensteinereignisse', daten.meilensteinereignisse ?? []);
  await speicher.ersetzeAlle('anfragen', daten.anfragen ?? []);
  await speicher.ersetzeAlle('badgeDefinitionen', daten.badgeDefinitionen ?? []);
  await speicher.ersetzeAlle('badgeVergaben', daten.badgeVergaben ?? []);
}

function istGueltig(zuordnung: Zuordnung, stichtag: string): boolean {
  if (zuordnung.gueltigVon > stichtag) {
    return false;
  }
  return !zuordnung.gueltigBis || zuordnung.gueltigBis >= stichtag;
}
