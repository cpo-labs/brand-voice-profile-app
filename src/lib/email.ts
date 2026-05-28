import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromAddress =
  process.env.RESEND_FROM ||
  "Brand Voice Profile <hello@labs.appsales-consulting.de>";

const resend = apiKey ? new Resend(apiKey) : null;

export interface PermalinkArgs {
  email: string;
  permalink: string;
}

export async function sendProfileReady({
  email,
  permalink,
}: PermalinkArgs): Promise<void> {
  if (!resend) {
    console.log(
      "\n[Brand Voice Profile] Profile-Ready Mail (RESEND_API_KEY not set, logging instead):"
    );
    console.log(`  To:    ${email}`);
    console.log(`  Link:  ${permalink}\n`);
    return;
  }

  try {
    await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: "Dein Brand Voice Profile ist fertig",
      text: [
        "Hi,",
        "",
        "Dein VOICE.md ist generiert. Du findest es hier:",
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
    <p style="font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#5C544B;margin-bottom:24px">AppSales Labs / Brand Voice Profile</p>
    <h1 style="font-size:24px;font-weight:700;letter-spacing:-0.01em;margin-bottom:16px">Dein VOICE.md ist fertig</h1>
    <p style="margin-bottom:24px">Du findest dein Profil hier. Speicher den Link &mdash; du kannst es jederzeit wieder aufrufen.</p>
    <p style="margin-bottom:32px">
      <a href="${permalink}" style="display:inline-block;background:#181410;color:#FAF7F2;padding:14px 28px;border-radius:100px;font-weight:600;text-decoration:none">Profil &ouml;ffnen &rarr;</a>
    </p>
    <p style="font-size:13px;color:#5C544B">Frag mich nicht, warum mein E-Mail-Footer so kurz ist. Christian.</p>
  </div>
</body></html>`;
}
