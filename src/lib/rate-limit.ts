import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { profileRun } from "./db/schema";

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

export async function checkLimit(email: string): Promise<LimitCheck> {
  const monthKey = currentMonthKey();

  const [byEmail, globalCount] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(profileRun)
      .where(eq(profileRun.email, email.toLowerCase())),
    db
      .select({ count: sql<number>`count(*)` })
      .from(profileRun)
      .where(eq(profileRun.monthKey, monthKey)),
  ]);

  const emailCount = byEmail[0]?.count ?? 0;
  const totalThisMonth = globalCount[0]?.count ?? 0;

  if (emailCount >= PER_EMAIL) {
    return {
      allowed: false,
      reason: "per-email",
      remaining: 0,
      message: `Du hast bereits ${emailCount} Profil(e) generiert. Für ein weiteres Profil schreib mir kurz — Kontakt unten auf der Seite.`,
    };
  }

  if (totalThisMonth >= GLOBAL_MONTHLY) {
    return {
      allowed: false,
      reason: "global",
      remaining: 0,
      message: `Diesen Monat sind die Free-Plätze ausgeschöpft (${GLOBAL_MONTHLY}/${GLOBAL_MONTHLY}). Schreib mir, wenn du nicht warten willst.`,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, PER_EMAIL - emailCount),
  };
}

export async function recordRun({
  email,
  profileId = null,
}: {
  email: string;
  profileId?: string | null;
}): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(profileRun).values({
    id,
    email: email.toLowerCase(),
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
