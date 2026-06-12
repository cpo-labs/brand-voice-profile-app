import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { checkLimit, recordRun, attachProfileToRun, LIMITS } from "./rate-limit";
import { createTables, clearTables } from "../../tests/db-helper";
import { db } from "./db";
import { profile, profileRun } from "./db/schema";
import { eq } from "drizzle-orm";

beforeAll(async () => {
  await createTables();
});

beforeEach(async () => {
  await clearTables();
});

describe("checkLimit", () => {
  test("allows first run for a fresh email", async () => {
    // Arrange: leere DB

    // Act
    const result = await checkLimit("fresh@example.com");

    // Assert
    expect(result.allowed).toBe(true);
  });

  test("blocks second run for the same email (per-email limit 1)", async () => {
    // Arrange
    await recordRun({ email: "used@example.com" });

    // Act
    const result = await checkLimit("used@example.com");

    // Assert
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("per-email");
  });

  test("treats email case-insensitively for the limit", async () => {
    // Arrange
    await recordRun({ email: "Mixed@Example.com" });

    // Act
    const result = await checkLimit("mixed@example.com");

    // Assert
    expect(result.allowed).toBe(false);
  });

  test("allows run without email (input-free drop flow)", async () => {
    // Arrange
    await recordRun({ email: "someone@example.com" });

    // Act
    const result = await checkLimit(null);

    // Assert
    expect(result.allowed).toBe(true);
  });

  test("blocks when global monthly cap is reached", async () => {
    // Arrange: global cap mit anonymen Runs fuellen
    for (let i = 0; i < LIMITS.globalMonthly; i++) {
      await recordRun({ email: null });
    }

    // Act
    const result = await checkLimit("fresh@example.com");

    // Assert
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("global");
  });
});

describe("recordRun / attachProfileToRun", () => {
  test("records a run and attaches a profile id", async () => {
    // Arrange
    const runId = await recordRun({ email: "attach@example.com" });
    const profileId = crypto.randomUUID();
    await db.insert(profile).values({
      id: profileId,
      slug: "test-slug",
      voiceMd: "# Test",
      dropInChatgpt: "x",
      dropInClaude: "x",
      dropInGemini: "x",
      proofPrompt: "x",
      proofBefore: "x",
      proofAfter: "x",
      sourceFileCount: 1,
      sourceWordCount: 100,
    });

    // Act
    await attachProfileToRun(runId, profileId);

    // Assert
    const rows = await db.select().from(profileRun).where(eq(profileRun.id, runId));
    expect(rows[0]?.profileId).toBe(profileId);
  });

  test("stores only a hash, never the cleartext email", async () => {
    // Arrange + Act
    const runId = await recordRun({ email: "cleartext@example.com" });

    // Assert
    const rows = await db.select().from(profileRun).where(eq(profileRun.id, runId));
    expect(rows[0]?.emailHash).toBeTruthy();
    expect(rows[0]?.emailHash).not.toContain("cleartext");
    expect(rows[0]?.emailHash).not.toContain("@");
  });
});
