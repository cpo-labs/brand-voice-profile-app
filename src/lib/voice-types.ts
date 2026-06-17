// ── Gemeinsame Typen der Voice-Pipeline ─────────────────────────────────────
// Stufe 1 (voice-markers.ts) destilliert granulare, belegte Marker aus dem
// Korpus. Stufe 2 (voice-essence.ts) verdichtet die Marker zu Identitaet,
// Skalen, Drop-ins und Beweis. voice-extraction.ts orchestriert beides.

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

/** Signatur-Wendung mit Beleg. */
export interface LexiconEntry {
  /** Die Wendung/das Wort, woertlich. */
  phrase: string;
  /** Wann/wie es benutzt wird, ein Halbsatz. */
  note: string;
  /** Woertliches Vorkommen mit Quellen-Anker. */
  exampleText: string;
  exampleSource: string;
}

/** Beobachtete Nutzung eines Satzzeichens / typografischen Mittels. */
export interface PunctuationHabit {
  /** z.B. "Gedankenstrich", "Ausrufezeichen", "Klammern", "Emoji". */
  mark: string;
  usage: "nie" | "selten" | "regelmaessig" | "oft";
  /** Wofuer es (nicht) eingesetzt wird, ein Halbsatz. */
  note: string;
}

/** Beobachtetes Einstiegs-/Abschluss-Muster mit echtem Beispiel. */
export interface OpeningClosing {
  /** Das Muster, z.B. "Vorname + Komma, direkt zur Sache". */
  pattern: string;
  /** Woertliches Beispiel aus den Quellen. */
  example: string;
  /** Quellen-Anker. */
  source: string;
}

/** Granulare, quellenbelegte Voice-Marker (Stufe 1). */
export interface VoiceMarkers {
  /** Sprache des Korpus (steuert die Profilsprache). */
  language: "de" | "en";
  /** 6-12 Signatur-Wendungen mit Beleg. */
  lexicon: LexiconEntry[];
  /** Typische kleine Fuell-/Verbindungswoerter. */
  fillerWords: string[];
  /** Satzrhythmus: Laenge, Streuung, Fragmente, Fluss. */
  rhythm: {
    avgSentenceWords: number;
    /** Wie stark die Satzlaenge schwankt, mit Befund. */
    spread: string;
    /** Ellipsen/verblose Saetze/Einwort-Saetze, mit Befund. */
    fragments: string;
    /** Absatz- und Gedankenfluss, ein bis zwei Saetze. */
    flow: string;
    evidenceText: string;
    evidenceSource: string;
  };
  /** Interpunktions-Gewohnheiten einzeln (Gedankenstrich, !, ?, Klammern, Emoji, ...). */
  punctuation: PunctuationHabit[];
  /** 2-5 Einstiegs-Muster mit echten Beispielen. */
  openings: OpeningClosing[];
  /** 2-5 Abschluss-Muster mit echten Beispielen. */
  closings: OpeningClosing[];
  /** Konkrete nachahmbare Regeln ("Schreibe ...", 4-8). */
  dos: string[];
  /** Konkrete Verbote ("Vermeide ...", 4-8). */
  donts: string[];
  /** Was diese Stimme NIE tut (KI-Floskeln + personenspezifisch). */
  antiPatterns: string[];
  /** Wie Aussagen getroffen werden (direkt, abgesichert, mit Zahlen, ...). */
  claimStyle: string;
  /** Anrede, Register, Du/Sie, Rhythmus-Notiz. */
  registerNote: string;
  /** >= 8 woertliche Beleg-Zitate. */
  quotes: VoiceQuote[];
}

/** Verdichtete Essenz (Stufe 2). */
export interface VoiceEssence {
  /** Erfundener oder echter Stimm-Name, ein Satz zur Kern-Identitaet. */
  identity: string;
  /** 3-5 quantitative Skalen. */
  scales: VoiceScale[];
  /** Wendungen/Begriffe, die diese Person wirklich nutzt. */
  usesPhrases: string[];
  /** Tabu-Liste: Floskeln, die diese Person NIE schreibt. */
  neverSays: string[];
  /** Wie sicher die Analyse ist + offene Punkte. */
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

export type VoiceMode = "destilliert" | "uebersetzt";

/**
 * Verifikations-Report der tiefen Pipeline (extractVoiceDeep). Macht fuer den
 * Nutzer transparent, wie hart das Profil geprueft wurde: ueber wie viele
 * unabhaengige Laeufe es konsolidiert ist, wie viele Beleg-Zitate woertlich in
 * den Quellen gefunden wurden, ob ein Nachschaerf-Pass lief und wie nah ein aus
 * dem Drop-in erzeugter Test-Text an den echten Quellen liegt (1..5).
 */
export interface VoiceVerification {
  /** Anzahl unabhaengiger Marker-Laeufe, die in den Konsens eingingen. */
  consensusRuns: number;
  /** Wie viele Beleg-Zitate woertlich in den Quellen verifiziert wurden. */
  quotesVerified: number;
  /** Wie viele Beleg-Zitate insgesamt geprueft wurden. */
  quotesTotal: number;
  /** Ob ein quellengestuetzter Nachschaerf-Pass die Essenz verbessert hat. */
  refined: boolean;
  /** Drop-in-Gegentest: Aehnlichkeit eines erzeugten Test-Texts zur Quelle, 1..5. */
  backTestScore: number;
  /** Kurze Befunde des Gegentests (was passt, was abweicht). */
  backTestNotes?: string;
}

/**
 * Vollstaendiges Stimmprofil = Essenz + Marker + Modus. registerNote und
 * quotes liegen (UI-kompatibel) zusaetzlich auf Top-Level. `markers` ist
 * optional, damit aeltere persistierte Profile (ohne Marker) weiter laden.
 * `verification` liegt nur bei der tiefen Pipeline vor.
 */
export interface VoiceProfile extends VoiceEssence {
  mode: VoiceMode;
  registerNote: string;
  quotes: VoiceQuote[];
  markers?: VoiceMarkers;
  verification?: VoiceVerification;
}

export interface VoiceExtractionResult extends VoiceProfile {
  /** Serverseitig aus dem Profil gebautes Stimmprofil-Dokument. */
  voiceMd: string;
}

export interface SourceText {
  filename: string;
  content: string;
}
