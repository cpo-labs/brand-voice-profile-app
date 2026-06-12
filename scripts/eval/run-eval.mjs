// Duenner Wrapper: startet die eigentliche Eval-Logik (eval-main.ts) ueber
// die tsx-CLI, damit TypeScript-Imports aus src/lib funktionieren.
// Aufruf: node scripts/eval/run-eval.mjs [--cases 5]
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, "../..");
const tsxBin = path.join(APP_ROOT, "node_modules", ".bin", "tsx");

const result = spawnSync(tsxBin, [path.join(__dirname, "eval-main.ts"), ...process.argv.slice(2)], {
  stdio: "inherit",
  cwd: APP_ROOT,
});
process.exit(result.status ?? 2);
