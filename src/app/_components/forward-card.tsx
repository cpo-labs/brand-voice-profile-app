"use client";

import { useState } from "react";

interface Props {
  email: string;
  emailConfirmed: boolean;
}

const FORWARD_ADDRESS = "voice-inbox@labs.appsales-consulting.de";

type CopyState =
  | { kind: "idle" }
  | { kind: "ok"; target: "address" | "subject" }
  | { kind: "fail"; target: "address" | "subject" };

export function ForwardCard({ email, emailConfirmed }: Props) {
  const [copyState, setCopyState] = useState<CopyState>({ kind: "idle" });
  const subject = email
    ? `[${email}] Mein Voice-Material`
    : "[deine@email.de] Mein Voice-Material";

  async function copy(text: string, target: "address" | "subject") {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState({ kind: "ok", target });
      setTimeout(() => setCopyState({ kind: "idle" }), 1500);
    } catch {
      // Clipboard API can be blocked (Firefox without user gesture, HTTP origin, etc.)
      setCopyState({ kind: "fail", target });
      setTimeout(() => setCopyState({ kind: "idle" }), 2500);
    }
  }

  function copyLabel(target: "address" | "subject"): string {
    if (copyState.kind === "ok" && copyState.target === target) return "Kopiert!";
    if (copyState.kind === "fail" && copyState.target === target)
      return "Manuell markieren";
    return "Kopieren";
  }

  const disabled = !emailConfirmed;

  return (
    <article className={`icard ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <p className="icard__num">03 · Forward Inbox</p>
      <h3 className="icard__title">Mails an uns weiterleiten</h3>
      <p className="icard__sub">
        Du hast schon einen Stapel Mails, die nach dir klingen? Forward sie an
        unsere Sammeladresse — wir extrahieren den Text. Kein Account, keine
        Verbindung.
      </p>

      <div className="icard__body flex flex-col gap-3">
        <div
          className="rounded-xl border border-[var(--color-ink)] p-3 bg-white flex items-center justify-between gap-3"
        >
          <div className="min-w-0 flex-1">
            <p className="label-mono">Forward an</p>
            <p
              className="font-mono text-sm truncate"
              style={{ color: "var(--color-ink)" }}
            >
              {FORWARD_ADDRESS}
            </p>
          </div>
          <button
            type="button"
            onClick={() => copy(FORWARD_ADDRESS, "address")}
            className="text-xs underline decoration-[var(--color-coral)] underline-offset-4 flex-none"
            style={{ color: "var(--color-coral)" }}
          >
            {copyLabel("address")}
          </button>
        </div>

        <div className="rounded-xl border border-[var(--color-ink)] p-3 bg-white flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="label-mono">Subject muss sein</p>
            <p
              className="font-mono text-sm truncate"
              style={{ color: "var(--color-ink)" }}
            >
              {subject}
            </p>
          </div>
          <button
            type="button"
            onClick={() => copy(subject, "subject")}
            disabled={!emailConfirmed}
            className="text-xs underline decoration-[var(--color-coral)] underline-offset-4 flex-none disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: "var(--color-coral)" }}
          >
            {copyLabel("subject")}
          </button>
        </div>

        <ol
          className="text-sm flex flex-col gap-2 mt-2"
          style={{ color: "var(--color-soft)" }}
        >
          <li className="flex items-start gap-2">
            <span className="font-mono" style={{ color: "var(--color-coral)" }}>1.</span>
            <span>Mails als Anhang (oder weitergeleitet) an die Adresse oben</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono" style={{ color: "var(--color-coral)" }}>2.</span>
            <span>Deine E-Mail im Subject in eckigen Klammern</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono" style={{ color: "var(--color-coral)" }}>3.</span>
            <span>Sobald 3+ Texte da sind, generieren wir und mailen dir den Link</span>
          </li>
        </ol>

        <p className="text-xs mt-2" style={{ color: "var(--color-soft)" }}>
          Inbox-Receiver wird gerade scharf gemacht. Wenn du jetzt forwarden
          und sofort durchgeschaltet werden willst, schreib uns kurz.
        </p>
      </div>
    </article>
  );
}
