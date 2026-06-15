import { buildVoiceMd } from "./voice-md";
import { extractMarkers } from "./voice-markers";
import { condenseEssence } from "./voice-essence";
import type { SourceText, VoiceExtractionResult, VoiceMode, VoiceProfile } from "./voice-types";

// ── Orchestrator der zweistufigen Voice-Pipeline ────────────────────────────
// Stufe 1 (voice-markers.ts): granulare Marker-Extraktion am Korpus.
// Stufe 2 (voice-essence.ts): Verdichtung mit frischem Kontext (nur Marker).
// Daraus baut voice-md.ts serverseitig das VOICE.md mit allen Pflicht-
// Sektionen. Methodik portiert aus dem brand-voice-Skill / distill-voice.

export type {
  VoiceScale,
  VoiceQuote,
  VoiceProfile,
  VoiceExtractionResult,
  VoiceMarkers,
  VoiceMode,
} from "./voice-types";

interface ExtractArgs {
  texts: SourceText[];
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

export function detectModeHint(texts: SourceText[]): VoiceMode {
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

// ── Korpus-Budget (Stufe 1, Single-Pass) ────────────────────────────────────
// Konservativ bei ~90k Zeichen (~22-25k Token Input) gehalten: das reicht fuer
// ein repraesentatives Stimmprofil, haelt den Stufe-1-Call aber spuerbar
// schneller und billiger als die fruehere 200k-Grenze (die regelmaessig in
// Richtung Timeout lief). Groessere Uploads werden gesampelt statt abgelehnt:
// pro Datei Kopf+Ende, damit Einstieg und Verlauf der Stimme erhalten bleiben.
export const SAMPLE_CHAR_BUDGET = 90_000;
const MIN_PER_FILE = 1_200;

export function sampleForAnalysis(texts: SourceText[]): SourceText[] {
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

// Zeit-Budgets: Vercel-Function laeuft mit maxDuration 300 (Fluid Compute).
// Selbst-Abbruch deutlich davor, damit der Nutzer eine saubere Meldung
// bekommt statt eines opaken Function-Timeouts.
const STAGE1_TIMEOUT_MS = 110_000;
const STAGE2_TIMEOUT_MS = 90_000;

async function withTimeout<T>(
  ms: number,
  run: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await run(controller.signal);
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

  // Stufe 1: granulare Marker am Korpus.
  const { markers, mode } = await withTimeout(STAGE1_TIMEOUT_MS, (signal) =>
    extractMarkers(analysisTexts, modeHint, signal)
  );

  // Stufe 2: Verdichtung mit frischem Kontext (nur Marker, kein Korpus).
  const essence = await withTimeout(STAGE2_TIMEOUT_MS, (signal) =>
    condenseEssence(markers, mode, signal)
  );

  const profile: VoiceProfile = {
    ...essence,
    mode,
    registerNote: markers.registerNote,
    quotes: markers.quotes,
    markers,
  };

  const voiceMd = buildVoiceMd(profile);

  return { ...profile, voiceMd };
}
