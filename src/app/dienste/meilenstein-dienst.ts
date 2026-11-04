import { inject, Service } from '@angular/core';
import type {
  Ausbildung,
  BadgeDefinition,
  MeilensteinBestaetigen,
  MeilensteinEreignis,
  MeilensteinErgebnis,
  MeilensteinZuruecknehmen,
  Stufenereignis,
  Stufenmodell,
} from '@skilltree/vertraege';
import { FachlicherFehler, meilensteinTexteFuer, stufenmodellFuer } from '@skilltree/vertraege';
import {
  erstelleBadgeDefinitionen,
  indexierePlan,
  istAktuellesBadgeSet,
  meilensteinStati,
  type PlanIndex,
} from '@skilltree/regeln';
import { DomaenenEreignisse } from '../core/domaenen-ereignisse';
import { UHR } from '../core/uhr';
import {
  AUSBILDUNG_REPOSITORY,
  BADGE_REPOSITORY,
  EREIGNIS_REPOSITORY,
  VORLAGE_REPOSITORY,
} from '../daten/ports';
import { ermittleBadgeAenderungen, type BadgeNeuberechnung } from './badge-vergabe';
import { SitzungDienst } from './sitzung-dienst';
import { forderePraxisbildnerRecht } from './zugriff';

interface SchreibKontext {
  ausbildung: Ausbildung;
  index: PlanIndex;
  stufenereignisse: Stufenereignis[];
  meilensteinereignisse: MeilensteinEreignis[];
  definitionen: BadgeDefinition[];
  modell: Stufenmodell;
}

@Service()
export class MeilensteinDienst {
  private readonly sitzung = inject(SitzungDienst);
  private readonly ausbildungRepository = inject(AUSBILDUNG_REPOSITORY);
  private readonly vorlageRepository = inject(VORLAGE_REPOSITORY);
  private readonly ereignisRepository = inject(EREIGNIS_REPOSITORY);
  private readonly badgeRepository = inject(BADGE_REPOSITORY);
  private readonly uhr = inject(UHR);
  private readonly domaenenEreignisse = inject(DomaenenEreignisse);

  async bestaetigen(
    ausbildungId: string,
    befehl: MeilensteinBestaetigen,
  ): Promise<MeilensteinErgebnis> {
    const kontext = await this.ladeKontext(ausbildungId);
    if ((befehl.kommentar ?? '').trim().length > 500) {
      throw new FachlicherFehler(
        'UNGUELTIGE_EINGABE',
        'Der Kommentar darf höchstens 500 Zeichen enthalten.',
        { laenge: (befehl.kommentar ?? '').length },
      );
    }
    const texte = meilensteinTexteFuer(befehl.meilenstein, kontext.modell);
    if (meilensteinStati(kontext.meilensteinereignisse)[befehl.meilenstein].erreicht) {
      return {
        ereignis: null,
        erreicht: true,
        neueBadges: [],
        inaktiveBadges: [],
        hinweis: `«${texte.name}» ist bereits als erreicht bestätigt.`,
      };
    }

    const ereignis = (await this.ereignisRepository.anfuegen({
      ausbildungId,
      meilenstein: befehl.meilenstein,
      aktion: 'ERREICHT',
      akteurId: this.sitzung.fordereBenutzer().id,
      zeitpunkt: this.uhr().toISOString(),
      ...(befehl.kommentar ? { kommentar: befehl.kommentar } : {}),
    })) as MeilensteinEreignis;

    const badgeErgebnis = await this.badgesNeuBerechnen(kontext, [
      ...kontext.meilensteinereignisse,
      ereignis,
    ]);
    const badgesText = this.badgesHinweis(badgeErgebnis);

    this.domaenenEreignisse.melde({ art: 'EREIGNIS_ANGEFUEGT', ausbildungId });
    return {
      ereignis,
      erreicht: true,
      neueBadges: badgeErgebnis.neue.map((badge) => badge.definition),
      inaktiveBadges: badgeErgebnis.inaktive.map((badge) => badge.definition),
      hinweis: `«${texte.name}» als erreicht bestätigt.${badgesText}`,
    };
  }

  async zuruecknehmen(
    ausbildungId: string,
    befehl: MeilensteinZuruecknehmen,
  ): Promise<MeilensteinErgebnis> {
    const kontext = await this.ladeKontext(ausbildungId);
    const begruendung = befehl.begruendung.trim();
    if (begruendung.length < 10) {
      throw new FachlicherFehler(
        'BEGRUENDUNG_ZU_KURZ',
        `Die Begründung muss mindestens 10 Zeichen enthalten. Aktuell ${begruendung.length} Zeichen.`,
        { laenge: begruendung.length },
      );
    }

    const zurueckgenommen = new Set(
      kontext.meilensteinereignisse
        .filter((ereignis) => ereignis.aktion === 'ZURUECKGENOMMEN' && ereignis.refEreignisId)
        .map((ereignis) => ereignis.refEreignisId),
    );
    const ziel = kontext.meilensteinereignisse.find(
      (ereignis) =>
        ereignis.id === befehl.ereignisId &&
        ereignis.aktion === 'ERREICHT' &&
        !zurueckgenommen.has(ereignis.id),
    );
    if (!ziel) {
      throw new FachlicherFehler(
        'NICHT_GEFUNDEN',
        'Diese Meilenstein-Bestätigung ist nicht mehr aktiv oder existiert nicht.',
      );
    }

    const ereignis = (await this.ereignisRepository.anfuegen({
      ausbildungId,
      meilenstein: ziel.meilenstein,
      aktion: 'ZURUECKGENOMMEN',
      akteurId: this.sitzung.fordereBenutzer().id,
      zeitpunkt: this.uhr().toISOString(),
      begruendung,
      refEreignisId: ziel.id,
    })) as MeilensteinEreignis;

    const badgeErgebnis = await this.badgesNeuBerechnen(kontext, [
      ...kontext.meilensteinereignisse,
      ereignis,
    ]);
    const texte = meilensteinTexteFuer(ziel.meilenstein, kontext.modell);
    const badgesText = this.badgesHinweis(badgeErgebnis);

    this.domaenenEreignisse.melde({ art: 'EREIGNIS_ANGEFUEGT', ausbildungId });
    return {
      ereignis,
      erreicht: false,
      neueBadges: badgeErgebnis.neue.map((badge) => badge.definition),
      inaktiveBadges: badgeErgebnis.inaktive.map((badge) => badge.definition),
      hinweis: `«${texte.name}»: Rücknahme gespeichert.${badgesText}`,
    };
  }

  /** R-B5: badge changes caused by the write, phrased for the confirmation message. */
  private badgesHinweis(ergebnis: BadgeNeuberechnung): string {
    const teile: string[] = [];
    if (ergebnis.neue.length > 0) {
      const titel = ergebnis.neue.map((badge) => badge.definition.titel).join(', ');
      teile.push(`Neu erreichte Badges: ${titel}.`);
    }
    if (ergebnis.inaktive.length > 0) {
      const titel = ergebnis.inaktive.map((badge) => badge.definition.titel).join(', ');
      teile.push(`Inaktiv geworden: ${titel}.`);
    }
    return teile.length > 0 ? ` ${teile.join(' ')}` : '';
  }

  private async ladeKontext(ausbildungId: string): Promise<SchreibKontext> {
    const benutzer = this.sitzung.fordereBenutzer();
    const ausbildung = await this.ausbildungRepository.laden(ausbildungId).catch(() => {
      throw new FachlicherFehler('NICHT_GEFUNDEN', 'Ausbildung nicht gefunden.');
    });
    const zuordnungen = await this.ausbildungRepository.zuordnungen(ausbildung.id);
    forderePraxisbildnerRecht(benutzer, zuordnungen, this.uhr());

    const [vorlage, struktur, stufenereignisse, meilensteinereignisse, gespeicherteDefinitionen] =
      await Promise.all([
        this.vorlageRepository.laden(ausbildung.vorlageId),
        this.vorlageRepository.struktur(ausbildung.vorlageId),
        this.ereignisRepository.stufenereignisse(ausbildungId),
        this.ereignisRepository.meilensteinereignisse(ausbildungId),
        this.badgeRepository.definitionen(ausbildung.vorlageId),
      ]);
    const modell = stufenmodellFuer(vorlage.stufenmodell);
    const index = indexierePlan(struktur);
    // D-025: stored definitions from before the reduced badge set are replaced, not extended.
    const definitionen =
      gespeicherteDefinitionen.length > 0 && istAktuellesBadgeSet(gespeicherteDefinitionen)
        ? gespeicherteDefinitionen
        : erstelleBadgeDefinitionen(struktur, ausbildung.vorlageId, modell);

    return {
      ausbildung,
      index,
      stufenereignisse,
      meilensteinereignisse,
      definitionen,
      modell,
    };
  }

  private async badgesNeuBerechnen(
    kontext: SchreibKontext,
    meilensteinereignisse: MeilensteinEreignis[],
  ): Promise<BadgeNeuberechnung> {
    const ergebnis = ermittleBadgeAenderungen(
      kontext.definitionen,
      kontext.index,
      kontext.ausbildung.id,
      kontext.modell,
      kontext.stufenereignisse,
      kontext.stufenereignisse,
      kontext.meilensteinereignisse,
      meilensteinereignisse,
    );
    await this.badgeRepository.vergabenSpeichern(kontext.ausbildung.id, ergebnis.vergaben);
    return ergebnis;
  }
}
