// URL-safe short slug for shareable profile permalinks.

const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

export function generateSlug(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}
