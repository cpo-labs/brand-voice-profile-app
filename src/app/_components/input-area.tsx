"use client";

import { useEffect, useState } from "react";
import { DragDropCard } from "./drag-drop-card";
import { GmailCard } from "./gmail-card";
import { ForwardCard } from "./forward-card";

const STORAGE_KEY = "bvp:email";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InputArea() {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Restore email if user revisits the page. The `mounted` gate keeps the
  // SSR-rendered form deterministic (empty state) so React does not flag a
  // hydration mismatch on the input value or the "Weiter"/"Ändern" swap.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && EMAIL_RE.test(stored)) {
      setEmail(stored);
      setConfirmed(true);
    }
    setMounted(true);
  }, []);

  const valid = EMAIL_RE.test(email);

  function confirm(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    window.localStorage.setItem(STORAGE_KEY, email.toLowerCase().trim());
    setConfirmed(true);
    // Smooth-scroll to the cards
    setTimeout(() => {
      document
        .getElementById("methods")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  return (
    <>
      <form onSubmit={confirm} className="flex flex-col gap-3 max-w-[520px]">
        <label htmlFor="email" className="label-mono" style={{ color: "rgba(250,247,242,0.6)" }}>
          Deine E-Mail
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="du@beispiel.de"
            value={mounted ? email : ""}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            disabled={mounted && confirmed}
            suppressHydrationWarning
            className="flex-1 bg-[var(--color-cream)] text-[var(--color-ink)] border-2 border-transparent rounded-2xl px-5 py-4 text-base outline-none focus:border-[var(--color-coral)] transition-colors disabled:opacity-70"
          />
          {(!mounted || !confirmed) && (
            <button
              type="submit"
              disabled={!valid}
              className="pill pill--light pill--arrow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Weiter
            </button>
          )}
          {mounted && confirmed && (
            <button
              type="button"
              onClick={() => {
                setConfirmed(false);
                window.localStorage.removeItem(STORAGE_KEY);
              }}
              className="pill pill--ghost"
            >
              Ändern
            </button>
          )}
        </div>
        {touched && !valid && (
          <p className="text-sm" style={{ color: "var(--color-coral)" }}>
            Bitte gib eine gültige E-Mail-Adresse ein.
          </p>
        )}
        <p className="label-mono mt-1" style={{ color: "rgba(250,247,242,0.5)" }}>
          1 Profil pro E-Mail · kostenlos · ~30 Sekunden Generation
        </p>
      </form>

      <section id="methods" className="section gut">
        <div className="max-w-[1400px] mx-auto">
          <header className="section__head">
            <p className="eyebrow">Drei Wege rein</p>
            <h2 className="section__title">
              Wähle, woher deine Texte kommen.
            </h2>
            <p className="section__intro">
              Drei Eingänge, gleiches Ziel: ein VOICE.md, das in jedem LLM
              funktioniert. Wähl den Weg, der für dich am wenigsten Aufwand ist.
            </p>
          </header>

          <div
            className="grid gap-6 lg:gap-8"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}
          >
            <DragDropCard email={email} emailConfirmed={confirmed} />
            <GmailCard email={email} emailConfirmed={confirmed} />
            <ForwardCard email={email} emailConfirmed={confirmed} />
          </div>
        </div>
      </section>
    </>
  );
}
