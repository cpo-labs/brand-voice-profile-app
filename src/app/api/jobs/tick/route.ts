import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { runOneJob, sweepCompletedJobPii } from "@/lib/job-runner";

// Manueller/Poller-Fallback-Trigger. Die eigentliche Verarbeitung laeuft auf dem
// Mac-Mini-Worker (scripts/worker.ts) gegen dieselbe Turso-DB — denn die tiefe
// Pipeline (~7 Min) sprengt das Vercel-Funktions-Limit (Hobby: 300s, Pro: 800s).
// Wird diese Route dennoch aufgerufen, verarbeitet sie einen Job, aber gedeckelt
// auf 300s (Hobby-Max). Laenger laufende Jobs bleiben `processing` und werden
// vom Worker nach dem Stale-Lock-Fenster requeued.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;
const POLLER_SHARED_SECRET = process.env.POLLER_SHARED_SECRET;

// Per-Prozess-Schluessel nur fuer den Gleichheits-Vergleich. Stabil innerhalb
// eines Prozesses, sonst egal.
const COMPARE_KEY = randomBytes(32);

// Konstantzeit-Vergleich gegen Timing-Seitenkanaele. Beide Seiten werden zuerst
// per HMAC auf feste 32 Byte gehasht, bevor verglichen wird — so verraet kein
// Laengen-Short-Circuit die Laenge des erwarteten Secrets (relevant, weil der
// Poller-Pfad gegen vom Aufrufer kontrollierte Header vergleicht).
function safeEqual(a: string | null, b: string | undefined): boolean {
  if (!a || !b) return false;
  const ha = createHmac("sha256", COMPARE_KEY).update(a).digest();
  const hb = createHmac("sha256", COMPARE_KEY).update(b).digest();
  return timingSafeEqual(ha, hb);
}

function authorized(req: Request): boolean {
  const auth = req.headers.get("authorization");
  // Vercel Cron sendet "Authorization: Bearer <CRON_SECRET>". Fuer manuelle/
  // externe Trigger (Poller) akzeptieren wir zusaetzlich POLLER_SHARED_SECRET —
  // als Bearer oder ueber den x-poller-secret-Header. Deshalb bleibt POST
  // erhalten: der externe Poller braucht ihn.
  if (safeEqual(auth, CRON_SECRET ? `Bearer ${CRON_SECRET}` : undefined)) return true;
  if (POLLER_SHARED_SECRET) {
    if (safeEqual(auth, `Bearer ${POLLER_SHARED_SECRET}`)) return true;
    if (safeEqual(req.headers.get("x-poller-secret"), POLLER_SHARED_SECRET)) return true;
  }
  return false;
}

async function handle(req: Request): Promise<Response> {
  // Fail-loud bei Fehlkonfiguration: ohne irgendein Secret koennte der Worker
  // nie laufen. 503 + Log statt einer stillen 401-Dauerschleife, die wie ein
  // falsches Secret aussieht.
  if (!CRON_SECRET && !POLLER_SHARED_SECRET) {
    console.error(
      "[cron/tick] misconfigured: neither CRON_SECRET nor POLLER_SHARED_SECRET is set"
    );
    return new Response("Cron not configured", { status: 503 });
  }
  if (!authorized(req)) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    await sweepCompletedJobPii();
    const result = await runOneJob();
    return Response.json({ ok: true, processed: result });
  } catch (err) {
    // Interne Fehlerdetails (LLM-/DB-Meldungen) nicht an den Aufrufer leaken —
    // nur serverseitig loggen, generische Meldung zurueck.
    console.error("[cron/tick] unhandled error", err);
    return Response.json({ ok: false, error: "internal error" }, { status: 500 });
  }
}

export async function GET(req: Request): Promise<Response> {
  return handle(req);
}

export async function POST(req: Request): Promise<Response> {
  return handle(req);
}
