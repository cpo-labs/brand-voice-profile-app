"use server";

import { redirect } from "next/navigation";
import {
  deleteBatch,
  getBatchByToken,
  getBatchSamples,
  MIN_SAMPLES_TO_GENERATE,
} from "@/lib/forward-batches";
import { decodeLinkEmail, verifyForwardLink } from "@/lib/forward-links";
import { generateProfileFromTexts } from "@/lib/generate-profile";
import { t, type Locale } from "@/lib/i18n";

// Server Action des Forward-Pfads: erzeugt das Profil aus den gesammelten
// Proben eines Batches. Erreichbar nur ueber den signierten Erstellen-Link
// aus der Status-Mail (token + signierte Absender-Adresse). Nach Erfolg wird
// der Batch (inkl. Proben) geloescht — Datenschutz-Posture des Forward-Pfads.

export interface ForwardGenerateState {
  error?: string;
}

export async function generateFromForward(
  _prev: ForwardGenerateState,
  formData: FormData
): Promise<ForwardGenerateState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "de";
  const e = t(locale).errors;

  const token = String(formData.get("token") ?? "");
  const signature = String(formData.get("s") ?? "");
  const email = decodeLinkEmail(String(formData.get("e") ?? ""));

  if (!token || !signature || !email) {
    return { error: e.generic };
  }

  const batch = await getBatchByToken(token);
  if (!batch) {
    return { error: e.forwardLinkInvalid };
  }

  // Signatur + Hash-Bindung pruefen — der Link gilt nur fuer genau diesen
  // Absender und Batch.
  const ok = verifyForwardLink({
    token,
    email,
    signature,
    batchEmailHash: batch.emailHash,
  });
  if (!ok) {
    return { error: e.forwardLinkInvalid };
  }

  if (batch.sampleCount < MIN_SAMPLES_TO_GENERATE) {
    return { error: e.forwardNotEnough };
  }

  let slug: string;
  try {
    const texts = await getBatchSamples(batch.batchId);
    ({ slug } = await generateProfileFromTexts({ email, texts }));
    // Proben sind transient — nach erfolgreicher Erstellung sofort loeschen.
    await deleteBatch(batch.batchId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: msg };
  }

  redirect(`/voice/${slug}`);
}
