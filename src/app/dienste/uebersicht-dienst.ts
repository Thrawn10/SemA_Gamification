import { inject, Service } from '@angular/core';
import type {
  AktiveAnfrageAnsicht,
  Ausbildung,
  Bestaetigungsanfrage,
  MeineDatenZeile,
  Stufenmodell,
  UebersichtZeile,
  VorlageStruktur,
} from '@skilltree/vertraege';
import { stufenmodellFuer } from '@skilltree/vertraege';
import {
  ampel,
  anzahlRoteKompetenzen,
  berechneLehrjahr,
  bereichswert,
  fortschritt,
  indexierePlan,
  stufenMapFuerModell,
  type PlanIndex,
} from '@skilltree/regeln';
import { UHR } from '../core/uhr';
import {
  ANFRAGE_REPOSITORY,
  AUSBILDUNG_REPOSITORY,
  BENUTZER_REPOSITORY,
  EREIGNIS_REPOSITORY,
  LEHRBERUF_REPOSITORY,
  VORLAGE_REPOSITORY,
} from '../daten/ports';
import { SitzungDienst } from './sitzung-dienst';
import { fordereRolle } from './zugriff';

interface PlanCache {
  index: PlanIndex;
  struktur: VorlageStruktur;
  modell: Stufenmodell;
}

@Service()
export class UebersichtDienst {
  private readonly sitzung = inject(SitzungDienst);
  private readonly ausbildungRepository = inject(AUSBILDUNG_REPOSITORY);
  private readonly vorlageRepository = inject(VORLAGE_REPOSITORY);
  private readonly lehrberufRepository = inject(LEHRBERUF_REPOSITORY);
  private readonly ereignisRepository = inject(EREIGNIS_REPOSITORY);
  private readonly anfrageRepository = inject(ANFRAGE_REPOSITORY);
  private readonly benutzerRepository = inject(BENUTZER_REPOSITORY);
  private readonly uhr = inject(UHR);

  async lernende(): Promise<UebersichtZeile[]> {
    const benutzer = this.sitzung.fordereBenutzer();
    fordereRolle(benutzer, 'PRAXISBILDNER');
    const jetzt = this.uhr();
    const ausbildungen = await this.ausbildungRepository.fuerPraxisbildner(
      benutzer.id,
      jetzt.toISOString(),
    );
    const alleBenutzer = new Map(
      (await this.benutzerRepository.alle()).map((eintrag) => [eintrag.id, eintrag]),
    );
    const caches = new Map<string, PlanCache>();
    const zeilen: UebersichtZeile[] = [];

    for (const ausbildung of ausbildungen) {
      const lernende = alleBenutzer.get(ausbildung.lernendeId);
      if (!lernende) {
        continue;
      }
      const cache = await this.planCache(ausbildung, caches);
      const [lehrberuf, ereignisse, anfragen] = await Promise.all([
        this.lehrberufRepository.laden(ausbildung.lehrberufId),
        this.ereignisRepository.stufenereignisse(ausbildung.id),
        this.anfrageRepository.fuerAusbildung(ausbildung.id),
      ]);
      const stufen = stufenMapFuerModell(ereignisse, cache.modell);
      zeilen.push({
        ausbildung,
        lernende,
        lehrberuf,
        stufenmodell: cache.modell,
        lehrjahr: berechneLehrjahr(ausbildung.lehrbeginn, jetzt, lehrberuf.lehrdauerJahre),
        fortschritt: fortschritt(cache.index.aktiveLeistungszielIds, stufen),
        bereiche: cache.index.bereiche.map((bereich) => {
          const ziele = bereich.kompetenzen.flatMap((kompetenz) => kompetenz.leistungszielIds);
          return {
            code: bereich.bereich.code,
            ampel: ampel(bereichswert(ziele, stufen)),
            fortschritt: fortschritt(ziele, stufen),
          };
        }),
        roteKompetenzen: cache.index.bereiche.reduce(
          (summe, bereich) =>
            summe +
            anzahlRoteKompetenzen(
              bereich.kompetenzen.map((kompetenz) => ({
                id: kompetenz.kompetenz.id,
                leistungszielIds: kompetenz.leistungszielIds,
              })),
              stufen,
            ),
          0,
        ),
        offeneAnfragen: anfragen.filter((anfrage) => anfrage.status === 'OFFEN').length,
      });
    }

    return zeilen.sort((a, b) => a.lernende.name.localeCompare(b.lernende.name, 'de'));
  }

  async offeneAnfragen(): Promise<AktiveAnfrageAnsicht[]> {
    const benutzer = this.sitzung.fordereBenutzer();
    fordereRolle(benutzer, 'PRAXISBILDNER');
    const jetzt = this.uhr();
    const anfragen = await this.anfrageRepository.offeneFuerPraxisbildner(
      benutzer.id,
      jetzt.toISOString(),
    );
    const alleBenutzer = new Map(
      (await this.benutzerRepository.alle()).map((eintrag) => [eintrag.id, eintrag]),
    );
    const caches = new Map<string, PlanCache>();
    const ergebnis: AktiveAnfrageAnsicht[] = [];

    for (const anfrage of anfragen) {
      const ausbildung = await this.ausbildungRepository.laden(anfrage.ausbildungId);
      const cache = await this.planCache(ausbildung, caches);
      const leistungsziel = cache.index.leistungszielNachId.get(anfrage.leistungszielId);
      const kompetenz = leistungsziel
        ? cache.index.kompetenzNachId.get(leistungsziel.kompetenzId)
        : undefined;
      const bereich = kompetenz
        ? cache.index.bereichNachId.get(kompetenz.kompetenz.bereichId)
        : undefined;
      const lernende = alleBenutzer.get(ausbildung.lernendeId);
      const lehrberuf = await this.lehrberufRepository.laden(ausbildung.lehrberufId);
      if (!leistungsziel || !kompetenz || !bereich || !lernende) {
        continue;
      }
      const ereignisse = await this.ereignisRepository.stufenereignisse(ausbildung.id);
      ergebnis.push({
        anfrage,
        ausbildung,
        lernende,
        lehrberuf,
        leistungsziel,
        kompetenz: kompetenz.kompetenz,
        bereich: bereich.bereich,
        aktuelleStufe:
          stufenMapFuerModell(ereignisse, cache.modell).get(anfrage.leistungszielId) ?? 0,
        stufenmodell: cache.modell,
      });
    }

    return ergebnis.sort((a, b) => a.anfrage.erstelltAm.localeCompare(b.anfrage.erstelltAm));
  }

  async offeneAnfrageFuer(anfrageId: string): Promise<Bestaetigungsanfrage | null> {
    const alle = await this.offeneAnfragen();
    return alle.find((eintrag) => eintrag.anfrage.id === anfrageId)?.anfrage ?? null;
  }

  meineDaten(): MeineDatenZeile[] {
    const benutzer = this.sitzung.fordereBenutzer();
    switch (benutzer.rolle) {
      case 'LERNENDE':
        return [
          {
            datenart: 'Name, Login, Lehrberuf, Lehrbeginn',
            sichtbarkeit: 'Du, zugeordnete Praxisbildner/innen, Administration',
          },
          {
            datenart: 'Stufen und Verlauf (Bestätigungen, Rücknahmen, Kommentare)',
            sichtbarkeit: 'Du, zugeordnete Praxisbildner/innen, Administration (Support)',
          },
          {
            datenart: 'Anfragen mit deinem Text',
            sichtbarkeit: 'Du, zugeordnete Praxisbildner/innen',
          },
          {
            datenart: 'Badges',
            sichtbarkeit:
              'Du, zugeordnete Praxisbildner/innen. Ausblenden ändert nur deine Ansicht.',
          },
        ];
      case 'PRAXISBILDNER':
        return [
          {
            datenart: 'Name, Login, Rolle',
            sichtbarkeit: 'Du, Administration',
          },
          {
            datenart: 'Zuordnungen zu Lernenden',
            sichtbarkeit: 'Du, betroffene Lernende, Administration',
          },
          {
            datenart: 'Bestätigungen, Rücknahmen, Kommentare',
            sichtbarkeit: 'Du, betroffene Lernende, Administration',
          },
          {
            datenart: 'Anfragen und deine Begründungen',
            sichtbarkeit: 'Du, betroffene Lernende, Administration',
          },
        ];
      case 'ADMIN':
        return [
          {
            datenart: 'Alle Personendaten und Ausbildungsdaten',
            sichtbarkeit: 'Administration (Support), soweit für den Betrieb nötig',
          },
          {
            datenart: 'Stufen, Verlauf, Anfragen, Badges',
            sichtbarkeit: 'Administration (Support)',
          },
          {
            datenart: 'Vorlagen und Importe',
            sichtbarkeit: 'Administration',
          },
        ];
    }
  }

  async eigeneAusbildung(): Promise<Ausbildung | null> {
    const benutzer = this.sitzung.fordereBenutzer();
    if (benutzer.rolle !== 'LERNENDE') {
      return null;
    }
    return this.ausbildungRepository.fuerLernende(benutzer.id);
  }

  private async planCache(
    ausbildung: Ausbildung,
    caches: Map<string, PlanCache>,
  ): Promise<PlanCache> {
    const vorhanden = caches.get(ausbildung.vorlageId);
    if (vorhanden) {
      return vorhanden;
    }
    const [vorlage, struktur] = await Promise.all([
      this.vorlageRepository.laden(ausbildung.vorlageId),
      this.vorlageRepository.struktur(ausbildung.vorlageId),
    ]);
    const cache = {
      struktur,
      index: indexierePlan(struktur),
      modell: stufenmodellFuer(vorlage.stufenmodell),
    };
    caches.set(ausbildung.vorlageId, cache);
    return cache;
  }
}
