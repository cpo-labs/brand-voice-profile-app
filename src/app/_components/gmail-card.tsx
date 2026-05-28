"use client";

import { t, type Locale } from "@/lib/i18n";

const CONTACT = "hello@appsales-consulting.de";

export function GoogleCard({ locale }: { locale: Locale }) {
  const d = t(locale).sources.google;
  const subject = encodeURIComponent("Brand Voice Profile – Gmail-Connect");

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

        <a
          href={`mailto:${CONTACT}?subject=${subject}`}
          className="pill pill--ink pill--arrow self-start"
        >
          {locale === "de" ? "Freischaltung anfragen" : "Request access"}
        </a>

        <p className="text-xs" style={{ color: "var(--soft)" }}>{d.note}</p>
      </div>
    </article>
  );
}
