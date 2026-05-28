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
- Keine Aufzählungen, die "Klarheit & Präzision & Authentizität" wiederholen

Du schreibst auf Deutsch, weil die Quelltexte typischerweise deutsch sind. Falls Quelltexte
englisch sind, wechselst du.`;

const USER_PROMPT = (
  texts: { filename: string; content: string }[]
) => `Hier sind ${texts.length} Texte einer Person. Analysiere sie und gib das Voice-Profil zurück.

${texts
  .map(
    (t, i) =>
      `─── Text ${i + 1}: ${t.filename} ─────────────────────\n${t.content}\n`
  )
  .join("\n")}

─── Ende der Quellen ─────────────────────

Gib deine Antwort als JSON-Objekt im folgenden Format zurück (ohne Markdown-Codeblock-Wrapper):

{
  "voiceMd": "<vollständiges VOICE.md im Markdown-Format. Sektionen: Kern-Identität, Satzbau & Rhythmus, Wortwahl & Vokabular, Was diese Stimme NIE tut, Beispiele aus den Quellen, Drop-in-Anleitung für LLMs.>",
  "dropInChatgpt": "<Kurzform für ChatGPT Custom Instructions, max 1500 Zeichen, beginnt mit 'Schreibe in folgender Stimme:'>",
  "dropInClaude": "<Kurzform für Claude Project / Style, max 2000 Zeichen, beginnt mit '# Voice Guide'>",
  "dropInGemini": "<Kurzform für Gemini Gem System Instructions, max 1500 Zeichen, beginnt mit 'Voice guide:'>",
  "proofPrompt": "<Ein konkreter Beispiel-Prompt zum Demonstrieren, z.B. 'Schreibe eine kurze LinkedIn-Notiz über das erste Quartal'>",
  "proofBefore": "<Wie ein generisches LLM diesen Prompt beantworten würde — bewusst stock, mit typischen AI-Slop-Markern>",
  "proofAfter": "<Wie das LLM mit deinem Voice-Profil antworten würde — in der echten Stimme dieser Person>"
}

WICHTIG:
- voiceMd soll konkret und nachprüfbar sein, nicht generisch
- Belege Beobachtungen mit Zitaten aus den Quelltexten
- proofBefore sollte typische AI-Schreibe enthalten, damit der Unterschied sichtbar wird
- proofAfter muss überzeugend in der Stimme klingen, sonst hat das Tool keinen Wert`;

export async function extractVoice({
  texts,
}: ExtractArgs): Promise<VoiceExtractionResult> {
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

  // Vercel killt die Funktion bei maxDuration (60s). Wir brechen bei 55s
  // selbst ab, damit der Nutzer eine saubere Fehlermeldung bekommt statt eines
  // opaken Function-Timeouts.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);

  let response;
  try {
    response = await getAnthropic().messages.create(
      {
        model: VOICE_MODEL,
        max_tokens: 8000,
        // System-Prompt cachen (statisch) — spart Kosten bei wiederholten Läufen.
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [
          {
            role: "user",
            content: USER_PROMPT(texts),
          },
        ],
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

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Keine Antwort vom Modell erhalten.");
  }

  // Allow accidental codeblock wrapping
  const raw = textBlock.text.trim();
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```\s*$/, "")
    .trim();

  let parsed: VoiceExtractionResult;
  try {
    parsed = JSON.parse(cleaned) as VoiceExtractionResult;
  } catch (err) {
    throw new Error(
      `Konnte die Modell-Antwort nicht als JSON parsen. ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

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

  return parsed;
}
