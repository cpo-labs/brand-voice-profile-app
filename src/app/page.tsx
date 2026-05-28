import { GenerateForm } from "./_components/generate-form";
import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";

export default function HomePage() {
  return (
    <>
      <SiteHeader theme="ink" />

      <section className="relative bg-[var(--color-ink-deep)] text-[var(--color-cream)] overflow-hidden isolate">
        {/* dotted grid */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(250,247,242,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(250,247,242,0.05) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage:
              "radial-gradient(120% 100% at 50% 42%, #000 22%, transparent 82%)",
            WebkitMaskImage:
              "radial-gradient(120% 100% at 50% 42%, #000 22%, transparent 82%)",
          }}
        />
        {/* coral blob */}
        <div
          aria-hidden
          className="absolute -top-32 -right-32 w-[40vmax] h-[40vmax] z-0 pointer-events-none"
          style={{
            background: "var(--color-coral)",
            opacity: 0.16,
            filter: "blur(60px)",
            borderRadius: "46% 54% 62% 38% / 52% 44% 56% 48%",
          }}
        />

        <div className="relative z-10 gut pt-32 pb-24 md:pt-44 md:pb-32 max-w-[1400px] mx-auto">
          <p className="label-mono mb-6 text-[var(--color-coral)]">
            Werkzeug · AppSales Labs
          </p>
          <h1 className="display-xl mb-8 max-w-[18ch]">
            Damit KI nicht mehr <em className="italic font-light not-italic" style={{ color: "var(--color-coral)" }}>dich</em> verwässert.
          </h1>
          <p
            className="text-lg md:text-xl max-w-[42ch] mb-12"
            style={{ color: "rgba(250,247,242,0.78)", lineHeight: 1.55 }}
          >
            Lade drei bis zwanzig deiner eigenen Texte hoch. Bekomme ein
            VOICE.md, das du in ChatGPT, Claude oder Gemini wirfst — und
            das LLM schreibt wie du.
          </p>

          <div className="surface text-[var(--color-ink)] p-6 md:p-10 max-w-[640px]">
            <GenerateForm />
          </div>

          <p className="label-mono mt-8" style={{ color: "rgba(250,247,242,0.55)" }}>
            1 Profil pro E-Mail · kostenlos · ~30 Sekunden Generation
          </p>
        </div>
      </section>

      <section
        className="gut py-24 md:py-32 max-w-[1400px] mx-auto"
        id="how"
      >
        <p className="label-mono mb-4">Warum das funktioniert</p>
        <h2 className="display-l mb-12 max-w-[20ch]">
          Generische Prompts erzeugen generische Antworten.
        </h2>
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          <Card
            num="01"
            head="Echte Quellen, nicht Adjektive"
            body={`„Professionell und sympathisch“ sagt nichts. Die echten Marker stecken in Satzbau, Wortwahl und dem, was du NIE schreiben würdest.`}
          />
          <Card
            num="02"
            head="Drop-in für jedes LLM"
            body="Du bekommst dein VOICE.md plus kompakte Drop-in-Versionen für ChatGPT Custom Instructions, Claude Projects und Gemini Gems."
          />
          <Card
            num="03"
            head="Sichtbarer Vorher/Nachher"
            body="Wir zeigen den exakt gleichen Prompt — einmal mit Default-LLM, einmal mit deinem Profil. Du siehst sofort, ob's funktioniert."
          />
        </div>
      </section>

      <SiteFooter />
    </>
  );
}

function Card({ num, head, body }: { num: string; head: string; body: string }) {
  return (
    <div>
      <p
        className="label-mono mb-3"
        style={{ color: "var(--color-coral)" }}
      >
        {num}
      </p>
      <h3 className="text-2xl font-semibold mb-3 leading-tight">{head}</h3>
      <p style={{ color: "var(--color-soft)" }}>{body}</p>
    </div>
  );
}
