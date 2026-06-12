import type { VoiceEssence, VoiceMarkers, VoiceProfile } from "@/lib/voice-types";

// Geteilte Test-Fixture: ein vollstaendiges, kuenstliches Marker-Set + Essenz.
// Inhaltlich frei erfunden (keine Kundendaten), strukturell vollstaendig.

export const markersFixture: VoiceMarkers = {
  language: "de",
  lexicon: [
    { phrase: "passt schon", note: "knappe Zustimmung", exampleText: "Passt schon, mach so.", exampleSource: "Quelle 1" },
    { phrase: "kurz gesagt", note: "Einleitung der Kernaussage", exampleText: "Kurz gesagt: nein.", exampleSource: "Quelle 2" },
    { phrase: "haken wir ab", note: "Themen schliessen", exampleText: "Das haken wir ab.", exampleSource: "Quelle 1" },
    { phrase: "guck ich mir an", note: "Zusage light", exampleText: "Guck ich mir morgen an.", exampleSource: "Quelle 3" },
    { phrase: "melde dich", note: "Abschluss-Aufforderung", exampleText: "Melde dich, wenn was ist.", exampleSource: "Quelle 2" },
    { phrase: "klar", note: "Bestaetigung", exampleText: "Klar, machen wir.", exampleSource: "Quelle 3" },
  ],
  fillerWords: ["halt", "eh", "kurz"],
  rhythm: {
    avgSentenceWords: 9,
    spread: "kurz und konstant, selten ueber 15 Woerter",
    fragments: "haeufig verblose Bestaetigungen (Passt. Klar.)",
    flow: "ein Gedanke pro Absatz, kein Vorgeplaenkel",
    evidenceText: "Passt schon, mach so. Rest klaeren wir Montag.",
    evidenceSource: "Quelle 1",
  },
  punctuation: [
    { mark: "Gedankenstrich", usage: "nie", note: "stattdessen Punkt oder Komma" },
    { mark: "Ausrufezeichen", usage: "selten", note: "nur bei echtem Nachdruck" },
    { mark: "Fragezeichen", usage: "regelmaessig", note: "echte Rueckfragen, keine rhetorischen" },
    { mark: "Klammern", usage: "selten", note: "kurze Einschuebe" },
    { mark: "Emoji", usage: "nie", note: "kommt im Material nicht vor" },
  ],
  openings: [
    { pattern: "Vorname + Komma, direkt zur Sache", example: "Anna, der Entwurf passt.", source: "Quelle 1" },
  ],
  closings: [
    { pattern: "knapper Imperativ + Vorname", example: "Melde dich. Jo", source: "Quelle 2" },
  ],
  dos: [
    "Schreibe Saetze unter 12 Woertern.",
    "Beginne mit der Kernaussage.",
    "Nutze Verben statt Substantivierungen.",
    "Schliesse mit einer konkreten Aufforderung.",
  ],
  donts: [
    "Vermeide Einleitungsfloskeln.",
    "Vermeide Weichmacher wie 'eventuell'.",
    "Vermeide Gedankenstriche.",
    "Vermeide Emojis.",
  ],
  antiPatterns: [
    "Ich hoffe, diese Nachricht erreicht Sie wohlbehalten",
    "Gerne komme ich auf Sie zurueck",
    "Lass uns eintauchen",
    "Absolut!",
  ],
  claimStyle: "Direkte Aussagen ohne Absicherung, Zahlen statt Adjektive.",
  registerNote: "Konsequent Du, informell, knapp. Kein Smalltalk.",
  quotes: [
    { text: "Passt schon, mach so.", source: "Quelle 1", shows: "knappe Zustimmung" },
    { text: "Kurz gesagt: nein.", source: "Quelle 2", shows: "direkte Absage" },
    { text: "Das haken wir ab.", source: "Quelle 1", shows: "Themen schliessen" },
    { text: "Guck ich mir morgen an.", source: "Quelle 3", shows: "Zusage light" },
    { text: "Melde dich, wenn was ist.", source: "Quelle 2", shows: "Abschlussformel" },
    { text: "Klar, machen wir.", source: "Quelle 3", shows: "Bestaetigung" },
    { text: "Rest klaeren wir Montag.", source: "Quelle 1", shows: "pragmatische Planung" },
    { text: "Anna, der Entwurf passt.", source: "Quelle 1", shows: "Opening-Muster" },
  ],
};

export const essenceFixture: VoiceEssence = {
  identity: "Knapper Pragmatiker, der Entscheidungen in Hauptsaetzen trifft.",
  scales: [
    { key: "direktheit", label: "Direktheit", poleLow: "diplomatisch", poleHigh: "sehr direkt", value: 5, evidence: "„Kurz gesagt: nein.“ (Quelle 2)" },
    { key: "formalitaet", label: "Formalitaet", poleLow: "locker", poleHigh: "foermlich", value: 1, evidence: "Konsequent Du, „Passt schon“ (Quelle 1)" },
    { key: "satzlaenge", label: "Satzlaenge", poleLow: "telegraphisch", poleHigh: "ausschweifend", value: 1, evidence: "~9 Woerter pro Satz im Schnitt" },
  ],
  usesPhrases: ["passt schon", "kurz gesagt", "haken wir ab", "melde dich"],
  neverSays: ["Ich hoffe, diese Nachricht erreicht Sie wohlbehalten", "Absolut!", "Lass uns eintauchen", "Gerne komme ich auf Sie zurueck"],
  confidence: "Hohe Sicherheit bei Mails, keine Daten zu Langtexten.",
  proofPrompt: "Schreib eine kurze Absage fuer einen Termin am Freitag.",
  proofBefore: "Vielen Dank fuer Ihre Anfrage! Leider muss ich Ihnen mitteilen, dass...",
  proofAfter: "Anna, Freitag wird nichts. Neuer Vorschlag: Dienstag 10 Uhr. Melde dich. Jo",
  dropInChatgpt: "Schreibe in folgender Stimme: kurze Hauptsaetze unter 12 Woertern...",
  dropInClaude: "# Voice Guide\nKurze Hauptsaetze, Du-Anrede, keine Floskeln...",
  dropInGemini: "Voice guide: short main clauses, informal Du, no filler...",
};

export const profileFixture: VoiceProfile = {
  ...essenceFixture,
  mode: "destilliert",
  registerNote: markersFixture.registerNote,
  quotes: markersFixture.quotes,
  markers: markersFixture,
};
