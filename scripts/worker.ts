// Hintergrund-Worker fuer den Mac Mini.
//
// Warum lokal statt auf Vercel: Die tiefe, mehrfach verifizierte Pipeline
// (extractVoiceDeep) laeuft bis ~7 Min. Das Vercel-Funktions-Limit ist 300s
// (Hobby) bzw. 800s (Pro), und Hobby erlaubt nur Tages-Crons — beides reicht
// nicht. Der Mini ist 24/7 an, hat ANTHROPIC/RESEND-Keys und Zugriff auf die
// (Turso-)Prod-DB. Er pollt dieselbe DB, in die der Vercel-Upload die Jobs
// schreibt, fuehrt die Pipeline lokal aus und schreibt Profil + Mail zurueck.
//
// Lauf:
//   npx tsx scripts/worker.ts              # Dauerbetrieb (launchd)
//   WORKER_ONCE=1 npx tsx scripts/worker.ts # ein Tick, dann Ende (Test)
//
// Env: liest .env.local (DB/Anthropic/Resend). PUBLIC_BASE_URL wird bewusst auf
// die Prod-Domain gezwungen — sonst landen localhost-Links in den Mails.

import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

// E-Mail-Permalinks muessen auf die echte Seite zeigen, nicht auf das lokale
// .env.local (localhost). Override hier, vor dem Import von job-runner/email.
const DEFAULT_PROD_BASE_URL = "https://brand-voice-profile.vercel.app";
const usingFallbackBaseUrl = !process.env.WORKER_PUBLIC_BASE_URL;
process.env.PUBLIC_BASE_URL =
  process.env.WORKER_PUBLIC_BASE_URL || DEFAULT_PROD_BASE_URL;

const IDLE_SLEEP_MS = 15_000;
const ERROR_SLEEP_MS = 30_000;
// Heartbeat ~ alle 10 Min (40 * 15s), damit das Log zeigt, dass der Worker lebt,
// ohne im Leerlauf zu spammen.
const HEARTBEAT_EVERY_IDLE = 40;

function log(message: string): void {
  console.log(`[worker ${new Date().toISOString()}] ${message}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  // Erst NACH dem Env-Load importieren: db/email lesen ihre Secrets beim Import.
  const { runOneJob, sweepCompletedJobPii } = await import("../src/lib/job-runner");

  const once = process.env.WORKER_ONCE === "1";
  log(`gestartet (base=${process.env.PUBLIC_BASE_URL}${once ? ", once-Modus" : ""})`);
  if (usingFallbackBaseUrl) {
    log(`WARN: WORKER_PUBLIC_BASE_URL nicht gesetzt — nutze Fallback ${DEFAULT_PROD_BASE_URL}. Bei Domain-Wechsel hier setzen, sonst stimmen die Mail-Links nicht.`);
  }

  let running = true;
  const stop = (sig: string) => {
    if (!running) return;
    running = false;
    log(`${sig} empfangen — beende nach aktuellem Job`);
  };
  process.on("SIGINT", () => stop("SIGINT"));
  process.on("SIGTERM", () => stop("SIGTERM"));

  let idleCycles = 0;

  do {
    // Sweep getrennt kapseln, damit ein transienter Sweep-Fehler nicht als
    // Job-Fehler im Log erscheint und nicht die Job-Verarbeitung blockiert.
    try {
      await sweepCompletedJobPii();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`sweep-Fehler (ignoriert): ${msg}`);
    }

    try {
      const result = await runOneJob();
      if (result) {
        idleCycles = 0;
        const suffix = result.error ? ` (${result.error})` : "";
        log(`Job ${result.slug} -> ${result.status}${suffix}`);
        if (once) break;
        continue; // sofort weiter — Backlog leeren statt schlafen
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`Fehler im Tick: ${msg}`);
      if (once) break;
      await sleep(ERROR_SLEEP_MS);
      continue;
    }

    if (once) {
      log("kein Job offen");
      break;
    }
    if (++idleCycles % HEARTBEAT_EVERY_IDLE === 0) {
      log("idle — warte auf Jobs");
    }
    await sleep(IDLE_SLEEP_MS);
  } while (running);

  log("gestoppt");
}

main().catch((err) => {
  console.error("[worker] fataler Fehler:", err);
  process.exit(1);
});
