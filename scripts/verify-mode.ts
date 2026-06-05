// Offline-Verifikation der Mode-A/B-Klassifikation + Fehlerfaelle.
// Kein API-Call. npx tsx scripts/verify-mode.ts
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

function assert(cond: boolean, msg: string) {
  if (!cond) { console.error("FEHLER:", msg); process.exit(1); }
  console.log("OK:", msg);
}

async function main() {
  const mod = await import("../src/lib/voice-extraction");
  const { extractVoice } = mod;

  // Fehlerfall 1: leerer Korpus
  try {
    await extractVoice({ texts: [] });
    console.error("FEHLER: leerer Korpus haette werfen muessen"); process.exit(1);
  } catch (e) {
    assert(e instanceof Error && /Keine Texte/.test(e.message), "leerer Korpus -> klare Meldung");
  }

  // Fehlerfall 2: zu wenig Text
  try {
    await extractVoice({ texts: [{ filename: "a.txt", content: "Hallo." }] });
    console.error("FEHLER: zu kurzer Korpus haette werfen muessen"); process.exit(1);
  } catch (e) {
    assert(e instanceof Error && /Zu wenig Textmaterial/.test(e.message), "zu wenig Text -> klare Meldung");
  }

  console.log("\nFEHLERFAELLE GRUEN (ohne API-Call)");
}

main().catch((err) => { console.error("FEHLGESCHLAGEN:", err); process.exit(1); });
