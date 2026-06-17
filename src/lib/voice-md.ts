import type {
  OpeningClosing,
  PunctuationHabit,
  VoiceProfile,
  VoiceQuote,
  VoiceScale,
} from "./voice-types";

// Baut aus dem strukturierten Profil ein Stimmprofil-Dokument im Format von
// Christians Master-Template. Pflicht-Sektionen: Kern-Identitaet, Skalen,
// Tonalitaet & Rhythmus, Satzrhythmus, Interpunktion, Lexikon/Wortwahl,
// Openings/Closings, Do/Dont, Anti-Patterns, Beleg-Zitate, Vorher/Nachher,
// Drop-ins, Confidence. Serverseitig gebaut -> kein fragiles Markdown vom
// Modell, konsistente Form. Aeltere Profile ohne `markers` bekommen die
// Marker-Sektionen nicht (Abwaertskompatibilitaet beim Re-Render).

function scaleLine(s: VoiceScale): string {
  const filled = "●".repeat(s.value);
  const empty = "○".repeat(5 - s.value);
  return `- **${s.label}:** ${filled}${empty} (${s.value}/5), ${s.poleLow} ↔ ${s.poleHigh}. ${s.evidence}`;
}

function quoteBlock(q: VoiceQuote): string {
  return `> „${q.text}“\n> _${q.source}: ${q.shows}_`;
}

function bulletList(items: string[]): string {
  if (items.length === 0) return "- _(keine erfasst)_";
  return items.map((i) => `- ${i}`).join("\n");
}

function openingClosingList(items: OpeningClosing[]): string {
  if (items.length === 0) return "- _(keine erfasst)_";
  return items
    .map((o) => `- **${o.pattern}**\n  z.B. „${o.example}“ _(${o.source})_`)
    .join("\n");
}

function punctuationTable(habits: PunctuationHabit[]): string {
  if (habits.length === 0) return "_(keine erfasst)_";
  const rows = habits.map((h) => `| ${h.mark} | ${h.usage} | ${h.note} |`);
  return ["| Zeichen | Nutzung | Wofuer |", "|---|---|---|", ...rows].join("\n");
}

const MODE_LABEL: Record<VoiceProfile["mode"], string> = {
  destilliert: "aus echten Schreibproben destilliert",
  uebersetzt: "aus einem fertigen Stil-Dokument uebernommen",
};

function markerSections(p: VoiceProfile): string {
  const m = p.markers;
  if (!m) return "";
  const lexicon = m.lexicon
    .map((e) => `- **„${e.phrase}“** — ${e.note}\n  z.B. „${e.exampleText}“ _(${e.exampleSource})_`)
    .join("\n");
  const filler =
    m.fillerWords.length > 0
      ? `\n**Typische Fuell-/Verbindungswoerter:** ${m.fillerWords.map((w) => `„${w}“`).join(", ")}`
      : "";

  return `## Lexikon / Wortwahl

${lexicon}
${filler}

## Satzrhythmus

- **Mittlere Satzlaenge:** ~${Math.round(m.rhythm.avgSentenceWords)} Woerter
- **Streuung:** ${m.rhythm.spread}
- **Fragmente:** ${m.rhythm.fragments}
- **Fluss:** ${m.rhythm.flow}

> „${m.rhythm.evidenceText}“ _(${m.rhythm.evidenceSource})_

## Interpunktion

${punctuationTable(m.punctuation)}

## Openings

${openingClosingList(m.openings)}

## Closings

${openingClosingList(m.closings)}

## Do / Dont

### Do

${bulletList(m.dos)}

### Dont

${bulletList(m.donts)}

## Anti-Patterns

Was diese Stimme nie tut:

${bulletList(m.antiPatterns)}

## Aussagen-Stil

${m.claimStyle}

`;
}

function verificationSection(p: VoiceProfile): string {
  const v = p.verification;
  if (!v) return "";
  const lines = [
    `- **Konsens:** aus ${v.consensusRuns} unabhaengigen Analyse-Laeufen konsolidiert`,
    `- **Zitat-Treue:** ${v.quotesVerified}/${v.quotesTotal} Beleg-Zitate woertlich in den Quellen verifiziert`,
    `- **Nachschaerf:** ${v.refined ? "Profil gegen eine Stichprobe der Originaltexte nachgeschaerft" : "kein Pass gelaufen"}`,
    `- **Drop-in-Gegentest:** ${v.backTestScore}/5 — Aehnlichkeit eines aus dem Drop-in erzeugten Test-Texts zur echten Quelle`,
  ];
  const notes = v.backTestNotes ? `\n${v.backTestNotes}\n` : "";
  return `## Verifikation

${lines.join("\n")}
${notes}
`;
}

export function buildVoiceMd(p: VoiceProfile): string {
  const today = new Date().toISOString().slice(0, 10);
  return `# Stimmprofil

> Sprachliche Essenz fuer jede KI. ${MODE_LABEL[p.mode]}.
> Erstellt: ${today}

## Kern-Identitaet (ein Satz)

> ${p.identity}

## Skalen

${p.scales.map(scaleLine).join("\n")}

## Tonalitaet & Rhythmus

${p.registerNote}

${markerSections(p)}## Lexikon-Kurzliste

### Das nutzt du wirklich

${bulletList(p.usesPhrases)}

### Das schreibst du nie

${bulletList(p.neverSays)}

## Beleg-Zitate (aus deinen echten Quellen)

${p.quotes.map(quoteBlock).join("\n\n")}

## Vorher / Nachher

**Aufgabe:** ${p.proofPrompt}

**Generische KI:**
${p.proofBefore}

**In deiner Stimme:**
${p.proofAfter}

## Drop-in fuer KI-Tools

### ChatGPT (Custom Instructions)

${p.dropInChatgpt}

### Claude (Project / Style)

${p.dropInClaude}

### Gemini (Gem)

${p.dropInGemini}

${verificationSection(p)}## Sicherheit & offene Punkte

${p.confidence}
`;
}
