// Lokale Verifikation (NICHT committen wenn unnoetig): ruft extractVoice gegen
// die echte Claude-API mit einem mittleren, erfundenen Korpus (Single-Pass) und
// prueft die DoD-Zusagen programmatisch: alle Skalen, >= 5 Beleg-Zitate, alle
// Master-Template-Sektionen im gebauten Dokument. Keine echten Kundennamen.
//
//   npx tsx scripts/verify-voice.ts
//
// Erwartet ANTHROPIC_API_KEY in .env.local.

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

// Mittlerer, erfundener Korpus: kurze, direkte Mails einer fiktiven Person.
// Bewusst genug Material fuer eine echte Analyse, weit unter dem Single-Pass-Budget.
const MAILS = [
  `Hi Tom, hab den Entwurf ueberflogen. Passt fuer mich. Eine Sache noch: die Headline ist mir zu generisch. Sag kurz Bescheid wenn du eine Alternative hast. Gruss, Mara`,
  `Moin, danke dir, das ging schnell. Ich schau morgen frueh drueber und melde mich. Schoenen Abend.`,
  `Ehrlich gesagt finde ich Variante B staerker. Die klingt weniger nach Werbung und mehr nach uns. Lass uns die nehmen.`,
  `Kein Stress wegen dem Termin. Melde dich einfach wenn du soweit bist, ich bin flexibel.`,
  `Kurze Info: der Liefertermin rutscht um zwei Tage. Nichts Dramatisches, wollte es nur frueh sagen. Bei Fragen melde dich.`,
  `Das koennen wir kuerzer sagen. Weniger ist hier mehr. Streich den zweiten Absatz komplett, der bringt nichts.`,
  `Hey Lisa, danke fuer die Doku. Hab zwei kleine Anmerkungen reingeschrieben, sonst top. Liebe Gruesse, Mara`,
  `Ich bin da ehrlich: das Briefing ist zu schwammig. Lass uns 15 Minuten telefonieren, dann ist es schneller geklaert als per Mail.`,
  `Passt, machen wir so. Ich setze den Text bis Freitag auf und schick dir die erste Fassung. Schoenes Wochenende.`,
  `Sorry fuer spaet, war ein voller Tag. Antwort kommt morgen, versprochen. Gute Nacht.`,
];

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FEHLER:", msg);
    process.exit(1);
  }
  console.log("OK:", msg);
}

async function main() {
  const { extractVoice } = await import("../src/lib/voice-extraction");

  const texts = MAILS.map((content, i) => ({ filename: `mail-${i + 1}.txt`, content }));
  const totalChars = texts.reduce((s, t) => s + t.content.length, 0);
  console.log(`Korpus: ${texts.length} Texte, ${totalChars} Zeichen (Single-Pass)\n`);

  const t0 = Date.now();
  const r = await extractVoice({ texts });
  console.log(`Analyse fertig in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

  // DoD-Assertions
  assert(r.scales.length >= 3, `mindestens 3 Skalen (hat ${r.scales.length})`);
  assert(r.scales.every((s) => s.value >= 1 && s.value <= 5), "alle Skalenwerte in 1..5");
  assert(r.scales.every((s) => !!s.poleLow && !!s.poleHigh && !!s.evidence), "jede Skala hat Pole + Beleg");
  assert(r.quotes.length >= 5, `mindestens 5 Beleg-Zitate (hat ${r.quotes.length})`);
  assert(r.quotes.every((q) => !!q.text && !!q.source && !!q.shows), "jedes Zitat hat Text + Quelle + Aussage");
  assert(r.usesPhrases.length > 0, "Lexikon: nutzt-Begriffe vorhanden");
  assert(r.neverSays.length > 0, "Lexikon: nie-Begriffe vorhanden");
  assert(!!r.proofBefore && !!r.proofAfter && !!r.proofPrompt, "Vorher/Nachher vollstaendig");
  assert(["destilliert", "uebersetzt"].includes(r.mode), `Modus erkannt: ${r.mode}`);

  // Master-Template-Sektionen im gebauten Dokument
  const sections = [
    "# Stimmprofil",
    "## Kern-Identitaet",
    "## Skalen",
    "## Lexikon",
    "## Beleg-Zitate",
    "## Vorher / Nachher",
    "## Drop-in",
    "## Sicherheit & offene Punkte",
  ];
  for (const sec of sections) {
    assert(r.voiceMd.includes(sec), `Dokument enthaelt Sektion "${sec}"`);
  }

  console.log(`\nModus: ${r.mode}`);
  console.log("\n─── Skalen ───");
  for (const s of r.scales) console.log(`  ${s.label}: ${s.value}/5 (${s.poleLow} <-> ${s.poleHigh})`);
  console.log("\n─── Zitate ───");
  for (const q of r.quotes) console.log(`  „${q.text.slice(0, 70)}…“ [${q.source}]`);
  console.log("\n─── Vorher ───\n" + r.proofBefore);
  console.log("\n─── Nachher ───\n" + r.proofAfter);
  console.log("\n─── Dokument (Anfang) ───\n" + r.voiceMd.slice(0, 900) + "…");

  console.log("\nALLE DoD-ASSERTIONS GRUEN");
}

main().catch((err) => {
  console.error("VERIFIKATION FEHLGESCHLAGEN:", err);
  process.exit(1);
});
