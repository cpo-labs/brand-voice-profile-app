"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { extractTextFromFiles } from "@/lib/text-extraction";
import { generateProfileFromTexts } from "@/lib/generate-profile";
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

  // Frühe, lokalisierte Limit-Meldung bevor wir Dateien extrahieren. Die
  // autoritative Prüfung (inkl. Slot-Reservierung) passiert in
  // generateProfileFromTexts.
  const limit = await checkLimit(email);
  if (!limit.allowed) {
    return { error: e.limitFallback };
  }

  let slug: string;
  try {
    const texts = await extractTextFromFiles(files);
    ({ slug } = await generateProfileFromTexts({ email, texts }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: msg };
  }

  redirect(`/voice/${slug}`);
}
