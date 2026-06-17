import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import { createTables, clearTables } from "../../tests/db-helper";
import { db } from "./db";
import { job, profile } from "./db/schema";
import { recordRun } from "./rate-limit";
import { hashEmail } from "./email-hash";
import { claimNextJob, runOneJob, type VoiceExtractor, type Mailer } from "./job-runner";
import type { VoiceExtractionResult } from "./voice-types";
import type { ProfileReadyArgs } from "./email";

beforeAll(async () => {
  await createTables();
});
beforeEach(async () => {
  await clearTables();
});

function fakeResult(): VoiceExtractionResult {
  return {
    mode: "destilliert",
    identity: "Knapp und direkt.",
    scales: [],
    usesPhrases: ["kurz"],
    neverSays: ["mit freundlichen grüßen"],
    registerNote: "Du, direkt.",
    confidence: "ok",
    proofPrompt: "Schreib eine Absage.",
    proofBefore: "Sehr geehrte Damen und Herren ...",
    proofAfter: "Hallo, leider nein.",
    dropInChatgpt: "cg",
    dropInClaude: "cl",
    dropInGemini: "gm",
    quotes: [],
    voiceMd: "# Stimmprofil\n\n## Verifikation\n",
  };
}

const okExtractor: VoiceExtractor = async () => fakeResult();
const failExtractor: VoiceExtractor = async () => {
  throw new Error("boom");
};

function makeSpyMailer() {
  const calls: ProfileReadyArgs[] = [];
  const mailer: Mailer = async (args) => {
    calls.push(args);
  };
  return { mailer, calls };
}

async function insertPendingJob(overrides: Record<string, unknown> = {}) {
  const id = crypto.randomUUID();
  const slug = `slug-${id.slice(0, 6)}`;
  const email = "job@example.com";
  const runId = await recordRun({ email });
  await db.insert(job).values({
    id,
    slug,
    status: "pending",
    emailHash: hashEmail(email),
    email,
    sourceText: "genug text ".repeat(20),
    sourceFileCount: 1,
    sourceWordCount: 40,
    locale: "de",
    runId,
    ...overrides,
  });
  return { id, slug, runId };
}

describe("job-runner", () => {
  test("processes a job: profile created, mail sent, PII deleted, status done", async () => {
    const { id, slug } = await insertPendingJob();
    const { mailer, calls } = makeSpyMailer();

    const res = await runOneJob(okExtractor, mailer);

    expect(res?.status).toBe("done");
    const j = (await db.select().from(job).where(eq(job.id, id)))[0];
    expect(j.status).toBe("done");
    expect(j.email).toBeNull(); // PII gelöscht
    expect(j.sourceText).toBeNull(); // PII gelöscht
    expect(j.profileId).toBeTruthy();
    expect(j.attempts).toBe(1);

    const p = (await db.select().from(profile).where(eq(profile.slug, slug)))[0];
    expect(p).toBeTruthy();
    expect(p.voiceMd).toContain("Stimmprofil");
    expect(p.emailHash).toBeTruthy();

    // Mail genau einmal, mit Permalink auf den slug und VOICE.md im Anhang.
    expect(calls).toHaveLength(1);
    expect(calls[0].email).toBe("job@example.com");
    expect(calls[0].permalink).toContain(slug);
    expect(calls[0].voiceMd).toContain("Stimmprofil");
  });

  test("claimNextJob returns null when nothing is pending", async () => {
    expect(await claimNextJob()).toBeNull();
  });

  test("retries on failure keeping source text, then fails after MAX_ATTEMPTS and clears PII", async () => {
    const { id } = await insertPendingJob();

    const r1 = await runOneJob(failExtractor);
    expect(r1?.status).toBe("retry");
    let j = (await db.select().from(job).where(eq(job.id, id)))[0];
    expect(j.status).toBe("pending");
    expect(j.sourceText).not.toBeNull(); // bleibt für Retry erhalten
    expect(j.attempts).toBe(1);

    const r2 = await runOneJob(failExtractor);
    expect(r2?.status).toBe("retry");
    j = (await db.select().from(job).where(eq(job.id, id)))[0];
    expect(j.attempts).toBe(2);

    const r3 = await runOneJob(failExtractor);
    expect(r3?.status).toBe("failed");
    j = (await db.select().from(job).where(eq(job.id, id)))[0];
    expect(j.status).toBe("failed");
    expect(j.attempts).toBe(3);
    expect(j.sourceText).toBeNull(); // PII nach endgültigem Scheitern gelöscht
    expect(j.email).toBeNull();
  });

  test("is idempotent: finalizes done without re-running if a profile for the slug already exists", async () => {
    const { id, slug } = await insertPendingJob();
    // Simuliere einen frueheren, abgestuerzten Lauf: Profil existiert schon.
    await db.insert(profile).values({
      id: crypto.randomUUID(),
      slug,
      voiceMd: "# Stimmprofil",
      dropInChatgpt: "x",
      dropInClaude: "x",
      dropInGemini: "x",
      proofPrompt: "x",
      proofBefore: "x",
      proofAfter: "x",
      sourceFileCount: 1,
      sourceWordCount: 40,
    });

    // failExtractor: wuerde werfen, falls der Guard NICHT greift.
    const { mailer, calls } = makeSpyMailer();
    const res = await runOneJob(failExtractor, mailer);

    expect(res?.status).toBe("done");
    const j = (await db.select().from(job).where(eq(job.id, id)))[0];
    expect(j.status).toBe("done");
    expect(j.sourceText).toBeNull();
    expect(j.profileId).toBeTruthy();
    // W1: Mail wird auch im Idempotenz-Pfad nachgeholt (Crash-Fenster nach Insert).
    expect(calls).toHaveLength(1);
    expect(calls[0].permalink).toContain(slug);
  });

  test("fails immediately on empty source text without calling the extractor", async () => {
    const { id } = await insertPendingJob({ sourceText: "" });

    const res = await runOneJob(okExtractor);

    expect(res?.status).toBe("failed");
    const j = (await db.select().from(job).where(eq(job.id, id)))[0];
    expect(j.status).toBe("failed");
    expect(j.sourceText).toBeNull();
  });
});
