"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  generateFromForward,
  type ForwardGenerateState,
} from "@/app/actions/forward-generate";
import { t, type Locale } from "@/lib/i18n";

// Erstellen-Button des Forward-Pfads. Traegt token + signierte Adresse als
// Hidden-Fields zur Server Action. Bei Erfolg redirected die Action zur
// Profil-Seite, deshalb gibt es hier nur den Fehlerpfad zu rendern.
export function ForwardGenerateForm({
  locale,
  token,
  e,
  s,
}: {
  locale: Locale;
  token: string;
  e: string;
  s: string;
}) {
  const d = t(locale).forwardPage;
  const [state, formAction] = useActionState<ForwardGenerateState, FormData>(
    generateFromForward,
    {}
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="e" value={e} />
      <input type="hidden" name="s" value={s} />
      {state.error && (
        <p className="text-sm" style={{ color: "var(--coral-deep)" }}>
          {state.error}
        </p>
      )}
      <SubmitButton cta={d.cta} pendingLabel={d.ctaPending} />
    </form>
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
