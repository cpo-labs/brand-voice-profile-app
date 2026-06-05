import type { VoiceProfile, VoiceScale, VoiceQuote } from "./voice-extraction";

// Baut aus dem strukturierten Profil ein Stimmprofil-Dokument im Format von
// Christians Master-Template (Voice DNA / Tonalitaet / Lexikon / Skalen /
// Beleg-Zitate / Was-die-Stimme-nie-tut / Vorher-Nachher / Drop-in / Confidence).
// Serverseitig gebaut -> kein fragiles Markdown vom Modell, konsistente Form.

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

const MODE_LABEL: Record<VoiceProfile["mode"], string> = {
  destilliert: "aus echten Schreibproben destilliert",
  uebersetzt: "aus einem fertigen Stil-Dokument uebernommen",
};

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

## Lexikon

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

## Sicherheit & offene Punkte

${p.confidence}
`;
}
