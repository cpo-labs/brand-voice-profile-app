import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import {
  addSamplesToBatch,
  cleanupExpiredBatches,
  deleteBatch,
  getBatchByToken,
  getBatchSamples,
  MAX_SAMPLES_PER_BATCH,
  MIN_SAMPLES_TO_GENERATE,
  RETENTION_DAYS,
} from "./forward-batches";
import { createTables, clearTables } from "../../tests/db-helper";
import { db } from "./db";
import { forwardBatch } from "./db/schema";

const sample = (i: number) => ({ filename: `mail-${i}.eml`, content: `Probe ${i} mit genug Text.` });

beforeAll(async () => {
  await createTables();
});

beforeEach(async () => {
  await clearTables();
});

describe("addSamplesToBatch", () => {
  test("creates a batch and reports it is not ready below the threshold", async () => {
    // Act
    const state = await addSamplesToBatch("max@example.com", [sample(1)]);

    // Assert
    expect(state.sampleCount).toBe(1);
    expect(state.accepted).toBe(1);
    expect(state.readyToGenerate).toBe(false);
    expect(state.token).toBeTruthy();
  });

  test("accumulates across calls for the same sender and flips ready at the threshold", async () => {
    // Arrange
    await addSamplesToBatch("max@example.com", [sample(1), sample(2)]);

    // Act
    const state = await addSamplesToBatch("max@example.com", [sample(3)]);

    // Assert
    expect(state.sampleCount).toBe(MIN_SAMPLES_TO_GENERATE);
    expect(state.readyToGenerate).toBe(true);
  });

  test("keeps the same batch/token for the same sender", async () => {
    // Arrange
    const first = await addSamplesToBatch("max@example.com", [sample(1)]);

    // Act
    const second = await addSamplesToBatch("max@example.com", [sample(2)]);

    // Assert
    expect(second.batchId).toBe(first.batchId);
    expect(second.token).toBe(first.token);
  });

  test("caps the batch at MAX_SAMPLES_PER_BATCH", async () => {
    // Arrange: mehr Proben als erlaubt einreichen
    const many = Array.from({ length: MAX_SAMPLES_PER_BATCH + 5 }, (_, i) => sample(i));

    // Act
    const state = await addSamplesToBatch("max@example.com", many);

    // Assert
    expect(state.sampleCount).toBe(MAX_SAMPLES_PER_BATCH);
    expect(state.accepted).toBe(MAX_SAMPLES_PER_BATCH);
  });

  test("stores only a hash for the sender, never the cleartext address", async () => {
    // Act
    await addSamplesToBatch("cleartext@example.com", [sample(1)]);

    // Assert
    const rows = await db.select().from(forwardBatch);
    expect(rows[0].emailHash).not.toContain("cleartext");
    expect(rows[0].emailHash).not.toContain("@");
  });
});

describe("getBatchByToken / getBatchSamples / deleteBatch", () => {
  test("loads a batch by its token with the current sample count", async () => {
    // Arrange
    const { token } = await addSamplesToBatch("max@example.com", [sample(1), sample(2)]);

    // Act
    const loaded = await getBatchByToken(token);

    // Assert
    expect(loaded?.sampleCount).toBe(2);
  });

  test("returns null for an unknown token", async () => {
    // Assert
    expect(await getBatchByToken("nope")).toBeNull();
  });

  test("returns the stored samples in insertion order", async () => {
    // Arrange
    const { batchId } = await addSamplesToBatch("max@example.com", [sample(1), sample(2)]);

    // Act
    const samples = await getBatchSamples(batchId);

    // Assert
    expect(samples.map((s) => s.filename)).toEqual(["mail-1.eml", "mail-2.eml"]);
  });

  test("deleteBatch removes the batch and its samples", async () => {
    // Arrange
    const { batchId, token } = await addSamplesToBatch("max@example.com", [sample(1)]);

    // Act
    await deleteBatch(batchId);

    // Assert
    expect(await getBatchByToken(token)).toBeNull();
    expect(await getBatchSamples(batchId)).toHaveLength(0);
  });
});

describe("cleanupExpiredBatches", () => {
  test("deletes batches whose last activity is older than the retention window", async () => {
    // Arrange
    const { batchId } = await addSamplesToBatch("old@example.com", [sample(1)]);
    const stale = new Date(Date.now() - (RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000);
    await db.update(forwardBatch).set({ updatedAt: stale }).where(eq(forwardBatch.id, batchId));

    // Act
    const deleted = await cleanupExpiredBatches();

    // Assert
    expect(deleted).toBe(1);
    expect(await getBatchSamples(batchId)).toHaveLength(0);
  });

  test("keeps fresh batches", async () => {
    // Arrange
    await addSamplesToBatch("fresh@example.com", [sample(1)]);

    // Act
    const deleted = await cleanupExpiredBatches();

    // Assert
    expect(deleted).toBe(0);
  });
});
