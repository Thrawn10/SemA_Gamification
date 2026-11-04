import { inject, Service } from '@angular/core';
import type {
  Ausbildung,
  BadgeAnsicht,
  BadgesAnsicht,
  BereichAnsicht,
  Benutzer,
  Bestaetigungsanfrage,
  KantenAnsicht,
  KompetenzAnsicht,
  Lehrberuf,
  LeistungszielAnsicht,
  MeilensteinAnsicht,
  MeilensteinEreignis,
  SkilltreeAnsicht,
  Stufe,
  Stufenereignis,
  Stufenmodell,
  VerlaufEintrag,
  Vorlage,
  Zuordnung,
} from '@skilltree/vertraege';
import {
  ANFRAGE_STATUS_TEXTE,
  FachlicherFehler,
  meilensteinTexteFuer,
  stufenmodellFuer,
  stufenText,
} from '@skilltree/vertraege';
import {
  aktiveBestaetigungen,
  ampel,
  anzahlRoteKompetenzen,
  badgeBedingung,
  badgeFortschrittText,
  berechneBadgeVergaben,
  berechneLehrjahr,
  bereichswert,
  erstelleBadgeDefinitionen,
  fortschritt,
  indexierePlan,
  istAktuellesBadgeSet,
  istZuordnungGueltig,
  kanten,
  kantenzustand,
  kompetenzAmpeln,
  kompetenzwert,
  meilensteinBereitschaft,
  meilensteinStati,
  meilensteinStatusMap,
  naechsteKnoten,
  stufenMapFuerModell,
  type MeilensteinStatusMap,
  type PlanIndex,
} from '@skilltree/regeln';
import {
  ANFRAGE_REPOSITORY,
  AUSBILDUNG_REPOSITORY,
  BADGE_REPOSITORY,
  BENUTZER_REPOSITORY,
  EREIGNIS_REPOSITORY,
  LEHRBERUF_REPOSITORY,
  VORLAGE_REPOSITORY,
} from '../daten/ports';
import { UHR } from '../core/uhr';
import { SitzungDienst } from './sitzung-dienst';
import { fordereLeseZugriff, istPraxisbildnerMitGueltigerZuordnung } from './zugriff';

interface TreeKontext {
  benutzer: Benutzer;
  ausbildung: Ausbildung;
  zuordnungen: Zuordnung[];
  vorlage: Vorlage;
  lehrberuf: Lehrberuf;
  index: PlanIndex;
  stufenereignisse: Stufenereignis[];
  meilensteinereignisse: MeilensteinEreignis[];
  anfragen: Bestaetigungsanfrage[];
  benutzerNachId: Map<string, Benutzer>;
}

@Service()
export class SkilltreeDienst {
  private readonly sitzung = inject(SitzungDienst);
  private readonly ausbildungRepository = inject(AUSBILDUNG_REPOSITORY);
  private readonly vorlageRepository = inject(VORLAGE_REPOSITORY);
  private readonly lehrberufRepository = inject(LEHRBERUF_REPOSITORY);
  private readonly ereignisRepository = inject(EREIGNIS_REPOSITORY);
  private readonly anfrageRepository = inject(ANFRAGE_REPOSITORY);
  private readonly benutzerRepository = inject(BENUTZER_REPOSITORY);
  private readonly badgeRepository = inject(BADGE_REPOSITORY);
  private readonly uhr = inject(UHR);

  async laden(ausbildungId: string): Promise<SkilltreeAnsicht> {
    const kontext = await this.ladeKontext(ausbildungId);
    const jetzt = this.uhr();
    const modell = stufenmodellFuer(kontext.vorlage.stufenmodell, kontext.lehrberuf.stufenmodell);
    const stufen = stufenMapFuerModell(kontext.stufenereignisse, modell);
    const stati = meilensteinStati(kontext.meilensteinereignisse);
    const ampeln = kompetenzAmpeln(kontext.index, stufen);
    const naechste = naechsteKnoten(kontext.index, stufen);
    const offeneAnfragen = kontext.anfragen.filter((anfrage) => anfrage.status === 'OFFEN');
    const aktiveIds = new Set(
      aktiveBestaetigungen(kontext.stufenereignisse).map((ereignis) => ereignis.id),
    );
    const offeneProZiel = new Map<string, Bestaetigungsanfrage[]>();
    for (const anfrage of offeneAnfragen) {
      const liste = offeneProZiel.get(anfrage.leistungszielId) ?? [];
      liste.push(anfrage);
      offeneProZiel.set(anfrage.leistungszielId, liste);
    }

    const bereiche: BereichAnsicht[] = kontext.index.bereiche.map((bereich) => {
      const ziele = bereich.kompetenzen.flatMap((kompetenz) => kompetenz.leistungszielIds);
      const wert = bereichswert(ziele, stufen);
      const kompetenzen: KompetenzAnsicht[] = bereich.kompetenzen.map((kompetenz) => {
        const leistungsziele: LeistungszielAnsicht[] = kompetenz.leistungszielIds.map((zielId) => {
          const leistungsziel = kontext.index.leistungszielNachId.get(zielId);
          if (!leistungsziel) {
            throw new FachlicherFehler('NICHT_GEFUNDEN', 'Leistungsziel fehlt im Plan.');
          }
          const offene = offeneProZiel.get(zielId) ?? [];
          const verlauf = this.verlaufFuer(zielId, kontext, aktiveIds, modell);
          return {
            leistungsziel,
            stufe: stufen.get(zielId) ?? 0,
            aktiveBestaetigung:
              aktiveBestaetigungen(kontext.stufenereignisse)
                .filter((ereignis) => ereignis.leistungszielId === zielId)
                .sort((a, b) => b.stufe - a.stufe)[0] ?? null,
            offeneAnfrage: offene[0] ?? null,
            offeneAnfrageAnzahl: offene.length,
            verlauf,
          };
        });
        return {
          kompetenz: kompetenz.kompetenz,
          leistungsziele,
          wert: kompetenzwert(kompetenz.leistungszielIds, stufen),
          fortschritt: fortschritt(kompetenz.leistungszielIds, stufen),
          ampel: ampel(kompetenzwert(kompetenz.leistungszielIds, stufen)),
          istNaechster: naechste.includes(kompetenz.kompetenz.id),
          offeneAnfragen: leistungsziele.reduce(
            (summe, ziel) => summe + ziel.offeneAnfrageAnzahl,
            0,
          ),
          abgeschlosseneLeistungsziele: leistungsziele.filter((ziel) => ziel.stufe >= 3).length,
          anzahlLeistungsziele: leistungsziele.length,
        };
      });
      return {
        bereich: bereich.bereich,
        kompetenzen,
        wert,
        fortschritt: fortschritt(ziele, stufen),
        ampel: ampel(wert),
        roteKompetenzen: anzahlRoteKompetenzen(
          bereich.kompetenzen.map((kompetenz) => ({
            id: kompetenz.kompetenz.id,
            leistungszielIds: kompetenz.leistungszielIds,
          })),
          stufen,
        ),
        offeneAnfragen: kompetenzen.reduce(
          (summe, kompetenz) => summe + kompetenz.offeneAnfragen,
          0,
        ),
        abgeschlosseneLeistungsziele: ziele.filter((zielId) => (stufen.get(zielId) ?? 0) >= 3)
          .length,
        anzahlLeistungsziele: ziele.length,
      };
    });

    const statusMap = meilensteinStatusMap(stati);
    const kantenAnsicht: KantenAnsicht[] = kanten(kontext.index).map((kante) => ({
      ...kante,
      zustand: kantenzustand(kante, ampeln, statusMap),
    }));

    const meilensteine: MeilensteinAnsicht[] = (['BBC', 'IPA', 'LAP'] as const).map((code) => {
      const status = stati[code];
      return {
        code,
        erreicht: status.erreicht,
        erreichtAm: status.erreichtAm,
        aktivesEreignis: status.aktivesEreignis,
        bereitschaft: meilensteinBereitschaft(
          code,
          kontext.index,
          stufen,
          stati,
          fortschritt(kontext.index.aktiveLeistungszielIds, stufen),
          modell,
        ),
        verlauf: this.meilensteinVerlauf(code, kontext, modell),
      };
    });

    const praxisbildner = kontext.zuordnungen
      .filter((zuordnung) => istZuordnungGueltig(zuordnung, jetzt))
      .map((zuordnung) => kontext.benutzerNachId.get(zuordnung.praxisbildnerId))
      .filter((eintrag): eintrag is Benutzer => Boolean(eintrag))
      .filter(
        (eintrag, index, liste) =>
          liste.findIndex((anderer) => anderer.id === eintrag.id) === index,
      );

    const badges = await this.badgesFuer(kontext, stufen, modell, statusMap);

    return {
      ausbildung: kontext.ausbildung,
      lernende: kontext.benutzerNachId.get(kontext.ausbildung.lernendeId) ?? kontext.benutzer,
      lehrberuf: kontext.lehrberuf,
      vorlage: kontext.vorlage,
      stufenmodell: modell,
      rolle: kontext.benutzer.rolle,
      lehrjahr: berechneLehrjahr(
        kontext.ausbildung.lehrbeginn,
        jetzt,
        kontext.lehrberuf.lehrdauerJahre,
      ),
      fortschritt: fortschritt(kontext.index.aktiveLeistungszielIds, stufen),
      bereiche,
      kanten: kantenAnsicht,
      meilensteine,
      naechsteKnoten: naechste,
      offeneAnfragen: offeneAnfragen.length,
      praxisbildner,
      kannBestaetigen: istPraxisbildnerMitGueltigerZuordnung(
        kontext.benutzer,
        kontext.zuordnungen,
        jetzt,
      ),
      badges,
    };
  }

  private async ladeKontext(ausbildungId: string): Promise<TreeKontext> {
    const benutzer = this.sitzung.fordereBenutzer();
    let ausbildung: Ausbildung;
    try {
      ausbildung = await this.ausbildungRepository.laden(ausbildungId);
    } catch {
      throw new FachlicherFehler('NICHT_GEFUNDEN', 'Ausbildung nicht gefunden.');
    }
    const zuordnungen = await this.ausbildungRepository.zuordnungen(ausbildungId);
    fordereLeseZugriff(benutzer, ausbildung, zuordnungen, this.uhr());

    const [
      vorlage,
      lehrberuf,
      struktur,
      stufenereignisse,
      meilensteinereignisse,
      anfragen,
      benutzerListe,
    ] = await Promise.all([
      this.vorlageRepository.laden(ausbildung.vorlageId),
      this.lehrberufRepository.laden(ausbildung.lehrberufId),
      this.vorlageRepository.struktur(ausbildung.vorlageId),
      this.ereignisRepository.stufenereignisse(ausbildungId),
      this.ereignisRepository.meilensteinereignisse(ausbildungId),
      this.anfrageRepository.fuerAusbildung(ausbildungId),
      this.benutzerRepository.alle(),
    ]);

    return {
      benutzer,
      ausbildung,
      zuordnungen,
      vorlage,
      lehrberuf,
      index: indexierePlan(struktur),
      stufenereignisse,
      meilensteinereignisse,
      anfragen,
      benutzerNachId: new Map(benutzerListe.map((eintrag) => [eintrag.id, eintrag])),
    };
  }

  private verlaufFuer(
    leistungszielId: string,
    kontext: TreeKontext,
    aktiveIds: ReadonlySet<string>,
    modell: Stufenmodell,
  ): VerlaufEintrag[] {
    const eintraege: VerlaufEintrag[] = [];

    for (const ereignis of kontext.stufenereignisse) {
      if (ereignis.leistungszielId !== leistungszielId) {
        continue;
      }
      eintraege.push({
        id: ereignis.id,
        art: 'EREIGNIS',
        aktion: aktionsText(ereignis, modell),
        zeitpunkt: ereignis.zeitpunkt,
        akteurId: ereignis.akteurId,
        akteurName: kontext.benutzerNachId.get(ereignis.akteurId)?.name ?? 'Unbekannt',
        kommentar: ereignis.kommentar,
        begruendung: ereignis.begruendung,
        stufe: ereignis.stufe,
        aktiv: ereignis.aktion === 'ZURUECKGENOMMEN' ? true : aktiveIds.has(ereignis.id),
        refEreignisId: ereignis.refEreignisId,
      });
    }

    for (const anfrage of kontext.anfragen) {
      if (anfrage.leistungszielId !== leistungszielId) {
        continue;
      }
      const beantwortet = anfrage.status === 'ERLEDIGT' || anfrage.status === 'ABGELEHNT';
      const akteurId = beantwortet
        ? (anfrage.beantwortetVon ?? kontext.ausbildung.lernendeId)
        : kontext.ausbildung.lernendeId;
      eintraege.push({
        id: anfrage.id,
        art: 'ANFRAGE',
        aktion: `Anfrage ${ANFRAGE_STATUS_TEXTE[anfrage.status]}`,
        zeitpunkt: beantwortet ? (anfrage.beantwortetAm ?? anfrage.erstelltAm) : anfrage.erstelltAm,
        akteurId,
        akteurName: kontext.benutzerNachId.get(akteurId)?.name ?? 'Unbekannt',
        kommentar: anfrage.text,
        begruendung: anfrage.antwort,
        aktiv: true,
        anfrageStatus: anfrage.status,
      });
    }

    return eintraege.sort((a, b) => b.zeitpunkt.localeCompare(a.zeitpunkt));
  }

  private meilensteinVerlauf(
    code: MeilensteinEreignis['meilenstein'],
    kontext: TreeKontext,
    modell: Stufenmodell,
  ): VerlaufEintrag[] {
    const eintraege: VerlaufEintrag[] = [];
    const aktive = new Set(aktiveMeilensteinIds(kontext.meilensteinereignisse));
    for (const ereignis of kontext.meilensteinereignisse) {
      if (ereignis.meilenstein !== code) {
        continue;
      }
      const texte = meilensteinTexteFuer(code, modell);
      eintraege.push({
        id: ereignis.id,
        art: 'EREIGNIS',
        aktion:
          ereignis.aktion === 'ERREICHT'
            ? `${texte.name} als erreicht bestätigt`
            : `Rücknahme ${texte.name}`,
        zeitpunkt: ereignis.zeitpunkt,
        akteurId: ereignis.akteurId,
        akteurName: kontext.benutzerNachId.get(ereignis.akteurId)?.name ?? 'Unbekannt',
        kommentar: ereignis.kommentar,
        begruendung: ereignis.begruendung,
        aktiv: ereignis.aktion === 'ZURUECKGENOMMEN' ? true : aktive.has(ereignis.id),
        refEreignisId: ereignis.refEreignisId,
      });
    }
    return eintraege.sort((a, b) => b.zeitpunkt.localeCompare(a.zeitpunkt));
  }

  private async badgesFuer(
    kontext: TreeKontext,
    stufen: ReadonlyMap<string, Stufe>,
    modell: Stufenmodell,
    meilensteine: MeilensteinStatusMap,
  ): Promise<BadgesAnsicht> {
    const gespeicherte = await this.badgeRepository.definitionen(kontext.vorlage.id);
    const definitionen =
      gespeicherte.length > 0 && istAktuellesBadgeSet(gespeicherte)
        ? gespeicherte
        : erstelleBadgeDefinitionen(kontext.index.struktur, kontext.vorlage.id, modell);
    const vergaben = berechneBadgeVergaben(
      definitionen,
      kontext.index,
      kontext.stufenereignisse,
      kontext.ausbildung.id,
      modell,
      kontext.meilensteinereignisse,
    );
    const nachBadge = new Map(vergaben.map((vergabe) => [vergabe.badgeId, vergabe]));
    const istEigeneAnsicht = kontext.benutzer.id === kontext.ausbildung.lernendeId;
    const einstellung = await this.benutzerRepository.einstellungen(kontext.ausbildung.lernendeId);

    const erhalten: BadgeAnsicht[] = [];
    const inaktiv: BadgeAnsicht[] = [];
    const offen: BadgeAnsicht[] = [];

    for (const definition of [...definitionen].sort((a, b) => a.reihenfolge - b.reihenfolge)) {
      const vergabe = nachBadge.get(definition.id) ?? null;
      const bedingung = badgeBedingung(definition, kontext.index, stufen, meilensteine);
      const ansicht: BadgeAnsicht = {
        definition,
        vergabe,
        status: vergabe?.aktiv ? 'ERHALTEN' : vergabe ? 'INAKTIV' : 'OFFEN',
        fortschrittText: badgeFortschrittText(definition, bedingung, modell),
        aktuell: bedingung.aktuell,
        gesamt: bedingung.gesamt,
      };
      if (ansicht.status === 'ERHALTEN') {
        erhalten.push(ansicht);
      } else if (ansicht.status === 'INAKTIV') {
        inaktiv.push(ansicht);
      } else {
        offen.push(ansicht);
      }
    }

    erhalten.sort((a, b) =>
      (b.vergabe?.vergebenAm ?? '').localeCompare(a.vergabe?.vergebenAm ?? ''),
    );
    inaktiv.sort((a, b) =>
      (b.vergabe?.inaktivSeit ?? '').localeCompare(a.vergabe?.inaktivSeit ?? ''),
    );
    offen.sort(
      (a, b) =>
        b.aktuell / Math.max(1, b.gesamt) - a.aktuell / Math.max(1, a.gesamt) ||
        a.definition.reihenfolge - b.definition.reihenfolge,
    );

    return {
      erhalten,
      inaktiv,
      offen,
      ausgeblendet: istEigeneAnsicht && einstellung.badgesAusgeblendet,
    };
  }
}

function aktionsText(ereignis: Stufenereignis, modell: Stufenmodell): string {
  const text = stufenText(modell, ereignis.stufe);
  switch (ereignis.aktion) {
    case 'BESTAETIGT':
      return `${text} bestätigt`;
    case 'UEBERNOMMEN':
      return `${text} aus Bildungsplan übernommen`;
    case 'ZURUECKGENOMMEN':
      return `Rücknahme ${text}`;
  }
}

function aktiveMeilensteinIds(ereignisse: readonly MeilensteinEreignis[]): string[] {
  const zurueckgenommen = new Set(
    ereignisse
      .filter((ereignis) => ereignis.aktion === 'ZURUECKGENOMMEN' && ereignis.refEreignisId)
      .map((ereignis) => ereignis.refEreignisId),
  );
  return ereignisse
    .filter((ereignis) => ereignis.aktion === 'ERREICHT' && !zurueckgenommen.has(ereignis.id))
    .map((ereignis) => ereignis.id);
}
