// Saeubert weitergeleitete Mails fuer die Voice-Analyse: Forwarded-Header,
// zitierte Antwort-Ketten und Signaturen fliegen raus — sonst verschmutzen
// sie die Proben und das Profil lernt Outlook-Boilerplate statt Stimme.

const FORWARD_SEPARATORS = [
  /^-{2,}\s*Forwarded message\s*-{2,}/i,
  /^-{2,}\s*Weitergeleitete Nachricht\s*-{2,}/i,
  /^Anfang der weitergeleiteten (?:Nachricht|E-?Mail):?/i,
  /^Begin forwarded message:?/i,
  /^-{4,}\s*Original(?:-| )Message\s*-{4,}/i,
  /^-{2,}\s*Urspr(?:ü|ue)ngliche Nachricht\s*-{2,}/i,
];

// Header-Zeilen, wie sie Mail-Clients in den weitergeleiteten Block schreiben.
const HEADER_LINE =
  /^(Von|From|An|To|Cc|Bcc|Datum|Date|Gesendet|Sent|Betreff|Subject|Antwort an|Reply-To)\s*:/i;

// Ab hier beginnt eine zitierte Antwort-Kette — alles danach kappen.
const REPLY_CHAIN_STARTERS = [
  /^Am .{4,100} schrieb .*:?\s*$/,
  /^On .{4,100} wrote:?\s*$/,
  /^Nachricht von .{2,100} am .{4,60}:?\s*$/,
  /^Le .{4,100} a écrit\s*:?\s*$/,
];

// Signatur-Beginn: Konvention "-- " oder typische Mobil-Footer.
const SIGNATURE_STARTERS = [
  /^--\s*$/,
  /^(Gesendet|Von meinem) (von meinem )?i?(Phone|Pad|Mac)/i,
  /^Sent from my /i,
  /^Diese Nachricht wurde von meinem .* gesendet/i,
];

/**
 * Strippt eine weitergeleitete Mail auf den eigentlichen Autorentext:
 * 1. Forwarded-Separatoren und Header-Cluster entfernen
 * 2. ab Beginn einer zitierten Antwort-Kette (oder ">"-Zeilen) kappen
 * 3. ab Signatur-Marker kappen
 * Gibt den getrimmten Text zurueck (kann leer sein).
 */
export function stripForwardedText(raw: string): string {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const kept: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Antwort-Kette oder Quote: ab hier ist nichts mehr vom Autor.
    if (trimmed.startsWith(">")) break;
    if (REPLY_CHAIN_STARTERS.some((re) => re.test(trimmed))) break;
    if (SIGNATURE_STARTERS.some((re) => re.test(trimmed))) break;

    // Forwarded-Separator und Header-Zeilen einzeln ueberspringen — der
    // eigentliche weitergeleitete Text (vom Autor) kommt danach.
    if (FORWARD_SEPARATORS.some((re) => re.test(trimmed))) continue;
    if (HEADER_LINE.test(trimmed)) continue;

    kept.push(line);
  }

  // Mehrfache Leerzeilen eindampfen.
  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Mindestlaenge, ab der ein gestrippter Text als Probe zaehlt. */
export const MIN_SAMPLE_CHARS = 80;

export interface StrippedText {
  filename: string;
  content: string;
}

/**
 * Strippt eine Liste von Texten und filtert leere/zu kurze Reste weg.
 */
export function stripAndFilter(
  texts: { filename: string; content: string }[]
): StrippedText[] {
  const result: StrippedText[] = [];
  for (const t of texts) {
    const content = stripForwardedText(t.content);
    if (content.length < MIN_SAMPLE_CHARS) continue;
    result.push({ filename: t.filename, content });
  }
  return result;
}
