import type { VoiceProfile } from "./voice-extraction";
import { buildVoiceMd } from "./voice-md";

// Demo-Stimmprofil fuer den "Beispiel ansehen"-Pfad VOR jedem Upload.
// Erfundene Person (freie Texterin), KEIN echter Kunde, keine echten Namen.
// Bewusst so geschrieben, dass die Skalen, Beleg-Zitate und der Vorher/Nachher
// das Wow ohne eigene Eingabe zeigen.

export const DEMO_SLUG = "beispiel";
export const DEMO_AUTHOR = "Lena Voss";

export const demoProfileDe: VoiceProfile = {
  mode: "destilliert",
  identity:
    "Knapp, warm und konkret: schreibt wie sie spricht, kurze Saetze, ein Gedanke pro Zeile, nie geschwollen.",
  scales: [
    {
      key: "direktheit",
      label: "Direktheit",
      poleLow: "diplomatisch",
      poleHigh: "sehr direkt",
      value: 4,
      evidence: "Sagt die Kernsache im ersten Satz, ohne Aufwaermen.",
    },
    {
      key: "formalitaet",
      label: "Formalitaet",
      poleLow: "locker",
      poleHigh: "formell",
      value: 2,
      evidence: "Duzt, nutzt Alltagssprache, aber keine Anbiederung.",
    },
    {
      key: "waerme",
      label: "Waerme",
      poleLow: "sachlich",
      poleHigh: "herzlich",
      value: 4,
      evidence: "Bedankt sich konkret, benennt die Person beim Namen.",
    },
    {
      key: "tempo",
      label: "Tempo",
      poleLow: "ausfuehrlich",
      poleHigh: "knapp",
      value: 5,
      evidence: "Drei Saetze reichen ihr fast immer.",
    },
  ],
  quotes: [
    {
      text: "Hab den Entwurf ueberflogen, passt fuer mich. Eine Sache noch zur Headline.",
      source: "Mail an Projektpartnerin",
      shows: "Kernaussage zuerst, dann ein konkreter Punkt",
    },
    {
      text: "Danke dir, das ging schnell. Ich schau morgen frueh drueber.",
      source: "Slack-Antwort",
      shows: "kurze, warme Bestaetigung mit klarem naechsten Schritt",
    },
    {
      text: "Ehrlich gesagt finde ich Variante B staerker, weil sie nicht so generisch klingt.",
      source: "Feedback-Mail",
      shows: "begruendete Meinung, kein Drumherum",
    },
    {
      text: "Kein Stress, melde dich einfach wenn du soweit bist.",
      source: "Mail an Kunden",
      shows: "Druck rausnehmen, Tuer offen lassen",
    },
    {
      text: "Das koennen wir kuerzer sagen. Weniger ist hier mehr.",
      source: "Redigier-Notiz",
      shows: "Kuerze als Haltung, nicht nur als Stil",
    },
    {
      text: "Liebe Gruesse und schoenes Wochenende, Lena",
      source: "Mail-Abschluss",
      shows: "persoenlicher, knapper Abschluss ohne Floskel",
    },
  ],
  usesPhrases: [
    "Ehrlich gesagt",
    "Kein Stress",
    "passt fuer mich",
    "weniger ist mehr",
    "melde dich einfach",
    "schau morgen drueber",
  ],
  neverSays: [
    "Sehr geehrte Damen und Herren",
    "anbei uebersende ich Ihnen",
    "im Rahmen unserer Zusammenarbeit",
    "diesbezueglich moechte ich anmerken",
    "Lass uns eintauchen",
    "in diesem dynamischen Umfeld",
  ],
  registerNote:
    "Duzt durchgehend, beginnt oft mit der Sache statt mit Begruessung, schliesst persoenlich. Saetze meist unter 15 Woertern, ein Gedanke pro Satz. Keine Aufzaehlungen im Fliesstext, keine Gedankenstrich-Inflation.",
  confidence:
    "Stimmiges Bild aus kurzer, beruflicher Korrespondenz. Weniger Belege fuer laengere Texte (z.B. Artikel) und fuer den formellen Erstkontakt mit fremden Firmen.",
  proofPrompt: "Schreib eine kurze Mail, dass sich ein Liefertermin um zwei Tage verschiebt.",
  proofBefore:
    "Sehr geehrte Damen und Herren, im Rahmen unserer laufenden Zusammenarbeit moechte ich Sie hiermit darueber in Kenntnis setzen, dass sich der vereinbarte Liefertermin aufgrund unvorhergesehener Umstaende voraussichtlich um zwei Tage nach hinten verschieben wird. Wir bitten dieserhalb um Ihr Verstaendnis und stehen fuer Rueckfragen selbstverstaendlich jederzeit gerne zur Verfuegung.",
  proofAfter:
    "Hi Sarah, kurze Info: der Liefertermin rutscht um zwei Tage, also auf Donnerstag. Nichts Dramatisches, ich wollte es dir nur frueh sagen. Melde dich, wenn das ein Problem ist. Liebe Gruesse, Lena",
  dropInChatgpt:
    "Schreibe in folgender Stimme: knapp, warm, direkt. Duze. Sag die Kernsache im ersten Satz. Saetze unter 15 Woertern, ein Gedanke pro Satz. Keine Floskeln wie 'Sehr geehrte Damen und Herren' oder 'im Rahmen unserer Zusammenarbeit'. Nimm Druck raus ('Kein Stress', 'melde dich einfach'). Schliesse persoenlich.",
  dropInClaude:
    "# Voice Guide\n\nTon: knapp, warm, direkt. Duzen. Kernaussage zuerst, dann ein konkreter Punkt. Saetze meist unter 15 Woertern, ein Gedanke pro Satz. Begruendete Meinungen ('Ehrlich gesagt finde ich B staerker'). Druck rausnehmen, Tuer offen lassen. Verboten: 'Sehr geehrte Damen und Herren', 'anbei uebersende ich', 'im Rahmen', Gedankenstrich-Inflation, generische KI-Floskeln.",
  dropInGemini:
    "Voice guide: knapp, warm, direkt, duzend. Erst die Sache, dann Details. Kurze Saetze, ein Gedanke pro Satz. Persoenlicher Abschluss. Keine Amtsdeutsch-Floskeln, kein 'Lass uns eintauchen'.",
};

export interface DemoProfileRow {
  slug: string;
  author: string;
  voiceMd: string;
  profile: VoiceProfile;
  sourceFileCount: number;
  sourceWordCount: number;
}

export function getDemoProfile(): DemoProfileRow {
  return {
    slug: DEMO_SLUG,
    author: DEMO_AUTHOR,
    voiceMd: buildVoiceMd(demoProfileDe),
    profile: demoProfileDe,
    sourceFileCount: 9,
    sourceWordCount: 2840,
  };
}
