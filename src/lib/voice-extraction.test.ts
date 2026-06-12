import { afterEach, describe, expect, test, vi } from "vitest";
import { markersFixture, essenceFixture } from "../../tests/fixtures/profile-fixture";

// Anthropic wird gemockt — die Pipeline-Logik (Sampling, Mode-Detection,
// Orchestrierung, Validierung) laeuft echt.
const createMock = vi.fn();
vi.mock("./anthropic", () => ({
  getAnthropic: () => ({ messages: { create: createMock } }),
  VOICE_MODEL: "test-model",
}));

import {
  extractVoice,
  detectModeHint,
  sampleForAnalysis,
  SAMPLE_CHAR_BUDGET,
} from "./voice-extraction";
import { validateMarkers } from "./voice-markers";
import { validateEssence } from "./voice-essence";

function toolResponse(name: string, input: unknown) {
  return {
    stop_reason: "tool_use",
    content: [{ type: "tool_use", name, input }],
  };
}

afterEach(() => {
  createMock.mockReset();
});

describe("detectModeHint", () => {
  test("detects a finished style guide as 'uebersetzt'", () => {
    const texts = [{ filename: "styleguide.md", content: "Unsere Schreibrichtlinie." }];
    expect(detectModeHint(texts)).toBe("uebersetzt");
  });

  test("detects raw mails as 'destilliert'", () => {
    const texts = [{ filename: "mail1.txt", content: "Hi Anna, der Entwurf passt. Melde dich." }];
    expect(detectModeHint(texts)).toBe("destilliert");
  });
});

describe("sampleForAnalysis", () => {
  test("returns texts unchanged when under budget", () => {
    const texts = [{ filename: "a.txt", content: "kurzer Text" }];
    expect(sampleForAnalysis(texts)).toEqual(texts);
  });

  test("samples head and tail when over budget", () => {
    // Arrange: eine Datei deutlich ueber dem Budget
    const big = "A".repeat(SAMPLE_CHAR_BUDGET + 100_000);
    const texts = [{ filename: "big.txt", content: big }];

    // Act
    const sampled = sampleForAnalysis(texts);

    // Assert
    expect(sampled[0].content.length).toBeLessThan(big.length);
    expect(sampled[0].content).toContain("[… fuer die Analyse gekuerzt …]");
  });
});

describe("extractVoice (two-stage pipeline)", () => {
  test("rejects when total text is too short", async () => {
    await expect(
      extractVoice({ texts: [{ filename: "a.txt", content: "zu kurz" }] })
    ).rejects.toThrow(/Zu wenig Textmaterial/);
    expect(createMock).not.toHaveBeenCalled();
  });

  test("runs both stages and assembles profile + voiceMd", async () => {
    // Arrange
    createMock
      .mockResolvedValueOnce(
        toolResponse("emit_voice_markers", { ...markersFixture, mode: "destilliert" })
      )
      .mockResolvedValueOnce(toolResponse("emit_voice_essence", essenceFixture));
    const texts = [{ filename: "mails.txt", content: "Hi Anna, der Entwurf passt. ".repeat(30) }];

    // Act
    const result = await extractVoice({ texts });

    // Assert: zwei Stufen gelaufen
    expect(createMock).toHaveBeenCalledTimes(2);
    // Stufe 2 sieht NUR Marker, nicht den Korpus
    const stage2Body = createMock.mock.calls[1][0];
    expect(JSON.stringify(stage2Body.messages)).not.toContain("Hi Anna, der Entwurf passt.");
    // Profil vollstaendig
    expect(result.identity).toBe(essenceFixture.identity);
    expect(result.markers?.lexicon.length).toBeGreaterThanOrEqual(6);
    expect(result.quotes.length).toBeGreaterThanOrEqual(8);
    // VOICE.md mit Pflicht-Sektionen
    expect(result.voiceMd).toContain("## Lexikon / Wortwahl");
    expect(result.voiceMd).toContain("## Interpunktion");
    expect(result.voiceMd).toContain("## Anti-Patterns");
  });

  test("fails with clear message when stage 1 returns thin markers", async () => {
    // Arrange: zu wenige Zitate
    createMock.mockResolvedValueOnce(
      toolResponse("emit_voice_markers", {
        ...markersFixture,
        mode: "destilliert",
        quotes: markersFixture.quotes.slice(0, 2),
      })
    );
    const texts = [{ filename: "mails.txt", content: "Material ".repeat(100) }];

    // Act + Assert
    await expect(extractVoice({ texts })).rejects.toThrow(/zu wenige Beleg-Zitate/);
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  test("clamps out-of-range scale values into 1..5", async () => {
    // Arrange
    createMock
      .mockResolvedValueOnce(
        toolResponse("emit_voice_markers", { ...markersFixture, mode: "destilliert" })
      )
      .mockResolvedValueOnce(
        toolResponse("emit_voice_essence", {
          ...essenceFixture,
          scales: essenceFixture.scales.map((s, i) => ({ ...s, value: i === 0 ? 9 : 0 })),
        })
      );
    const texts = [{ filename: "mails.txt", content: "Material ".repeat(100) }];

    // Act
    const result = await extractVoice({ texts });

    // Assert
    expect(result.scales[0].value).toBe(5);
    expect(result.scales[1].value).toBe(1);
  });
});

describe("validateMarkers", () => {
  test("accepts the complete fixture", () => {
    expect(() => validateMarkers({ ...markersFixture, mode: "destilliert" })).not.toThrow();
  });

  test("rejects missing punctuation", () => {
    expect(() =>
      validateMarkers({ ...markersFixture, mode: "destilliert", punctuation: [] })
    ).toThrow(/Interpunktion/);
  });
});

describe("validateEssence", () => {
  test("accepts the complete fixture", () => {
    expect(() => validateEssence(essenceFixture)).not.toThrow();
  });

  test("rejects empty drop-in", () => {
    expect(() => validateEssence({ ...essenceFixture, dropInClaude: " " })).toThrow(/dropInClaude/);
  });
});
