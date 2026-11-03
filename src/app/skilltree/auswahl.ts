import type { MeilensteinCode } from '@skilltree/vertraege';

export type BaumAuswahl =
  | { art: 'kompetenz'; id: string }
  | { art: 'ast'; code: string }
  | { art: 'meilenstein'; code: MeilensteinCode };
