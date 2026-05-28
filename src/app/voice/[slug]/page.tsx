import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profile } from "@/lib/db/schema";
import { SiteHeader } from "@/app/_components/site-header";
import { SiteFooter } from "@/app/_components/site-footer";
import { CopyBlock } from "@/app/_components/copy-block";
import { DownloadVoiceButton } from "@/app/_components/download-voice-button";

const CONTACT_EMAIL =
  process.env.CONTACT_EMAIL ?? "hello@appsales-consulting.de";

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
  const rows = await db
    .select()
    .from(profile)
    .where(eq(profile.slug, slug))
    .limit(1);
  const p = rows[0];
  if (!p) notFound();

  const created = new Date(p.createdAt as unknown as number);

  return (
    <>
      <SiteHeader theme="cream" />

      <header className="gut pt-32 pb-12 max-w-[1100px] mx-auto">
        <p className="label-mono mb-4">Dein Voice Profile</p>
        <h1 className="display-l mb-4 max-w-[18ch]">
          Fertig. Jedes LLM kann jetzt wie du schreiben.
        </h1>
        <p
          className="text-base"
          style={{ color: "var(--color-soft)" }}
        >
          Aus {p.sourceFileCount} Datei{p.sourceFileCount === 1 ? "" : "en"}{" "}
          mit {p.sourceWordCount.toLocaleString("de-DE")} Wörtern ·{" "}
          generiert am{" "}
          {created.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
      </header>

      {/* Proof — sichtbarer Vorher/Nachher */}
      <section className="gut pb-16 max-w-[1100px] mx-auto">
        <p className="label-mono mb-3" style={{ color: "var(--color-coral)" }}>
          Beweis
        </p>
        <h2 className="display-l mb-8 max-w-[22ch]">
          Gleicher Prompt, anderes Ergebnis.
        </h2>

        <div
          className="rounded-2xl p-5 mb-6 font-mono text-sm leading-relaxed"
          style={{
            background: "var(--color-ink-deep)",
            color: "var(--color-cream)",
          }}
        >
          <span
            className="label-mono mr-2"
            style={{ color: "rgba(250,247,242,0.5)" }}
          >
            Prompt
          </span>
          {p.proofPrompt}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <ProofCard
            label="Generischer LLM-Output"
            tone="muted"
            body={p.proofBefore}
          />
          <ProofCard
            label="Mit deinem Voice Profile"
            tone="coral"
            body={p.proofAfter}
          />
        </div>
      </section>

      {/* VOICE.md */}
      <section className="gut pb-16 max-w-[1100px] mx-auto">
        <div className="surface p-6 md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <p className="label-mono mb-2">Vollständiges Profil</p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                VOICE.md
              </h2>
            </div>
            <DownloadVoiceButton voiceMd={p.voiceMd} slug={p.slug} />
          </div>
          <pre
            className="text-sm leading-relaxed whitespace-pre-wrap font-mono p-5 rounded-xl overflow-x-auto"
            style={{ background: "#fff", color: "var(--color-ink)" }}
          >
            {p.voiceMd}
          </pre>
        </div>
      </section>

      {/* Drop-in cards */}
      <section className="gut pb-20 max-w-[1100px] mx-auto">
        <p className="label-mono mb-3">Drop-in für dein LLM</p>
        <h2 className="display-l mb-8 max-w-[22ch]">
          Kompakt-Versionen, sofort einsetzbar.
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <CopyBlock
            tool="ChatGPT"
            where="Custom Instructions → How would you like ChatGPT to respond?"
            value={p.dropInChatgpt}
          />
          <CopyBlock
            tool="Claude"
            where="Project → Project Knowledge → Set custom instructions"
            value={p.dropInClaude}
          />
          <CopyBlock
            tool="Gemini"
            where="Gem manager → System instructions"
            value={p.dropInGemini}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="gut py-20 max-w-[1100px] mx-auto">
        <div
          className="surface--ink p-8 md:p-12 relative overflow-hidden"
        >
          <div
            aria-hidden
            className="absolute -top-20 -right-10 w-[28vmax] h-[28vmax] z-0 pointer-events-none"
            style={{
              background: "var(--color-coral)",
              opacity: 0.18,
              filter: "blur(48px)",
              borderRadius: "46% 54% 62% 38% / 52% 44% 56% 48%",
            }}
          />
          <div className="relative z-10">
            <p
              className="label-mono mb-3"
              style={{ color: "var(--color-coral)" }}
            >
              Du willst mehr?
            </p>
            <h2 className="display-l mb-4 max-w-[22ch]">
              Du brauchst sowas für dein Team oder eine andere Person?
            </h2>
            <p
              className="text-lg mb-6 max-w-[42ch]"
              style={{ color: "rgba(250,247,242,0.78)" }}
            >
              Ein Profil pro E-Mail ist die Demo. Wenn du mehrere Profile, eine
              Team-Variante oder Integration in deinen Workflow brauchst,
              schreib uns kurz.
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=Brand%20Voice%20Profile%20-%20Anfrage`}
              className="pill pill--light pill--arrow"
            >
              Schreib uns
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}

function ProofCard({
  label,
  body,
  tone,
}: {
  label: string;
  body: string;
  tone: "muted" | "coral";
}) {
  const isCoral = tone === "coral";
  return (
    <div
      className="rounded-2xl p-6 flex flex-col"
      style={{
        background: isCoral ? "var(--color-ink)" : "var(--color-cream-2)",
        color: isCoral ? "var(--color-cream)" : "var(--color-ink)",
      }}
    >
      <p
        className="label-mono mb-3"
        style={{
          color: isCoral
            ? "var(--color-coral)"
            : "var(--color-soft)",
        }}
      >
        {label}
      </p>
      <p className="leading-relaxed whitespace-pre-wrap">{body}</p>
    </div>
  );
}
