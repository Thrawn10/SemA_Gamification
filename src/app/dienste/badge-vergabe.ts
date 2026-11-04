import type {
  BadgeDefinition,
  BadgeVergabe,
  MeilensteinEreignis,
  Stufenereignis,
  Stufenmodell,
} from '@skilltree/vertraege';
import { berechneBadgeVergaben, type PlanIndex } from '@skilltree/regeln';

export interface BadgeAenderung {
  definition: BadgeDefinition;
  vergabe: BadgeVergabe;
}

export interface BadgeNeuberechnung {
  neue: BadgeAenderung[];
  inaktive: BadgeAenderung[];
  vergaben: BadgeVergabe[];
}

/**
 * R-B5: recompute badge awards before and after a write and return the differences plus the
 * new materialised state. Stage and milestone writes share this path so a milestone badge
 * appears in the confirmation message as well.
 */
export function ermittleBadgeAenderungen(
  definitionen: readonly BadgeDefinition[],
  index: PlanIndex,
  ausbildungId: string,
  modell: Stufenmodell,
  vorherStufen: readonly Stufenereignis[],
  nachherStufen: readonly Stufenereignis[],
  vorherMeilensteine: readonly MeilensteinEreignis[] = [],
  nachherMeilensteine: readonly MeilensteinEreignis[] = [],
): BadgeNeuberechnung {
  const vorher = berechneBadgeVergaben(
    definitionen,
    index,
    vorherStufen,
    ausbildungId,
    modell,
    vorherMeilensteine,
  );
  const nachher = berechneBadgeVergaben(
    definitionen,
    index,
    nachherStufen,
    ausbildungId,
    modell,
    nachherMeilensteine,
  );
  const vorherMap = new Map(vorher.map((vergabe) => [vergabe.badgeId, vergabe]));
  const definitionMap = new Map(definitionen.map((definition) => [definition.id, definition]));

  const neue = nachher.flatMap((vergabe) => {
    const alt = vorherMap.get(vergabe.badgeId);
    const definition = definitionMap.get(vergabe.badgeId);
    return definition && vergabe.aktiv && (!alt || !alt.aktiv) ? [{ definition, vergabe }] : [];
  });
  const inaktive = nachher.flatMap((vergabe) => {
    const alt = vorherMap.get(vergabe.badgeId);
    const definition = definitionMap.get(vergabe.badgeId);
    return definition && alt?.aktiv === true && !vergabe.aktiv ? [{ definition, vergabe }] : [];
  });

  return { neue, inaktive, vergaben: nachher };
}
