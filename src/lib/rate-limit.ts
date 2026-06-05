import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { profileRun } from "./db/schema";
import { hashEmail } from "./email-hash";

export interface LimitCheck {
  allowed: boolean;
  reason?: "per-email" | "global";
  remaining: number;
  message?: string;
}

const PER_EMAIL = Number(process.env.PROFILE_LIMIT_PER_EMAIL ?? "1");
const GLOBAL_MONTHLY = Number(
  process.env.PROFILE_LIMIT_GLOBAL_MONTHLY ?? "100"
);

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function checkLimit(email?: string | null): Promise<LimitCheck> {
  const monthKey = currentMonthKey();

  // Global-Cap gilt immer (Kostenschutz). Per-E-Mail-Limit nur, wenn eine
  // E-Mail vorliegt — der eingabefreie Drop-Flow hat keine.
  const globalCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(profileRun)
    .where(eq(profileRun.monthKey, monthKey));
  const totalThisMonth = globalCount[0]?.count ?? 0;

  // Per-E-Mail-Limit ueber den Hash — Klartext landet nie in der Query.
  const emailHash = hashEmail(email);
  if (emailHash) {
    const byEmail = await db
      .select({ count: sql<number>`count(*)` })
      .from(profileRun)
      .where(eq(profileRun.emailHash, emailHash));
    const emailCount = byEmail[0]?.count ?? 0;
    if (emailCount >= PER_EMAIL) {
      return { allowed: false, reason: "per-email", remaining: 0 };
    }
  }

  if (totalThisMonth >= GLOBAL_MONTHLY) {
    return { allowed: false, reason: "global", remaining: 0 };
  }

  return { allowed: true, remaining: 1 };
}

export async function recordRun({
  email = null,
  profileId = null,
}: {
  email?: string | null;
  profileId?: string | null;
}): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(profileRun).values({
    id,
    emailHash: hashEmail(email),
    profileId,
    monthKey: currentMonthKey(),
  });
  return id;
}

export async function attachProfileToRun(
  runId: string,
  profileId: string
): Promise<void> {
  await db
    .update(profileRun)
    .set({ profileId })
    .where(eq(profileRun.id, runId));
}

export const LIMITS = {
  perEmail: PER_EMAIL,
  globalMonthly: GLOBAL_MONTHLY,
};
