import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";
import { InputArea } from "./_components/input-area";

export default function HomePage() {
  return (
    <>
      <SiteHeader theme="ink" />

      <section className="pagehero">
        <div className="pagehero__grid" aria-hidden />
        <div className="pagehero__blob pagehero__blob--a" aria-hidden />
        <div className="pagehero__blob pagehero__blob--b" aria-hidden />

        <div className="pagehero__in gut">
          <p className="eyebrow" style={{ color: "var(--color-coral)" }}>
            Werkzeug · AppSales Labs
          </p>
          <h1 className="display-xl mb-6 max-w-[16ch]">
            Damit KI nicht mehr <em style={{ color: "var(--color-coral)", fontStyle: "normal" }}>dich</em> verwässert.
          </h1>
          <p
            className="text-lg md:text-xl max-w-[44ch] mb-10"
            style={{ color: "rgba(250,247,242,0.82)", lineHeight: 1.55 }}
          >
            Ein VOICE.md aus deinen echten Texten. Du drag-and-droppst Files,
            verbindest dein Gmail oder forwardest ein paar Mails. Was rauskommt,
            wirfst du in ChatGPT, Claude oder Gemini — die schreiben dann nicht
            mehr wie ein LinkedIn-Influencer.
          </p>

          <InputArea />
        </div>
      </section>

      <section className="section section--dim">
        <div className="gut max-w-[1400px] mx-auto">
          <header className="section__head">
            <p className="eyebrow">Warum das funktioniert</p>
            <h2 className="section__title">
              Generische Prompts erzeugen <em>generische</em> Antworten.
            </h2>
            <p className="section__intro">
              Wir analysieren nicht, was du gerne wärst, sondern wie du wirklich
              schreibst. Satzbau, Wortwahl, was du vermeidest — alles aus deinen
              echten Quellen, alles nachprüfbar.
            </p>
          </header>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <article>
              <p className="label-mono mb-2" style={{ color: "var(--color-coral)" }}>
                01
              </p>
              <h3 className="text-2xl font-semibold mb-3 leading-tight">
                Echte Quellen, nicht Adjektive
              </h3>
              <p style={{ color: "var(--color-soft)" }}>
                „Professionell und sympathisch&ldquo; sagt nichts. Die echten
                Marker stecken in Satzbau, Wortwahl und dem, was du NIE
                schreiben würdest.
              </p>
            </article>
            <article>
              <p className="label-mono mb-2" style={{ color: "var(--color-coral)" }}>
                02
              </p>
              <h3 className="text-2xl font-semibold mb-3 leading-tight">
                Drop-in für jedes LLM
              </h3>
              <p style={{ color: "var(--color-soft)" }}>
                Du bekommst dein VOICE.md plus kompakte Drop-in-Versionen für
                ChatGPT Custom Instructions, Claude Projects und Gemini Gems.
              </p>
            </article>
            <article>
              <p className="label-mono mb-2" style={{ color: "var(--color-coral)" }}>
                03
              </p>
              <h3 className="text-2xl font-semibold mb-3 leading-tight">
                Sichtbarer Vorher/Nachher
              </h3>
              <p style={{ color: "var(--color-soft)" }}>
                Wir zeigen den exakt gleichen Prompt — einmal mit Default-LLM,
                einmal mit deinem Profil. Du siehst sofort, ob&apos;s funktioniert.
              </p>
            </article>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
