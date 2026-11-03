export type Rolle = 'LERNENDE' | 'PRAXISBILDNER' | 'ADMIN';

export interface Benutzer {
  id: string;
  login: string;
  name: string;
  rolle: Rolle;
}

export interface Benutzereinstellung {
  benutzerId: string;
  badgesAusgeblendet: boolean;
}

export const ROLLEN_TEXTE: Readonly<Record<Rolle, string>> = {
  LERNENDE: 'Lernende/r',
  PRAXISBILDNER: 'Praxisbildner/in',
  ADMIN: 'Administration',
};
