"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { extractTextFromFiles } from "@/lib/text-extraction";
import { enqueueProfileJob } from "@/lib/job-runner";
import { checkLimit } from "@/lib/rate-limit";
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

  // E-Mail ist jetzt PFLICHT — das fertige Profil wird im Hintergrund gebaut und
  // per Mail zugestellt (plus Permalink). Ohne Adresse geht es nicht.
  const emailRaw = formData.get("email");
  const emailStr = typeof emailRaw === "string" ? emailRaw.trim() : "";
  if (emailStr.length === 0) {
    return { error: e.emailRequired };
  }
  const parsed = EmailSchema.safeParse(emailStr);
  if (!parsed.success) {
    return { error: e.invalidEmail };
  }
  const email = parsed.data.toLowerCase();

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return { error: e.noFiles };
  }

  // Frühe, lokalisierte Limit-Meldung. Die Slot-Reservierung passiert in
  // enqueueProfileJob (recordRun).
  const limit = await checkLimit(email);
  if (!limit.allowed) {
    return { error: e.limitFallback };
  }

  let slug: string;
  try {
    // Text wird sofort extrahiert (schnell); die teure Analyse uebernimmt der
    // Hintergrund-Worker, damit der Upload nicht ins 300s-Limit laeuft.
    const texts = await extractTextFromFiles(files);
    ({ slug } = await enqueueProfileJob({ email, texts, locale }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: msg };
  }

  redirect(`/voice/${slug}`);
}
