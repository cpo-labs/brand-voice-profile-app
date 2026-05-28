"use client";

import { useState } from "react";

interface Props {
  email: string;
  emailConfirmed: boolean;
}

export function GmailCard({ email, emailConfirmed }: Props) {
  const [status, setStatus] = useState<"idle" | "starting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    if (!emailConfirmed) return;
    setStatus("starting");
    setError(null);
    try {
      const url = `/api/auth/google/start?email=${encodeURIComponent(email)}`;
      window.location.href = url;
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Etwas ist schiefgelaufen.");
    }
  }

  const disabled = !emailConfirmed;

  return (
    <article className={`icard ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <p className="icard__num">02 · Gmail Sent-Folder</p>
      <h3 className="icard__title">Mit Gmail verbinden</h3>
      <p className="icard__sub">
        Wir lesen die letzten 100 Mails, die du selbst geschrieben hast (nur
        Sent-Folder). Aus echten Mails wird das ehrlichste Profil. Read-only,
        kein Posting in deinem Namen.
      </p>

      <div className="icard__body flex flex-col gap-4">
        <ul className="text-sm flex flex-col gap-2" style={{ color: "var(--color-soft)" }}>
          <li className="flex items-start gap-2">
            <span style={{ color: "var(--color-coral)" }}>✓</span>
            <span>Nur Sent-Folder — keine eingehenden Mails</span>
          </li>
          <li className="flex items-start gap-2">
            <span style={{ color: "var(--color-coral)" }}>✓</span>
            <span>Token wird nach der Generierung gelöscht</span>
          </li>
          <li className="flex items-start gap-2">
            <span style={{ color: "var(--color-coral)" }}>✓</span>
            <span>Auf Anfrage komplett löschbar</span>
          </li>
        </ul>

        {error && (
          <p
            className="text-sm rounded-xl px-3 py-2"
            style={{
              background: "rgba(230,80,66,0.12)",
              color: "var(--color-coral-deep)",
            }}
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={connect}
          disabled={disabled || status === "starting"}
          className="pill pill--ink pill--arrow disabled:opacity-50 disabled:cursor-not-allowed self-start"
        >
          {status === "starting" ? "Verbinde…" : "Mit Google verbinden"}
        </button>

        <p className="text-xs" style={{ color: "var(--color-soft)" }}>
          Google zeigt dir, dass die App nicht verifiziert ist. Für die Beta-Phase
          ist das normal — bestätige &bdquo;Weiter&ldquo;.
        </p>
      </div>
    </article>
  );
}
