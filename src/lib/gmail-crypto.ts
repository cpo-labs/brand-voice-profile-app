import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Verschluesselt Gmail-Refresh-Tokens at-rest (AES-256-GCM). Der Schluessel
// kommt aus GMAIL_TOKEN_KEY (32 Byte, base64) — nie hartcodiert, nie im Repo.
// Format des Chiffrats: base64url(iv).base64url(tag).base64url(ciphertext).
//
// Teil des Gmail-OAuth-Skeletons: nur in Nutzung, wenn GMAIL_OAUTH_ENABLED
// gesetzt ist. Ohne Schluessel wirft loadKey — der Pfad ist dann nicht
// erreichbar (fail closed).

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // GCM-Standard
const KEY_BYTES = 32;

function loadKey(): Buffer {
  const raw = process.env.GMAIL_TOKEN_KEY;
  if (!raw) {
    throw new Error("GMAIL_TOKEN_KEY is not set — cannot encrypt Gmail tokens.");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(`GMAIL_TOKEN_KEY must decode to ${KEY_BYTES} bytes (got ${key.length}).`);
  }
  return key;
}

export function encryptToken(plaintext: string): string {
  const key = loadKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((b) => b.toString("base64url")).join(".");
}

export function decryptToken(encoded: string): string {
  const key = loadKey();
  const parts = encoded.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted Gmail token.");
  }
  const [iv, tag, ciphertext] = parts.map((p) => Buffer.from(p, "base64url"));
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
