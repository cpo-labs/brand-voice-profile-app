"use server";

import { z } from "zod";
import { sendGmailAccessRequest } from "@/lib/email";
import { t, type Locale } from "@/lib/i18n";

// Nur Google-Konten: diese Adresse wird manuell als OAuth-Test-User eingetragen.
// Nicht-Google-Adressen (Outlook/Yahoo) würden einen Test-User-Slot verschwenden.
const EmailSchema = z
  .string()
  .email()
  .max(254)
  .refine((v) => /@(gmail|googlemail)\.com$/i.test(v.trim()));

export interface GmailAccessState {
  ok?: boolean;
  error?: string;
}

export async function requestGmailAccess(
  _prev: GmailAccessState,
  formData: FormData
): Promise<GmailAccessState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "de";
  const g = t(locale).sources.google;

  // Honeypot
  const honeypot = formData.get("company");
  if (typeof honeypot === "string" && honeypot.length > 0) {
    return { ok: true };
  }

  const parsed = EmailSchema.safeParse(formData.get("gmail"));
  if (!parsed.success) {
    return { error: g.errEmail };
  }
  const gmail = parsed.data.toLowerCase().trim();

  const res = await sendGmailAccessRequest({ gmail, locale });
  if (!res.ok) {
    return { error: t(locale).errors.generic };
  }
  return { ok: true };
}
