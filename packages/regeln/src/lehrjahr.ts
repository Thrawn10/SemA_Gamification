import type { Zuordnung } from '@skilltree/vertraege';

/**
 * S-A01: school year = full years since the apprenticeship start + 1, capped at
 * the configured duration. Dates are compared in UTC.
 */
export function berechneLehrjahr(lehrbeginn: string, jetzt: Date, lehrdauerJahre: number): number {
  const beginn = new Date(lehrbeginn);
  if (Number.isNaN(beginn.getTime())) {
    return 1;
  }

  let jahre = jetzt.getUTCFullYear() - beginn.getUTCFullYear();
  const monatVergleich =
    jetzt.getUTCMonth() - beginn.getUTCMonth() || jetzt.getUTCDate() - beginn.getUTCDate();
  if (monatVergleich < 0) {
    jahre--;
  }

  return Math.min(Math.max(jahre + 1, 1), lehrdauerJahre);
}

/** R-S3: a Zuordnung is valid when gueltigVon <= now and (gueltigBis is empty or >= now). */
export function istZuordnungGueltig(zuordnung: Zuordnung, jetzt: Date): boolean {
  const von = new Date(zuordnung.gueltigVon).getTime();
  if (Number.isNaN(von) || von > jetzt.getTime()) {
    return false;
  }
  if (!zuordnung.gueltigBis) {
    return true;
  }
  const bis = new Date(zuordnung.gueltigBis).getTime();
  return !Number.isNaN(bis) && bis >= jetzt.getTime();
}
