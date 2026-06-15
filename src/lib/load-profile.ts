import type { profile } from "@/lib/db/schema";
import type { VoiceProfile } from "@/lib/voice-extraction";

type ProfileRow = typeof profile.$inferSelect;

// Aelteres Profil ohne strukturiertes JSON: minimal aus den Spalten
// rekonstruieren, damit die Seite nie weiss-bleibt.
export function legacyProfile(p: ProfileRow): VoiceProfile {
  return {
    mode: "destilliert",
    identity:
      p.voiceMd.split("\n").find((l) => l.trim().length > 0)?.replace(/^#+\s*/, "") ??
      "Stimmprofil",
    scales: [],
    quotes: [],
    usesPhrases: [],
    neverSays: [],
    registerNote: "",
    confidence: "",
    proofPrompt: p.proofPrompt,
    proofBefore: p.proofBefore,
    proofAfter: p.proofAfter,
    dropInChatgpt: p.dropInChatgpt,
    dropInClaude: p.dropInClaude,
    dropInGemini: p.dropInGemini,
  };
}

/**
 * Baut das anzeigbare VoiceProfile aus einer DB-Zeile.
 *
 * Wichtig: die Drop-ins (dropIn*) und die Vorher/Nachher-Felder (proof*) liegen
 * in EIGENEN DB-Spalten, nicht in profileJson — generate-profile.ts
 * destrukturiert die Drop-ins vor dem JSON.stringify heraus. Ohne Rueckmerge
 * waeren profile.dropIn* hier undefined und die Kopier-Buttons wuerden den
 * String "undefined" in die Zwischenablage schreiben. Die Spalten dienen daher
 * als Fallback fuer alles, was im JSON fehlt.
 */
export function loadProfileFromRow(p: ProfileRow): VoiceProfile {
  if (!p.profileJson) return legacyProfile(p);

  let fromJson: VoiceProfile;
  try {
    fromJson = JSON.parse(p.profileJson) as VoiceProfile;
  } catch {
    return legacyProfile(p);
  }

  return {
    ...fromJson,
    dropInChatgpt: fromJson.dropInChatgpt ?? p.dropInChatgpt,
    dropInClaude: fromJson.dropInClaude ?? p.dropInClaude,
    dropInGemini: fromJson.dropInGemini ?? p.dropInGemini,
    proofPrompt: fromJson.proofPrompt ?? p.proofPrompt,
    proofBefore: fromJson.proofBefore ?? p.proofBefore,
    proofAfter: fromJson.proofAfter ?? p.proofAfter,
  };
}
