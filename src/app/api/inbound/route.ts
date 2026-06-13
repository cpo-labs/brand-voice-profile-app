import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { stripAndFilter } from "@/lib/forward-stripping";
import {
  addSamplesToBatch,
  cleanupExpiredBatches,
} from "@/lib/forward-batches";
import { buildForwardLink } from "@/lib/forward-links";
import { sendForwardStatus } from "@/lib/email";

// Inbound endpoint for the forward path: the IMAP poller (Mac Mini) parses
// forwarded mails to the collection address and POSTs the extracted text here.
// Secret-guarded — the poller signs every request with the shared secret.
//
// Sammel-Logik statt Sofort-Generierung: jede weitergeleitete Mail wird pro
// Absender (Hash) als Probe gesammelt. Ab MIN_SAMPLES_TO_GENERATE bekommt der
// Absender per Status-Mail den signierten Erstellen-Link. So entsteht das
// Profil aus mehreren echten Mails statt aus einer einzigen.

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
    // Forwarded-Header, Quotes und Signaturen strippen, sonst lernt das Profil
    // Outlook-Boilerplate statt Stimme. Zu kurze Reste fallen raus.
    const samples = stripAndFilter(parsed.data.texts);
    if (samples.length === 0) {
      return NextResponse.json(
        { ok: false, error: "no usable text after stripping forwarded boilerplate" },
        { status: 200 }
      );
    }

    // Opportunistischer Retention-Cleanup (kein eigener Cron noetig).
    await cleanupExpiredBatches();

    const state = await addSamplesToBatch(parsed.data.email, samples);

    const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
    const generateLink = state.readyToGenerate
      ? buildForwardLink(baseUrl, state.token, parsed.data.email)
      : null;

    // Status-Antwort: Probenzahl, ab 3 Proben der Erstellen-Link.
    await sendForwardStatus({
      email: parsed.data.email,
      sampleCount: state.sampleCount,
      generateLink,
    });

    return NextResponse.json(
      {
        ok: true,
        sampleCount: state.sampleCount,
        accepted: state.accepted,
        readyToGenerate: state.readyToGenerate,
      },
      { status: 200 }
    );
  } catch (err) {
    // Sammel-/Stripping-/DB-Fehler → handled, 200 mit Message, damit der
    // Poller loggen (und ggf. retryen) kann.
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error }, { status: 200 });
  }
}
