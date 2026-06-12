import { getAnthropic, VOICE_MODEL } from "./anthropic";
import type { SourceText, VoiceMarkers, VoiceMode } from "./voice-types";

// ── Stufe 1: Marker-Extraktion ──────────────────────────────────────────────
// Liest den kompletten (gesampelten) Korpus und destilliert granulare,
// quellenbelegte Voice-Marker: Lexikon, Satzrhythmus, Interpunktion,
// Openings/Closings, Do/Dont, Anti-Patterns, Beleg-Zitate. Methodik nach dem
// brand-voice-Skill: empirisch, belegt, nachahmbar — keine vagen Adjektive.

const SYSTEM_PROMPT = `Du bist ein forensischer Stil-Analyst. Aus echten Textproben einer Person
extrahierst du granulare, NACHAHMBARE Voice-Marker, jeweils mit woertlichem Beleg aus den Quellen.
Du gibst das Ergebnis ausschliesslich ueber das Tool \`emit_voice_markers\` zurueck.

Zwei Modi (du bekommst eine Empfehlung mitgeliefert, ueberstimme sie nur bei klarem Gegenbeleg):
- Modus "uebersetzt": Die Quelle IST bereits ein fertiges Stil-Dokument (Tone-of-Voice, Stil-Guide).
  Dann KONVERTIERST du dessen Aussagen 1:1 in die Marker-Struktur, ohne zu paraphrasieren. Du bist
  Copyist, nicht Autor.
- Modus "destilliert": Die Quelle ist Rohmaterial (Mails, Posts, Texte). Dann leitest du jeden
  Marker EMPIRISCH ab und belegst ihn mit einem echten Zitat.

Was du extrahierst (alles aus den Quellen, nichts erfunden):
1. LEXIKON: 6-12 Signatur-Wendungen, die diese Person wirklich benutzt — woertlich, mit Fundstelle.
   Dazu typische kleine Fuell-/Verbindungswoerter (z.B. "halt", "eh", "kurz", "einfach mal").
2. SATZRHYTHMUS: durchschnittliche Satzlaenge in Woertern (schaetze ehrlich aus den Proben),
   Streuung (monoton vs. stark wechselnd), Fragment-Nutzung (Ellipsen, verblose Saetze,
   Einwort-Saetze), Gedankenfluss in Absaetzen. Mit Beleg-Zitat.
3. INTERPUNKTION: pro Zeichen einzeln beurteilen — Gedankenstrich, Auslassungspunkte,
   Ausrufezeichen, Fragezeichen, Klammern, Doppelpunkt, Semikolon, Komma-Stil, Emoji/Smileys.
   Nutzung: nie / selten / regelmaessig / oft, plus wofuer.
4. OPENINGS: 2-5 echte Einstiegs-Muster (Anrede, erster Satz) mit woertlichen Beispielen.
5. CLOSINGS: 2-5 echte Abschluss-Muster (letzter Satz, Grussformel) mit woertlichen Beispielen.
6. DO / DONT: je 4-8 konkrete, imperativische Regeln, die ein LLM direkt befolgen kann
   ("Schreibe ...", "Vermeide ..."). Abgeleitet aus dem Material, nicht aus Konventionen.
7. ANTI-PATTERNS: was diese Stimme NIE tut. Konkrete Floskeln und Muster, die im Material
   auffaellig fehlen (inkl. typischer KI-Floskeln, wenn sie der Stimme widersprechen).
8. CLAIM-STYLE: wie Aussagen getroffen werden (direkt vs. abgesichert, Weichmacher, Zahlen).
9. REGISTER: Anrede (Du/Sie/gemischt, pro Kontext falls erkennbar), Formalitaet, Tonlage.
10. BELEG-ZITATE: mindestens 8 woertliche Zitate mit Quellen-Anker und Aussage, was sie zeigen.

Harte Regeln:
- Jeder Marker muss durch die Quellen gedeckt sein. Nichts erfinden, nichts verallgemeinern.
- Zitate sind WOERTLICH, nicht umformuliert. Kuerze lange Zitate mit [...], faelsche keine Worte.
- Konkrete, nachahmbare Marker statt vager Adjektive. Niemals "professionell", "authentisch",
  "empathisch", "auf Augenhoehe", "freundlich" als Befund.
- Signaturen, Adressen, Telefonnummern, Rechtstexte am Mail-Ende sind Boilerplate — ignorieren,
  ausser die Grussformel direkt davor (die zaehlt zu CLOSINGS).
- Du selbst benutzt keine KI-Floskeln und keine inflationaeren Gedankenstriche.

Sprache: Sind die Quellen deutsch, schreibst du deutsch mit echten Umlauten (language: "de").
Sind sie englisch, komplett englisch (language: "en").`;

const userPrompt = (texts: SourceText[], modeHint: VoiceMode) =>
  `Empfohlener Modus fuer dieses Material: "${modeHint}".

Hier sind ${texts.length} Textprobe(n) einer Person. Analysiere sie vollstaendig und gib die
Voice-Marker ueber \`emit_voice_markers\` zurueck.

${texts
    .map((t, i) => `─── Quelle ${i + 1}: ${t.filename} ─────────────────────\n${t.content}\n`)
    .join("\n")}

─── Ende der Quellen ─────────────────────

Pflicht: mindestens 8 woertliche Beleg-Zitate (jedes mit Quellen-Anker), 6-12 Lexikon-Eintraege
mit Fundstelle, Interpunktion pro Zeichen einzeln, echte Openings und Closings als woertliche
Beispiele, konkrete Do/Dont-Regeln und Anti-Patterns. Belege ALLES aus den Quellen oben.`;

const EXAMPLE_FIELDS = {
  exampleText: { type: "string", description: "woertliches Vorkommen aus den Quellen" },
  exampleSource: { type: "string", description: "Quellen-Anker, z.B. 'Quelle 2' oder Dateiname" },
};

const MARKERS_TOOL = {
  name: "emit_voice_markers",
  description: "Gibt die granularen, quellenbelegten Voice-Marker strukturiert zurueck.",
  input_schema: {
    type: "object" as const,
    properties: {
      language: { type: "string", enum: ["de", "en"], description: "Sprache des Korpus" },
      mode: {
        type: "string",
        enum: ["destilliert", "uebersetzt"],
        description: "'destilliert' aus Rohmaterial, 'uebersetzt' aus fertigem Stil-Dokument",
      },
      lexicon: {
        type: "array",
        minItems: 6,
        maxItems: 12,
        description: "Signatur-Wendungen mit Beleg",
        items: {
          type: "object",
          properties: {
            phrase: { type: "string", description: "die Wendung woertlich" },
            note: { type: "string", description: "wann/wie sie benutzt wird, ein Halbsatz" },
            ...EXAMPLE_FIELDS,
          },
          required: ["phrase", "note", "exampleText", "exampleSource"],
        },
      },
      fillerWords: {
        type: "array",
        items: { type: "string" },
        description: "typische kleine Fuell-/Verbindungswoerter (0-8)",
      },
      rhythm: {
        type: "object",
        properties: {
          avgSentenceWords: { type: "number", description: "geschaetzte mittlere Satzlaenge in Woertern" },
          spread: { type: "string", description: "wie stark die Satzlaenge schwankt, mit Befund" },
          fragments: { type: "string", description: "Ellipsen/verblose Saetze/Einwort-Saetze, mit Befund" },
          flow: { type: "string", description: "Absatz- und Gedankenfluss, ein bis zwei Saetze" },
          evidenceText: { type: "string", description: "woertliches Beleg-Zitat fuer den Rhythmus" },
          evidenceSource: { type: "string", description: "Quellen-Anker" },
        },
        required: ["avgSentenceWords", "spread", "fragments", "flow", "evidenceText", "evidenceSource"],
      },
      punctuation: {
        type: "array",
        minItems: 5,
        description: "Interpunktions-Gewohnheiten pro Zeichen einzeln",
        items: {
          type: "object",
          properties: {
            mark: { type: "string", description: "z.B. 'Gedankenstrich', 'Ausrufezeichen', 'Emoji'" },
            usage: { type: "string", enum: ["nie", "selten", "regelmaessig", "oft"] },
            note: { type: "string", description: "wofuer es (nicht) eingesetzt wird" },
          },
          required: ["mark", "usage", "note"],
        },
      },
      openings: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        description: "echte Einstiegs-Muster mit woertlichem Beispiel",
        items: {
          type: "object",
          properties: {
            pattern: { type: "string", description: "das Muster, z.B. 'Vorname + Komma, direkt zur Sache'" },
            example: { type: "string", description: "woertliches Beispiel aus den Quellen" },
            source: { type: "string", description: "Quellen-Anker" },
          },
          required: ["pattern", "example", "source"],
        },
      },
      closings: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        description: "echte Abschluss-Muster mit woertlichem Beispiel",
        items: {
          type: "object",
          properties: {
            pattern: { type: "string", description: "das Muster, z.B. 'knapper Imperativ + Vorname'" },
            example: { type: "string", description: "woertliches Beispiel aus den Quellen" },
            source: { type: "string", description: "Quellen-Anker" },
          },
          required: ["pattern", "example", "source"],
        },
      },
      dos: {
        type: "array",
        minItems: 4,
        maxItems: 8,
        items: { type: "string" },
        description: "konkrete imperativische Regeln ('Schreibe ...')",
      },
      donts: {
        type: "array",
        minItems: 4,
        maxItems: 8,
        items: { type: "string" },
        description: "konkrete Verbote ('Vermeide ...')",
      },
      antiPatterns: {
        type: "array",
        minItems: 4,
        items: { type: "string" },
        description: "Floskeln/Muster, die diese Stimme NIE benutzt",
      },
      claimStyle: {
        type: "string",
        description: "wie Aussagen getroffen werden (direkt/abgesichert, Weichmacher, Zahlen)",
      },
      registerNote: {
        type: "string",
        description: "Anrede, Register, Formalitaet, Tonlage in ein bis zwei Saetzen",
      },
      quotes: {
        type: "array",
        minItems: 8,
        description: "woertliche, quellenbelegte Zitate",
        items: {
          type: "object",
          properties: {
            text: { type: "string", description: "woertliches Zitat, ggf. mit [...] gekuerzt" },
            source: { type: "string", description: "Quellen-Anker" },
            shows: { type: "string", description: "was dieses Zitat ueber die Stimme zeigt" },
          },
          required: ["text", "source", "shows"],
        },
      },
    },
    required: [
      "language",
      "mode",
      "lexicon",
      "fillerWords",
      "rhythm",
      "punctuation",
      "openings",
      "closings",
      "dos",
      "donts",
      "antiPatterns",
      "claimStyle",
      "registerNote",
      "quotes",
    ],
  },
};

const MAX_OUTPUT_TOKENS = 8_000;

export interface MarkersResult {
  markers: VoiceMarkers;
  mode: VoiceMode;
}

export function validateMarkers(
  parsed: Partial<VoiceMarkers & { mode: VoiceMode }>
): asserts parsed is VoiceMarkers & { mode: VoiceMode } {
  const fail = (was: string): never => {
    throw new Error(`Die Stil-Analyse war unvollstaendig (${was}). Bitte nochmal versuchen.`);
  };
  if (parsed.language !== "de" && parsed.language !== "en") fail("Sprache fehlt");
  if (parsed.mode !== "destilliert" && parsed.mode !== "uebersetzt") fail("Modus fehlt");
  if (!Array.isArray(parsed.lexicon) || parsed.lexicon.length < 4) fail("Lexikon zu duenn");
  if (!parsed.rhythm || typeof parsed.rhythm.avgSentenceWords !== "number") fail("Satzrhythmus fehlt");
  if (!Array.isArray(parsed.punctuation) || parsed.punctuation.length < 4) fail("Interpunktion fehlt");
  if (!Array.isArray(parsed.openings) || parsed.openings.length < 1) fail("Openings fehlen");
  if (!Array.isArray(parsed.closings) || parsed.closings.length < 1) fail("Closings fehlen");
  if (!Array.isArray(parsed.dos) || parsed.dos.length < 3) fail("Do-Regeln fehlen");
  if (!Array.isArray(parsed.donts) || parsed.donts.length < 3) fail("Dont-Regeln fehlen");
  if (!Array.isArray(parsed.antiPatterns) || parsed.antiPatterns.length < 3) fail("Anti-Patterns fehlen");
  if (!Array.isArray(parsed.quotes) || parsed.quotes.length < 6) fail("zu wenige Beleg-Zitate");
  if (!Array.isArray(parsed.fillerWords)) fail("Fuellwoerter fehlen");
  if (typeof parsed.claimStyle !== "string" || parsed.claimStyle.trim().length === 0) fail("Claim-Style fehlt");
  if (typeof parsed.registerNote !== "string" || parsed.registerNote.trim().length === 0) fail("Register fehlt");
}

/**
 * Stufe 1: extrahiert granulare Voice-Marker aus dem Korpus.
 * `signal` bricht den Call ab (Timeout-Budget verwaltet der Orchestrator).
 */
export async function extractMarkers(
  texts: SourceText[],
  modeHint: VoiceMode,
  signal: AbortSignal
): Promise<MarkersResult> {
  const response = await getAnthropic().messages.create(
    {
      model: VOICE_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: [MARKERS_TOOL],
      tool_choice: { type: "tool", name: "emit_voice_markers" },
      messages: [{ role: "user", content: userPrompt(texts, modeHint) }],
    },
    { signal }
  );

  if (response.stop_reason === "max_tokens") {
    throw new Error(
      "Die Stil-Analyse wurde zu lang und abgeschnitten. Versuch es mit etwas weniger Material nochmal."
    );
  }

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Keine auswertbare Antwort vom Modell erhalten. Bitte nochmal versuchen.");
  }

  const parsed = toolBlock.input as Partial<VoiceMarkers & { mode: VoiceMode }>;
  validateMarkers(parsed);

  const { mode, ...markers } = parsed;
  return { markers: markers as VoiceMarkers, mode };
}
