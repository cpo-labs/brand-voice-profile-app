"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { profile } from "@/lib/db/schema";
import { extractTextFromFiles, countWords } from "@/lib/text-extraction";
import { extractVoice } from "@/lib/voice-extraction";
import { checkLimit, recordRun } from "@/lib/rate-limit";
import { generateSlug } from "@/lib/slug";
import { sendProfileReady } from "@/lib/email";

const EmailSchema = z.string().email().max(254);

export interface GenerateState {
  error?: string;
}

export async function generateProfile(
  _prev: GenerateState,
  formData: FormData
): Promise<GenerateState> {
  // Honeypot — bots that auto-fill all visible inputs trip this
  const honeypot = formData.get("website");
  if (typeof honeypot === "string" && honeypot.length > 0) {
    return { error: "Etwas ist schiefgelaufen. Probiere es nochmal." };
  }

  const emailRaw = formData.get("email");
  const parsed = EmailSchema.safeParse(emailRaw);
  if (!parsed.success) {
    return { error: "Bitte gib eine gültige E-Mail-Adresse ein." };
  }
  const email = parsed.data.toLowerCase().trim();

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return { error: "Keine Dateien hochgeladen." };
  }

  const limit = await checkLimit(email);
  if (!limit.allowed) {
    return {
      error:
        limit.message ?? "Limit erreicht. Schreib mir, wenn du mehr willst.",
    };
  }

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

    await recordRun({ email, profileId: id });

    const baseUrl =
      process.env.PUBLIC_BASE_URL ||
      process.env.BETTER_AUTH_URL ||
      "http://localhost:3000";
    await sendProfileReady({
      email,
      permalink: `${baseUrl}/voice/${slug}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: msg };
  }

  redirect(`/voice/${slug}`);
}
