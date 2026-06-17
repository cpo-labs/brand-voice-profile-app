import { getAnthropic, VOICE_MODEL } from "./anthropic";
import type { VoiceEssence, VoiceMarkers, VoiceMode } from "./voice-types";

// ── Stufe 2: Verdichtung ────────────────────────────────────────────────────
// Bekommt NUR die Marker aus Stufe 1 (frischer Kontext, kein Korpus mehr) und
// verdichtet sie zu Identitaet, Skalen, Lexikon-Listen, Vorher/Nachher-Beweis
// und den Drop-ins fuer ChatGPT/Claude/Gemini. Die Drop-ins muessen die
// operativsten Marker tragen — sie sind das, was Nutzer wirklich einsetzen.

const SYSTEM_PROMPT = `Du bist ein praeziser Voice-Editor. Du bekommst granulare, quellenbelegte
Voice-Marker einer Person (Ergebnis einer forensischen Stil-Analyse) und verdichtest sie zu einem
operativen Stimmprofil. Du gibst das Ergebnis ausschliesslich ueber das Tool \`emit_voice_essence\`
zurueck.

Regeln:
1. Du erfindest NICHTS dazu. Jede Aussage muss sich aus den Markern ergeben. Die Beleg-Zitate in
   den Markern sind deine einzige Quelle.
2. Skalen (3-5) sind ganzzahlig 1..5 mit klar gegensaetzlichen Polen. Die evidence jeder Skala
   zitiert oder referenziert ein konkretes Beleg-Zitat aus den Markern.
3. usesPhrases: die staerksten Signatur-Wendungen aus dem Lexikon, woertlich (4-10).
   neverSays: konkrete Floskeln aus den Anti-Patterns (4-10).
4. Niemals vage Adjektive ("professionell", "authentisch", "empathisch", "freundlich") als Befund.
5. proofBefore zeigt typische generische KI-Schreibe (Floskeln, Em-Dash-Inflation, "Lass uns
   eintauchen"). proofAfter zeigt denselben Inhalt ueberzeugend in der echten Stimme: richtige
   Anrede/Opening, Satzrhythmus, Interpunktion und Closing gemaess den Markern.
6. Drop-ins sind eigenstaendige Anweisungstexte, die ein fremdes LLM ohne weiteren Kontext
   befolgen kann. Sie muessen die operativsten Marker explizit nennen: Anrede/Register,
   Satzlaenge/Rhythmus, 3-5 Signatur-Wendungen woertlich, Interpunktions-Regeln (insbesondere
   was NIE benutzt wird), Opening-/Closing-Muster, die wichtigsten Verbote. Bei der Anrede die
   KONTEXT-Regel explizit machen, wenn sie variiert (z.B. "Hey <Vorname>" bei vertrauten,
   "Hallo Herr/Frau <Name>" bei foermlichen Empfaengern) und mit dem haeufigsten Muster fuehren —
   nicht zu einer Einheits-Anrede verflachen.
7. Du selbst benutzt keine KI-Floskeln und keine inflationaeren Gedankenstriche.

Sprache: language "de" => deutsch mit echten Umlauten. language "en" => komplett englisch.`;

const userPrompt = (markers: VoiceMarkers, mode: VoiceMode) =>
  `Modus der Analyse: "${mode}". Hier die Voice-Marker als JSON:

${JSON.stringify(markers, null, 1)}

Verdichte sie ueber \`emit_voice_essence\`. Pflicht: 3-5 Skalen je mit Beleg, usesPhrases woertlich
aus dem Lexikon, neverSays aus den Anti-Patterns, ueberzeugender Vorher/Nachher-Beweis, drei
eigenstaendige Drop-ins mit den operativsten Markern.`;

const ESSENCE_TOOL = {
  name: "emit_voice_essence",
  description: "Gibt die verdichtete Stimm-Essenz strukturiert zurueck.",
  input_schema: {
    type: "object" as const,
    properties: {
      identity: {
        type: "string",
        description: "Kern-Identitaet der Stimme in einem praezisen Satz, ohne vage Adjektive",
      },
      scales: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        description: "quantitative Skalen, je mit Beleg",
        items: {
          type: "object",
          properties: {
            key: { type: "string", description: "stabiler Schluessel, klein, ohne Leerzeichen" },
            label: { type: "string", description: "Anzeigename, z.B. 'Direktheit'" },
            poleLow: { type: "string", description: "linker Pol (Wert 1)" },
            poleHigh: { type: "string", description: "rechter Pol (Wert 5)" },
            value: { type: "integer", minimum: 1, maximum: 5 },
            evidence: { type: "string", description: "ein Satz Begruendung mit Bezug auf ein Beleg-Zitat" },
          },
          required: ["key", "label", "poleLow", "poleHigh", "value", "evidence"],
        },
      },
      usesPhrases: {
        type: "array",
        minItems: 4,
        maxItems: 10,
        items: { type: "string" },
        description: "Signatur-Wendungen woertlich aus dem Lexikon",
      },
      neverSays: {
        type: "array",
        minItems: 4,
        maxItems: 10,
        items: { type: "string" },
        description: "konkrete Floskeln, die diese Person NIE schreibt",
      },
      confidence: {
        type: "string",
        description: "wie sicher die Analyse ist und welche Punkte offen bleiben, ein bis zwei Saetze",
      },
      proofPrompt: {
        type: "string",
        description: "konkreter Beispiel-Prompt, z.B. 'Schreib eine kurze Absage fuer einen Termin'",
      },
      proofBefore: {
        type: "string",
        description: "wie ein generisches LLM antworten wuerde, bewusst stock mit KI-Floskeln",
      },
      proofAfter: {
        type: "string",
        description: "dieselbe Antwort in der echten Stimme, inkl. Opening/Closing gemaess Markern",
      },
      dropInChatgpt: {
        type: "string",
        description: "Kurzform fuer ChatGPT Custom Instructions, max 1500 Zeichen, beginnt mit 'Schreibe in folgender Stimme:' (en: 'Write in this voice:')",
      },
      dropInClaude: {
        type: "string",
        description: "Kurzform fuer Claude Project/Style, max 2000 Zeichen, beginnt mit '# Voice Guide'",
      },
      dropInGemini: {
        type: "string",
        description: "Kurzform fuer Gemini Gem System Instructions, max 1500 Zeichen, beginnt mit 'Voice guide:'",
      },
    },
    required: [
      "identity",
      "scales",
      "usesPhrases",
      "neverSays",
      "confidence",
      "proofPrompt",
      "proofBefore",
      "proofAfter",
      "dropInChatgpt",
      "dropInClaude",
      "dropInGemini",
    ],
  },
};

const MAX_OUTPUT_TOKENS = 6_000;

export function validateEssence(parsed: Partial<VoiceEssence>): asserts parsed is VoiceEssence {
  const stringFields: (keyof VoiceEssence)[] = [
    "identity",
    "confidence",
    "proofPrompt",
    "proofBefore",
    "proofAfter",
    "dropInChatgpt",
    "dropInClaude",
    "dropInGemini",
  ];
  for (const key of stringFields) {
    const value = parsed[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`Die Modell-Antwort war unvollstaendig (Feld "${key}" fehlt). Bitte nochmal versuchen.`);
    }
  }
  if (!Array.isArray(parsed.scales) || parsed.scales.length < 3) {
    throw new Error("Die Analyse lieferte zu wenige Skalen. Bitte mit etwas mehr Text nochmal versuchen.");
  }
  if (!Array.isArray(parsed.usesPhrases) || !Array.isArray(parsed.neverSays)) {
    throw new Error("Die Modell-Antwort war unvollstaendig (Lexikon fehlt). Bitte nochmal versuchen.");
  }
}

/**
 * Stufe 2: verdichtet die Marker zur Essenz. Laeuft mit frischem Kontext —
 * das Modell sieht nur die Marker, nicht mehr den Korpus.
 */
export async function condenseEssence(
  markers: VoiceMarkers,
  mode: VoiceMode,
  signal: AbortSignal
): Promise<VoiceEssence> {
  const response = await getAnthropic().messages.create(
    {
      model: VOICE_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: [ESSENCE_TOOL],
      tool_choice: { type: "tool", name: "emit_voice_essence" },
      messages: [{ role: "user", content: userPrompt(markers, mode) }],
    },
    { signal }
  );

  if (response.stop_reason === "max_tokens") {
    throw new Error("Das Profil wurde zu lang und abgeschnitten. Bitte nochmal versuchen.");
  }

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Keine auswertbare Antwort vom Modell erhalten. Bitte nochmal versuchen.");
  }

  const parsed = toolBlock.input as Partial<VoiceEssence>;
  validateEssence(parsed);

  // Skalenwerte defensiv in 1..5 klemmen (Modell koennte 0 oder 6 liefern).
  const scales = parsed.scales.map((s) => ({
    ...s,
    value: Math.min(5, Math.max(1, Math.round(s.value))),
  }));

  return { ...parsed, scales };
}

// ── Nachschaerf-Pass ─────────────────────────────────────────────────────────
// Verifikations-Ebene "Nachschaerf": Das fertige Profil wird gegen eine STICHPROBE
// echter Originaltexte gehalten und schonungslos kritisiert — liest sich das
// wirklich wie diese Person? Was ist generisch/vage/unbelegt? Fehlen operative
// Marker in den Drop-ins? Ergebnis ist eine VERBESSERTE Essenz (gleiche Struktur).
const REFINE_SYSTEM = `Du bist ein schonungslos kritischer Voice-Editor. Du bekommst (1) ein bereits
erstelltes Stimmprofil (Essenz), (2) die zugrundeliegenden Voice-Marker und (3) eine STICHPROBE
echter Originaltexte der Person. Du verbesserst die Essenz und gibst sie ausschliesslich ueber das
Tool \`emit_voice_essence\` zurueck — gleiche Struktur, aber praeziser und naeher an der Stichprobe.

Pruefe gnadenlos gegen die Stichprobe:
- Liest sich proofAfter WIRKLICH wie diese Person? Vergleiche Anrede, Opening, Satzrhythmus,
  Interpunktion und Closing direkt mit der Stichprobe. Wenn nicht: schreibe proofAfter neu, naeher dran.
- Sind die Drop-ins (ChatGPT/Claude/Gemini) operativ genug, dass ein fremdes LLM ohne den Korpus
  in dieser Stimme schreibt? Nenne die konkretesten Marker explizit: Anrede-Regel nach Kontext,
  Satzlaenge/Rhythmus, 3-5 woertliche Signatur-Wendungen, Interpunktion (v.a. was NIE vorkommt),
  Opening/Closing-Muster, die wichtigsten Verbote.
- identity, scales, usesPhrases, neverSays: streiche Vages und Unbelegtes, schaerfe mit dem, was die
  Stichprobe und Marker hergeben. Niemals vage Adjektive ("professionell", "authentisch", "freundlich").
- Aendere NICHTS frei Erfundenes hinein. Jede Aussage muss durch Marker oder Stichprobe gedeckt sein.
- Du selbst benutzt keine KI-Floskeln und keine inflationaeren Gedankenstriche.

Sprache: language "de" => deutsch mit echten Umlauten. language "en" => komplett englisch.`;

const refineUserPrompt = (
  current: VoiceEssence,
  markers: VoiceMarkers,
  sourceSample: string,
  critiqueNotes?: string
) =>
  `${critiqueNotes ? `Ein Drop-in-Gegentest hat folgende Schwaechen gefunden — behebe sie gezielt:\n${critiqueNotes}\n\n` : ""}── Aktuelle Essenz (verbessern) ──
${JSON.stringify(current, null, 1)}

── Voice-Marker (Grundlage, nichts darueber hinaus erfinden) ──
${JSON.stringify(markers, null, 1)}

── Stichprobe echter Originaltexte (Massstab fuer "klingt wie die Person") ──
${sourceSample}

── Ende der Stichprobe ──

Gib die VERBESSERTE Essenz ueber \`emit_voice_essence\` zurueck. Behalte die Struktur, mach sie
praeziser und belegt naeher an der Stichprobe. Pflicht: 3-5 Skalen, usesPhrases woertlich,
neverSays konkret, ueberzeugender Vorher/Nachher-Beweis, drei eigenstaendige operative Drop-ins.`;

const MAX_SAMPLE_CHARS = 24_000;

/**
 * Nachschaerf-Pass: kritisiert die Essenz gegen eine Quell-Stichprobe und gibt
 * eine verbesserte Essenz zurueck. `critiqueNotes` optional aus dem
 * Drop-in-Gegentest, damit der Pass gezielt nachbessert.
 */
export async function refineEssence(
  current: VoiceEssence,
  markers: VoiceMarkers,
  sourceSample: string,
  signal: AbortSignal,
  critiqueNotes?: string
): Promise<VoiceEssence> {
  const sample = sourceSample.slice(0, MAX_SAMPLE_CHARS);

  const response = await getAnthropic().messages.create(
    {
      model: VOICE_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: [{ type: "text", text: REFINE_SYSTEM, cache_control: { type: "ephemeral" } }],
      tools: [ESSENCE_TOOL],
      tool_choice: { type: "tool", name: "emit_voice_essence" },
      messages: [{ role: "user", content: refineUserPrompt(current, markers, sample, critiqueNotes) }],
    },
    { signal }
  );

  if (response.stop_reason === "max_tokens") {
    throw new Error("Der Nachschaerf-Pass wurde zu lang und abgeschnitten. Bitte nochmal versuchen.");
  }

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Keine auswertbare Antwort beim Nachschaerf-Pass. Bitte nochmal versuchen.");
  }

  const parsed = toolBlock.input as Partial<VoiceEssence>;
  validateEssence(parsed);
  const scales = parsed.scales.map((s) => ({
    ...s,
    value: Math.min(5, Math.max(1, Math.round(s.value))),
  }));
  return { ...parsed, scales };
}
