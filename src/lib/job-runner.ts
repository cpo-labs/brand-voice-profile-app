import { and, asc, eq, lt, or } from "drizzle-orm";
import { db } from "./db";
import { job, profile } from "./db/schema";
import { extractVoiceDeep } from "./voice-extraction";
import { sendProfileReady, type ProfileReadyArgs } from "./email";
import { attachProfileToRun } from "./rate-limit";
import type { SourceText, VoiceExtractionResult } from "./voice-types";

// ── Hintergrund-Worker für die tiefe Pipeline ───────────────────────────────
// Ein Cron-Tick greift den naechsten verarbeitbaren Job, faehrt die komplette
// verifizierte Pipeline (extractVoiceDeep), persistiert das Profil, mailt es und
// LOESCHT danach die transienten PII (Klartext-Mail + Quelltext). Damit entfaellt
// das synchrone 300s-Limit.
//
// Robustheit: optimistische Sperre beim Greifen (attempts als Versions-Guard),
// Stale-Lock-Recovery fuer abgestuerzte Laeufe, begrenzte Retries.

type JobRow = typeof job.$inferSelect;

/** Ein abgestuerzter `processing`-Job gilt nach dieser Zeit als wieder freigebbar. */
const STALE_LOCK_MS = 15 * 60 * 1000;
/** Nach so vielen Fehlversuchen wird der Job endgueltig als failed markiert. */
const MAX_ATTEMPTS = 3;
/** Konsens-Laeufe im Hintergrund — bewusst 2 (Qualitaet vs. Laufzeit/Kosten). */
const CONSENSUS_RUNS = 2;

/** Signatur der tiefen Pipeline — injizierbar fuer deterministische Tests. */
export type VoiceExtractor = (args: {
  texts: SourceText[];
  runs?: number;
}) => Promise<VoiceExtractionResult>;

/** Signatur des Mail-Versands — injizierbar fuer deterministische Tests. */
export type Mailer = (args: ProfileReadyArgs) => Promise<void>;

/** Schickt das fertige Profil per Mail, sofern eine (transiente) Adresse vorliegt. */
async function deliver(sendMail: Mailer, row: JobRow, voiceMd: string): Promise<void> {
  if (!row.email) return;
  const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
  await sendMail({
    email: row.email,
    permalink: `${baseUrl}/voice/${row.slug}`,
    voiceMd,
    fileName: `stimmprofil-${row.slug}.txt`,
  });
}

export interface ProcessResult {
  jobId: string;
  slug: string;
  status: "done" | "failed" | "retry";
  error?: string;
}

/**
 * Greift atomar den naechsten verarbeitbaren Job: `pending` oder ein
 * `processing` mit abgelaufenem Lock (abgestuerzt). Die optimistische Sperre
 * (WHERE attempts = gelesener Wert) verhindert Doppelgriff durch parallele Ticks.
 */
export async function claimNextJob(now: Date = new Date()): Promise<JobRow | null> {
  const staleCutoff = new Date(now.getTime() - STALE_LOCK_MS);
  const candidates = await db
    .select()
    .from(job)
    .where(
      or(
        eq(job.status, "pending"),
        and(eq(job.status, "processing"), lt(job.lockedAt, staleCutoff))
      )
    )
    .orderBy(asc(job.createdAt))
    .limit(1);

  const cand = candidates[0];
  if (!cand) return null;

  const claimed = await db
    .update(job)
    .set({ status: "processing", lockedAt: now, attempts: cand.attempts + 1, updatedAt: now })
    .where(and(eq(job.id, cand.id), eq(job.attempts, cand.attempts)))
    .returning();

  return claimed[0] ?? null;
}

/**
 * Verarbeitet einen bereits gegriffenen Job vollstaendig. Bei Erfolg: Profil
 * persistieren, mailen, PII loeschen, status=done. Bei Fehler: Retry (zurueck
 * auf pending) bis MAX_ATTEMPTS, danach failed (ebenfalls mit PII-Loeschung).
 */
export async function processJob(
  j: JobRow,
  extract: VoiceExtractor = extractVoiceDeep,
  sendMail: Mailer = sendProfileReady
): Promise<ProcessResult> {
  if (!j.sourceText || j.sourceText.trim().length === 0) {
    await db
      .update(job)
      .set({ status: "failed", error: "Kein Quelltext im Job.", email: null, sourceText: null, lockedAt: null, updatedAt: new Date() })
      .where(eq(job.id, j.id));
    return { jobId: j.id, slug: j.slug, status: "failed", error: "Kein Quelltext im Job." };
  }

  // Idempotenz: hat ein frueherer Lauf das Profil schon angelegt (Absturz im
  // ms-Fenster zwischen Profil-Insert und Status-Update), nicht erneut die teure
  // Pipeline fahren — der unique `slug` wuerde beim Re-Insert ohnehin werfen.
  // Wichtig: die Mail koennte beim Absturz noch ausstehen, also hier nachholen
  // (Doppelversand im Crash-Fall ist akzeptabler als gar keine Mail) BEVOR die
  // transiente Adresse genullt wird.
  const existing = await db
    .select({ id: profile.id, voiceMd: profile.voiceMd })
    .from(profile)
    .where(eq(profile.slug, j.slug))
    .limit(1);
  if (existing[0]) {
    if (j.runId) await attachProfileToRun(j.runId, existing[0].id);
    await deliver(sendMail, j, existing[0].voiceMd);
    await db
      .update(job)
      .set({ status: "done", profileId: existing[0].id, email: null, sourceText: null, error: null, lockedAt: null, updatedAt: new Date() })
      .where(eq(job.id, j.id));
    return { jobId: j.id, slug: j.slug, status: "done" };
  }

  try {
    const texts: SourceText[] = [{ filename: "quellen.txt", content: j.sourceText }];
    const result = await extract({ texts, runs: CONSENSUS_RUNS });

    const id = crypto.randomUUID();
    const { voiceMd, dropInChatgpt, dropInClaude, dropInGemini, ...structured } = result;
    await db.insert(profile).values({
      id,
      slug: j.slug,
      emailHash: j.emailHash,
      voiceMd,
      profileJson: JSON.stringify(structured),
      dropInChatgpt,
      dropInClaude,
      dropInGemini,
      proofPrompt: structured.proofPrompt,
      proofBefore: structured.proofBefore,
      proofAfter: structured.proofAfter,
      sourceFileCount: j.sourceFileCount,
      sourceWordCount: j.sourceWordCount,
    });

    if (j.runId) await attachProfileToRun(j.runId, id);
    await deliver(sendMail, j, voiceMd);

    // Erfolg: PII loeschen (Klartext-Mail + Quelltext genullt), status=done.
    await db
      .update(job)
      .set({ status: "done", profileId: id, email: null, sourceText: null, error: null, lockedAt: null, updatedAt: new Date() })
      .where(eq(job.id, j.id));

    return { jobId: j.id, slug: j.slug, status: "done" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // j.attempts wurde beim Greifen bereits inkrementiert.
    const giveUp = j.attempts >= MAX_ATTEMPTS;
    if (giveUp) {
      // Endgueltig gescheitert: auch hier PII loeschen — der Job wird nicht mehr verarbeitet.
      await db
        .update(job)
        .set({ status: "failed", error: msg, email: null, sourceText: null, lockedAt: null, updatedAt: new Date() })
        .where(eq(job.id, j.id));
      return { jobId: j.id, slug: j.slug, status: "failed", error: msg };
    }
    // Retry: Quelltext bleibt erhalten, Lock freigeben.
    await db
      .update(job)
      .set({ status: "pending", error: msg, lockedAt: null, updatedAt: new Date() })
      .where(eq(job.id, j.id));
    return { jobId: j.id, slug: j.slug, status: "retry", error: msg };
  }
}

/** Cron-Convenience: einen Job greifen und verarbeiten. null, wenn keiner ansteht. */
export async function runOneJob(
  extract: VoiceExtractor = extractVoiceDeep,
  sendMail: Mailer = sendProfileReady
): Promise<ProcessResult | null> {
  const claimed = await claimNextJob();
  if (!claimed) return null;
  return processJob(claimed, extract, sendMail);
}
