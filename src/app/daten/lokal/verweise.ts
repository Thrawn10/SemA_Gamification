/**
 * Cross edges documented in SPEC R-T2. The templates contain no machine-readable
 * cross references, so the documented result is applied per Lehrberuf.
 */
export const TEXTVERWEISE: Readonly<Record<string, readonly [string, string][]>> = {
  'INF-APP': [
    ['a1', 'g1'],
    ['a3', 'g4'],
    ['a3', 'h3'],
  ],
  'INF-PLA': [
    ['a1', 'd1'],
    ['a7', 'd4'],
    ['a1', 'e1'],
  ],
  MED: [],
};
