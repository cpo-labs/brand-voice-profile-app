import { getAnthropic, VOICE_MODEL } from "./anthropic";

export interface VoiceExtractionResult {
  voiceMd: string;
  dropInChatgpt: string;
  dropInClaude: string;
  dropInGemini: string;
  proofPrompt: string;
  proofBefore: string;
  proofAfter: string;
}

interface ExtractArgs {
  texts: { filename: string; content: string }[];
}

const SYSTEM_PROMPT = `Du bist ein Voice-Analyst. Aus echten Textproben einer Person destillierst du
ein präzises Voice-Profil, das LLMs nutzen können, um in dieser Stimme zu schreiben.

Deine Methode:
1. Lies alle Texte ohne Vorurteil. Suche nach wiederkehrenden Mustern, nicht nach Einzeleffekten.
2. Identifiziere konkrete, nachahmbare Markers — keine vagen Adjektive wie "professionell" oder "freundlich".
3. Belege jeden Marker mit Beispielen aus den echten Texten.
4. Schreibe das Profil so, dass ein anderes LLM es direkt umsetzen kann.

Was DU NICHT tust:
- Keine generischen Tone-of-Voice-Floskeln ("authentisch", "empathisch", "auf Augenhöhe")
- Keine Em-Dashes (—) inflationär verwenden (nur wenn die Person sie selbst nutzt)
- Keine AI-Slop-Phrasen ("Let's dive in", "Absolutely", "I'd be happy to")

HALTE DICH KOMPAKT: Qualität über Länge. Das voiceMd max ~450 Wörter, jede Drop-in-Version
innerhalb ihres Limits, der Proof kurz. Keine Füll-Sätze — das Tool muss schnell liefern.

Du schreibst auf Deutsch, weil die Quelltexte typischerweise deutsch sind. Falls die
Quelltexte englisch sind, wechselst du.`;

const userPrompt = (texts: { filename: string; content: string }[]) =>
  `Hier sind ${texts.length} Texte einer Person. Analysiere sie und gib das Voice-Profil über das Tool \`emit_voice_profile\` zurück.

${texts
    .map((t, i) => `─── Text ${i + 1}: ${t.filename} ─────────────────────\n${t.content}\n`)
    .join("\n")}

─── Ende der Quellen ─────────────────────

Wichtig: voiceMd konkret und nachprüfbar (mit Zitaten aus den Quellen), nicht generisch.
proofBefore soll typische AI-Schreibe enthalten, proofAfter überzeugend in der echten Stimme.`;

// Strukturierte Ausgabe per Tool-Use: das Modell MUSS dieses Tool aufrufen, das
// SDK liefert dann ein validiertes Objekt — kein fragiles JSON.parse auf
// mehrzeiligem Markdown mehr.
const VOICE_TOOL = {
  name: "emit_voice_profile",
  description: "Gibt das fertige Voice-Profil strukturiert zurück.",
  input_schema: {
    type: "object" as const,
    properties: {
      voiceMd: {
        type: "string",
        description:
          "Vollständiges VOICE.md im Markdown-Format, ~450 Wörter. Sektionen: Kern-Identität, Satzbau & Rhythmus, Wortwahl & Vokabular, Was diese Stimme NIE tut, Beispiele aus den Quellen, Drop-in-Anleitung für LLMs.",
      },
      dropInChatgpt: {
        type: "string",
        description: "Kurzform für ChatGPT Custom Instructions, max 1500 Zeichen, beginnt mit 'Schreibe in folgender Stimme:'",
      },
      dropInClaude: {
        type: "string",
        description: "Kurzform für Claude Project/Style, max 2000 Zeichen, beginnt mit '# Voice Guide'",
      },
      dropInGemini: {
        type: "string",
        description: "Kurzform für Gemini Gem System Instructions, max 1500 Zeichen, beginnt mit 'Voice guide:'",
      },
      proofPrompt: {
        type: "string",
        description: "Ein konkreter Beispiel-Prompt, z.B. 'Schreibe eine kurze LinkedIn-Notiz über das erste Quartal'",
      },
      proofBefore: {
        type: "string",
        description: "Wie ein generisches LLM diesen Prompt beantworten würde — bewusst stock, mit typischen AI-Slop-Markern",
      },
      proofAfter: {
        type: "string",
        description: "Wie das LLM mit diesem Voice-Profil antworten würde — in der echten Stimme der Person",
      },
    },
    required: [
      "voiceMd",
      "dropInChatgpt",
      "dropInClaude",
      "dropInGemini",
      "proofPrompt",
      "proofBefore",
      "proofAfter",
    ],
  },
};

export async function extractVoice({ texts }: ExtractArgs): Promise<VoiceExtractionResult> {
  if (texts.length === 0) {
    throw new Error("Keine Texte zum Analysieren übergeben.");
  }

  const totalChars = texts.reduce((sum, t) => sum + t.content.length, 0);
  if (totalChars < 500) {
    throw new Error(
      "Zu wenig Textmaterial. Lade mindestens ~500 Zeichen / einen ordentlichen Absatz hoch."
    );
  }
  if (totalChars > 200_000) {
    throw new Error(
      "Zu viel Textmaterial auf einmal. Reduziere auf max. ~200.000 Zeichen oder lade kürzere Auszüge hoch."
    );
  }

  // 55s Selbst-Abbruch, damit der Nutzer vor dem Vercel-60s-Kill eine saubere
  // Meldung bekommt statt eines opaken Function-Timeouts.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);

  let response;
  try {
    response = await getAnthropic().messages.create(
      {
        model: VOICE_MODEL,
        max_tokens: 4500,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        tools: [VOICE_TOOL],
        tool_choice: { type: "tool", name: "emit_voice_profile" },
        messages: [{ role: "user", content: userPrompt(texts) }],
      },
      { signal: controller.signal }
    );
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(
        "Die Generierung hat zu lange gedauert. Versuch es nochmal mit weniger oder kürzeren Texten."
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Keine strukturierte Antwort vom Modell erhalten.");
  }

  const parsed = toolBlock.input as Partial<VoiceExtractionResult>;
  const required: (keyof VoiceExtractionResult)[] = [
    "voiceMd",
    "dropInChatgpt",
    "dropInClaude",
    "dropInGemini",
    "proofPrompt",
    "proofBefore",
    "proofAfter",
  ];
  for (const key of required) {
    const value = parsed[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`Modell-Antwort fehlt das Feld "${key}".`);
    }
  }

  return parsed as VoiceExtractionResult;
}
