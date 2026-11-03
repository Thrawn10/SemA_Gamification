import { inject, Service } from '@angular/core';
import type {
  Ausbildung,
  BadgeDefinition,
  BadgeVergabe,
  BestaetigungsErgebnis,
  BestaetigungZuruecknehmen,
  StufeBestaetigen,
  Stufenereignis,
  Zuordnung,
} from '@skilltree/vertraege';
import { FachlicherFehler, STUFEN_TEXTE } from '@skilltree/vertraege';
import {
  aktiveBestaetigungen,
  ampel,
  berechneBadgeVergaben,
  erstelleBadgeDefinitionen,
  fortschritt,
  indexierePlan,
  kompetenzwert,
  stufenMap,
  type PlanIndex,
} from '@skilltree/regeln';
import { DomaenenEreignisse } from '../core/domaenen-ereignisse';
import { UHR } from '../core/uhr';
import {
  ANFRAGE_REPOSITORY,
  AUSBILDUNG_REPOSITORY,
  BADGE_REPOSITORY,
  EREIGNIS_REPOSITORY,
  VORLAGE_REPOSITORY,
} from '../daten/ports';
import { SitzungDienst } from './sitzung-dienst';
import { forderePraxisbildnerRecht } from './zugriff';

interface SchreibKontext {
  ausbildung: Ausbildung;
  zuordnungen: Zuordnung[];
  index: PlanIndex;
  ereignisse: Stufenereignis[];
  definitionen: BadgeDefinition[];
}

@Service()
export class BestaetigungDienst {
  private readonly sitzung = inject(SitzungDienst);
  private readonly ausbildungRepository = inject(AUSBILDUNG_REPOSITORY);
  private readonly vorlageRepository = inject(VORLAGE_REPOSITORY);
  private readonly ereignisRepository = inject(EREIGNIS_REPOSITORY);
  private readonly anfrageRepository = inject(ANFRAGE_REPOSITORY);
  private readonly badgeRepository = inject(BADGE_REPOSITORY);
  private readonly uhr = inject(UHR);
  private readonly domaenenEreignisse = inject(DomaenenEreignisse);

  async bestaetigen(
    ausbildungId: string,
    befehl: StufeBestaetigen,
  ): Promise<BestaetigungsErgebnis> {
    const kontext = await this.ladeKontext(ausbildungId);
    const leistungsziel = kontext.index.leistungszielNachId.get(befehl.leistungszielId);
    if (!leistungsziel) {
      throw new FachlicherFehler('NICHT_GEFUNDEN', 'Leistungsziel nicht gefunden.');
    }
    if (befehl.kommentar && befehl.kommentar.length > 500) {
      throw new FachlicherFehler(
        'UNGUELTIGE_EINGABE',
        'Der Kommentar darf höchstens 500 Zeichen enthalten.',
      );
    }

    const stufen = stufenMap(kontext.ereignisse);
    const aktuelleStufe = stufen.get(befehl.leistungszielId) ?? 0;
    const vorherProzent = fortschritt(kontext.index.aktiveLeistungszielIds, stufen);
    const kompetenz = kontext.index.kompetenzNachId.get(leistungsziel.kompetenzId);

    if (befehl.stufe <= aktuelleStufe) {
      return {
        ereignis: null,
        stufe: aktuelleStufe,
        fortschritt: vorherProzent,
        ampel: ampel(kompetenzwert(kompetenz?.leistungszielIds ?? [], stufen)),
        neueBadges: [],
        inaktiveBadges: [],
        hinweis: `«${leistungsziel.code}» ist bereits «${STUFEN_TEXTE[aktuelleStufe]}». Es wurde nichts gespeichert.`,
        geaenderteAnfragen: [],
      };
    }

    const jetzt = this.uhr();
    const ereignis = (await this.ereignisRepository.anfuegen({
      ausbildungId,
      leistungszielId: befehl.leistungszielId,
      stufe: befehl.stufe,
      aktion: 'BESTAETIGT',
      akteurId: this.sitzung.fordereBenutzer().id,
      zeitpunkt: jetzt.toISOString(),
      ...(befehl.kommentar ? { kommentar: befehl.kommentar } : {}),
    })) as Stufenereignis;

    // R-S5: open requests with a target level <= confirmed level become ERLEDIGT.
    const geaenderteAnfragen: string[] = [];
    const offene = await this.anfrageRepository.fuerAusbildung(ausbildungId);
    for (const anfrage of offene) {
      if (
        anfrage.leistungszielId === befehl.leistungszielId &&
        anfrage.status === 'OFFEN' &&
        anfrage.zielstufe <= befehl.stufe
      ) {
        await this.anfrageRepository.statusSetzen(anfrage.id, {
          status: 'ERLEDIGT',
          beantwortetAm: jetzt.toISOString(),
          beantwortetVon: this.sitzung.fordereBenutzer().id,
          ergebnisEreignisId: ereignis.id,
        });
        geaenderteAnfragen.push(anfrage.id);
      }
    }

    const neueEreignisse = [...kontext.ereignisse, ereignis];
    const badgeErgebnis = await this.badgesNeuBerechnen(kontext, neueEreignisse, ausbildungId);
    const nachherStufen = stufenMap(neueEreignisse);
    const nachherProzent = fortschritt(kontext.index.aktiveLeistungszielIds, nachherStufen);

    const badgesText =
      badgeErgebnis.neue.length > 0
        ? ` Neu erreichte Badges: ${badgeErgebnis.neue.map((badge) => badge.definition.titel).join(', ')}.`
        : '';

    const hinweis = `«${leistungsziel.code}» als «${STUFEN_TEXTE[befehl.stufe]}» bestätigt. Fortschritt ${vorherProzent} % → ${nachherProzent} %.${badgesText}`;

    this.domaenenEreignisse.melde({ art: 'EREIGNIS_ANGEFUEGT', ausbildungId });

    return {
      ereignis,
      stufe: befehl.stufe,
      fortschritt: nachherProzent,
      ampel: ampel(kompetenzwert(kompetenz?.leistungszielIds ?? [], nachherStufen)),
      neueBadges: badgeErgebnis.neue.map((badge) => badge.definition),
      inaktiveBadges: badgeErgebnis.inaktive.map((badge) => badge.definition),
      hinweis,
      geaenderteAnfragen,
    };
  }

  async zuruecknehmen(
    ausbildungId: string,
    befehl: BestaetigungZuruecknehmen,
  ): Promise<BestaetigungsErgebnis> {
    const kontext = await this.ladeKontext(ausbildungId);
    const begruendung = befehl.begruendung.trim();
    if (begruendung.length < 10) {
      throw new FachlicherFehler(
        'BEGRUENDUNG_ZU_KURZ',
        `Die Begründung muss mindestens 10 Zeichen enthalten. Aktuell ${begruendung.length} Zeichen.`,
        { laenge: begruendung.length },
      );
    }

    const aktive = aktiveBestaetigungen(kontext.ereignisse);
    const ziel = aktive.find((ereignis) => ereignis.id === befehl.ereignisId);
    if (!ziel) {
      throw new FachlicherFehler(
        'NICHT_GEFUNDEN',
        'Diese Bestätigung ist nicht mehr aktiv oder existiert nicht.',
      );
    }

    const leistungsziel = kontext.index.leistungszielNachId.get(ziel.leistungszielId);
    if (!leistungsziel) {
      throw new FachlicherFehler('NICHT_GEFUNDEN', 'Leistungsziel nicht gefunden.');
    }

    const jetzt = this.uhr();
    const ereignis = (await this.ereignisRepository.anfuegen({
      ausbildungId,
      leistungszielId: ziel.leistungszielId,
      stufe: ziel.stufe,
      aktion: 'ZURUECKGENOMMEN',
      akteurId: this.sitzung.fordereBenutzer().id,
      zeitpunkt: jetzt.toISOString(),
      begruendung,
      refEreignisId: ziel.id,
    })) as Stufenereignis;

    const neueEreignisse = [...kontext.ereignisse, ereignis];
    const badgeErgebnis = await this.badgesNeuBerechnen(kontext, neueEreignisse, ausbildungId);
    const vorherProzent = fortschritt(
      kontext.index.aktiveLeistungszielIds,
      stufenMap(kontext.ereignisse),
    );
    const nachherStufen = stufenMap(neueEreignisse);
    const nachherProzent = fortschritt(kontext.index.aktiveLeistungszielIds, nachherStufen);

    const badgesText =
      badgeErgebnis.inaktive.length > 0
        ? ` Inaktiv geworden: ${badgeErgebnis.inaktive.map((badge) => badge.definition.titel).join(', ')}.`
        : '';

    this.domaenenEreignisse.melde({ art: 'EREIGNIS_ANGEFUEGT', ausbildungId });

    const kompetenz = kontext.index.kompetenzNachId.get(leistungsziel.kompetenzId);
    return {
      ereignis,
      stufe: nachherStufen.get(ziel.leistungszielId) ?? 0,
      fortschritt: nachherProzent,
      ampel: ampel(kompetenzwert(kompetenz?.leistungszielIds ?? [], nachherStufen)),
      neueBadges: badgeErgebnis.neue.map((badge) => badge.definition),
      inaktiveBadges: badgeErgebnis.inaktive.map((badge) => badge.definition),
      hinweis: `«${leistungsziel.code}»: Rücknahme gespeichert. Fortschritt ${vorherProzent} % → ${nachherProzent} %.${badgesText}`,
      geaenderteAnfragen: [],
    };
  }

  private async ladeKontext(ausbildungId: string): Promise<SchreibKontext> {
    const benutzer = this.sitzung.fordereBenutzer();
    const ausbildung = await this.ausbildungRepository.laden(ausbildungId).catch(() => {
      throw new FachlicherFehler('NICHT_GEFUNDEN', 'Ausbildung nicht gefunden.');
    });
    const zuordnungen = await this.ausbildungRepository.zuordnungen(ausbildungId);
    forderePraxisbildnerRecht(benutzer, zuordnungen, this.uhr());

    const [struktur, ereignisse, gespeicherteDefinitionen] = await Promise.all([
      this.vorlageRepository.struktur(ausbildung.vorlageId),
      this.ereignisRepository.stufenereignisse(ausbildungId),
      this.badgeRepository.definitionen(ausbildung.vorlageId),
    ]);
    const index = indexierePlan(struktur);
    const definitionen =
      gespeicherteDefinitionen.length > 0
        ? gespeicherteDefinitionen
        : erstelleBadgeDefinitionen(struktur, ausbildung.vorlageId);

    return { ausbildung, zuordnungen, index, ereignisse, definitionen };
  }

  private async badgesNeuBerechnen(
    kontext: SchreibKontext,
    ereignisse: Stufenereignis[],
    ausbildungId: string,
  ): Promise<{
    neue: { definition: BadgeDefinition; vergabe: BadgeVergabe }[];
    inaktive: { definition: BadgeDefinition; vergabe: BadgeVergabe }[];
  }> {
    const vorher = berechneBadgeVergaben(
      kontext.definitionen,
      kontext.index,
      kontext.ereignisse,
      ausbildungId,
    );
    const nachher = berechneBadgeVergaben(
      kontext.definitionen,
      kontext.index,
      ereignisse,
      ausbildungId,
    );
    const vorherMap = new Map(vorher.map((vergabe) => [vergabe.badgeId, vergabe]));
    const definitionMap = new Map(
      kontext.definitionen.map((definition) => [definition.id, definition]),
    );

    const neue = nachher
      .filter((vergabe) => {
        const alt = vorherMap.get(vergabe.badgeId);
        return vergabe.aktiv && (!alt || !alt.aktiv);
      })
      .map((vergabe) => ({ definition: definitionMap.get(vergabe.badgeId)!, vergabe }));
    const inaktive = nachher
      .filter((vergabe) => {
        const alt = vorherMap.get(vergabe.badgeId);
        return alt?.aktiv === true && !vergabe.aktiv;
      })
      .map((vergabe) => ({ definition: definitionMap.get(vergabe.badgeId)!, vergabe }));

    await this.badgeRepository.vergabenSpeichern(ausbildungId, nachher);
    return { neue, inaktive };
  }
}
