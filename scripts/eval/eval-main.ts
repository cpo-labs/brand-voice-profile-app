// Blind-Eval der Voice-Pipeline (Hold-out-Verfahren, Buhls-Muster).
//
// Pro Fall: aus dem Fixtures-Korpus wird EINE Probe als Hold-out
// zurueckgehalten, das Profil entsteht aus den uebrigen Proben. Dann wird
// dieselbe Schreibaufgabe zweimal geloest — einmal ohne, einmal mit Profil —
// und ein Judge mit FRISCHEM Kontext entscheidet blind, welcher Text
// stilistisch naeher am Original-Hold-out liegt.
//
// Schwelle: >= 4 von 5 Faellen muss der profil-gestuetzte Text gewinnen.
//
// Fixtures liegen bewusst AUSSERHALB des Repos (PII/Kundendaten):
//   BVP_EVAL_FIXTURES_DIR=/pfad/zu/fixtures   (Default: ~/.bvp-eval-fixtures)
// Erwartete Struktur: <dir>/<persona>/NN.txt — eine echte Textprobe pro Datei.
//
// Aufruf: node scripts/eval/run-eval.mjs [--cases 5]  (Wrapper, startet tsx)

import { config as loadEnv } from "dotenv";
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { extractVoice } from "../../src/lib/voice-extraction";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, "../..");
loadEnv({ path: path.join(APP_ROOT, ".env.local") });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-6";

const FIXTURES_DIR =
  process.env.BVP_EVAL_FIXTURES_DIR || path.join(homedir(), ".bvp-eval-fixtures");
const CASE_COUNT = Number(
  process.argv.includes("--cases") ? process.argv[process.argv.indexOf("--cases") + 1] : 5
);
const THRESHOLD = 4;
const MAX_PROFILE_SAMPLES = 12;

interface Sample {
  filename: string;
  content: string;
}

interface Persona {
  name: string;
  samples: Sample[];
}

interface EvalCase {
  persona: Persona;
  holdOutIndex: number;
}

// ── Fixtures laden ───────────────────────────────────────────────────────────

function loadPersonas(): Persona[] {
  const personas = readdirSync(FIXTURES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  if (personas.length === 0) {
    throw new Error(`Keine Persona-Ordner in ${FIXTURES_DIR}.`);
  }
  return personas.map((name) => {
    const dir = path.join(FIXTURES_DIR, name);
    const samples = readdirSync(dir)
      .filter((f) => f.endsWith(".txt"))
      .sort()
      .map((f) => ({
        filename: f,
        content: readFileSync(path.join(dir, f), "utf8").trim(),
      }));
    return { name, samples };
  });
}

// Faelle: Hold-outs rotieren ueber die Personas. Das Profil einer Persona
// wird aus den Proben NACH den Hold-outs gebaut — kein Hold-out ist je Teil
// des Profil-Korpus, daher reicht EINE Extraktion pro Persona.
function buildCases(personas: Persona[]): EvalCase[] {
  const cases: EvalCase[] = [];
  const holdOutsPerPersona = Math.ceil(CASE_COUNT / personas.length);
  for (const persona of personas) {
    const need = Math.min(holdOutsPerPersona, CASE_COUNT - cases.length);
    if (persona.samples.length < need + 3) {
      throw new Error(
        `Persona "${persona.name}" hat zu wenige Proben (${persona.samples.length}) fuer ${need} Hold-outs + Profil.`
      );
    }
    for (let i = 0; i < need; i++) {
      cases.push({ persona, holdOutIndex: i });
    }
    if (cases.length >= CASE_COUNT) break;
  }
  return cases.slice(0, CASE_COUNT);
}

// ── LLM-Helfer ───────────────────────────────────────────────────────────────

interface ToolSpec {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

async function toolCall<T>({
  prompt,
  tool,
  maxTokens = 2000,
}: {
  prompt: string;
  tool: ToolSpec;
  maxTokens?: number;
}): Promise<T> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    tools: [tool as never],
    tool_choice: { type: "tool", name: tool.name },
    messages: [{ role: "user", content: prompt }],
  });
  const block = response.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error(`Kein tool_use in Antwort (${tool.name})`);
  }
  return block.input as T;
}

async function plainCall({
  system,
  prompt,
  maxTokens = 1200,
}: {
  system?: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    ...(system ? { system } : {}),
    messages: [{ role: "user", content: prompt }],
  });
  return response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

// Schreibaufgabe aus dem Hold-out ableiten — inhaltlich, ohne Stil-Hinweise.
async function deriveTask(holdOut: string): Promise<string> {
  const result = await toolCall<{ task: string }>({
    prompt: `Hier ist eine echte E-Mail/Textprobe:

─── PROBE ───
${holdOut}
─── ENDE ───

Beschreibe als Schreibaufgabe, welche Nachricht hier zu schreiben war: Situation, Empfaenger,
Ziel und die konkreten Inhaltspunkte. KEINE Aussagen zu Stil, Ton, Laenge oder Formulierung —
nur Inhalt und Zweck.`,
    tool: {
      name: "emit_task",
      description: "Gibt die abgeleitete Schreibaufgabe zurueck.",
      input_schema: {
        type: "object",
        properties: {
          task: { type: "string", description: "die Schreibaufgabe in 2-4 Saetzen, rein inhaltlich" },
        },
        required: ["task"],
      },
    },
  });
  return result.task;
}

interface Verdict {
  closer: "A" | "B";
  reasoning: string;
}

async function judge({
  original,
  candidateA,
  candidateB,
}: {
  original: string;
  candidateA: string;
  candidateB: string;
}): Promise<Verdict> {
  // Frischer Kontext: eigener API-Call, sieht weder Profil noch Generierung.
  return toolCall<Verdict>({
    prompt: `Du vergleichst Schreibstile. Hier ein ORIGINAL eines echten Autors und zwei
Kandidaten-Texte, die dieselbe Aufgabe loesen.

─── ORIGINAL ───
${original}

─── KANDIDAT A ───
${candidateA}

─── KANDIDAT B ───
${candidateB}

─── ENDE ───

Welcher Kandidat ist STILISTISCH naeher am Original? Bewerte ausschliesslich Stil:
Anrede und Grussformel, Wortwahl, Satzlaenge und Rhythmus, Interpunktion, Direktheit,
Floskeln vs. deren Abwesenheit. Inhaltliche Vollstaendigkeit und Qualitaet sind egal.`,
    tool: {
      name: "emit_verdict",
      description: "Gibt das Stil-Urteil zurueck.",
      input_schema: {
        type: "object",
        properties: {
          closer: { type: "string", enum: ["A", "B"], description: "stilistisch naeher am Original" },
          reasoning: { type: "string", description: "knappe Begruendung anhand konkreter Stil-Merkmale" },
        },
        required: ["closer", "reasoning"],
      },
    },
  });
}

// ── Eval-Lauf ────────────────────────────────────────────────────────────────

function ts(): string {
  return new Date().toISOString();
}

interface CaseResult {
  case: number;
  persona: string;
  holdOut: string;
  task: string;
  profileWon: boolean;
  judgeReasoning: string;
  withProfile: string;
  withoutProfile: string;
}

async function main(): Promise<void> {
  console.log(`[${ts()}] Blind-Eval startet. Fixtures: ${FIXTURES_DIR}, Faelle: ${CASE_COUNT}`);
  const personas = loadPersonas();
  const cases = buildCases(personas);

  // Eine Profil-Extraktion pro Persona (Hold-outs sind nie im Korpus).
  const holdOutCount = new Map<string, number>();
  for (const c of cases) {
    holdOutCount.set(
      c.persona.name,
      Math.max(holdOutCount.get(c.persona.name) ?? 0, c.holdOutIndex + 1)
    );
  }
  const profiles = new Map<string, Awaited<ReturnType<typeof extractVoice>>>();
  for (const persona of personas) {
    const reserved = holdOutCount.get(persona.name);
    if (reserved === undefined) continue;
    const corpus = persona.samples.slice(reserved, reserved + MAX_PROFILE_SAMPLES);
    console.log(
      `[${ts()}] Extrahiere Profil fuer "${persona.name}" aus ${corpus.length} Proben (${reserved} Hold-outs reserviert) ...`
    );
    const profile = await extractVoice({ texts: corpus });
    profiles.set(persona.name, profile);
    console.log(
      `[${ts()}]   Profil ok: ${profile.markers?.lexicon.length ?? 0} Lexikon-Marker, ${profile.quotes.length} Zitate.`
    );
  }

  const results: CaseResult[] = [];
  for (const [i, c] of cases.entries()) {
    const holdOut = c.persona.samples[c.holdOutIndex].content;
    const profile = profiles.get(c.persona.name);
    if (!profile) throw new Error(`Kein Profil fuer ${c.persona.name}`);
    console.log(
      `[${ts()}] Fall ${i + 1}/${cases.length} (${c.persona.name}, Hold-out ${c.persona.samples[c.holdOutIndex].filename}) ...`
    );

    const task = await deriveTask(holdOut);

    const withoutProfile = await plainCall({
      prompt: `Schreibe die folgende Nachricht auf Deutsch:\n\n${task}\n\nGib nur den Nachrichtentext aus.`,
    });
    const withProfile = await plainCall({
      system: `Du schreibst Nachrichten exakt in der folgenden Stimme. Halte dich strikt an alle Marker:\n\n${profile.voiceMd}`,
      prompt: `Schreibe die folgende Nachricht auf Deutsch:\n\n${task}\n\nGib nur den Nachrichtentext aus.`,
    });

    // Blind: Position des Profil-Kandidaten alterniert pro Fall.
    const profileIsA = i % 2 === 0;
    const verdict = await judge({
      original: holdOut,
      candidateA: profileIsA ? withProfile : withoutProfile,
      candidateB: profileIsA ? withoutProfile : withProfile,
    });
    const profileWon = verdict.closer === (profileIsA ? "A" : "B");
    console.log(
      `[${ts()}]   ${profileWon ? "WIN " : "LOSS"} — Judge: ${verdict.reasoning.slice(0, 160)}`
    );

    results.push({
      case: i + 1,
      persona: c.persona.name,
      holdOut: c.persona.samples[c.holdOutIndex].filename,
      task,
      profileWon,
      judgeReasoning: verdict.reasoning,
      withProfile,
      withoutProfile,
    });
  }

  const wins = results.filter((r) => r.profileWon).length;
  const passed = wins >= THRESHOLD;
  console.log(
    `\n[${ts()}] Ergebnis: ${wins}/${results.length} Faelle gewonnen — ${passed ? "BESTANDEN" : "NICHT bestanden"} (Schwelle ${THRESHOLD}/${CASE_COUNT}).`
  );

  const outDir = path.join(__dirname, "results");
  mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `eval-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(outFile, JSON.stringify({ wins, total: results.length, passed, results }, null, 2));
  console.log(`[${ts()}] Detail-Log: ${outFile}`);

  process.exit(passed ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error(`[${ts()}] FEHLER:`, err);
  process.exit(2);
});
