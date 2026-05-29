import { NextRequest, NextResponse } from "next/server";

// Gmail OAuth — start endpoint.
// Phase 1: emits a clear "setup pending" page so the click does not 404.
// Phase 2 (when GOOGLE_CLIENT_ID is provisioned): builds the actual
// authorization URL with scope https://www.googleapis.com/auth/gmail.readonly
// and redirects to Google.

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email") ?? "";

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

  if (!clientId) {
    return new NextResponse(setupPendingHtml(email), {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  // Phase 2 path — actual OAuth redirect
  const state = encodeURIComponent(
    Buffer.from(JSON.stringify({ email })).toString("base64url")
  );
  const redirectUri = `${baseUrl}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}

const CONTACT_EMAIL = process.env.CONTACT_EMAIL ?? "info@appsales-consulting.de";

function setupPendingHtml(email: string): string {
  const safeEmail = email.replace(/[<>"]/g, "");
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gmail-Verbindung · Setup läuft</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Montserrat:wght@400;500;600;700;800&display=swap">
  <style>
    body{font-family:"Montserrat",-apple-system,system-ui,sans-serif;background:#FAF7F2;color:#181410;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:2rem;line-height:1.55}
    main{max-width:540px}
    p.tag{font-family:"JetBrains Mono",monospace;font-size:.78rem;letter-spacing:.18em;text-transform:uppercase;color:#E65042;margin-bottom:1rem;display:inline-flex;align-items:center;gap:.6rem}
    p.tag::before{content:"";width:1.7rem;height:2px;background:#E65042}
    h1{font-weight:700;font-size:clamp(2rem,4vw,3rem);line-height:1.04;letter-spacing:-.035em;margin-bottom:1.2rem;max-width:14ch}
    p{font-size:1.05rem;color:#5C544B;margin-bottom:1.4rem}
    p.muted{font-size:.86rem}
    a.pill{display:inline-flex;align-items:center;gap:.5rem;background:#181410;color:#FAF7F2;padding:.9rem 1.7rem;border-radius:100px;font-weight:600;text-decoration:none;transition:background .25s ease}
    a.pill:hover{background:#E65042}
    a.pill::after{content:"→";transition:transform .2s ease}
    a.pill:hover::after{transform:translateX(4px)}
    a.back{font-family:"JetBrains Mono",monospace;font-size:.76rem;letter-spacing:.08em;text-transform:uppercase;color:#5C544B;text-decoration:none;display:inline-block;margin-top:1.6rem}
    a.back:hover{color:#E65042}
  </style>
</head>
<body>
  <main>
    <p class="tag">Phase 2 · in Vorbereitung</p>
    <h1>Gmail-Verbindung wird gerade scharf gemacht.</h1>
    <p>Die OAuth-Verifikation bei Google ist beantragt, dauert aber meist 1–2 Werktage. Solange drück nicht auf &bdquo;Verbinden&ldquo; — sondern nutz den <strong>Drop&nbsp;&amp;&nbsp;Generate</strong>-Weg oder die <strong>Forward-Inbox</strong>.</p>
    <p class="muted">Wenn du Gmail trotzdem jetzt nutzen willst: schreib uns kurz, wir schalten dich manuell frei. ${safeEmail ? `Deine Adresse <strong>${safeEmail}</strong> haben wir gleich mit.` : ""}</p>
    <p>
      <a class="pill" href="mailto:${CONTACT_EMAIL}?subject=Brand%20Voice%20Profile%20-%20Gmail%20Beta&body=${encodeURIComponent(
        `Hallo Labs-Team,\n\nich würde Brand Voice Profile mit Gmail-Verbindung testen.\nMeine Adresse: ${safeEmail || "(bitte eintragen)"}\n\nDanke!\n`
      )}">Schreib uns</a>
    </p>
    <a class="back" href="/">&larr; Zurück</a>
  </main>
</body>
</html>`;
}
