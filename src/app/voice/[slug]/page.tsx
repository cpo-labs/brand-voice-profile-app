import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profile } from "@/lib/db/schema";
import { SiteHeader } from "@/app/_components/site-header";
import { SiteFooter } from "@/app/_components/site-footer";
import { CopyBlock } from "@/app/_components/copy-block";
import { DownloadVoiceButton } from "@/app/_components/download-voice-button";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

// Per-Request-DB-Lookup nach Slug — nie statisch prerendern.
export const dynamic = "force-dynamic";

const CONTACT_EMAIL = process.env.CONTACT_EMAIL ?? "hello@appsales-consulting.de";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return {
    title: `Voice Profile · ${slug} · AppSales Labs`,
    robots: { index: false, follow: false },
  };
}

export default async function VoiceProfilePage({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const d = t(locale).result;
  const copy = { copyLabel: t(locale).sources.forward.copy, copiedLabel: t(locale).sources.forward.copied };

  const rows = await db.select().from(profile).where(eq(profile.slug, slug)).limit(1);
  const p = rows[0];
  if (!p) notFound();

  // Drizzle `mode: "timestamp"` liefert bereits ein Date.
  const created = p.createdAt as Date;
  const dateStr = created.toLocaleDateString(locale === "de" ? "de-DE" : "en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const wordsStr = p.sourceWordCount.toLocaleString(locale === "de" ? "de-DE" : "en-US");

  return (
    <>
      <SiteHeader theme="cream" locale={locale} />

      <header className="wrap pt-32 pb-10">
        <p className="eyebrow">{d.tag}</p>
        <h1 className="display-l mb-4 max-w-[20ch]">{d.title}</h1>
        <p className="text-base" style={{ color: "var(--soft)" }}>
          {d.metaFrom(p.sourceFileCount, wordsStr, dateStr)}
        </p>
      </header>

      {/* HELD: VOICE.md + Download + so benutzt du es */}
      <section className="wrap pb-12">
        <div className="surface p-6 md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <p className="hfile hfile--dark">VOICE.md</p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{d.voiceLabel}</h2>
            </div>
            <DownloadVoiceButton voiceMd={p.voiceMd} slug={p.slug} label={d.download} />
          </div>
          <pre
            className="text-sm leading-relaxed whitespace-pre-wrap font-mono p-5 rounded-xl overflow-x-auto"
            style={{ background: "#fff", color: "var(--ink)" }}
          >
            {p.voiceMd}
          </pre>
        </div>
      </section>

      {/* Drop-in: so benutzt du es */}
      <section className="wrap pb-16">
        <p className="eyebrow">{d.howEyebrow}</p>
        <h2 className="display-l mb-3 max-w-[22ch]">{d.howTitle}</h2>
        <p className="mb-8 max-w-[54ch]" style={{ color: "var(--soft)" }}>{d.howIntro}</p>
        <div className="grid md:grid-cols-3 gap-6">
          <CopyBlock tool="ChatGPT" where={d.chatgptWhere} value={p.dropInChatgpt} {...copy} />
          <CopyBlock tool="Claude" where={d.claudeWhere} value={p.dropInClaude} {...copy} />
          <CopyBlock tool="Gemini" where={d.geminiWhere} value={p.dropInGemini} {...copy} />
        </div>
      </section>

      {/* Beweis — sichtbarer Vorher/Nachher */}
      <section className="wrap pb-16">
        <p className="eyebrow">{d.proofEyebrow}</p>
        <h2 className="display-l mb-8 max-w-[22ch]">{d.proofTitle}</h2>

        <div
          className="rounded-2xl p-5 mb-6 font-mono text-sm leading-relaxed"
          style={{ background: "var(--ink-deep)", color: "var(--cream)" }}
        >
          <span className="label-mono mr-2" style={{ color: "rgba(250,247,242,0.5)" }}>{d.promptLabel}</span>
          {p.proofPrompt}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <ProofCard label={d.proofBefore} tone="muted" body={p.proofBefore} />
          <ProofCard label={d.proofAfter} tone="accent" body={p.proofAfter} />
        </div>
      </section>

      {/* CTA */}
      <section className="wrap py-16">
        <div className="surface--ink p-8 md:p-12 relative overflow-hidden">
          <div
            aria-hidden
            className="absolute -top-20 -right-10 w-[28vmax] h-[28vmax] z-0 pointer-events-none"
            style={{
              background: "var(--accent)",
              opacity: 0.2,
              filter: "blur(48px)",
              borderRadius: "46% 54% 62% 38% / 52% 44% 56% 48%",
            }}
          />
          <div className="relative z-10">
            <p className="label-mono mb-3" style={{ color: "var(--accent)" }}>{d.ctaEyebrow}</p>
            <h2 className="display-l mb-4 max-w-[24ch]">{d.ctaTitle}</h2>
            <p className="text-lg mb-6 max-w-[44ch]" style={{ color: "rgba(250,247,242,0.78)" }}>{d.ctaText}</p>
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=Brand%20Voice%20Profile%20-%20Anfrage`}
              className="pill pill--accent pill--arrow"
            >
              {d.ctaButton}
            </a>
          </div>
        </div>
      </section>

      <SiteFooter locale={locale} />
    </>
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
