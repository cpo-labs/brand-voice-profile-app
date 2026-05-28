import Anthropic from "@anthropic-ai/sdk";

// Lazy: der Client (und der API-Key-Guard) wird erst bei der ersten echten
// Nutzung erzeugt, nicht beim Modul-Import — sonst kann `next build` schon
// beim Sammeln der Page-Daten werfen.
let cached: Anthropic | undefined;

export function getAnthropic(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  cached = new Anthropic({ apiKey });
  return cached;
}

export const VOICE_MODEL = "claude-sonnet-4-6";
