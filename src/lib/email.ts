import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromAddress =
  process.env.RESEND_FROM ||
  "Brand Voice Profile <info@appsales-consulting.de>";

const resend = apiKey ? new Resend(apiKey) : null;
const contactAddress = process.env.CONTACT_EMAIL || "info@appsales-consulting.de";

/**
 * Benachrichtigt das Lab-Team über eine neue Gmail-Connect-Zugangsanfrage.
 * Google bietet keine API zum Hinzufügen von OAuth-Test-Usern — daher wird
 * die Adresse erfasst und Christian trägt sie manuell in die Test-User-Liste
 * ein, dann geht der Link raus.
 */
export async function sendGmailAccessRequest({
  gmail,
  locale,
}: {
  gmail: string;
  locale: string;
}): Promise<{ ok: boolean }> {
  if (!resend) {
    // Dev-only Fallback; gmail ist user-PII und gehört nicht in Prod-Logs.
    if (process.env.NODE_ENV === "development") {
      console.log(`\n[Brand Voice Profile] Gmail-Access-Request (RESEND not set): ${gmail} (${locale})\n`);
    }
    return { ok: true };
  }
  try {
    await resend.emails.send({
      from: fromAddress,
      to: contactAddress,
      subject: `Gmail-Connect Zugang angefragt: ${gmail}`,
      text: [
        "Neue Gmail-Connect-Anfrage (Brand Voice Profile).",
        "",
        `Gmail:    ${gmail}`,
        `Sprache:  ${locale}`,
        "",
        "Aktion: Adresse in Google Cloud Console → OAuth Consent Screen → Test users",
        "hinzufügen, dann den OAuth-Link an diese Adresse schicken.",
      ].join("\n"),
    });
    return { ok: true };
  } catch (err) {
    console.error("[Brand Voice Profile] Gmail-access notify failed:", err);
    return { ok: false };
  }
}

// Datenschutz-Hinweis fuer den Forward-Pfad — steht in jeder Status-Mail.
const FORWARD_PRIVACY_NOTE =
  "Datenschutz: Wir nutzen deine weitergeleiteten Mails ausschließlich, um dein Stimmprofil zu erstellen. " +
  "Nach der Erstellung löschen wir sie — spätestens 14 Tage nach der letzten Mail.";

export interface ForwardStatusArgs {
  email: string;
  sampleCount: number;
  /** Erstellen-Link, sobald genug Proben da sind — sonst null. */
  generateLink: string | null;
}

/**
 * Status-Antwort auf jede verarbeitete Forward-Mail: Probenzahl + ab
 * 3 Proben der Link zur Profil-Erstellung.
 */
export async function sendForwardStatus({
  email,
  sampleCount,
  generateLink,
}: ForwardStatusArgs): Promise<void> {
  const subject = generateLink
    ? `Genug Material: dein Stimmprofil wartet (${sampleCount} Proben)`
    : `Mail angekommen: ${sampleCount} ${sampleCount === 1 ? "Probe" : "Proben"} gesammelt`;

  const lines = [
    "Hi,",
    "",
    `wir haben jetzt ${sampleCount} ${sampleCount === 1 ? "Textprobe" : "Textproben"} von dir.`,
    "",
    ...(generateLink
      ? [
          "Das reicht für ein gutes Profil. Hier erstellen:",
          generateLink,
          "",
          "Du kannst auch noch mehr Mails weiterleiten, bevor du erstellst — mehr Material, schärferes Profil.",
        ]
      : [
          "Ab 3 Proben schicken wir dir den Link zur Profil-Erstellung.",
          "Leite einfach weitere Mails weiter, die nach dir klingen.",
        ]),
    "",
    FORWARD_PRIVACY_NOTE,
    "",
    "AppSales Labs",
  ];

  if (!resend) {
    // Dev-only Fallback; email ist user-PII und gehoert nicht in Prod-Logs.
    if (process.env.NODE_ENV === "development") {
      console.log("\n[Brand Voice Profile] Forward-Status (RESEND_API_KEY not set):");
      console.log(`  To:      ${email}`);
      console.log(`  Samples: ${sampleCount}`);
      console.log(`  Link:    ${generateLink ?? "(noch keiner)"}\n`);
    }
    return;
  }

  try {
    await resend.emails.send({
      from: fromAddress,
      to: email,
      subject,
      text: lines.join("\n"),
    });
  } catch (err) {
    // Status-Mail darf den Sammel-Flow nicht blockieren.
    console.error("[Brand Voice Profile] Forward-status send failed:", err);
  }
}

export interface PermalinkArgs {
  email: string;
  permalink: string;
}

export async function sendProfileReady({
  email,
  permalink,
}: PermalinkArgs): Promise<void> {
  if (!resend) {
    // Dev-only Fallback; email ist user-PII und gehoert nicht in Prod-Logs.
    if (process.env.NODE_ENV === "development") {
      console.log(
        "\n[Brand Voice Profile] Profile-Ready Mail (RESEND_API_KEY not set, logging instead):"
      );
      console.log(`  To:    ${email}`);
      console.log(`  Link:  ${permalink}\n`);
    }
    return;
  }

  try {
    await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: "Dein Stimmprofil ist fertig",
      text: [
        "Hi,",
        "",
        "Dein Stimmprofil ist fertig. Du findest es hier:",
        permalink,
        "",
        "Speicher den Link, du kannst ihn jederzeit wieder aufrufen.",
        "",
        "AppSales Labs",
      ].join("\n"),
      html: profileHtml(permalink),
    });
  } catch (err) {
    // Don't block the user flow if email delivery fails
    console.error("[Brand Voice Profile] Email send failed:", err);
  }
}

function profileHtml(permalink: string): string {
  return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#FAF7F2;color:#181410;padding:32px;line-height:1.55">
  <div style="max-width:520px;margin:0 auto">
    <p style="font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#5C544B;margin-bottom:24px">AppSales Labs / Stimmprofil</p>
    <h1 style="font-size:24px;font-weight:700;letter-spacing:-0.01em;margin-bottom:16px">Dein Stimmprofil ist fertig</h1>
    <p style="margin-bottom:24px">Du findest dein Profil hier. Speicher den Link, du kannst es jederzeit wieder aufrufen.</p>
    <p style="margin-bottom:32px">
      <a href="${permalink}" style="display:inline-block;background:#181410;color:#FAF7F2;padding:14px 28px;border-radius:100px;font-weight:600;text-decoration:none">Profil &ouml;ffnen &rarr;</a>
    </p>
    <p style="font-size:13px;color:#5C544B">Das Labs-Team</p>
  </div>
</body></html>`;
}
