import { and, asc, eq, isNotNull, lt, or } from "drizzle-orm";
import { db } from "./db";
import { job, profile, profileRun } from "./db/schema";
import { extractVoiceDeep, MIN_TOTAL_CHARS } from "./voice-extraction";
import { sendProfileReady, type ProfileReadyArgs } from "./email";
import { attachProfileToRun, recordRun } from "./rate-limit";
import { generateSlug } from "./slug";
import { hashEmail } from "./email-hash";
import { t, type Locale } from "./i18n";
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

// ── Job anlegen (Upload-Seite) ──────────────────────────────────────────────

export interface EnqueueArgs {
  /** Pflicht im Hintergrund-Flow — das fertige Profil geht per Mail raus. */
  email: string;
  /** Vorab extrahierte Quelltexte (Dateiname + Inhalt). */
  texts: { filename: string; content: string }[];
  /** Sprache fuer die Status-Seite und die Mail. */
  locale: string;
}

/**
 * Legt einen Hintergrund-Job an und reserviert den Rate-Limit-Slot. Gibt den
 * Permalink-Slug zurueck, sodass der Upload sofort auf die Status-Seite leiten
 * kann. Der zusammengefuehrte Quelltext liegt transient in der Job-Zeile und
 * wird vom Worker nach Fertigstellung geloescht (PII).
 */
export async function enqueueProfileJob({ email, texts, locale }: EnqueueArgs): Promise<{ slug: string }> {
  // Fehlermeldungen lokalisiert — generateProfile reicht sie unveraendert an die
  // UI weiter, deshalb darf hier kein hartkodiertes Deutsch entstehen.
  const e = t(locale as Locale).errors;
  if (texts.length === 0) {
    throw new Error(e.noFiles);
  }
  const normalizedEmail = email.trim().toLowerCase();
  const sourceText = texts.map((f) => `── ${f.filename} ──\n${f.content}`).join("\n\n");

  // Mindest-Material schon beim Upload pruefen — sonst scheitert der Job erst
  // spaeter still im Worker und der Nutzer bekaeme keine Rueckmeldung. Auch: kein
  // Rate-Limit-Slot fuer Mini-Input. Bewusst gegen `sourceText` (inkl. Trenner)
  // geprueft: der Worker fuehrt exakt denselben merged Blob durch
  // extractVoiceDeep, das `content.length` ebenfalls auf `sourceText` zaehlt —
  // so bleibt der Gate konsistent mit dem tatsaechlichen Pipeline-Minimum.
  if (sourceText.trim().length < MIN_TOTAL_CHARS) {
    throw new Error(e.tooLittleText);
  }

  // Nur die echten Inhalte zaehlen — die `── Dateiname ──`-Trenner sollen den
  // gespeicherten Wort-Count nicht aufblaehen.
  const wordCount = texts.reduce(
    (n, f) => n + f.content.split(/\s+/).filter(Boolean).length,
    0
  );
  const slug = generateSlug(8);
  const runId = await recordRun({ email: normalizedEmail });

  try {
    await db.insert(job).values({
      id: crypto.randomUUID(),
      slug,
      status: "pending",
      emailHash: hashEmail(normalizedEmail),
      email: normalizedEmail,
      sourceText,
      sourceFileCount: texts.length,
      sourceWordCount: wordCount,
      locale,
      runId,
    });
  } catch (err) {
    // Insert fehlgeschlagen (z.B. Slug-Kollision, DB-Blip) → den bereits
    // reservierten Rate-Limit-Slot wieder freigeben, sonst verliert der Nutzer
    // Kontingent fuer einen Job, der nie existiert hat.
    await db.delete(profileRun).where(eq(profileRun.id, runId)).catch(() => {});
    throw err;
  }

  return { slug };
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

/**
 * Belt-and-Suspenders-Datenschutz: nullt transiente PII (Klartext-Mail +
 * Quelltext) auf allen abgeschlossenen Jobs (done/failed), bei denen sie wider
 * Erwarten noch gesetzt ist. Greift nur, wenn wirklich Reste existieren —
 * idempotent und billig. Schuetzt vor kuenftigen Pfaden, die den Status setzen,
 * ohne zu nullen. `retry`/`pending`/`processing` bleiben unberuehrt (brauchen
 * den Quelltext noch).
 */
export async function sweepCompletedJobPii(): Promise<void> {
  await db
    .update(job)
    .set({ email: null, sourceText: null })
    .where(
      and(
        or(eq(job.status, "done"), eq(job.status, "failed")),
        or(isNotNull(job.email), isNotNull(job.sourceText))
      )
    );
}
