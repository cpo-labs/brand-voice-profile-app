// Zentrale Gate-Funktion fuer den Gmail-OAuth-Pfad. Der Flow ist ein
// Skeleton: er ist NUR erreichbar, wenn das Feature-Flag gesetzt UND die
// Google-Credentials provisioniert sind. Default-Env => komplett aus
// (fail closed). So bleibt der Code im Repo, ohne dass ein halbfertiger
// OAuth-Flow live geht.

export const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

export function isGmailOAuthEnabled(): boolean {
  const flag = (process.env.GMAIL_OAUTH_ENABLED ?? "").toLowerCase();
  const enabled = flag === "1" || flag === "true" || flag === "yes";
  return enabled && !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
}

export function googleRedirectUri(): string {
  const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
  return `${baseUrl}/api/auth/google/callback`;
}
