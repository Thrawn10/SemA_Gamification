import {
  ApplicationConfig,
  InjectionToken,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { UHR } from './core/uhr';
import type { DatenSpeicher } from './daten/lokal/daten-speicher';
import { IndexedDbSpeicher } from './daten/lokal/indexed-db-speicher';
import { erstelleSeedDaten } from './daten/lokal/seed';
import { LokalerSitzungSpeicher } from './daten/lokal/sitzung-speicher';
import {
  AnfrageSpeicherAdapter,
  AusbildungSpeicherAdapter,
  BadgeSpeicherAdapter,
  BenutzerSpeicherAdapter,
  DatenbestandSpeicherAdapter,
  EreignisSpeicherAdapter,
  LehrberufSpeicherAdapter,
  VorlageSpeicherAdapter,
  type SeedFabrik,
} from './daten/lokal/speicher-adapter';
import { ladeVorlagen } from './daten/lokal/vorlagen-lader';
import { initialisiereApp } from './app-initialisierung';
import {
  ANFRAGE_REPOSITORY,
  AUSBILDUNG_REPOSITORY,
  BADGE_REPOSITORY,
  BENUTZER_REPOSITORY,
  DATEN_INITIALISIERER,
  DATENBESTAND_PORT,
  EREIGNIS_REPOSITORY,
  LEHRBERUF_REPOSITORY,
  SITZUNG_PORT,
  VORLAGE_REPOSITORY,
} from './daten/ports';

/**
 * The single place that chooses the data adapter (SPEC 0.7 rule 1). Swapping
 * this token for an HTTP implementation is the only change a backend needs.
 */
const SPEICHER = new InjectionToken<DatenSpeicher>('DatenSpeicher');

const seed: SeedFabrik = async () => {
  const importe = await ladeVorlagen();
  return erstelleSeedDaten(importe, new Date()).daten;
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: SPEICHER, useFactory: () => new IndexedDbSpeicher() },
    {
      provide: LEHRBERUF_REPOSITORY,
      useFactory: () => new LehrberufSpeicherAdapter(inject(SPEICHER)),
    },
    {
      provide: VORLAGE_REPOSITORY,
      useFactory: () => new VorlageSpeicherAdapter(inject(SPEICHER), inject(UHR)),
    },
    {
      provide: AUSBILDUNG_REPOSITORY,
      useFactory: () => new AusbildungSpeicherAdapter(inject(SPEICHER)),
    },
    {
      provide: EREIGNIS_REPOSITORY,
      useFactory: () => new EreignisSpeicherAdapter(inject(SPEICHER)),
    },
    {
      provide: ANFRAGE_REPOSITORY,
      useFactory: () => new AnfrageSpeicherAdapter(inject(SPEICHER)),
    },
    {
      provide: BENUTZER_REPOSITORY,
      useFactory: () => new BenutzerSpeicherAdapter(inject(SPEICHER)),
    },
    {
      provide: BADGE_REPOSITORY,
      useFactory: () => new BadgeSpeicherAdapter(inject(SPEICHER)),
    },
    {
      provide: DATENBESTAND_PORT,
      useFactory: () => new DatenbestandSpeicherAdapter(inject(SPEICHER), inject(UHR), seed),
    },
    {
      provide: DATEN_INITIALISIERER,
      useFactory: () => new DatenbestandSpeicherAdapter(inject(SPEICHER), inject(UHR), seed),
    },
    { provide: SITZUNG_PORT, useFactory: () => new LokalerSitzungSpeicher() },
    provideAppInitializer(initialisiereApp),
  ],
};
