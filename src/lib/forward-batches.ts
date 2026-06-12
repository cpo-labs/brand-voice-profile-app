import { randomBytes } from "node:crypto";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "./db";
import { forwardBatch, forwardSample } from "./db/schema";
import { hashEmail } from "./email-hash";
import type { StrippedText } from "./forward-stripping";

// Sammel-Logik des Forward-Pfads: weitergeleitete Mails werden pro Absender
// (Hash) als Proben gesammelt. Ab MIN_SAMPLES_TO_GENERATE bekommt der
// Absender den Erstellen-Link. Inhalte sind transient: Loeschung nach
// Profil-Erstellung, spaetestens nach RETENTION_DAYS Tagen.

export const MIN_SAMPLES_TO_GENERATE = 3;
export const MAX_SAMPLES_PER_BATCH = 20;
export const RETENTION_DAYS = 14;
/** Obergrenze pro Probe — Mails sind kurz, alles andere ist kein Mail-Text. */
export const MAX_SAMPLE_CHARS = 50_000;

export interface BatchState {
  batchId: string;
  token: string;
  sampleCount: number;
  /** Wie viele der eingereichten Texte uebernommen wurden. */
  accepted: number;
  /** true, sobald genug Proben fuer die Profil-Erstellung da sind. */
  readyToGenerate: boolean;
}

/**
 * Loescht Batches (inkl. Proben), deren letzte Aktivitaet aelter als
 * RETENTION_DAYS ist. Laeuft opportunistisch bei jedem Inbound-POST und
 * beim Laden der Erstellen-Seite — kein eigener Cron noetig.
 */
export async function cleanupExpiredBatches(): Promise<number> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const expired = await db
    .select({ id: forwardBatch.id })
    .from(forwardBatch)
    .where(lt(forwardBatch.updatedAt, cutoff));
  if (expired.length === 0) return 0;
  const ids = expired.map((b) => b.id);
  // Proben explizit zuerst loeschen — nicht auf FK-Kaskade verlassen.
  await db.delete(forwardSample).where(inArray(forwardSample.batchId, ids));
  await db.delete(forwardBatch).where(inArray(forwardBatch.id, ids));
  return ids.length;
}

/**
 * Haengt gestrippte Proben an den Batch des Absenders (legt ihn bei Bedarf
 * an) und liefert den neuen Stand. Ueber MAX_SAMPLES_PER_BATCH hinaus werden
 * keine Proben mehr angenommen.
 */
export async function addSamplesToBatch(
  email: string,
  texts: StrippedText[]
): Promise<BatchState> {
  const emailHash = hashEmail(email);
  if (!emailHash) {
    throw new Error("Keine gueltige Absender-Adresse.");
  }

  const existing = await db
    .select()
    .from(forwardBatch)
    .where(eq(forwardBatch.emailHash, emailHash));

  let batch = existing[0];
  if (!batch) {
    const created = {
      id: crypto.randomUUID(),
      emailHash,
      token: randomBytes(16).toString("base64url"),
    };
    await db.insert(forwardBatch).values(created);
    const rows = await db.select().from(forwardBatch).where(eq(forwardBatch.id, created.id));
    batch = rows[0];
  }

  const countRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(forwardSample)
    .where(eq(forwardSample.batchId, batch.id));
  const current = countRows[0]?.count ?? 0;

  const room = Math.max(0, MAX_SAMPLES_PER_BATCH - current);
  const toInsert = texts.slice(0, room).map((t) => ({
    id: crypto.randomUUID(),
    batchId: batch.id,
    filename: t.filename.slice(0, 512),
    content: t.content.slice(0, MAX_SAMPLE_CHARS),
  }));

  if (toInsert.length > 0) {
    await db.insert(forwardSample).values(toInsert);
    await db
      .update(forwardBatch)
      .set({ updatedAt: new Date() })
      .where(eq(forwardBatch.id, batch.id));
  }

  const sampleCount = current + toInsert.length;
  return {
    batchId: batch.id,
    token: batch.token,
    sampleCount,
    accepted: toInsert.length,
    readyToGenerate: sampleCount >= MIN_SAMPLES_TO_GENERATE,
  };
}

export interface LoadedBatch {
  batchId: string;
  token: string;
  emailHash: string;
  sampleCount: number;
  updatedAt: Date;
}

export async function getBatchByToken(token: string): Promise<LoadedBatch | null> {
  if (!token) return null;
  const rows = await db.select().from(forwardBatch).where(eq(forwardBatch.token, token));
  const batch = rows[0];
  if (!batch) return null;
  const countRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(forwardSample)
    .where(eq(forwardSample.batchId, batch.id));
  return {
    batchId: batch.id,
    token: batch.token,
    emailHash: batch.emailHash,
    sampleCount: countRows[0]?.count ?? 0,
    updatedAt: batch.updatedAt,
  };
}

export async function getBatchSamples(batchId: string): Promise<StrippedText[]> {
  const rows = await db
    .select()
    .from(forwardSample)
    .where(eq(forwardSample.batchId, batchId))
    .orderBy(forwardSample.createdAt);
  return rows.map((r) => ({ filename: r.filename, content: r.content }));
}

/** Loescht Batch + Proben — nach erfolgreicher Profil-Erstellung. */
export async function deleteBatch(batchId: string): Promise<void> {
  await db.delete(forwardSample).where(eq(forwardSample.batchId, batchId));
  await db.delete(forwardBatch).where(and(eq(forwardBatch.id, batchId)));
}
