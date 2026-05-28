"use client";

import { LOCALE_COOKIE, LOCALES, type Locale } from "@/lib/i18n";

export function LangToggle({ locale }: { locale: Locale }) {
  function set(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }

  return (
    <div className="nav__lang" role="group" aria-label="Language">
      {LOCALES.map((l) => (
        <a
          key={l}
          role="button"
          tabIndex={0}
          aria-current={l === locale ? "page" : undefined}
          className={l === locale ? "is-current" : ""}
          onClick={() => set(l)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              set(l);
            }
          }}
        >
          {l}
        </a>
      ))}
    </div>
  );
}
