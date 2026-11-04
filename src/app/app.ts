import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ROLLEN_TEXTE } from '@skilltree/vertraege';
import { DEMO_MODE } from './core/konfiguration';
import { DemoLeiste } from './demo-steuerung/demo-leiste/demo-leiste';
import { SitzungDienst } from './dienste/sitzung-dienst';

@Component({
  imports: [RouterOutlet, RouterLink, DemoLeiste],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly demoAktiv = DEMO_MODE;
  protected readonly sitzung = inject(SitzungDienst);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly hauptinhalt = viewChild<ElementRef<HTMLElement>>('hauptinhalt');

  protected readonly rollenText = computed(() => {
    const rolle = this.sitzung.rolle();
    return rolle ? ROLLEN_TEXTE[rolle] : '';
  });

  constructor() {
    // A single-page navigation must move focus into the new view and announce it (2.4.3).
    this.router.events
      .pipe(
        filter((ereignis): ereignis is NavigationEnd => ereignis instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        afterNextRender(() => this.hauptinhalt()?.nativeElement.focus(), {
          injector: this.injector,
        });
      });
  }

  protected async abmelden(): Promise<void> {
    await this.sitzung.abmelden();
    await this.router.navigate(['/anmeldung']);
  }
}
