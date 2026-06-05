"use client";

import { useEffect } from "react";
import { t, LOCALE_COOKIE, type Locale } from "@/lib/i18n";

// Fehlerfall der Profil-Seite: menschliche, lokalisierte Meldung statt
// Stacktrace oder Weiss-Screen. Greift z.B. bei DB-Problemen beim Lookup.
function readLocale(): Locale {
  if (typeof document === "undefined") return "de";
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${LOCALE_COOKIE}=`));
  return match?.split("=")[1] === "en" ? "en" : "de";
}

export default function VoiceProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-seitiges Detail nur ins Log, nie ins UI.
    console.error("[voice profile] page error:", error);
  }, [error]);

  const e = t(readLocale()).errors;

  return (
    <main className="wrap pt-32 pb-24 min-h-[60vh] flex items-center">
      <div className="surface p-8 md:p-10 max-w-[44ch]">
        <h1 className="display-l mb-4">{e.pageTitle}</h1>
        <p className="mb-8" style={{ color: "var(--soft)" }}>
          {e.pageBody}
        </p>
        <button type="button" onClick={reset} className="pill pill--ink pill--arrow">
          {e.pageRetry}
        </button>
      </div>
    </main>
  );
}
