import { db } from "@/lib/db";
import { profile } from "@/lib/db/schema";
import { countWords, type ExtractedFile } from "@/lib/text-extraction";
import { extractVoice } from "@/lib/voice-extraction";
import { attachProfileToRun, checkLimit, recordRun } from "@/lib/rate-limit";
import { generateSlug } from "@/lib/slug";
import { sendProfileReady } from "@/lib/email";
import { hashEmail } from "@/lib/email-hash";

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
 * Core profile-generation flow behind the upload server action.
 *
 * Steps:
 *   checkLimit → recordRun → extractVoice → insert profile
 *   → attachProfileToRun → sendProfileReady (nur wenn E-Mail angegeben) → slug
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

  // Strukturierte Felder fuer das lesbare Browser-Profil getrennt vom
  // serverseitig gebauten voiceMd persistieren.
  const { voiceMd, dropInChatgpt, dropInClaude, dropInGemini, ...structured } = result;

  await db.insert(profile).values({
    id,
    slug,
    // Nur der Hash wird persistiert. normalizedEmail bleibt rein transient
    // (lokale Variable) und wird unten einmalig fuer den Mail-Versand genutzt.
    emailHash: hashEmail(normalizedEmail),
    voiceMd,
    profileJson: JSON.stringify(structured),
    dropInChatgpt,
    dropInClaude,
    dropInGemini,
    proofPrompt: structured.proofPrompt,
    proofBefore: structured.proofBefore,
    proofAfter: structured.proofAfter,
    sourceFileCount: texts.length,
    sourceWordCount: wordCount,
  });

  await attachProfileToRun(runId, id);

  // Mail nur, wenn der Nutzer im Upload optional eine Adresse angegeben hat.
  // Dann geht die VOICE.md direkt als Datei-Anhang mit raus.
  if (normalizedEmail) {
    const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
    await sendProfileReady({
      email: normalizedEmail,
      permalink: `${baseUrl}/voice/${slug}`,
      voiceMd,
      fileName: `stimmprofil-${slug}.txt`,
    });
  }

  return { slug };
}
