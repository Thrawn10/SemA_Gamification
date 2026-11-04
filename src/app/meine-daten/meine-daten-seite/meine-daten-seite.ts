import { Component, computed, inject } from '@angular/core';
import { ROLLEN_TEXTE } from '@skilltree/vertraege';
import { SitzungDienst } from '../../dienste/sitzung-dienst';
import { UebersichtDienst } from '../../dienste/uebersicht-dienst';
import { AnforderungId } from '../../shared/ui/anforderung-id/anforderung-id';

/** «Meine Daten»: role-dependent transparency table (S-Q01, T-D1). */
@Component({
  selector: 'st-meine-daten-seite',
  imports: [AnforderungId],
  templateUrl: './meine-daten-seite.html',
  styleUrl: './meine-daten-seite.scss',
})
export class MeineDatenSeite {
  private readonly sitzung = inject(SitzungDienst);
  private readonly uebersicht = inject(UebersichtDienst);

  protected readonly benutzer = this.sitzung.benutzer;
  protected readonly zeilen = computed(() => this.uebersicht.meineDaten());

  protected readonly rollenText = computed(() => {
    const rolle = this.sitzung.rolle();
    return rolle ? ROLLEN_TEXTE[rolle] : '';
  });

  protected readonly badgesSichtbar = computed(
    () => !(this.sitzung.einstellung()?.badgesAusgeblendet ?? false),
  );
}
