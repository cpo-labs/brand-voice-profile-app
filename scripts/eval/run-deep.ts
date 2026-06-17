// Offline-Lauf der tiefen, mehrfach verifizierten Pipeline (extractVoiceDeep).
// Beweist die Qualitaet + misst die Latenz, bevor die Async-Mechanik dranhaengt.
//
//   SAMPLE_FILES=./scripts/eval/fixtures/christian-emails.txt npx tsx scripts/eval/run-deep.ts
//   DEEP_RUNS=3 SAMPLE_FILES=... npx tsx scripts/eval/run-deep.ts
//
// Braucht ANTHROPIC_API_KEY in .env.local.

import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

function resolveFiles(): string[] {
  if (process.env.SAMPLE_FILES) {
    return process.env.SAMPLE_FILES.split(",").map((p) => resolve(p.trim()));
  }
  return [resolve("./scripts/eval/fixtures/christian-emails.txt")];
}

async function main() {
  const { extractVoiceDeep } = await import("../../src/lib/voice-extraction");
  const files = resolveFiles();
  const runs = Number(process.env.DEEP_RUNS ?? "3");

  const texts = files.map((path) => ({
    filename: basename(path),
    content: readFileSync(path, "utf-8"),
  }));
  const totalChars = texts.reduce((sum, t) => sum + t.content.length, 0);
  console.log(`Loaded ${texts.length} file(s), ${totalChars} chars, consensus runs=${runs}\n`);

  const t0 = Date.now();
  const result = await extractVoiceDeep({
    texts,
    runs,
    onProgress: (stage) => console.log(`  [${((Date.now() - t0) / 1000).toFixed(0)}s] ${stage}`),
  });
  console.log(`\nDONE in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log("\nVerifikation:", JSON.stringify(result.verification, null, 2));
  console.log("\n─── VOICE.md ─────────────────────────────────────────");
  console.log(result.voiceMd);
  console.log("\n─── Proof (before) ───");
  console.log(result.proofBefore);
  console.log("\n─── Proof (after) ───");
  console.log(result.proofAfter);
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
