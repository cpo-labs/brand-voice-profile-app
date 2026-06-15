import { Reveal } from "./reveal";
import { t, type Locale } from "@/lib/i18n";

// Ersetzt die weggefallenen Forward-/Gmail-Karten: eine kurze Anleitung, wie
// man gesendete Mails pro Postfach als Datei exportiert und oben hochlaedt.
// Links zeigen auf die offiziellen Hilfe-Seiten der Anbieter.
export function HowToExport({ locale }: { locale: Locale }) {
  const d = t(locale).howto;

  return (
    <section className="section">
      <div className="wrap">
        <Reveal as="header" className="section__head">
          <p className="eyebrow">{d.eyebrow}</p>
          <h2 className="section__title">
            {d.title}
            <em>{d.titleEm}</em>?
          </h2>
          <p className="section__intro">{d.intro}</p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {d.mailboxes.map((m, i) => (
            <Reveal as="article" key={m.name} delay={i * 0.1} className="surface p-6 md:p-7 flex flex-col">
              <h3 className="text-xl font-semibold mb-4">{m.name}</h3>
              <ol className="flex flex-col gap-2 mb-5 list-decimal pl-5" style={{ color: "var(--soft)" }}>
                {m.steps.map((s, j) => (
                  <li key={j}>{s}</li>
                ))}
              </ol>
              <a
                href={m.linkHref}
                target="_blank"
                rel="noreferrer noopener"
                className="pill pill--ghost self-start mt-auto text-sm"
              >
                {m.linkLabel}
              </a>
            </Reveal>
          ))}
        </div>

        <p className="text-sm mt-8 max-w-[60ch]" style={{ color: "var(--soft)" }}>
          {d.note}
        </p>
      </div>
    </section>
  );
}
