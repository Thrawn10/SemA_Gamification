export type Fehlercode =
  | 'KEINE_BERECHTIGUNG'
  | 'NICHT_GEFUNDEN'
  | 'STUFE_NICHT_HOEHER'
  | 'ANFRAGE_BEREITS_OFFEN'
  | 'BEGRUENDUNG_ZU_KURZ'
  | 'UNGUELTIGE_EINGABE';

/** Typed error raised by application services. The UI maps the code to a German text. */
export class FachlicherFehler extends Error {
  constructor(
    readonly code: Fehlercode,
    message: string,
    readonly details?: Readonly<Record<string, string | number>>,
  ) {
    super(message);
    this.name = 'FachlicherFehler';
  }
}

export const FEHLER_TEXTE: Readonly<Record<Fehlercode, string>> = {
  KEINE_BERECHTIGUNG: 'Diese Aktion ist für dich nicht erlaubt.',
  NICHT_GEFUNDEN: 'Der Datensatz wurde nicht gefunden.',
  STUFE_NICHT_HOEHER: 'Diese Stufe ist nicht höher als die aktuelle Stufe.',
  ANFRAGE_BEREITS_OFFEN: 'Für dieses Leistungsziel ist bereits eine Anfrage offen.',
  BEGRUENDUNG_ZU_KURZ: 'Die Begründung muss mindestens 10 Zeichen enthalten.',
  UNGUELTIGE_EINGABE: 'Die Eingabe ist ungültig.',
};
