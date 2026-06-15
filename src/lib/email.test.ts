import { describe, test, expect, vi, beforeEach } from "vitest";

// RESEND_API_KEY + Mock VOR dem Modul-Import setzen (email.ts liest den Key
// beim Import). vi.hoisted laeuft vor den Imports.
const { sendMock } = vi.hoisted(() => {
  process.env.RESEND_API_KEY = "test-resend-key";
  return { sendMock: vi.fn() };
});

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

import { sendProfileReady } from "./email";

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: "test" }, error: null });
});

describe("sendProfileReady", () => {
  test("haengt die VOICE.md als Datei-Anhang an, wenn voiceMd gesetzt ist", async () => {
    // Arrange
    const voiceMd = "# Stimmprofil\n\nGrüße aus München: ä ö ü ß Fuß Größe.";

    // Act
    await sendProfileReady({
      email: "test@example.com",
      permalink: "https://example.com/voice/abc123",
      voiceMd,
      fileName: "stimmprofil-abc123.txt",
    });

    // Assert
    expect(sendMock).toHaveBeenCalledTimes(1);
    const payload = sendMock.mock.calls[0][0];
    expect(payload.to).toBe("test@example.com");
    expect(payload.attachments).toHaveLength(1);
    expect(payload.attachments[0].filename).toBe("stimmprofil-abc123.txt");
    // Anhang-Inhalt ist ein UTF-8-Buffer mit korrekten Umlauten.
    const content: Buffer = payload.attachments[0].content;
    expect(Buffer.isBuffer(content)).toBe(true);
    expect(content.toString("utf-8")).toBe(voiceMd);
    expect(content.toString("utf-8")).toContain("Grüße");
  });

  test("schickt ohne voiceMd nur den Permalink, keinen Anhang", async () => {
    // Act
    await sendProfileReady({
      email: "test@example.com",
      permalink: "https://example.com/voice/abc123",
    });

    // Assert
    expect(sendMock).toHaveBeenCalledTimes(1);
    const payload = sendMock.mock.calls[0][0];
    expect(payload.attachments).toBeUndefined();
    expect(payload.text).toContain("https://example.com/voice/abc123");
  });
});
