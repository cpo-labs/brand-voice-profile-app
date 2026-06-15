import { describe, expect, test } from "vitest";
import { extractTextFromFiles, countWords, decodeTextBuffer } from "./text-extraction";

function makeFile(name: string, content: string): File {
  return new File([content], name, { type: "text/plain" });
}

/** Datei aus rohen Bytes bauen (um Nicht-UTF-8-Encodings zu simulieren). */
function makeBinaryFile(name: string, bytes: Buffer): File {
  return new File([new Uint8Array(bytes)], name, { type: "text/plain" });
}

// Regression fuer den Umlaut-Bug: Root-Cause war `buffer.toString("utf-8")`
// in der Extraktion, das Windows-1252-Dateien (Standard bei deutschen
// Outlook/Notepad-Exporten) verstuemmelt. decodeTextBuffer faengt das ab.
describe("decodeTextBuffer (Umlaut-Encoding)", () => {
  const sample = "Grüße aus München: Mädchen, Tür, Fuß, Größe. ä ö ü ß Ä Ö Ü";

  test("liest UTF-8 mit Umlauten korrekt", () => {
    expect(decodeTextBuffer(Buffer.from(sample, "utf-8"))).toBe(sample);
  });

  test("entfernt ein vorangestelltes UTF-8-BOM", () => {
    const withBom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(sample, "utf-8")]);
    expect(decodeTextBuffer(withBom)).toBe(sample);
  });

  test("faellt bei Windows-1252 nicht in Mojibake (ä/ö/ü/ß bleiben erhalten)", () => {
    const decoded = decodeTextBuffer(Buffer.from(sample, "latin1"));
    expect(decoded).toBe(sample);
    expect(decoded).not.toContain("�");
  });
});

describe("extractTextFromFiles (Umlaut-Regression)", () => {
  test("erhaelt Umlaute aus einer Windows-1252-kodierten .txt-Datei", async () => {
    // Arrange: deutsche .txt wie aus Notepad/Outlook (latin1), > 50 Zeichen
    const text =
      "Grüße aus München. Schöne Wörter über Größe, Tür und Fuß. " +
      "Das Mädchen läuft über die Straße zur Bäckerei und kauft Brötchen.";
    const file = makeBinaryFile("brief.txt", Buffer.from(text, "latin1"));

    // Act
    const [result] = await extractTextFromFiles([file]);

    // Assert
    expect(result.content).toContain("Grüße");
    expect(result.content).toContain("München");
    expect(result.content).toContain("Fuß");
    expect(result.content).not.toContain("�");
  });
});

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
