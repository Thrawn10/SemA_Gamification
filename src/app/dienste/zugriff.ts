import type { Ausbildung, Benutzer, Rolle, Zuordnung } from '@skilltree/vertraege';
import { FachlicherFehler } from '@skilltree/vertraege';
import { istZuordnungGueltig } from '@skilltree/regeln';

export function istPraxisbildnerMitGueltigerZuordnung(
  benutzer: Benutzer,
  zuordnungen: readonly Zuordnung[],
  jetzt: Date,
): boolean {
  return (
    benutzer.rolle === 'PRAXISBILDNER' &&
    zuordnungen.some(
      (zuordnung) =>
        zuordnung.praxisbildnerId === benutzer.id && istZuordnungGueltig(zuordnung, jetzt),
    )
  );
}

export function istLeseBerechtigt(
  benutzer: Benutzer,
  ausbildung: Ausbildung,
  zuordnungen: readonly Zuordnung[],
  jetzt: Date,
): boolean {
  if (benutzer.rolle === 'ADMIN') {
    return true;
  }
  if (benutzer.rolle === 'LERNENDE') {
    return ausbildung.lernendeId === benutzer.id;
  }
  return istPraxisbildnerMitGueltigerZuordnung(benutzer, zuordnungen, jetzt);
}

export function fordereLeseZugriff(
  benutzer: Benutzer,
  ausbildung: Ausbildung,
  zuordnungen: readonly Zuordnung[],
  jetzt: Date,
): void {
  if (!istLeseBerechtigt(benutzer, ausbildung, zuordnungen, jetzt)) {
    throw new FachlicherFehler('KEINE_BERECHTIGUNG', 'Du darfst diese Ausbildung nicht einsehen.');
  }
}

export function forderePraxisbildnerRecht(
  benutzer: Benutzer,
  zuordnungen: readonly Zuordnung[],
  jetzt: Date,
): void {
  if (!istPraxisbildnerMitGueltigerZuordnung(benutzer, zuordnungen, jetzt)) {
    throw new FachlicherFehler(
      'KEINE_BERECHTIGUNG',
      'Nur eine gültig zugeordnete Praxisbildnerin oder ein Praxisbildner darf bestätigen.',
    );
  }
}

export function fordereRolle(benutzer: Benutzer, ...rollen: Rolle[]): void {
  if (!rollen.includes(benutzer.rolle)) {
    throw new FachlicherFehler(
      'KEINE_BERECHTIGUNG',
      'Diese Aktion ist für deine Rolle nicht vorgesehen.',
    );
  }
}
