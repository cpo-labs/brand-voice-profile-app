import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { generateProfileFromTexts } from "@/lib/generate-profile";

// Inbound endpoint for the forward path: the IMAP poller (Mac Mini) parses
// forwarded mails to briefing@appsales-consulting.com and POSTs the extracted
// text here. Secret-guarded — the poller signs every request with the shared
// secret. The forward path always has the sender's email.

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  email: z.string().email().max(254),
  texts: z
    .array(
      z.object({
        filename: z.string().min(1).max(512),
        content: z.string().min(1),
      })
    )
    .min(1),
});

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.POLLER_SHARED_SECRET;
  // No secret configured → fail closed.
  if (!expected || expected.length === 0) return false;
  const provided = req.headers.get("x-poller-secret");
  if (!provided) return false;
  // Constant-time compare — kein Timing-Oracle auf das Secret.
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    // Malformed body — handled error, 200 so the poller logs and moves on.
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 200 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return NextResponse.json({ ok: false, error: msg || "validation failed" }, { status: 200 });
  }

  try {
    const { slug } = await generateProfileFromTexts({
      email: parsed.data.email,
      texts: parsed.data.texts,
    });
    return NextResponse.json({ ok: true, slug }, { status: 200 });
  } catch (err) {
    // Rate-limit / validation / LLM errors → handled, return 200 with the
    // message so the poller can log it (and decide whether to retry).
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error }, { status: 200 });
  }
}
