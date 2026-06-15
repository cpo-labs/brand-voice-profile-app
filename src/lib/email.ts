import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromAddress =
  process.env.RESEND_FROM ||
  "Brand Voice Profile <info@appsales-consulting.de>";

const resend = apiKey ? new Resend(apiKey) : null;

export interface ProfileReadyArgs {
  email: string;
  permalink: string;
  /** Wenn gesetzt: das fertige VOICE.md geht als Datei-Anhang mit raus. */
  voiceMd?: string;
  /** Anhang-Dateiname inkl. Endung, z.B. "stimmprofil-ab12cd34.txt". */
  fileName?: string;
}

/**
 * Schickt dem Nutzer sein fertiges Stimmprofil: Permalink im Text/HTML und —
 * wenn `voiceMd` gesetzt ist — die VOICE.md direkt als Datei-Anhang, damit man
 * sie ohne Umweg ueber den Download in der Hand hat. Der In-Browser-Download
 * bleibt davon unberuehrt.
 */
export async function sendProfileReady({
  email,
  permalink,
  voiceMd,
  fileName = "stimmprofil.txt",
}: ProfileReadyArgs): Promise<void> {
  if (!resend) {
    // Dev-only Fallback; email ist user-PII und gehoert nicht in Prod-Logs.
    if (process.env.NODE_ENV === "development") {
      console.log(
        "\n[Brand Voice Profile] Profile-Ready Mail (RESEND_API_KEY not set, logging instead):"
      );
      console.log(`  To:         ${email}`);
      console.log(`  Link:       ${permalink}`);
      console.log(`  Attachment: ${voiceMd ? fileName : "(keiner)"}\n`);
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
        voiceMd
          ? "Die VOICE.md haengt direkt an dieser Mail — du kannst sie sofort in deine KI-Tools laden."
          : "Speicher den Link, du kannst ihn jederzeit wieder aufrufen.",
        "",
        "AppSales Labs",
      ].join("\n"),
      html: profileHtml(permalink, Boolean(voiceMd)),
      ...(voiceMd
        ? { attachments: [{ filename: fileName, content: Buffer.from(voiceMd, "utf-8") }] }
        : {}),
    });
  } catch (err) {
    // Don't block the user flow if email delivery fails
    console.error("[Brand Voice Profile] Email send failed:", err);
  }
}

function profileHtml(permalink: string, hasAttachment: boolean): string {
  const attachmentLine = hasAttachment
    ? `<p style="margin-bottom:24px">Die <strong>VOICE.md</strong> h&auml;ngt direkt an dieser Mail &mdash; sofort einsatzbereit f&uuml;r deine KI-Tools.</p>`
    : `<p style="margin-bottom:24px">Du findest dein Profil hier. Speicher den Link, du kannst es jederzeit wieder aufrufen.</p>`;
  return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#FAF7F2;color:#181410;padding:32px;line-height:1.55">
  <div style="max-width:520px;margin:0 auto">
    <p style="font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#5C544B;margin-bottom:24px">AppSales Labs / Stimmprofil</p>
    <h1 style="font-size:24px;font-weight:700;letter-spacing:-0.01em;margin-bottom:16px">Dein Stimmprofil ist fertig</h1>
    ${attachmentLine}
    <p style="margin-bottom:32px">
      <a href="${permalink}" style="display:inline-block;background:#181410;color:#FAF7F2;padding:14px 28px;border-radius:100px;font-weight:600;text-decoration:none">Profil &ouml;ffnen &rarr;</a>
    </p>
    <p style="font-size:13px;color:#5C544B">Das Labs-Team</p>
  </div>
</body></html>`;
}
