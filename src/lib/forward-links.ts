import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeEmail, hashEmail } from "./email-hash";

// Der Erstellen-Link aus der Status-Mail traegt die E-Mail signiert in der
// URL statt sie in der DB zu speichern (PII-Posture: DB kennt nur Hashes).
// Signatur: HMAC-SHA256 ueber token+email mit dem EMAIL_HASH_SECRET.
// Der Link landet ausschliesslich im Postfach des Absenders selbst.

function secret(): string {
  const s = process.env.EMAIL_HASH_SECRET;
  if (!s || s.length === 0) {
    throw new Error("EMAIL_HASH_SECRET is not set — cannot sign forward links.");
  }
  return s;
}

export function signForwardLink(token: string, email: string): string {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error("Keine E-Mail zum Signieren.");
  return createHmac("sha256", secret())
    .update(`forward-link:${token}:${normalized}`)
    .digest("hex");
}

/**
 * Prueft Signatur UND dass die E-Mail zum Batch gehoert (Hash-Vergleich).
 */
export function verifyForwardLink({
  token,
  email,
  signature,
  batchEmailHash,
}: {
  token: string;
  email: string;
  signature: string;
  batchEmailHash: string;
}): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized || !signature) return false;
  const expected = signForwardLink(token, normalized);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!timingSafeEqual(a, b)) return false;
  return hashEmail(normalized) === batchEmailHash;
}

export function buildForwardLink(baseUrl: string, token: string, email: string): string {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error("Keine E-Mail fuer den Link.");
  const e = Buffer.from(normalized, "utf8").toString("base64url");
  const s = signForwardLink(token, normalized);
  return `${baseUrl}/forward/${token}?e=${e}&s=${s}`;
}

export function decodeLinkEmail(encoded: string | null): string | null {
  if (!encoded) return null;
  try {
    return normalizeEmail(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
