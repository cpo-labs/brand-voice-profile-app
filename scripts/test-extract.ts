// Local end-to-end smoke test: runs extractVoice against real markdown files.
// Bypasses HTTP/UI, calls the lib directly.
//
//   SAMPLE_DIR=./my-texts npx tsx scripts/test-extract.ts
//   # or:
//   SAMPLE_FILES=./a.md,./b.md npx tsx scripts/test-extract.ts
//
// Defaults to ./sample-texts/*.md if neither is set. Requires ANTHROPIC_API_KEY in .env.local.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

function resolveSampleFiles(): string[] {
  if (process.env.SAMPLE_FILES) {
    return process.env.SAMPLE_FILES.split(",").map((p) => resolve(p.trim()));
  }
  const dir = resolve(process.env.SAMPLE_DIR || "./sample-texts");
  try {
    const stat = statSync(dir);
    if (!stat.isDirectory()) throw new Error("not a dir");
  } catch {
    console.error(
      `Sample dir "${dir}" not found.\n` +
        `Set SAMPLE_DIR=./my-texts or SAMPLE_FILES=./a.md,./b.md and retry.`
    );
    process.exit(1);
  }
  return readdirSync(dir)
    .filter((f) => /\.(md|txt|markdown)$/i.test(f))
    .map((f) => join(dir, f));
}

const SAMPLE_FILES = resolveSampleFiles();

async function main() {
  const { extractVoice } = await import("../src/lib/voice-extraction");

  const texts = SAMPLE_FILES.map((path) => ({
    filename: basename(path),
    content: readFileSync(path, "utf-8"),
  }));

  const totalChars = texts.reduce((sum, t) => sum + t.content.length, 0);
  console.log(`Loaded ${texts.length} files, ${totalChars} chars total\n`);
  for (const t of texts) {
    console.log(`  - ${t.filename}: ${t.content.length} chars`);
  }
  console.log("\nCalling extractVoice (this takes ~30s)…\n");

  const t0 = Date.now();
  const result = await extractVoice({ texts });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`Done in ${elapsed}s.\n`);
  console.log("─── VOICE.md ─────────────────────────────────────────");
  console.log(result.voiceMd);
  console.log("\n─── ChatGPT Drop-in ─────────────────────────────────");
  console.log(result.dropInChatgpt);
  console.log("\n─── Claude Drop-in ──────────────────────────────────");
  console.log(result.dropInClaude);
  console.log("\n─── Gemini Drop-in ──────────────────────────────────");
  console.log(result.dropInGemini);
  console.log("\n─── Proof Prompt ────────────────────────────────────");
  console.log(result.proofPrompt);
  console.log("\n─── Generic LLM (before) ────────────────────────────");
  console.log(result.proofBefore);
  console.log("\n─── In your voice (after) ───────────────────────────");
  console.log(result.proofAfter);
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
