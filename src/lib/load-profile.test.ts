import { describe, it, expect } from "vitest";
import { loadProfileFromRow } from "@/lib/load-profile";
import type { profile } from "@/lib/db/schema";
import type { VoiceProfile } from "@/lib/voice-extraction";

type ProfileRow = typeof profile.$inferSelect;

// Voll besetztes Analyse-Ergebnis, wie es extractVoice liefert.
const fullProfile: VoiceProfile = {
  mode: "destilliert",
  identity: "Die Klare",
  scales: [],
  quotes: [],
  usesPhrases: ["konkret"],
  neverSays: ["Synergie"],
  registerNote: "Du-Form",
  confidence: "hoch",
  proofPrompt: "Schreib eine Absage.",
  proofBefore: "Sehr geehrte Damen und Herren...",
  proofAfter: "Hey, kurz und ehrlich...",
  dropInChatgpt: "DROP-IN CHATGPT TEXT",
  dropInClaude: "DROP-IN CLAUDE TEXT",
  dropInGemini: "DROP-IN GEMINI TEXT",
};

// Spiegelt generate-profile.ts: dropIn* werden vor dem JSON.stringify aus dem
// Objekt destrukturiert und landen in eigenen DB-Spalten, nicht in profileJson.
function rowFromResult(result: VoiceProfile): ProfileRow {
  const { dropInChatgpt, dropInClaude, dropInGemini, ...structured } = result;
  return {
    id: "id-1",
    slug: "ab12cd34",
    emailHash: null,
    voiceMd: "# Stimmprofil\n\nInhalt",
    profileJson: JSON.stringify(structured),
    dropInChatgpt,
    dropInClaude,
    dropInGemini,
    proofPrompt: result.proofPrompt,
    proofBefore: result.proofBefore,
    proofAfter: result.proofAfter,
    sourceFileCount: 1,
    sourceWordCount: 1200,
    createdAt: new Date(0),
  };
}

describe("loadProfileFromRow", () => {
  it("restores drop-ins from DB columns so they are never undefined", () => {
    // Arrange — profileJson allein hat die Drop-ins nicht (Root-Cause).
    const row = rowFromResult(fullProfile);
    expect(JSON.parse(row.profileJson!).dropInChatgpt).toBeUndefined();

    // Act
    const loaded = loadProfileFromRow(row);

    // Assert — der Loader merged sie aus den Spalten zurueck.
    expect(loaded.dropInChatgpt).toBe("DROP-IN CHATGPT TEXT");
    expect(loaded.dropInClaude).toBe("DROP-IN CLAUDE TEXT");
    expect(loaded.dropInGemini).toBe("DROP-IN GEMINI TEXT");
    // Strukturierte Felder aus dem JSON bleiben erhalten.
    expect(loaded.identity).toBe("Die Klare");
    expect(loaded.usesPhrases).toEqual(["konkret"]);
  });

  it("keeps proof fields populated from columns", () => {
    const row = rowFromResult(fullProfile);

    const loaded = loadProfileFromRow(row);

    expect(loaded.proofPrompt).toBe("Schreib eine Absage.");
    expect(loaded.proofBefore).toBe("Sehr geehrte Damen und Herren...");
    expect(loaded.proofAfter).toBe("Hey, kurz und ehrlich...");
  });

  it("falls back to a legacy profile when profileJson is null", () => {
    const row = { ...rowFromResult(fullProfile), profileJson: null };

    const loaded = loadProfileFromRow(row);

    // Drop-ins kommen dennoch aus den Spalten, nie undefined.
    expect(loaded.dropInChatgpt).toBe("DROP-IN CHATGPT TEXT");
    expect(loaded.identity).toBe("Stimmprofil");
  });

  it("falls back to a legacy profile when profileJson is malformed", () => {
    const row = { ...rowFromResult(fullProfile), profileJson: "{not valid json" };

    const loaded = loadProfileFromRow(row);

    expect(loaded.dropInGemini).toBe("DROP-IN GEMINI TEXT");
    expect(loaded.scales).toEqual([]);
  });
});
