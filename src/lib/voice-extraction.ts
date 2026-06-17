import { buildVoiceMd } from "./voice-md";
import { extractMarkers, consolidateMarkers, type MarkersResult } from "./voice-markers";
import { condenseEssence, refineEssence } from "./voice-essence";
import { checkQuoteFidelity, backTestDropIn } from "./voice-verify";
import type {
  SourceText,
  VoiceExtractionResult,
  VoiceMode,
  VoiceProfile,
  VoiceVerification,
} from "./voice-types";

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
// Obergrenze fuer den Text, der real an Stufe 1 geht. Sonnet 4.6 vertraegt den
// Kontext muehelos; die echte Grenze ist Latenz (Selbst-Abbruch bei
// STAGE1_TIMEOUT_MS) und Kosten, nicht das Kontextfenster. 180k Zeichen
// (~45k Token) ist der bewusste Kompromiss: genug fuer ein dichtes,
// repraesentatives Profil aus GROSSEN Uploads (lange Mail-Sammlungen,
// Chat-Exporte) statt nur einer Handvoll Schnipsel — aber sicher unter dem
// Stufe-1-Timeout. Direkter Vorgaenger war 90k; eine noch fruehere 200k-Grenze
// lief gelegentlich in Richtung Timeout und wurde deshalb auf 90k reduziert.
// 180k liegt bewusst dazwischen: deutlich mehr Signal als 90k, aber mit Abstand
// zum Timeout. Noch groessere Uploads werden gesampelt statt abgelehnt: pro Datei
// Kopf+Ende, damit Einstieg und Verlauf der Stimme erhalten bleiben.
export const SAMPLE_CHAR_BUDGET = 180_000;
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

// Minimum-Quelltext fuer eine sinnvolle Analyse. Exportiert, damit der Upload-
// Gate (enqueueProfileJob) denselben Schwellwert nutzt und ein Job nicht erst
// spaeter im Worker still scheitert.
export const MIN_TOTAL_CHARS = 500;

// Zeit-Budgets: Vercel-Function laeuft mit maxDuration 300 (Fluid Compute).
// Selbst-Abbruch deutlich davor, damit der Nutzer eine saubere Meldung
// bekommt statt eines opaken Function-Timeouts.
//
// Gemessen an echtem, dichtem Material (50 Mails, voll gefuelltes Marker-Schema):
// Stufe 1 ~127s, Stufe 2 ~66s. Die Stufe-1-Latenz wird von der ~8k-Token-Ausgabe
// dominiert (das Schema mit min. 8 Zitaten, 6-12 Lexikon-Eintraegen etc.) und
// haengt damit kaum am Input-Umfang. Die alten 110s schnitten genau diese gute
// Analyse ab. Budgets: 180s + 100s = 280s, sicher unter maxDuration 300.
const STAGE1_TIMEOUT_MS = 180_000;
const STAGE2_TIMEOUT_MS = 100_000;

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

// ── Tiefe, mehrfach verifizierte Pipeline (extractVoiceDeep) ─────────────────
// Fuer den Hintergrund-Flow ohne 300s-Limit. Vier Verifikations-Ebenen:
//   1. Konsens: N unabhaengige Marker-Laeufe (parallel) -> consolidateMarkers.
//   2. Zitat-Treue: jedes Beleg-Zitat muss woertlich in den Quellen stehen.
//   3. Nachschaerf: Essenz wird gegen eine Quell-Stichprobe nachgeschaerft.
//   4. Drop-in-Gegentest: aus dem Drop-in erzeugter Test-Text wird gegen die
//      Quelle bewertet; bei schwachem Score laeuft EIN korrigierender Pass.
// Latenz ist hier zweitrangig (asynchron); jede LLM-Stufe hat dennoch einen
// grosszuegigen Self-Abort, damit ein haengender Call nicht ewig blockiert.

export interface ExtractDeepArgs {
  texts: SourceText[];
  /** Anzahl unabhaengiger Marker-Laeufe fuer den Konsens (Default 3, min 1). */
  runs?: number;
  /** Fortschritts-Callback fuer Logging/Job-Status. */
  onProgress?: (stage: string) => void;
}

const DEEP_RUNS_DEFAULT = 3;
const DEEP_STAGE_TIMEOUT_MS = 200_000;
const MIN_QUOTES_AFTER_FIDELITY = 6;
const BACKTEST_PASS_SCORE = 4;

function buildSampleText(texts: SourceText[]): string {
  return texts.map((t) => `── ${t.filename} ──\n${t.content}`).join("\n\n");
}

export async function extractVoiceDeep({
  texts,
  runs = DEEP_RUNS_DEFAULT,
  onProgress,
}: ExtractDeepArgs): Promise<VoiceExtractionResult> {
  if (texts.length === 0) {
    throw new Error("Keine Texte zum Analysieren uebergeben.");
  }
  const totalChars = texts.reduce((sum, t) => sum + t.content.length, 0);
  if (totalChars < MIN_TOTAL_CHARS) {
    throw new Error(
      "Zu wenig Textmaterial. Gib uns mindestens einen ordentlichen Absatz (~500 Zeichen)."
    );
  }
  const runCount = Math.max(1, Math.floor(runs));

  const analysisTexts = sampleForAnalysis(texts);
  const sampleText = buildSampleText(analysisTexts);
  const modeHint = detectModeHint(analysisTexts);

  // Ebene 1: Konsens aus mehreren unabhaengigen Laeufen (parallel).
  // allSettled statt all: ein transienter Einzel-Fehler (Overload/Timeout in
  // einem Lauf) darf den Konsens nicht killen, solange mindestens ein Lauf
  // gelingt. Der Job-Runner kann zwar retryen, aber wir wollen nicht 2 gute
  // Laeufe wegwerfen, weil der dritte zickt.
  onProgress?.(`Konsens: ${runCount} parallele Marker-Laeufe`);
  const settled = await Promise.allSettled(
    Array.from({ length: runCount }, () =>
      withTimeout(DEEP_STAGE_TIMEOUT_MS, (signal) => extractMarkers(analysisTexts, modeHint, signal))
    )
  );
  const runResults = settled
    .filter((r): r is PromiseFulfilledResult<MarkersResult> => r.status === "fulfilled")
    .map((r) => r.value);
  if (runResults.length === 0) {
    throw new Error("Die Stil-Analyse ist in allen Laeufen fehlgeschlagen. Bitte nochmal versuchen.");
  }
  if (runResults.length < runCount) {
    onProgress?.(`Konsens: nur ${runResults.length}/${runCount} Laeufe erfolgreich — fahre fort`);
  }
  const mode = runResults[0].mode;
  onProgress?.("Konsens: konsolidieren");
  const consensusMarkers = await withTimeout(DEEP_STAGE_TIMEOUT_MS, (signal) =>
    consolidateMarkers(
      runResults.map((r) => r.markers),
      mode,
      signal
    )
  );

  // Ebene 2: Zitat-Treue (programmatisch). Faellt die Treue zu hart aus (zu
  // wenige verifizierte Zitate), behalten wir die Original-Liste, damit das
  // Profil nicht unter die Pflicht-Mindestmenge faellt — der Befund landet im
  // Verifikations-Report.
  const fidelity = checkQuoteFidelity(consensusMarkers.quotes, texts);
  const quotes =
    fidelity.kept.length >= MIN_QUOTES_AFTER_FIDELITY ? fidelity.kept : consensusMarkers.quotes;
  const verifiedMarkers = { ...consensusMarkers, quotes };
  onProgress?.(`Zitat-Treue: ${fidelity.kept.length}/${consensusMarkers.quotes.length} woertlich verifiziert`);

  // Stufe 2: Verdichtung zur Essenz.
  onProgress?.("Essenz verdichten");
  const baseEssence = await withTimeout(DEEP_STAGE_TIMEOUT_MS, (signal) =>
    condenseEssence(verifiedMarkers, mode, signal)
  );

  // Ebene 3: Nachschaerf gegen die Quell-Stichprobe.
  onProgress?.("Nachschaerf-Pass");
  let essence = await withTimeout(DEEP_STAGE_TIMEOUT_MS, (signal) =>
    refineEssence(baseEssence, verifiedMarkers, sampleText, signal)
  );

  // Ebene 4: Drop-in-Gegentest; bei schwachem Score ein korrigierender Pass.
  onProgress?.("Drop-in-Gegentest");
  let backtest = await withTimeout(DEEP_STAGE_TIMEOUT_MS, (signal) =>
    backTestDropIn(essence.dropInClaude, essence.proofPrompt, sampleText, signal)
  );
  if (!backtest.inconclusive && backtest.score < BACKTEST_PASS_SCORE) {
    onProgress?.(`Gegentest schwach (${backtest.score}/5) -> korrigierender Nachschaerf-Pass`);
    const notes = backtest.mismatches.join("; ");
    essence = await withTimeout(DEEP_STAGE_TIMEOUT_MS, (signal) =>
      refineEssence(essence, verifiedMarkers, sampleText, signal, notes)
    );
    backtest = await withTimeout(DEEP_STAGE_TIMEOUT_MS, (signal) =>
      backTestDropIn(essence.dropInClaude, essence.proofPrompt, sampleText, signal)
    );
  }

  const noteLines = [
    ...backtest.matches.map((m) => `+ ${m}`),
    ...backtest.mismatches.map((m) => `- ${m}`),
  ];
  const verification: VoiceVerification = {
    consensusRuns: runResults.length,
    quotesVerified: fidelity.kept.length,
    quotesTotal: consensusMarkers.quotes.length,
    refined: true,
    backTestScore: backtest.score,
    backTestNotes: noteLines.length > 0 ? noteLines.join("\n") : undefined,
  };

  const profile: VoiceProfile = {
    ...essence,
    mode,
    registerNote: verifiedMarkers.registerNote,
    quotes: verifiedMarkers.quotes,
    markers: verifiedMarkers,
    verification,
  };

  onProgress?.("VOICE.md bauen");
  const voiceMd = buildVoiceMd(profile);
  return { ...profile, voiceMd };
}
