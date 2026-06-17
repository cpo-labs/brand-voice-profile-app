import { getAnthropic, VOICE_MODEL } from "./anthropic";
import type { SourceText, VoiceQuote } from "./voice-types";

// ── Verifikations-Ebenen "Zitat-Treue" und "Drop-in-Gegentest" ───────────────
// Zitat-Treue: jedes Beleg-Zitat MUSS woertlich in den Quellen vorkommen, sonst
// fliegt es raus. Eliminiert die haeufigste Schwaeche (erfundene/umformulierte
// Zitate). Rein programmatisch, kein LLM — schnell und deterministisch.
// Drop-in-Gegentest: aus dem fertigen Drop-in wird ein Test-Text erzeugt und
// gegen eine Quell-Stichprobe bewertet — klingt der Output wirklich nach der
// Person? Liefert einen Score 1..5 plus konkrete Befunde fuer den Nachschaerf-Pass.

/** Normalisiert Text fuer den Treue-Vergleich: Case, Quotes, Dashes, Whitespace. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’‚‛`´]/g, "'")
    .replace(/[“”„‟»«]/g, '"')
    .replace(/[–—‒]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Zerlegt ein Zitat an Auslassungsmarkern ([...], […], ...) in Segmente. */
function splitOnEllipsis(quote: string): string[] {
  return quote
    .split(/\[\s*(?:\.\.\.|…)\s*\]|…|\.\.\./)
    .map((seg) => seg.trim())
    .filter(Boolean);
}

const MIN_SEGMENT_CHARS = 12;

export interface QuoteFidelityResult {
  kept: VoiceQuote[];
  dropped: VoiceQuote[];
  /** Anteil woertlich verifizierter Zitate (0..1). */
  ratio: number;
}

/**
 * Behaelt nur Beleg-Zitate, deren Inhalt woertlich in den Quellen steht. Lange
 * Zitate werden an Auslassungsmarkern zerlegt; jedes inhaltstragende Segment
 * (>= 12 Zeichen) muss als Teilstring der normalisierten Quellen vorkommen. Sehr
 * kurze Zitate (z.B. "Leider nein.") werden als Ganzes geprueft.
 */
export function checkQuoteFidelity(
  quotes: VoiceQuote[],
  texts: SourceText[]
): QuoteFidelityResult {
  const haystack = normalize(texts.map((t) => t.content).join("\n"));
  const kept: VoiceQuote[] = [];
  const dropped: VoiceQuote[] = [];

  for (const q of quotes) {
    const segments = splitOnEllipsis(q.text);
    // Pruefsegmente: lange Segmente einzeln; wenn keins lang genug ist, das
    // ganze (normalisierte) Zitat als ein Segment.
    const longSegments = segments
      .map(normalize)
      .filter((s) => s.length >= MIN_SEGMENT_CHARS);
    const toCheck = longSegments.length > 0 ? longSegments : [normalize(q.text)];

    const allFound = toCheck.every((seg) => seg.length > 0 && haystack.includes(seg));
    if (allFound) kept.push(q);
    else dropped.push(q);
  }

  const ratio = quotes.length === 0 ? 1 : kept.length / quotes.length;
  return { kept, dropped, ratio };
}

// ── Drop-in-Gegentest ────────────────────────────────────────────────────────

export interface BackTestResult {
  /** Aehnlichkeit des erzeugten Test-Texts zur Quelle, 1..5. */
  score: number;
  /** Was der Kandidat richtig trifft (konkret). */
  matches: string[];
  /** Wo der Kandidat von der echten Stimme abweicht (konkret). */
  mismatches: string[];
  /** Der aus dem Drop-in erzeugte Test-Text (zur Anzeige/Debug). */
  candidate: string;
  /**
   * True, wenn der Gegentest kein belastbares Urteil liefern konnte (leerer
   * Kandidat, kein auswertbarer Judge-Block). Der Orchestrator ueberspringt
   * darauf den Korrektur-Pass — ein schwacher Score ohne echtes Signal soll
   * keine Nachschaerfung auf Rauschen ausloesen.
   */
  inconclusive: boolean;
}

const BACKTEST_JUDGE_TOOL = {
  name: "emit_backtest",
  description: "Bewertet, wie nah ein Kandidat-Text an der echten Stimme der Stichprobe ist.",
  input_schema: {
    type: "object" as const,
    properties: {
      score: {
        type: "integer",
        minimum: 1,
        maximum: 5,
        description: "1 = generisch/fremd, 5 = ununterscheidbar von der Stichprobe",
      },
      matches: {
        type: "array",
        items: { type: "string" },
        description: "was der Kandidat an der echten Stimme richtig trifft (konkret)",
      },
      mismatches: {
        type: "array",
        items: { type: "string" },
        description: "wo der Kandidat abweicht (konkret, mit Bezug zur Stichprobe)",
      },
    },
    required: ["score", "matches", "mismatches"],
  },
};

const JUDGE_SYSTEM = `Du vergleichst einen KANDIDAT-Text mit einer STICHPROBE echter Texte einer Person.
Frage: Wuerde ein Leser den Kandidaten fuer einen Text DIESER Person halten? Bewerte streng entlang
Anrede, Opening, Satzrhythmus, Wortwahl/Signatur-Wendungen, Interpunktion und Closing. Gib das
Ergebnis ausschliesslich ueber \`emit_backtest\` zurueck. Sei konkret und belege Abweichungen an der
Stichprobe; keine vagen Adjektive.`;

const MAX_JUDGE_SAMPLE = 16_000;
const CANDIDATE_MAX_TOKENS = 700;
const JUDGE_MAX_TOKENS = 1_200;

/**
 * Erzeugt aus dem Claude-Drop-in einen Test-Text fuer den proofPrompt (der
 * Drop-in laeuft dabei als System-Prompt — genau wie beim echten Einsatz) und
 * laesst ihn gegen eine Quell-Stichprobe bewerten.
 */
export async function backTestDropIn(
  dropInClaude: string,
  proofPrompt: string,
  sourceSample: string,
  signal: AbortSignal
): Promise<BackTestResult> {
  const client = getAnthropic();

  // Schritt A: Kandidat erzeugen — Drop-in als System, Aufgabe als User-Turn.
  const gen = await client.messages.create(
    {
      model: VOICE_MODEL,
      max_tokens: CANDIDATE_MAX_TOKENS,
      system: [{ type: "text", text: dropInClaude }],
      messages: [
        {
          role: "user",
          content: `Aufgabe: ${proofPrompt}\n\nSchreibe NUR die fertige Antwort, keinen Vorspann und keine Erklaerung.`,
        },
      ],
    },
    { signal }
  );
  const candidate = gen.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();

  // Leerer/zu kurzer Kandidat (z.B. Generierung lief in max_tokens): den
  // Judge-Call gar nicht erst machen — er wuerde ueber ein Artefakt urteilen.
  // Als `inconclusive` markiert, damit der Orchestrator den Korrektur-Pass
  // ueberspringt statt auf Rauschen nachzuschaerfen.
  if (candidate.length < 20) {
    return {
      score: 3,
      matches: [],
      mismatches: ["Kandidat-Text leer/zu kurz — Gegentest nicht aussagekraeftig."],
      candidate,
      inconclusive: true,
    };
  }

  // Schritt B: Kandidat gegen die Stichprobe richten.
  const sample = sourceSample.slice(0, MAX_JUDGE_SAMPLE);
  const judge = await client.messages.create(
    {
      model: VOICE_MODEL,
      max_tokens: JUDGE_MAX_TOKENS,
      system: [{ type: "text", text: JUDGE_SYSTEM, cache_control: { type: "ephemeral" } }],
      tools: [BACKTEST_JUDGE_TOOL],
      tool_choice: { type: "tool", name: "emit_backtest" },
      messages: [
        {
          role: "user",
          content: `── STICHPROBE echter Texte ──\n${sample}\n\n── KANDIDAT (aus dem Drop-in erzeugt) ──\n${candidate}\n\n── Ende ──\n\nBewerte den Kandidaten gegen die Stichprobe ueber \`emit_backtest\`.`,
        },
      ],
    },
    { signal }
  );

  const toolBlock = judge.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    // Kein harter Fehler: der Gegentest ist eine Zusatz-Ebene. Inconclusive,
    // damit kein Korrektur-Pass auf einem fehlenden Urteil aufsetzt.
    return {
      score: 3,
      matches: [],
      mismatches: ["Gegentest ohne auswertbares Urteil."],
      candidate,
      inconclusive: true,
    };
  }

  const parsed = toolBlock.input as Partial<BackTestResult>;
  const score = Math.min(5, Math.max(1, Math.round(Number(parsed.score) || 3)));
  return {
    score,
    matches: Array.isArray(parsed.matches) ? parsed.matches : [],
    mismatches: Array.isArray(parsed.mismatches) ? parsed.mismatches : [],
    candidate,
    inconclusive: false,
  };
}
