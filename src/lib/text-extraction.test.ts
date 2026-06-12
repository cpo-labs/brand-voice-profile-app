import { describe, expect, test } from "vitest";
import { extractTextFromFiles, countWords } from "./text-extraction";

function makeFile(name: string, content: string): File {
  return new File([content], name, { type: "text/plain" });
}

describe("extractTextFromFiles", () => {
  test("extracts plain text from txt and md files", async () => {
    // Arrange
    const files = [
      makeFile("a.txt", "Hallo, das ist ein Test mit genug Inhalt fuer die Extraktion."),
      makeFile("b.md", "# Ueberschrift\n\nNoch ein Text mit ausreichend vielen Zeichen drin."),
    ];

    // Act
    const result = await extractTextFromFiles(files);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0].filename).toBe("a.txt");
    expect(result[0].content).toContain("Hallo");
  });

  test("normalizes CRLF and trailing whitespace", async () => {
    // Arrange
    const files = [makeFile("crlf.txt", "Zeile eins mit etwas Text dahinter.   \r\nZeile zwei mit noch mehr Text.")];

    // Act
    const result = await extractTextFromFiles(files);

    // Assert
    expect(result[0].content).not.toContain("\r");
    expect(result[0].content).toContain("Zeile eins mit etwas Text dahinter.\nZeile zwei");
  });

  test("throws when no files are passed", async () => {
    await expect(extractTextFromFiles([])).rejects.toThrow(/Keine Dateien/);
  });

  test("throws on unsupported extension", async () => {
    const files = [makeFile("bild.png", "x".repeat(100))];
    await expect(extractTextFromFiles(files)).rejects.toThrow(/nicht unterstützt/);
  });

  test("throws when more than the max file count is uploaded", async () => {
    const files = Array.from({ length: 21 }, (_, i) =>
      makeFile(`f${i}.txt`, "Inhalt mit ausreichend Zeichen fuer die Extraktion hier.")
    );
    await expect(extractTextFromFiles(files)).rejects.toThrow(/Maximal/);
  });

  test("skips near-empty files but keeps usable ones", async () => {
    // Arrange
    const files = [
      makeFile("leer.txt", "zu kurz"),
      makeFile("voll.txt", "Dieser Text hat deutlich mehr als fuenfzig Zeichen Inhalt und bleibt erhalten."),
    ];

    // Act
    const result = await extractTextFromFiles(files);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe("voll.txt");
  });

  test("throws when nothing usable can be extracted", async () => {
    const files = [makeFile("leer.txt", "mini")];
    await expect(extractTextFromFiles(files)).rejects.toThrow(/kein nutzbarer Text/);
  });
});

describe("countWords", () => {
  test("counts words across all texts", () => {
    // Arrange
    const texts = [
      { filename: "a.txt", content: "eins zwei drei" },
      { filename: "b.txt", content: "vier  fuenf" },
    ];

    // Act + Assert
    expect(countWords(texts)).toBe(5);
  });

  test("returns 0 for empty list", () => {
    expect(countWords([])).toBe(0);
  });
});
