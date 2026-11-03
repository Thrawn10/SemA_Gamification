/**
 * RFC 9562 UUID version 7: 48 bit Unix timestamp in milliseconds followed by
 * random bits. Time-sortable, which keeps append-only event lists ordered.
 */
export function erzeugeId(): string {
  const bytes = new Uint8Array(16);
  const jetzt = Date.now();

  bytes[0] = (jetzt / 2 ** 40) & 0xff;
  bytes[1] = (jetzt / 2 ** 32) & 0xff;
  bytes[2] = (jetzt / 2 ** 24) & 0xff;
  bytes[3] = (jetzt / 2 ** 16) & 0xff;
  bytes[4] = (jetzt / 2 ** 8) & 0xff;
  bytes[5] = jetzt & 0xff;

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes.subarray(6));
  } else {
    for (let i = 6; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Deterministic, non-cryptographic checksum used for imported template versions. */
export function pruefsumme(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
