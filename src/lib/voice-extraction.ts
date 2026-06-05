import { getAnthropic, VOICE_MODEL } from "./anthropic";
import { buildVoiceMd } from "./voice-md";

// ── Strukturiertes Stimmprofil ──────────────────────────────────────────────
// Statt eines freien Markdown-Strings liefert das Modell strukturierte Daten:
// quantitative Skalen (je mit Beleg-Zitat), quellenbelegte Zitate, Lexikon
// (genutzt + Tabu), Was-die-Stimme-nie-tut, Confidence/offene Punkte. Daraus
// bauen wir serverseitig (a) das lesbare Profil im Browser und (b) ein VOICE.md
// im Format von Christians Master-Template. Portiert aus distill-voice.md.

/** Eine 1..5-Skala mit Position, Pol-Beschriftung und einem Beleg-Zitat. */
export interface VoiceScale {
  /** Stabiler Schluessel, z.B. "direktheit". */
  key: string;
  /** Anzeigename, z.B. "Direktheit". */
  label: string;
  /** Beschriftung linker Pol (Wert 1), z.B. "diplomatisch". */
  poleLow: string;
  /** Beschriftung rechter Pol (Wert 5), z.B. "sehr direkt". */
  poleHigh: string;
  /** Position 1..5. */
  value: number;
  /** Kurze Begruendung/Beleg in einem Satz. */
  evidence: string;
}

/** Ein quellenbelegtes Zitat aus dem echten Korpus. */
export interface VoiceQuote {
  /** Das woertliche Zitat aus den Quellen. */
  text: string;
  /** Quellen-Anker, z.B. Dateiname oder "Mail 3". */
  source: string;
  /** Was dieses Zitat ueber die Stimme zeigt. */
  shows: string;
}

export interface VoiceProfile {
  /** "destilliert" = aus Rohmaterial (Mode B), "uebersetzt" = aus fertigem Stil-Dokument (Mode A). */
  mode: "destilliert" | "uebersetzt";
  /** Erfundener oder echter Stimm-Name, ein Satz zur Kern-Identitaet. */
  identity: string;
  /** 3-5 quantitative Skalen. */
  scales: VoiceScale[];
  /** >= 5 quellenbelegte Zitate. */
  quotes: VoiceQuote[];
  /** Wendungen/Begriffe, die diese Person wirklich nutzt. */
  usesPhrases: string[];
  /** Tabu-Liste: Floskeln, die diese Person NIE schreibt. */
  neverSays: string[];
  /** Anrede-/Register-/Rhythmus-Notiz, ein bis zwei Saetze. */
  registerNote: string;
  /** Wie sicher die Analyse ist + offene Punkte, ein bis zwei Saetze. */
  confidence: string;
  /** Beispiel-Prompt fuer den Vorher/Nachher-Beweis. */
  proofPrompt: string;
  /** Generischer LLM-Output (bewusst stock). */
  proofBefore: string;
  /** Output in der echten Stimme. */
  proofAfter: string;
  /** Kompaktversion fuer ChatGPT Custom Instructions. */
  dropInChatgpt: string;
  /** Kompaktversion fuer Claude Project/Style. */
  dropInClaude: string;
  /** Kompaktversion fuer Gemini Gem. */
  dropInGemini: string;
}

export interface VoiceExtractionResult extends VoiceProfile {
  /** Serverseitig aus dem Profil gebautes Stimmprofil-Dokument (Master-Template). */
  voiceMd: string;
}

interface ExtractArgs {
  texts: { filename: string; content: string }[];
}

// ── Mode-Klassifikation (aus distill-voice.md:18-29) ────────────────────────
// Mode A: fertiges Tone-of-Voice-Dokument -> 1:1 ins Format uebersetzen.
// Mode B: Rohmaterial (Mails, Posts) -> empirisch destillieren.
const MODE_A_HINTS = [
  "tone of voice",
  "tone-of-voice",
  "voice guide",
  "stil-guide",
  "stilguide",
  "brand voice",
  "schreibrichtlinie",
  "sprachleitfaden",
  "styleguide",
  "style guide",
];

function detectModeHint(texts: { filename: string; content: string }[]): "uebersetzt" | "destilliert" {
  const haystack = texts
    .map((t) => `${t.filename}\n${t.content.slice(0, 600)}`)
    .join("\n")
    .toLowerCase();
  // Inhaltliche Marker eines fertigen Stil-Dokuments.
  const contentMarkers =
    /(wir nutzen|wir vermeiden|wir verwenden|calls? to action|tonalit|anrede:|register:|do['s]? (?:and|&) don)/i.test(
      haystack
    );
  const filenameMarker = MODE_A_HINTS.some((h) => haystack.includes(h));
  return filenameMarker || contentMarkers ? "uebersetzt" : "destilliert";
}

const SYSTEM_PROMPT = `Du bist ein praeziser Voice-Analyst. Aus echten Textproben einer Person
destillierst du ein operatives Stimmprofil, das ein anderes LLM direkt nutzen kann, um in genau
dieser Stimme zu schreiben. Du gibst das Ergebnis ausschliesslich ueber das Tool
\`emit_voice_profile\` zurueck.

Zwei Modi (du bekommst eine Empfehlung mitgeliefert, ueberstimme sie nur bei klarem Gegenbeleg):
- Modus "uebersetzt": Die Quelle IST bereits ein fertiges Stil-Dokument (Tone-of-Voice, Stil-Guide).
  Dann KONVERTIERST du dessen Aussagen 1:1 ins Profil, ohne zu paraphrasieren. Du bist Copyist,
  nicht Autor. Zitate sind woertliche Uebernahmen aus dem Dokument.
- Modus "destilliert": Die Quelle ist Rohmaterial (Mails, Posts, Texte). Dann leitest du jede
  Erkenntnis EMPIRISCH ab und belegst sie mit einem echten Zitat aus dem Material.

Harte Regeln:
1. Jede Skala und jede Aussage muss durch ein echtes Zitat aus den Quellen gedeckt sein. Nichts
   erfinden, nichts verallgemeinern ohne Beleg.
2. Quotes sind WOERTLICH aus den Quellen, nicht umformuliert. Kuerze lange Zitate mit [...], aber
   faelsche keine Worte.
3. Konkrete, nachahmbare Marker statt vager Adjektive. Niemals "professionell", "authentisch",
   "empathisch", "auf Augenhoehe", "freundlich" als Befund.
4. Skalen sind ganzzahlig 1..5. Pole klar gegensaetzlich benennen (z.B. "diplomatisch" <-> "sehr direkt").
5. Mindestens 5 Beleg-Zitate. Mindestens 3 Skalen. Die Tabu-Liste (neverSays) enthaelt konkrete
   Floskeln, die diese Person erkennbar NIE benutzt, abgeleitet aus dem, was im Material fehlt.
6. proofBefore zeigt typische generische KI-Schreibe (Floskeln, Em-Dash-Inflation, "Lass uns
   eintauchen"). proofAfter zeigt denselben Inhalt ueberzeugend in der echten Stimme.
7. Du selbst benutzt keine KI-Floskeln ("Let's dive in", "Absolutely", "I'd be happy to"), keine
   inflationaeren Gedankenstriche.

Sprache: Du schreibst auf Deutsch mit echten Umlauten, weil die Quelltexte typischerweise deutsch
sind. Sind die Quelltexte englisch, wechselst du komplett ins Englische.`;

const userPrompt = (
  texts: { filename: string; content: string }[],
  modeHint: "uebersetzt" | "destilliert"
) =>
  `Empfohlener Modus fuer dieses Material: "${modeHint}".

Hier sind ${texts.length} Textprobe(n) einer Person. Analysiere sie vollstaendig und gib das
Stimmprofil ueber \`emit_voice_profile\` zurueck.

${texts
    .map((t, i) => `─── Quelle ${i + 1}: ${t.filename} ─────────────────────\n${t.content}\n`)
    .join("\n")}

─── Ende der Quellen ─────────────────────

Pflicht: mindestens 5 woertliche Beleg-Zitate (jedes mit Quellen-Anker), mindestens 3 Skalen je mit
einem Beleg-Satz, eine konkrete Tabu-Liste, ein ueberzeugender Vorher/Nachher-Beweis. Belege ALLES
aus den Quellen oben.`;

const SCALE_ITEM = {
  type: "object" as const,
  properties: {
    key: { type: "string", description: "stabiler Schluessel, klein, ohne Leerzeichen, z.B. 'direktheit'" },
    label: { type: "string", description: "Anzeigename, z.B. 'Direktheit'" },
    poleLow: { type: "string", description: "linker Pol (Wert 1), z.B. 'diplomatisch'" },
    poleHigh: { type: "string", description: "rechter Pol (Wert 5), z.B. 'sehr direkt'" },
    value: { type: "integer", description: "Position 1..5", minimum: 1, maximum: 5 },
    evidence: { type: "string", description: "ein Satz Begruendung, knapp" },
  },
  required: ["key", "label", "poleLow", "poleHigh", "value", "evidence"],
};

const QUOTE_ITEM = {
  type: "object" as const,
  properties: {
    text: { type: "string", description: "woertliches Zitat aus den Quellen, ggf. mit [...] gekuerzt" },
    source: { type: "string", description: "Quellen-Anker, z.B. Dateiname oder 'Quelle 2'" },
    shows: { type: "string", description: "was dieses Zitat ueber die Stimme zeigt, ein Halbsatz" },
  },
  required: ["text", "source", "shows"],
};

const VOICE_TOOL = {
  name: "emit_voice_profile",
  description: "Gibt das fertige, quellenbelegte Stimmprofil strukturiert zurueck.",
  input_schema: {
    type: "object" as const,
    properties: {
      mode: {
        type: "string",
        enum: ["destilliert", "uebersetzt"],
        description: "'destilliert' aus Rohmaterial, 'uebersetzt' aus fertigem Stil-Dokument",
      },
      identity: {
        type: "string",
        description: "Kern-Identitaet der Stimme in einem praezisen Satz, ohne vage Adjektive",
      },
      scales: {
        type: "array",
        description: "3 bis 5 quantitative Skalen, je mit Beleg",
        items: SCALE_ITEM,
        minItems: 3,
        maxItems: 5,
      },
      quotes: {
        type: "array",
        description: "mindestens 5 woertliche, quellenbelegte Zitate",
        items: QUOTE_ITEM,
        minItems: 5,
      },
      usesPhrases: {
        type: "array",
        description: "konkrete Wendungen/Woerter, die diese Person wirklich nutzt (4-10)",
        items: { type: "string" },
      },
      neverSays: {
        type: "array",
        description: "Floskeln, die diese Person erkennbar NIE schreibt (4-10)",
        items: { type: "string" },
      },
      registerNote: {
        type: "string",
        description: "Anrede, Register, Satzbau und Rhythmus in ein bis zwei Saetzen",
      },
      confidence: {
        type: "string",
        description: "Wie sicher die Analyse ist und welche Punkte offen/unsicher bleiben",
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
        description: "dieselbe Antwort in der echten Stimme der Person",
      },
      dropInChatgpt: {
        type: "string",
        description: "Kurzform fuer ChatGPT Custom Instructions, max 1500 Zeichen, beginnt mit 'Schreibe in folgender Stimme:'",
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
      "mode",
      "identity",
      "scales",
      "quotes",
      "usesPhrases",
      "neverSays",
      "registerNote",
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

// ── Korpus-Budget (Single-Pass) ────────────────────────────────────────────
// Mittlerer Korpus in EINEM Pass. Sonnet 4.6 hat ein grosses Kontextfenster;
// ~120k Zeichen (~30-40k Token Input) passen bequem in einen Call und sind
// deutlich mehr als die alten 48k, ohne ins Map-Reduce zu kippen (Phase 2).
// Grosse Uploads werden gesampelt statt abgelehnt: pro Datei Kopf+Ende, damit
// Einstieg und Verlauf der Stimme erhalten bleiben.
const SAMPLE_CHAR_BUDGET = 120_000;
const MIN_PER_FILE = 1_200;

function sampleForAnalysis(
  texts: { filename: string; content: string }[]
): { filename: string; content: string }[] {
  const total = texts.reduce((sum, t) => sum + t.content.length, 0);
  if (total <= SAMPLE_CHAR_BUDGET) return texts;
  return texts.map((t) => {
    const budget = Math.max(MIN_PER_FILE, Math.floor((SAMPLE_CHAR_BUDGET * t.content.length) / total));
    if (t.content.length <= budget) return t;
    const head = Math.ceil(budget * 0.62);
    const tail = budget - head;
    const content =
      t.content.slice(0, head).trimEnd() +
      "\n\n[… fuer die Analyse gekuerzt …]\n\n" +
      t.content.slice(t.content.length - tail).trimStart();
    return { filename: t.filename, content };
  });
}

const MIN_TOTAL_CHARS = 500;
const GENERATION_TIMEOUT_MS = 55_000;
const MAX_OUTPUT_TOKENS = 8_000;

function validateProfile(parsed: Partial<VoiceProfile>): asserts parsed is VoiceProfile {
  const stringFields: (keyof VoiceProfile)[] = [
    "identity",
    "registerNote",
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
  if (parsed.mode !== "destilliert" && parsed.mode !== "uebersetzt") {
    throw new Error("Die Modell-Antwort war unvollstaendig (Modus fehlt). Bitte nochmal versuchen.");
  }
  if (!Array.isArray(parsed.scales) || parsed.scales.length < 3) {
    throw new Error("Die Analyse lieferte zu wenige Skalen. Bitte mit etwas mehr Text nochmal versuchen.");
  }
  if (!Array.isArray(parsed.quotes) || parsed.quotes.length < 5) {
    throw new Error("Die Analyse fand zu wenige Beleg-Zitate. Bitte mit etwas mehr Text nochmal versuchen.");
  }
  if (!Array.isArray(parsed.usesPhrases) || !Array.isArray(parsed.neverSays)) {
    throw new Error("Die Modell-Antwort war unvollstaendig (Lexikon fehlt). Bitte nochmal versuchen.");
  }
}

export async function extractVoice({ texts }: ExtractArgs): Promise<VoiceExtractionResult> {
  if (texts.length === 0) {
    throw new Error("Keine Texte zum Analysieren uebergeben.");
  }

  const totalChars = texts.reduce((sum, t) => sum + t.content.length, 0);
  if (totalChars < MIN_TOTAL_CHARS) {
    throw new Error(
      "Zu wenig Textmaterial. Gib uns mindestens einen ordentlichen Absatz (~500 Zeichen)."
    );
  }

  const analysisTexts = sampleForAnalysis(texts);
  const modeHint = detectModeHint(analysisTexts);

  // 55s Selbst-Abbruch, damit der Nutzer vor dem Vercel-60s-Kill eine saubere
  // Meldung bekommt statt eines opaken Function-Timeouts.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

  let response;
  try {
    response = await getAnthropic().messages.create(
      {
        model: VOICE_MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        tools: [VOICE_TOOL],
        tool_choice: { type: "tool", name: "emit_voice_profile" },
        messages: [{ role: "user", content: userPrompt(analysisTexts, modeHint) }],
      },
      { signal: controller.signal }
    );
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(
        "Die Analyse hat zu lange gedauert. Versuch es nochmal mit weniger oder kuerzeren Texten."
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (response.stop_reason === "max_tokens") {
    throw new Error(
      "Das Profil wurde zu lang und abgeschnitten. Versuch es mit etwas weniger Material nochmal."
    );
  }

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Keine auswertbare Antwort vom Modell erhalten. Bitte nochmal versuchen.");
  }

  const parsed = toolBlock.input as Partial<VoiceProfile>;
  validateProfile(parsed);

  // Skalenwerte defensiv in 1..5 klemmen (Modell koennte 0 oder 6 liefern).
  const scales = parsed.scales.map((s) => ({
    ...s,
    value: Math.min(5, Math.max(1, Math.round(s.value))),
  }));
  const profile: VoiceProfile = { ...parsed, scales };

  const voiceMd = buildVoiceMd(profile);

  return { ...profile, voiceMd };
}
