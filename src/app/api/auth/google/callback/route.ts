import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { gmailToken } from "@/lib/db/schema";
import { hashEmail } from "@/lib/email-hash";
import { encryptToken } from "@/lib/gmail-crypto";
import { GMAIL_SCOPES, googleRedirectUri, isGmailOAuthEnabled } from "@/lib/gmail-oauth";

// Gmail OAuth — callback endpoint (Skeleton, hinter GMAIL_OAUTH_ENABLED).
// Default-Env: Flag aus → 404, der Pfad existiert faktisch nicht.
// Phase 2: tauscht den Code gegen Tokens, verschluesselt das Refresh-Token
// (AES-256-GCM) und legt es pro Absender-Hash ab. Das tatsaechliche Abholen
// der gesendeten Mails ist Folge-Arbeit (eigener Task nach Scharfschaltung).

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Fail closed: ohne Flag + Credentials ist der Callback nicht erreichbar.
  if (!isGmailOAuthEnabled()) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  if (!code || !stateRaw) {
    return NextResponse.json({ ok: false, error: "missing code/state" }, { status: 400 });
  }

  let email = "";
  try {
    email = JSON.parse(Buffer.from(decodeURIComponent(stateRaw), "base64url").toString("utf8")).email ?? "";
  } catch {
    return NextResponse.json({ ok: false, error: "invalid state" }, { status: 400 });
  }
  const emailHash = hashEmail(email);
  if (!emailHash) {
    return NextResponse.json({ ok: false, error: "invalid account" }, { status: 400 });
  }

  // Code gegen Tokens tauschen.
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID as string,
      client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    return NextResponse.json({ ok: false, error: "token exchange failed" }, { status: 502 });
  }
  const tokens = (await tokenRes.json()) as { refresh_token?: string };
  if (!tokens.refresh_token) {
    // Kein Refresh-Token (z.B. wiederholtes Consent ohne prompt) → abbrechen.
    return NextResponse.json({ ok: false, error: "no refresh token returned" }, { status: 400 });
  }

  // Refresh-Token verschluesselt ablegen (upsert pro Absender-Hash).
  const refreshTokenEnc = encryptToken(tokens.refresh_token);
  const existing = await db.select().from(gmailToken).where(eq(gmailToken.emailHash, emailHash));
  if (existing[0]) {
    await db
      .update(gmailToken)
      .set({ refreshTokenEnc, scope: GMAIL_SCOPES.join(" ") })
      .where(eq(gmailToken.emailHash, emailHash));
  } else {
    await db.insert(gmailToken).values({
      id: crypto.randomUUID(),
      emailHash,
      refreshTokenEnc,
      scope: GMAIL_SCOPES.join(" "),
    });
  }

  const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
  return NextResponse.redirect(`${baseUrl}/?gmail=connected`);
}
