import { inject, Service } from '@angular/core';
import type {
  AnfrageAblehnen,
  AnfrageErgebnis,
  AnfrageStellen,
  AnfrageZurueckziehen,
  Ausbildung,
  Bestaetigungsanfrage,
  Stufe,
} from '@skilltree/vertraege';
import { FachlicherFehler } from '@skilltree/vertraege';
import { indexierePlan, stufenMap } from '@skilltree/regeln';
import { DomaenenEreignisse } from '../core/domaenen-ereignisse';
import { UHR } from '../core/uhr';
import {
  ANFRAGE_REPOSITORY,
  AUSBILDUNG_REPOSITORY,
  EREIGNIS_REPOSITORY,
  VORLAGE_REPOSITORY,
} from '../daten/ports';
import { SitzungDienst } from './sitzung-dienst';
import { forderePraxisbildnerRecht, fordereRolle } from './zugriff';

@Service()
export class AnfrageDienst {
  private readonly sitzung = inject(SitzungDienst);
  private readonly ausbildungRepository = inject(AUSBILDUNG_REPOSITORY);
  private readonly vorlageRepository = inject(VORLAGE_REPOSITORY);
  private readonly ereignisRepository = inject(EREIGNIS_REPOSITORY);
  private readonly anfrageRepository = inject(ANFRAGE_REPOSITORY);
  private readonly uhr = inject(UHR);
  private readonly domaenenEreignisse = inject(DomaenenEreignisse);

  async stellen(ausbildungId: string, befehl: AnfrageStellen): Promise<AnfrageErgebnis> {
    const benutzer = this.sitzung.fordereBenutzer();
    fordereRolle(benutzer, 'LERNENDE');
    const ausbildung = await this.ladeAusbildung(ausbildungId);
    if (ausbildung.lernendeId !== benutzer.id) {
      throw new FachlicherFehler(
        'KEINE_BERECHTIGUNG',
        'Du kannst nur für deine eigene Ausbildung anfragen.',
      );
    }

    const text = befehl.text.trim();
    if (text.length < 10 || text.length > 1000) {
      throw new FachlicherFehler(
        'UNGUELTIGE_EINGABE',
        `Der Text muss 10 bis 1000 Zeichen enthalten. Aktuell ${text.length} Zeichen.`,
        { laenge: text.length },
      );
    }

    const [struktur, ereignisse, anfragen] = await Promise.all([
      this.vorlageRepository.struktur(ausbildung.vorlageId),
      this.ereignisRepository.stufenereignisse(ausbildungId),
      this.anfrageRepository.fuerAusbildung(ausbildungId),
    ]);
    const index = indexierePlan(struktur);
    const leistungsziel = index.leistungszielNachId.get(befehl.leistungszielId);
    if (!leistungsziel) {
      throw new FachlicherFehler('NICHT_GEFUNDEN', 'Leistungsziel nicht gefunden.');
    }

    const stufe: Stufe = stufenMap(ereignisse).get(befehl.leistungszielId) ?? 0;
    if (befehl.zielstufe <= stufe) {
      throw new FachlicherFehler(
        'UNGUELTIGE_EINGABE',
        'Die Zielstufe muss über der aktuellen Stufe liegen.',
      );
    }

    if (
      anfragen.some(
        (anfrage) =>
          anfrage.leistungszielId === befehl.leistungszielId && anfrage.status === 'OFFEN',
      )
    ) {
      throw new FachlicherFehler(
        'ANFRAGE_BEREITS_OFFEN',
        'Für dieses Leistungsziel ist bereits eine Anfrage offen.',
      );
    }

    const anfrage = await this.anfrageRepository.erstellen({
      ausbildungId,
      leistungszielId: befehl.leistungszielId,
      zielstufe: befehl.zielstufe,
      text,
      erstelltAm: this.uhr().toISOString(),
    });
    this.domaenenEreignisse.melde({ art: 'EREIGNIS_ANGEFUEGT', ausbildungId });

    return {
      anfrage,
      offeneAnfrageAnzahl:
        anfragen.filter(
          (eintrag) =>
            eintrag.status === 'OFFEN' && eintrag.leistungszielId !== anfrage.leistungszielId,
        ).length + 1,
    };
  }

  async zurueckziehen(befehl: AnfrageZurueckziehen): Promise<Bestaetigungsanfrage> {
    const benutzer = this.sitzung.fordereBenutzer();
    fordereRolle(benutzer, 'LERNENDE');
    const anfrage = await this.anfrageRepository.laden(befehl.anfrageId).catch(() => {
      throw new FachlicherFehler('NICHT_GEFUNDEN', 'Anfrage nicht gefunden.');
    });
    const ausbildung = await this.ladeAusbildung(anfrage.ausbildungId);
    if (ausbildung.lernendeId !== benutzer.id) {
      throw new FachlicherFehler(
        'KEINE_BERECHTIGUNG',
        'Du kannst nur deine eigenen Anfragen zurückziehen.',
      );
    }
    if (anfrage.status !== 'OFFEN') {
      throw new FachlicherFehler(
        'UNGUELTIGE_EINGABE',
        'Nur eine offene Anfrage kann zurückgezogen werden.',
      );
    }
    const aktualisiert = await this.anfrageRepository.statusSetzen(anfrage.id, {
      status: 'ZURUECKGEZOGEN',
      beantwortetAm: this.uhr().toISOString(),
      beantwortetVon: benutzer.id,
    });
    this.domaenenEreignisse.melde({
      art: 'EREIGNIS_ANGEFUEGT',
      ausbildungId: anfrage.ausbildungId,
    });
    return aktualisiert;
  }

  async ablehnen(befehl: AnfrageAblehnen): Promise<Bestaetigungsanfrage> {
    const benutzer = this.sitzung.fordereBenutzer();
    const anfrage = await this.anfrageRepository.laden(befehl.anfrageId).catch(() => {
      throw new FachlicherFehler('NICHT_GEFUNDEN', 'Anfrage nicht gefunden.');
    });
    const ausbildung = await this.ladeAusbildung(anfrage.ausbildungId);
    const zuordnungen = await this.ausbildungRepository.zuordnungen(anfrage.ausbildungId);
    forderePraxisbildnerRecht(benutzer, zuordnungen, this.uhr());

    const antwort = befehl.antwort.trim();
    if (antwort.length < 10) {
      throw new FachlicherFehler(
        'BEGRUENDUNG_ZU_KURZ',
        `Die Begründung muss mindestens 10 Zeichen enthalten. Aktuell ${antwort.length} Zeichen.`,
        { laenge: antwort.length },
      );
    }
    if (antwort.length > 500) {
      throw new FachlicherFehler(
        'UNGUELTIGE_EINGABE',
        'Die Begründung darf höchstens 500 Zeichen enthalten.',
      );
    }
    if (anfrage.status !== 'OFFEN') {
      throw new FachlicherFehler(
        'UNGUELTIGE_EINGABE',
        'Nur eine offene Anfrage kann abgelehnt werden.',
      );
    }

    const aktualisiert = await this.anfrageRepository.statusSetzen(anfrage.id, {
      status: 'ABGELEHNT',
      beantwortetAm: this.uhr().toISOString(),
      beantwortetVon: benutzer.id,
      antwort,
    });
    this.domaenenEreignisse.melde({
      art: 'EREIGNIS_ANGEFUEGT',
      ausbildungId: ausbildung.id,
    });
    return aktualisiert;
  }

  private async ladeAusbildung(ausbildungId: string): Promise<Ausbildung> {
    return this.ausbildungRepository.laden(ausbildungId).catch(() => {
      throw new FachlicherFehler('NICHT_GEFUNDEN', 'Ausbildung nicht gefunden.');
    });
  }
}
