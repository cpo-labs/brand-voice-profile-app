import { describe, expect, test } from "vitest";
import {
  buildForwardLink,
  decodeLinkEmail,
  signForwardLink,
  verifyForwardLink,
} from "./forward-links";
import { hashEmail } from "./email-hash";

// EMAIL_HASH_SECRET wird in tests/setup.ts gesetzt.

const TOKEN = "test-token-abc";
const EMAIL = "max@example.com";

describe("signForwardLink / verifyForwardLink", () => {
  test("verifies a freshly signed link", () => {
    // Arrange
    const signature = signForwardLink(TOKEN, EMAIL);

    // Act
    const ok = verifyForwardLink({
      token: TOKEN,
      email: EMAIL,
      signature,
      batchEmailHash: hashEmail(EMAIL) as string,
    });

    // Assert
    expect(ok).toBe(true);
  });

  test("normalizes case so the signature is email-canonical", () => {
    // Arrange
    const signature = signForwardLink(TOKEN, "Max@Example.com");

    // Act
    const ok = verifyForwardLink({
      token: TOKEN,
      email: EMAIL,
      signature,
      batchEmailHash: hashEmail(EMAIL) as string,
    });

    // Assert
    expect(ok).toBe(true);
  });

  test("rejects a tampered signature", () => {
    // Act
    const ok = verifyForwardLink({
      token: TOKEN,
      email: EMAIL,
      signature: "deadbeef",
      batchEmailHash: hashEmail(EMAIL) as string,
    });

    // Assert
    expect(ok).toBe(false);
  });

  test("rejects when the email does not match the batch hash", () => {
    // Arrange
    const signature = signForwardLink(TOKEN, EMAIL);

    // Act: gueltige Signatur, aber Hash eines anderen Absenders
    const ok = verifyForwardLink({
      token: TOKEN,
      email: EMAIL,
      signature,
      batchEmailHash: hashEmail("someone-else@example.com") as string,
    });

    // Assert
    expect(ok).toBe(false);
  });

  test("rejects when the token differs from the signed one", () => {
    // Arrange
    const signature = signForwardLink(TOKEN, EMAIL);

    // Act
    const ok = verifyForwardLink({
      token: "other-token",
      email: EMAIL,
      signature,
      batchEmailHash: hashEmail(EMAIL) as string,
    });

    // Assert
    expect(ok).toBe(false);
  });
});

describe("buildForwardLink / decodeLinkEmail", () => {
  test("round-trips the email through the encoded link param", () => {
    // Arrange
    const link = buildForwardLink("https://voice.example.com", TOKEN, EMAIL);
    const url = new URL(link);

    // Act
    const decoded = decodeLinkEmail(url.searchParams.get("e"));

    // Assert
    expect(url.pathname).toBe(`/forward/${TOKEN}`);
    expect(decoded).toBe(EMAIL);
  });

  test("the built link carries a signature that verifies", () => {
    // Arrange
    const link = buildForwardLink("https://voice.example.com", TOKEN, EMAIL);
    const url = new URL(link);

    // Act
    const ok = verifyForwardLink({
      token: TOKEN,
      email: decodeLinkEmail(url.searchParams.get("e")) as string,
      signature: url.searchParams.get("s") as string,
      batchEmailHash: hashEmail(EMAIL) as string,
    });

    // Assert
    expect(ok).toBe(true);
  });

  test("decodeLinkEmail returns null for missing input", () => {
    // Assert
    expect(decodeLinkEmail(null)).toBeNull();
  });
});
