import { computed, inject, Service, signal } from '@angular/core';
import type { Benutzer, Benutzereinstellung } from '@skilltree/vertraege';
import { FachlicherFehler } from '@skilltree/vertraege';
import { BENUTZER_REPOSITORY, SITZUNG_PORT } from '../daten/ports';
import { fordereRolle } from './zugriff';

@Service()
export class SitzungDienst {
  private readonly benutzerRepository = inject(BENUTZER_REPOSITORY);
  private readonly sitzungPort = inject(SITZUNG_PORT);

  private readonly benutzerSignal = signal<Benutzer | null>(null);
  private readonly einstellungSignal = signal<Benutzereinstellung | null>(null);

  readonly benutzer = this.benutzerSignal.asReadonly();
  readonly einstellung = this.einstellungSignal.asReadonly();
  readonly rolle = computed(() => this.benutzerSignal()?.rolle ?? null);
  readonly istAngemeldet = computed(() => this.benutzerSignal() !== null);

  async initialisieren(): Promise<void> {
    const benutzerId = await this.sitzungPort.laden();
    if (!benutzerId) {
      return;
    }
    try {
      const benutzer = await this.benutzerRepository.laden(benutzerId);
      await this.setzen(benutzer);
    } catch {
      await this.sitzungPort.speichern(null);
    }
  }

  /** Seed accounts for the local login page (no password, SPEC 0.3). */
  async konten(): Promise<Benutzer[]> {
    const benutzer = await this.benutzerRepository.alle();
    return benutzer.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }

  async anmelden(login: string): Promise<Benutzer> {
    const benutzer = await this.benutzerRepository.nachLogin(login);
    if (!benutzer) {
      throw new FachlicherFehler('NICHT_GEFUNDEN', 'Dieses Testkonto gibt es nicht.');
    }
    await this.setzen(benutzer);
    await this.sitzungPort.speichern(benutzer.id);
    return benutzer;
  }

  async abmelden(): Promise<void> {
    this.benutzerSignal.set(null);
    this.einstellungSignal.set(null);
    await this.sitzungPort.speichern(null);
  }

  fordereBenutzer(): Benutzer {
    const benutzer = this.benutzerSignal();
    if (!benutzer) {
      throw new FachlicherFehler('KEINE_BERECHTIGUNG', 'Bitte zuerst anmelden.');
    }
    return benutzer;
  }

  async badgesAusblenden(ausblenden: boolean): Promise<void> {
    const benutzer = this.fordereBenutzer();
    fordereRolle(benutzer, 'LERNENDE');
    const einstellung: Benutzereinstellung = {
      benutzerId: benutzer.id,
      badgesAusgeblendet: ausblenden,
    };
    await this.benutzerRepository.einstellungenSpeichern(einstellung);
    this.einstellungSignal.set(einstellung);
  }

  private async setzen(benutzer: Benutzer): Promise<void> {
    this.benutzerSignal.set(benutzer);
    await this.ladeEinstellung(benutzer.id);
  }

  private async ladeEinstellung(benutzerId: string): Promise<void> {
    const einstellung = await this.benutzerRepository.einstellungen(benutzerId);
    this.einstellungSignal.set(einstellung);
  }
}
