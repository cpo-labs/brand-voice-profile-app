import { describe, expect, test } from "vitest";
import { buildVoiceMd } from "./voice-md";
import { profileFixture } from "../../tests/fixtures/profile-fixture";

// Pflicht-Sektionen laut Acceptance: Lexikon/Wortwahl, Satzrhythmus,
// Interpunktion, Openings/Closings, Do/Dont, Anti-Patterns, Beleg-Zitate.
const MANDATORY_SECTIONS = [
  "## Kern-Identitaet",
  "## Skalen",
  "## Tonalitaet & Rhythmus",
  "## Lexikon / Wortwahl",
  "## Satzrhythmus",
  "## Interpunktion",
  "## Openings",
  "## Closings",
  "## Do / Dont",
  "## Anti-Patterns",
  "## Beleg-Zitate",
  "## Vorher / Nachher",
  "## Drop-in fuer KI-Tools",
  "## Sicherheit & offene Punkte",
];

describe("buildVoiceMd", () => {
  test("contains every mandatory section", () => {
    // Act
    const md = buildVoiceMd(profileFixture);

    // Assert
    for (const section of MANDATORY_SECTIONS) {
      expect(md).toContain(section);
    }
  });

  test("renders lexicon entries with verbatim evidence", () => {
    const md = buildVoiceMd(profileFixture);
    expect(md).toContain("passt schon");
    expect(md).toContain("Passt schon, mach so.");
    expect(md).toContain("(Quelle 1)");
  });

  test("renders punctuation as a table with usage levels", () => {
    const md = buildVoiceMd(profileFixture);
    expect(md).toContain("| Gedankenstrich | nie |");
    expect(md).toContain("| Emoji | nie |");
  });

  test("renders openings and closings with examples", () => {
    const md = buildVoiceMd(profileFixture);
    expect(md).toContain("Anna, der Entwurf passt.");
    expect(md).toContain("Melde dich. Jo");
  });

  test("renders quotes verbatim with source anchors", () => {
    const md = buildVoiceMd(profileFixture);
    for (const q of profileFixture.quotes) {
      expect(md).toContain(q.text);
    }
  });

  test("stays backwards-compatible for profiles without markers", () => {
    // Arrange: altes Profil ohne markers-Feld
    const legacy = { ...profileFixture, markers: undefined };

    // Act
    const md = buildVoiceMd(legacy);

    // Assert: Kernsektionen da, Marker-Sektionen sauber weggelassen
    expect(md).toContain("## Kern-Identitaet");
    expect(md).toContain("## Beleg-Zitate");
    expect(md).not.toContain("## Lexikon / Wortwahl");
    expect(md).not.toContain("## Interpunktion");
  });
});
