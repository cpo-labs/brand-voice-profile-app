import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";
import { DropCard } from "./_components/drag-drop-card";
import { ForwardCard } from "./_components/forward-card";
import { GoogleCard } from "./_components/gmail-card";
import { Reveal } from "./_components/reveal";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function HomePage() {
  const locale = await getLocale();
  const d = t(locale);

  return (
    <>
      <SiteHeader theme="ink" locale={locale} />

      {/* ── Hero: Frage + VOICE.md-Artefakt ── */}
      <section className="pagehero accent--petrol">
        <div className="pagehero__blob" aria-hidden />
        <div className="pagehero__in">
          <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-12 lg:gap-16 items-center">
            <div>
              <p className="pagehero__tag">{d.hero.tag}</p>
              <h1 className="pagehero__title">
                {d.hero.title}
                <em>{d.hero.titleEm}</em>
                {d.hero.titleAfter}
              </h1>
              <p className="pagehero__sub">{d.hero.sub}</p>
              <a href="#sources" className="pill pill--accent pill--arrow mt-8">
                {d.sources.titleEm.toUpperCase()}
              </a>
            </div>

            {/* VOICE.md-Artefakt — handgebaut, kein Stock */}
            <div className="relative hidden md:block">
              <p className="hfile">VOICE.md</p>
              <div className="nvcard tilt">
                <div className="nvcap">Voice Profile</div>
                <div className="nvrow nvrow--first">
                  <span className="nvlabel nvlabel--on">{locale === "de" ? "Ton" : "Tone"}</span>
                  <span className="nvtxt">{locale === "de" ? "direkt, ohne Marketing-Sprech" : "direct, no marketing-speak"}</span>
                </div>
                <div className="nvrow">
                  <span className="nvlabel">{locale === "de" ? "Satzbau" : "Syntax"}</span>
                  <span className="nvtxt nvmute">{locale === "de" ? "kurz, aktiv, konkret" : "short, active, concrete"}</span>
                </div>
                <div className="nvrow">
                  <span className="nvlabel">{locale === "de" ? "meidet" : "avoids"}</span>
                  <span className="nvtxt nvmute">&bdquo;Let&apos;s dive in&ldquo;, {locale === "de" ? "Floskeln" : "filler"}</span>
                </div>
                <div className="hba" style={{ marginTop: "1rem" }}>
                  <div className="hba__row">
                    <span className="hba__pill hba__pill--off">GPT</span>
                    <span className="hba__sk" />
                    <span className="hba__sk" style={{ flex: ".5" }} />
                  </div>
                  <div className="hba__row">
                    <span className="hba__pill hba__pill--on">{locale === "de" ? "DU" : "YOU"}</span>
                    <span className="hba__sk" style={{ background: "color-mix(in oklab, var(--accent) 60%, transparent)" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quellen: der Source-First-Kern ── */}
      <section id="sources" className="section">
        <div className="wrap">
          <Reveal as="header" className="section__head">
            <p className="eyebrow">{d.sources.eyebrow}</p>
            <h2 className="section__title">
              {d.sources.title}
              <em>{d.sources.titleEm}</em>.
            </h2>
            <p className="section__intro">{d.sources.intro}</p>
          </Reveal>

          <div
            className="grid gap-6 lg:gap-8"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}
          >
            <Reveal><DropCard locale={locale} /></Reveal>
            <Reveal delay={0.1}><ForwardCard locale={locale} /></Reveal>
            <Reveal delay={0.2}><GoogleCard locale={locale} /></Reveal>
          </div>
        </div>
      </section>

      {/* ── Warum das funktioniert ── */}
      <section className="section section--dim">
        <div className="wrap">
          <Reveal as="header" className="section__head">
            <p className="eyebrow">{d.why.eyebrow}</p>
            <h2 className="section__title">
              {d.why.title}
              <em>{d.why.titleEm}</em> {locale === "de" ? "Antworten." : "answers."}
            </h2>
            <p className="section__intro">{d.why.intro}</p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {d.why.cards.map((c, i) => (
              <Reveal as="article" key={c.num} delay={i * 0.1}>
                <p className="label-mono mb-2" style={{ color: "var(--accent)" }}>{c.num}</p>
                <h3 className="text-2xl font-semibold mb-3 leading-tight">{c.title}</h3>
                <p style={{ color: "var(--soft)" }}>{c.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter locale={locale} />
    </>
  );
}
