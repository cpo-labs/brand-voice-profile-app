import { describe, expect, test } from "vitest";
import { stripForwardedText, stripAndFilter, MIN_SAMPLE_CHARS } from "./forward-stripping";

describe("stripForwardedText", () => {
  test("removes the forwarded-message separator and header block", () => {
    // Arrange
    const raw = [
      "---------- Forwarded message ----------",
      "Von: Max Muster <max@example.com>",
      "Datum: Mo., 3. Juni 2026",
      "Betreff: Angebot",
      "An: kunde@example.com",
      "",
      "Hallo Frau Klein, anbei das Angebot wie besprochen.",
    ].join("\n");

    // Act
    const stripped = stripForwardedText(raw);

    // Assert
    expect(stripped).toBe("Hallo Frau Klein, anbei das Angebot wie besprochen.");
  });

  test("cuts the quoted reply chain (German 'Am ... schrieb')", () => {
    // Arrange
    const raw = [
      "Klar, machen wir so. Danke dir!",
      "",
      "Am 3. Juni 2026 um 10:12 schrieb Max Muster <max@example.com>:",
      "> Passt der Termin am Donnerstag?",
    ].join("\n");

    // Act
    const stripped = stripForwardedText(raw);

    // Assert
    expect(stripped).toBe("Klar, machen wir so. Danke dir!");
  });

  test("cuts quoted lines starting with '>'", () => {
    // Arrange
    const raw = "Meine Antwort steht oben.\n> zitierter Text\n> noch ein Zitat";

    // Act
    const stripped = stripForwardedText(raw);

    // Assert
    expect(stripped).toBe("Meine Antwort steht oben.");
  });

  test("drops the signature after the '-- ' marker", () => {
    // Arrange
    const raw = ["Bis dann, Christian", "", "-- ", "Christian Poral", "AppSales Consulting"].join("\n");

    // Act
    const stripped = stripForwardedText(raw);

    // Assert
    expect(stripped).toBe("Bis dann, Christian");
  });

  test("drops mobile signature footers", () => {
    // Arrange
    const raw = "Kurze Rückmeldung: passt.\nGesendet von meinem iPhone";

    // Act
    const stripped = stripForwardedText(raw);

    // Assert
    expect(stripped).toBe("Kurze Rückmeldung: passt.");
  });

  test("collapses runs of blank lines", () => {
    // Arrange
    const raw = "Zeile eins.\n\n\n\nZeile zwei.";

    // Act
    const stripped = stripForwardedText(raw);

    // Assert
    expect(stripped).toBe("Zeile eins.\n\nZeile zwei.");
  });
});

describe("stripAndFilter", () => {
  test("filters out samples shorter than the minimum after stripping", () => {
    // Arrange
    const longBody = "A".repeat(MIN_SAMPLE_CHARS + 10);
    const texts = [
      { filename: "good.txt", content: longBody },
      { filename: "tiny.txt", content: "ok" },
      { filename: "only-sig.txt", content: "-- \nMax Muster\nGesendet von meinem iPhone" },
    ];

    // Act
    const result = stripAndFilter(texts);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe("good.txt");
  });

  test("preserves the original filename on kept samples", () => {
    // Arrange
    const texts = [{ filename: "mail-7.eml", content: "B".repeat(MIN_SAMPLE_CHARS + 1) }];

    // Act
    const result = stripAndFilter(texts);

    // Assert
    expect(result[0].filename).toBe("mail-7.eml");
  });
});
