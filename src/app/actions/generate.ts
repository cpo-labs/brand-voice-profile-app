"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { profile } from "@/lib/db/schema";
import { extractTextFromFiles, countWords } from "@/lib/text-extraction";
import { extractVoice } from "@/lib/voice-extraction";
import { attachProfileToRun, checkLimit, recordRun } from "@/lib/rate-limit";
import { generateSlug } from "@/lib/slug";
import { sendProfileReady } from "@/lib/email";
import { t, type Locale } from "@/lib/i18n";

const EmailSchema = z.string().email().max(254);

export interface GenerateState {
  error?: string;
}

export async function generateProfile(
  _prev: GenerateState,
  formData: FormData
): Promise<GenerateState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "de";
  const e = t(locale).errors;

  // Honeypot — bots that auto-fill all visible inputs trip this
  const honeypot = formData.get("website");
  if (typeof honeypot === "string" && honeypot.length > 0) {
    return { error: e.generic };
  }

  // E-Mail ist OPTIONAL — der Drop-Flow ist eingabefrei. Nur validieren, wenn
  // wirklich eine angegeben wurde (z.B. zukünftig für "Link per Mail").
  const emailRaw = formData.get("email");
  let email: string | null = null;
  if (typeof emailRaw === "string" && emailRaw.trim().length > 0) {
    const parsed = EmailSchema.safeParse(emailRaw.trim());
    if (!parsed.success) {
      return { error: e.invalidEmail };
    }
    email = parsed.data.toLowerCase();
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return { error: e.noFiles };
  }

  const limit = await checkLimit(email);
  if (!limit.allowed) {
    return { error: e.limitFallback };
  }

  // Reserve the slot before the expensive Anthropic call so parallel
  // requests with the same email see the run during their own checkLimit.
  // Window from ~30s (LLM) down to a single DB round-trip.
  const runId = await recordRun({ email });

  let slug: string;
  try {
    const texts = await extractTextFromFiles(files);
    const wordCount = countWords(texts);

    const result = await extractVoice({ texts });

    slug = generateSlug(8);
    const id = crypto.randomUUID();

    await db.insert(profile).values({
      id,
      slug,
      email,
      voiceMd: result.voiceMd,
      dropInChatgpt: result.dropInChatgpt,
      dropInClaude: result.dropInClaude,
      dropInGemini: result.dropInGemini,
      proofPrompt: result.proofPrompt,
      proofBefore: result.proofBefore,
      proofAfter: result.proofAfter,
      sourceFileCount: texts.length,
      sourceWordCount: wordCount,
    });

    await attachProfileToRun(runId, id);

    // Mail nur, wenn der Nutzer freiwillig eine E-Mail angegeben hat.
    if (email) {
      const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
      await sendProfileReady({
        email,
        permalink: `${baseUrl}/voice/${slug}`,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: msg };
  }

  redirect(`/voice/${slug}`);
}
