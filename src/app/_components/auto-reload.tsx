"use client";

import { useEffect, useState } from "react";

interface AutoReloadProps {
  /** Sekunden bis zum naechsten Reload. */
  seconds: number;
  /** Gesamt-Wartezeit (ueber Reloads hinweg), nach der nicht mehr neu geladen wird. */
  maxAgeSeconds: number;
  /** Lokalisierte Meldung, die nach dem Timeout statt des Spinners erscheint. */
  timeoutMessage: string;
}

// Laedt die Job-Status-Seite periodisch neu, bis das Profil fertig ist — bewusst
// ein Server-Reload statt Client-Fetch, damit die Seite einfach die DB neu liest.
// Deckel: die Gesamtwartezeit wird ueber Reloads hinweg in sessionStorage
// gemerkt; nach `maxAgeSeconds` wird nicht mehr neu geladen, sondern eine
// "dauert laenger"-Meldung gezeigt. So pollt eine festhaengende Seite (z.B.
// Cron fehlkonfiguriert, Job dauerhaft pending) nicht endlos im 15s-Takt.
export function AutoReload({ seconds, maxAgeSeconds, timeoutMessage }: AutoReloadProps) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const key = `bvp:reload-start:${window.location.pathname}`;
    const stored = Number(sessionStorage.getItem(key));
    const start = stored > 0 ? stored : Date.now();
    if (!stored) sessionStorage.setItem(key, String(start));

    if (Date.now() - start >= maxAgeSeconds * 1000) {
      setTimedOut(true);
      return;
    }

    const id = setTimeout(() => window.location.reload(), seconds * 1000);
    return () => clearTimeout(id);
  }, [seconds, maxAgeSeconds]);

  if (!timedOut) return null;
  return (
    <p className="mt-4 text-sm max-w-[52ch]" style={{ color: "var(--soft)" }} role="status">
      {timeoutMessage}
    </p>
  );
}
