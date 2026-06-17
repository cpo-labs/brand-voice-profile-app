import { describe, expect, test } from "vitest";
import { checkQuoteFidelity } from "./voice-verify";
import type { SourceText, VoiceQuote } from "./voice-types";

const sources: SourceText[] = [
  {
    filename: "mail-1.txt",
    content:
      "Hallo Stefan,\n\nkurze Rückmeldung: Der Workshop-Termin am Freitag ist bestätigt — die Einladung ist raus. Lieber zu viel als zu wenig, ich filtere auf meiner Seite.\n\nBeste Grüße\nChristian",
  },
  { filename: "mail-2.txt", content: "Leider nein." },
];

function quote(text: string): VoiceQuote {
  return { text, source: "Mail 1", shows: "test" };
}

describe("checkQuoteFidelity", () => {
  test("keeps a verbatim quote that appears in the source", () => {
    const result = checkQuoteFidelity([quote("kurze Rückmeldung: Der Workshop-Termin am Freitag ist bestätigt")], sources);
    expect(result.kept).toHaveLength(1);
    expect(result.dropped).toHaveLength(0);
    expect(result.ratio).toBe(1);
  });

  test("drops a paraphrased quote that is not in the source", () => {
    const result = checkQuoteFidelity([quote("Ich melde mich nächste Woche bei dir zurück")], sources);
    expect(result.kept).toHaveLength(0);
    expect(result.dropped).toHaveLength(1);
    expect(result.ratio).toBe(0);
  });

  test("keeps a quote shortened with [...] when all segments are present", () => {
    const result = checkQuoteFidelity(
      [quote("kurze Rückmeldung: Der Workshop-Termin [...] Lieber zu viel als zu wenig, ich filtere auf meiner Seite")],
      sources
    );
    expect(result.kept).toHaveLength(1);
  });

  test("drops a [...] quote when one segment is fabricated", () => {
    const result = checkQuoteFidelity(
      [quote("kurze Rückmeldung: Der Workshop-Termin [...] und ich rufe dich morgen früh persönlich an")],
      sources
    );
    expect(result.dropped).toHaveLength(1);
  });

  test("keeps a very short quote that matches as a whole", () => {
    const result = checkQuoteFidelity([quote("Leider nein.")], sources);
    expect(result.kept).toHaveLength(1);
  });

  test("normalizes dashes, case and whitespace before matching", () => {
    // Source has em-dash + capitalisation; quote uses hyphen, lowercase, extra spaces.
    const result = checkQuoteFidelity([quote("ist  bestätigt - die einladung ist raus")], sources);
    expect(result.kept).toHaveLength(1);
  });

  test("computes the verified ratio across a mixed batch", () => {
    const result = checkQuoteFidelity(
      [quote("Leider nein."), quote("etwas völlig Erfundenes das nirgends steht")],
      sources
    );
    expect(result.kept).toHaveLength(1);
    expect(result.dropped).toHaveLength(1);
    expect(result.ratio).toBe(0.5);
  });

  test("treats an empty quote list as fully verified", () => {
    const result = checkQuoteFidelity([], sources);
    expect(result.ratio).toBe(1);
  });

  test("matches a sub-12-char quote via the whole-quote fallback", () => {
    // "ok nein" is 7 chars (< MIN_SEGMENT_CHARS) -> no long segment, so the
    // whole normalized quote is checked against the source.
    const src: SourceText[] = [{ filename: "x.txt", content: "Er sagte nur: ok nein, das passt." }];
    const result = checkQuoteFidelity([quote("ok nein")], src);
    expect(result.kept).toHaveLength(1);
  });

  test("drops a sub-12-char quote absent from the source", () => {
    const src: SourceText[] = [{ filename: "x.txt", content: "Alles gut soweit." }];
    const result = checkQuoteFidelity([quote("nope x")], src);
    expect(result.dropped).toHaveLength(1);
  });
});
