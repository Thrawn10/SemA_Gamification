import { inject, Service } from '@angular/core';
import type {
  MeilensteinBestaetigen,
  MeilensteinEreignis,
  MeilensteinErgebnis,
  MeilensteinZuruecknehmen,
} from '@skilltree/vertraege';
import { FachlicherFehler, MEILENSTEIN_TEXTE } from '@skilltree/vertraege';
import { meilensteinStati } from '@skilltree/regeln';
import { DomaenenEreignisse } from '../core/domaenen-ereignisse';
import { UHR } from '../core/uhr';
import { AUSBILDUNG_REPOSITORY, EREIGNIS_REPOSITORY } from '../daten/ports';
import { SitzungDienst } from './sitzung-dienst';
import { forderePraxisbildnerRecht } from './zugriff';

@Service()
export class MeilensteinDienst {
  private readonly sitzung = inject(SitzungDienst);
  private readonly ausbildungRepository = inject(AUSBILDUNG_REPOSITORY);
  private readonly ereignisRepository = inject(EREIGNIS_REPOSITORY);
  private readonly uhr = inject(UHR);
  private readonly domaenenEreignisse = inject(DomaenenEreignisse);

  async bestaetigen(
    ausbildungId: string,
    befehl: MeilensteinBestaetigen,
  ): Promise<MeilensteinErgebnis> {
    await this.pruefeRecht(ausbildungId);
    if ((befehl.kommentar ?? '').trim().length > 500) {
      throw new FachlicherFehler(
        'UNGUELTIGE_EINGABE',
        'Der Kommentar darf höchstens 500 Zeichen enthalten.',
        { laenge: (befehl.kommentar ?? '').length },
      );
    }
    const ereignisse = await this.ereignisRepository.meilensteinereignisse(ausbildungId);
    if (meilensteinStati(ereignisse)[befehl.meilenstein].erreicht) {
      return {
        ereignis: null,
        erreicht: true,
        hinweis: `«${MEILENSTEIN_TEXTE[befehl.meilenstein].name}» ist bereits als erreicht bestätigt.`,
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

    this.domaenenEreignisse.melde({ art: 'EREIGNIS_ANGEFUEGT', ausbildungId });
    return {
      ereignis,
      erreicht: true,
      hinweis: `«${MEILENSTEIN_TEXTE[befehl.meilenstein].name}» als erreicht bestätigt.`,
    };
  }

  async zuruecknehmen(
    ausbildungId: string,
    befehl: MeilensteinZuruecknehmen,
  ): Promise<MeilensteinErgebnis> {
    await this.pruefeRecht(ausbildungId);
    const begruendung = befehl.begruendung.trim();
    if (begruendung.length < 10) {
      throw new FachlicherFehler(
        'BEGRUENDUNG_ZU_KURZ',
        `Die Begründung muss mindestens 10 Zeichen enthalten. Aktuell ${begruendung.length} Zeichen.`,
        { laenge: begruendung.length },
      );
    }

    const ereignisse = await this.ereignisRepository.meilensteinereignisse(ausbildungId);
    const zurueckgenommen = new Set(
      ereignisse
        .filter((ereignis) => ereignis.aktion === 'ZURUECKGENOMMEN' && ereignis.refEreignisId)
        .map((ereignis) => ereignis.refEreignisId),
    );
    const ziel = ereignisse.find(
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

    this.domaenenEreignisse.melde({ art: 'EREIGNIS_ANGEFUEGT', ausbildungId });
    return {
      ereignis,
      erreicht: false,
      hinweis: `«${MEILENSTEIN_TEXTE[ziel.meilenstein].name}»: Rücknahme gespeichert.`,
    };
  }

  private async pruefeRecht(ausbildungId: string): Promise<void> {
    const benutzer = this.sitzung.fordereBenutzer();
    const ausbildung = await this.ausbildungRepository.laden(ausbildungId).catch(() => {
      throw new FachlicherFehler('NICHT_GEFUNDEN', 'Ausbildung nicht gefunden.');
    });
    const zuordnungen = await this.ausbildungRepository.zuordnungen(ausbildung.id);
    forderePraxisbildnerRecht(benutzer, zuordnungen, this.uhr());
  }
}
