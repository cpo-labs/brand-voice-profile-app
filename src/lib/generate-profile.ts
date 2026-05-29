import { db } from "@/lib/db";
import { profile } from "@/lib/db/schema";
import { countWords, type ExtractedFile } from "@/lib/text-extraction";
import { extractVoice } from "@/lib/voice-extraction";
import { attachProfileToRun, checkLimit, recordRun } from "@/lib/rate-limit";
import { generateSlug } from "@/lib/slug";
import { sendProfileReady } from "@/lib/email";

export interface GenerateProfileArgs {
  /** Sender/owner email. May be null for the input-free drop flow. */
  email: string | null;
  /** Pre-extracted text sources (filename + content). */
  texts: ExtractedFile[];
}

export interface GenerateProfileResult {
  slug: string;
}

/**
 * Core profile-generation flow, shared by the server action (drop/upload)
 * and the inbound forward route (IMAP poller).
 *
 * Steps mirror the original action exactly:
 *   checkLimit → recordRun → extractVoice → insert profile
 *   → attachProfileToRun → sendProfileReady (if email) → return slug
 *
 * Throws on rate-limit, validation, and LLM errors with clear messages.
 * Callers translate/format these as needed.
 */
export async function generateProfileFromTexts({
  email,
  texts,
}: GenerateProfileArgs): Promise<GenerateProfileResult> {
  const normalizedEmail = email && email.trim().length > 0 ? email.trim().toLowerCase() : null;

  if (texts.length === 0) {
    throw new Error("Keine Texte zum Analysieren übergeben.");
  }

  const limit = await checkLimit(normalizedEmail);
  if (!limit.allowed) {
    throw new Error(
      "Limit erreicht. Pro E-Mail-Adresse ist aktuell ein Profil möglich (bzw. das monatliche Gesamt-Limit ist ausgeschöpft)."
    );
  }

  // Reserve the slot before the expensive Anthropic call so parallel
  // requests with the same email see the run during their own checkLimit.
  const runId = await recordRun({ email: normalizedEmail });

  const wordCount = countWords(texts);

  const result = await extractVoice({ texts });

  const slug = generateSlug(8);
  const id = crypto.randomUUID();

  await db.insert(profile).values({
    id,
    slug,
    email: normalizedEmail,
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

  // Mail nur, wenn eine E-Mail vorliegt (Forward-/Gmail-Pfad hat immer eine).
  if (normalizedEmail) {
    const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
    await sendProfileReady({
      email: normalizedEmail,
      permalink: `${baseUrl}/voice/${slug}`,
    });
  }

  return { slug };
}
