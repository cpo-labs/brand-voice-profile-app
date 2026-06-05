import { createHmac } from "node:crypto";

// E-Mail-Adressen sind PII und werden NICHT im Klartext persistiert. Fuer
// Rate-Limit- und Dedup-Lookups speichern wir nur einen deterministischen
// HMAC-SHA256 ueber die normalisierte Adresse. Der Schluessel
// (EMAIL_HASH_SECRET) liegt serverseitig — ohne ihn ist der Hash nicht
// rueckrechenbar und auch nicht per Rainbow-Table angreifbar.

/**
 * Normalisiert eine E-Mail fuer den Hash: trimmen + lowercase. Gibt null
 * zurueck, wenn keine sinnvolle Adresse vorliegt (eingabefreier Drop-Flow).
 */
export function normalizeEmail(email?: string | null): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Berechnet den HMAC-SHA256 ueber die normalisierte E-Mail. Gibt null zurueck,
 * wenn keine Adresse vorliegt. Wirft, wenn das Server-Secret fehlt — fail-fast,
 * damit wir nie versehentlich mit einem leeren/Default-Key hashen.
 */
export function hashEmail(email?: string | null): string | null {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const secret = process.env.EMAIL_HASH_SECRET;
  if (!secret || secret.length === 0) {
    throw new Error(
      "EMAIL_HASH_SECRET is not set — cannot hash email for rate-limit lookup."
    );
  }

  return createHmac("sha256", secret).update(normalized).digest("hex");
}
