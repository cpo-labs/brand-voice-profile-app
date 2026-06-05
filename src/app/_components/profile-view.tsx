import type { VoiceProfile, VoiceScale, VoiceQuote } from "@/lib/voice-extraction";
import { CopyBlock } from "@/app/_components/copy-block";
import { DownloadVoiceButton } from "@/app/_components/download-voice-button";
import { t, type Locale } from "@/lib/i18n";

interface Props {
  profile: VoiceProfile;
  voiceMd: string;
  slug: string;
  locale: Locale;
}

// Lesbares Stimmprofil im Browser: Skalen visuell, Beleg-Zitate, Lexikon,
// Vorher/Nachher. Das vollstaendige Dokument + Drop-ins sind sekundaer.
// Wird vom echten Ergebnis und vom Demo-Pfad geteilt.
export function ProfileView({ profile, voiceMd, slug, locale }: Props) {
  const d = t(locale).result;
  const copy = {
    copyLabel: t(locale).sources.forward.copy,
    copiedLabel: t(locale).sources.forward.copied,
  };

  return (
    <>
      {/* Kern-Identitaet */}
      <section className="wrap pb-10">
        <div className="surface p-6 md:p-9">
          <p className="eyebrow">{d.identityEyebrow}</p>
          <p className="text-xl md:text-2xl leading-snug font-semibold max-w-[46ch]">
            {profile.identity}
          </p>
        </div>
      </section>

      {/* Skalen */}
      <section className="wrap pb-14">
        <p className="eyebrow">{d.scalesEyebrow}</p>
        <h2 className="display-l mb-2 max-w-[22ch]">{d.scalesTitle}</h2>
        <p className="mb-8 max-w-[52ch]" style={{ color: "var(--soft)" }}>{d.scalesIntro}</p>
        <div className="surface p-6 md:p-9">
          <div className="vmeter">
            {profile.scales.map((s) => (
              <ScaleMeter key={s.key} scale={s} />
            ))}
          </div>
        </div>
      </section>

      {/* Beleg-Zitate */}
      <section className="wrap pb-14">
        <p className="eyebrow">{d.quotesEyebrow}</p>
        <h2 className="display-l mb-2 max-w-[22ch]">{d.quotesTitle}</h2>
        <p className="mb-8 max-w-[52ch]" style={{ color: "var(--soft)" }}>{d.quotesIntro}</p>
        <div className="grid md:grid-cols-2 gap-4">
          {profile.quotes.map((q) => (
            <QuoteCard key={q.text} quote={q} fromLabel={d.quoteFrom} />
          ))}
        </div>
      </section>

      {/* Lexikon */}
      <section className="wrap pb-14">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="surface p-6 md:p-8">
            <p className="eyebrow">{d.usesTitle}</p>
            <div className="vchips mt-4">
              {profile.usesPhrases.map((p) => (
                <span key={p} className="vchip vchip--uses">{p}</span>
              ))}
            </div>
          </div>
          <div className="surface p-6 md:p-8">
            <p className="eyebrow">{d.neverTitle}</p>
            <div className="vchips mt-4">
              {profile.neverSays.map((p) => (
                <span key={p} className="vchip vchip--never">{p}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Vorher / Nachher */}
      <section className="wrap pb-16">
        <p className="eyebrow">{d.proofEyebrow}</p>
        <h2 className="display-l mb-8 max-w-[22ch]">{d.proofTitle}</h2>

        <div
          className="rounded-2xl p-5 mb-6 text-sm leading-relaxed"
          style={{ background: "var(--ink-deep)", color: "var(--cream)" }}
        >
          <span className="label-mono mr-2" style={{ color: "rgba(250,247,242,0.5)" }}>{d.promptLabel}</span>
          {profile.proofPrompt}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <ProofCard label={d.proofBefore} tone="muted" body={profile.proofBefore} />
          <ProofCard label={d.proofAfter} tone="accent" body={profile.proofAfter} />
        </div>
      </section>

      {/* So baust du es ein (Drop-in) */}
      <section className="wrap pb-16">
        <p className="eyebrow">{d.howEyebrow}</p>
        <h2 className="display-l mb-3 max-w-[22ch]">{d.howTitle}</h2>
        <p className="mb-8 max-w-[54ch]" style={{ color: "var(--soft)" }}>{d.howIntro}</p>
        <div className="grid md:grid-cols-3 gap-6">
          <CopyBlock tool="ChatGPT" where={d.chatgptWhere} value={profile.dropInChatgpt} {...copy} />
          <CopyBlock tool="Claude" where={d.claudeWhere} value={profile.dropInClaude} {...copy} />
          <CopyBlock tool="Gemini" where={d.geminiWhere} value={profile.dropInGemini} {...copy} />
        </div>
      </section>

      {/* Sicherheit / offene Punkte */}
      <section className="wrap pb-12">
        <div className="surface p-6 md:p-8">
          <p className="eyebrow">{d.confidenceTitle}</p>
          <p className="mt-3 max-w-[60ch]" style={{ color: "var(--soft)" }}>{profile.confidence}</p>
        </div>
      </section>

      {/* Vollstaendiges Profil (sekundaer, einklappbar) */}
      <section className="wrap pb-16">
        <details className="surface p-6 md:p-8">
          <summary className="cursor-pointer flex items-center justify-between gap-4">
            <span>
              <span className="eyebrow">{d.fullEyebrow}</span>
              <span className="block text-lg font-semibold mt-2">{d.fullTitle}</span>
            </span>
          </summary>
          <div className="mt-6 flex flex-wrap gap-3 mb-5">
            <DownloadVoiceButton voiceMd={voiceMd} slug={slug} label={d.download} fileLabel={d.downloadFile} />
          </div>
          <pre
            className="text-sm leading-relaxed whitespace-pre-wrap font-mono p-5 rounded-xl overflow-x-auto"
            style={{ background: "#fff", color: "var(--ink)" }}
          >
            {voiceMd}
          </pre>
        </details>
      </section>
    </>
  );
}

function ScaleMeter({ scale }: { scale: VoiceScale }) {
  // value 1..5 -> Prozent 0..100 fuer Knopf-Position.
  const pct = ((scale.value - 1) / 4) * 100;
  return (
    <div className="vmeter__item">
      <div className="vmeter__head">
        <span className="vmeter__label">{scale.label}</span>
      </div>
      <div className="vmeter__poles">
        <span className="vmeter__pole--lo">{scale.poleLow}</span>
        <span className="vmeter__pole--hi">{scale.poleHigh}</span>
      </div>
      <div className="vmeter__track" role="img" aria-label={`${scale.label}: ${scale.value} von 5, ${scale.poleLow} bis ${scale.poleHigh}`}>
        <span className="vmeter__dots" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="vmeter__dot" />
          ))}
        </span>
        <span className="vmeter__fill" style={{ width: `${pct}%` }} aria-hidden />
        <span className="vmeter__knob" style={{ left: `${pct}%` }} aria-hidden />
      </div>
      <p className="vmeter__ev">{scale.evidence}</p>
    </div>
  );
}

function QuoteCard({ quote, fromLabel }: { quote: VoiceQuote; fromLabel: string }) {
  return (
    <figure className="vquote">
      <blockquote className="vquote__text">&bdquo;{quote.text}&ldquo;</blockquote>
      <figcaption className="vquote__meta">
        <b>{fromLabel}</b> {quote.source} · {quote.shows}
      </figcaption>
    </figure>
  );
}

function ProofCard({ label, body, tone }: { label: string; body: string; tone: "muted" | "accent" }) {
  const isAccent = tone === "accent";
  return (
    <div
      className="rounded-2xl p-6 flex flex-col"
      style={{
        background: isAccent ? "var(--ink)" : "var(--cream-2)",
        color: isAccent ? "var(--cream)" : "var(--ink)",
      }}
    >
      <p className="label-mono mb-3" style={{ color: isAccent ? "var(--accent)" : "var(--soft)" }}>{label}</p>
      <p className="leading-relaxed whitespace-pre-wrap">{body}</p>
    </div>
  );
}
