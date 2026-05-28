"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { requestGmailAccess, type GmailAccessState } from "@/app/actions/gmail-access";
import { t, type Locale } from "@/lib/i18n";

export function GoogleCard({ locale }: { locale: Locale }) {
  const d = t(locale).sources.google;
  const [state, formAction] = useActionState<GmailAccessState, FormData>(requestGmailAccess, {});

  return (
    <article className="icard">
      <span className="icard__soon">{d.soon}</span>
      <p className="icard__num">{d.num}</p>
      <h3 className="icard__title">{d.title}</h3>
      <p className="icard__sub">{d.sub}</p>

      <div className="icard__body flex flex-col gap-4">
        <ul className="text-sm flex flex-col gap-2" style={{ color: "var(--soft)" }}>
          {d.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2">
              <span style={{ color: "var(--accent)" }}>✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>

        {state.ok ? (
          <p
            className="rounded-xl px-4 py-3 text-sm"
            style={{ background: "color-mix(in oklab, var(--accent) 12%, transparent)", color: "var(--accent)" }}
          >
            {d.requested}
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-3">
            <input type="hidden" name="locale" value={locale} />
            <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hp" />
            <div>
              <label htmlFor="gmail" className="field__label">{d.emailLabel}</label>
              <input
                id="gmail"
                name="gmail"
                type="email"
                required
                autoComplete="email"
                placeholder={d.emailPlaceholder}
                className="field"
              />
            </div>
            {state.error && (
              <p className="text-sm" style={{ color: "var(--coral-deep)" }}>{state.error}</p>
            )}
            <SubmitButton cta={d.cta} pendingLabel={d.ctaPending} />
          </form>
        )}

        <p className="text-xs" style={{ color: "var(--soft)" }}>{d.note}</p>
      </div>
    </article>
  );
}

function SubmitButton({ cta, pendingLabel }: { cta: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="pill pill--ink pill--arrow self-start">
      {pending ? pendingLabel : cta}
    </button>
  );
}
