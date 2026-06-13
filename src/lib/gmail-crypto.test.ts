import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, test } from "vitest";
import { decryptToken, encryptToken } from "./gmail-crypto";

beforeAll(() => {
  // 32-Byte-Schluessel (base64) fuer die Tests — nie ein Prod-Key.
  process.env.GMAIL_TOKEN_KEY = randomBytes(32).toString("base64");
});

describe("gmail-crypto", () => {
  test("round-trips a refresh token", () => {
    // Arrange
    const token = "1//refresh-token-value-xyz";

    // Act
    const enc = encryptToken(token);
    const dec = decryptToken(enc);

    // Assert
    expect(dec).toBe(token);
  });

  test("produces a different ciphertext each time (random IV)", () => {
    // Act
    const a = encryptToken("same-token");
    const b = encryptToken("same-token");

    // Assert
    expect(a).not.toBe(b);
    expect(decryptToken(a)).toBe(decryptToken(b));
  });

  test("rejects a tampered ciphertext (GCM auth tag)", () => {
    // Arrange
    const enc = encryptToken("tamper-me");
    const [iv, tag, ct] = enc.split(".");
    const flipped = ct.slice(0, -2) + (ct.endsWith("AA") ? "BB" : "AA");

    // Act + Assert
    expect(() => decryptToken(`${iv}.${tag}.${flipped}`)).toThrow();
  });

  test("rejects malformed input", () => {
    // Act + Assert
    expect(() => decryptToken("not-a-valid-blob")).toThrow();
  });
});
