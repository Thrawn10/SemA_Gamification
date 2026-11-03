import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

export interface DomaenenEreignis {
  art: 'EREIGNIS_ANGEFUEGT' | 'DATEN_ZURUECKGESETZT' | 'DATEN_IMPORTIERT';
  ausbildungId?: string;
}

/**
 * In-process event hook (SPEC 0.7 point 9). The UI subscribes to refresh its
 * view; later add-ons can attach here without changing the application.
 */
@Injectable({ providedIn: 'root' })
export class DomaenenEreignisse {
  private readonly subject = new Subject<DomaenenEreignis>();

  readonly ereignisse$ = this.subject.asObservable();

  /** Increments after every domain event; templates can read it as a change token. */
  readonly version = signal(0);

  melde(ereignis: DomaenenEreignis): void {
    this.subject.next(ereignis);
    this.version.update((wert) => wert + 1);
  }
}
