import type { Ampel, BadgeAnsicht, SkilltreeAnsicht } from '@skilltree/vertraege';
import { ABSCHLUSS_STUFE, stufenText } from '@skilltree/vertraege';

/** One competence of an area, reduced to the level counts shown in the area sidebar. */
export interface BelohnungSkill {
  id: string;
  code: string;
  titel: string;
  /** Objectives of this competence on the top level (selbständig / abgeschlossen). */
  erreicht: number;
  gesamt: number;
  ampel: Ampel;
}

/**
 * Completion reward of one area ("Ast"). Derived from the existing badge definitions
 * (`BEREICH_ABGESCHLOSSEN`, R-B3) and the stage counts of the plan; nothing is stored and no
 * rule is added. A missing definition is allowed and rendered as "kein Badge".
 */
export interface AstBelohnung {
  code: string;
  titel: string;
  fortschritt: number;
  ampel: Ampel;
  abschluss: BadgeAnsicht | null;
  skills: BelohnungSkill[];
  /** Skills that are not fully on the top level yet. */
  offeneSkills: number;
  /** Count sentence under the heading, e.g. «3 von 5 Kompetenzen selbständig». */
  skillsText: string;
}

function alleBadges(ansicht: SkilltreeAnsicht): BadgeAnsicht[] {
  return [...ansicht.badges.erhalten, ...ansicht.badges.inaktiv, ...ansicht.badges.offen];
}

/** «3 von 5 Kompetenzen selbständig», with a singular form for one-competence areas. */
export function kompetenzStandText(erreicht: number, gesamt: number, stufe: string): string {
  if (gesamt <= 0) {
    return `Keine Kompetenzen ${stufe}`;
  }
  if (gesamt === 1) {
    return erreicht >= gesamt
      ? `Die Kompetenz ist ${stufe}`
      : `${erreicht} von 1 Kompetenz ${stufe}`;
  }
  return erreicht >= gesamt
    ? `Alle ${gesamt} Kompetenzen sind ${stufe}`
    : `${erreicht} von ${gesamt} Kompetenzen ${stufe}`;
}

/** Maps the completion badge of every area to the competences it certifies (R-B3). */
export function astBelohnungen(ansicht: SkilltreeAnsicht): AstBelohnung[] {
  const badges = alleBadges(ansicht);
  const stufe = stufenText(ansicht.stufenmodell, ABSCHLUSS_STUFE);
  return ansicht.bereiche.map((bereich) => {
    const abschluss =
      badges.find(
        (badge) =>
          badge.definition.regeltyp === 'BEREICH_ABGESCHLOSSEN' &&
          badge.definition.parameter.bereichId === bereich.bereich.id,
      ) ?? null;
    const skills: BelohnungSkill[] = bereich.kompetenzen.map((kompetenz) => ({
      id: kompetenz.kompetenz.id,
      code: kompetenz.kompetenz.code,
      titel: kompetenz.kompetenz.titel,
      erreicht: kompetenz.abgeschlosseneLeistungsziele,
      gesamt: kompetenz.anzahlLeistungsziele,
      ampel: kompetenz.ampel,
    }));
    const offeneSkills = skills.filter((skill) => skill.erreicht < skill.gesamt).length;
    return {
      code: bereich.bereich.code,
      titel: bereich.bereich.titel,
      fortschritt: bereich.fortschritt,
      ampel: bereich.ampel,
      abschluss,
      skills,
      offeneSkills,
      skillsText: kompetenzStandText(skills.length - offeneSkills, skills.length, stufe),
    };
  });
}

/** Completion reward of a single area, used by the area sidebar. */
export function belohnungFuerAst(ansicht: SkilltreeAnsicht, code: string): AstBelohnung | null {
  return astBelohnungen(ansicht).find((belohnung) => belohnung.code === code) ?? null;
}
