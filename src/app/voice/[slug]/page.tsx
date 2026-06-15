import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profile } from "@/lib/db/schema";
import { SiteHeader } from "@/app/_components/site-header";
import { SiteFooter } from "@/app/_components/site-footer";
import { ProfileView } from "@/app/_components/profile-view";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { loadProfileFromRow } from "@/lib/load-profile";

// Per-Request-DB-Lookup nach Slug — nie statisch prerendern.
export const dynamic = "force-dynamic";

const CONTACT_EMAIL = process.env.CONTACT_EMAIL ?? "info@appsales-consulting.de";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return {
    title: `Stimmprofil · ${slug} · AppSales Labs`,
    robots: { index: false, follow: false },
  };
}

export default async function VoiceProfilePage({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const d = t(locale).result;

  const rows = await db.select().from(profile).where(eq(profile.slug, slug)).limit(1);
  const p = rows[0];
  if (!p) notFound();

  const parsed = loadProfileFromRow(p);

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

      <header className="wrap pt-32 pb-8">
        <p className="eyebrow">{d.tag}</p>
        <h1 className="display-l mb-4 max-w-[20ch]">{d.title}</h1>
        <p className="text-base" style={{ color: "var(--soft)" }}>
          {d.metaFrom(p.sourceFileCount, wordsStr, dateStr)}
        </p>
      </header>

      <ProfileView profile={parsed} voiceMd={p.voiceMd} slug={p.slug} locale={locale} />

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
              href={`mailto:${CONTACT_EMAIL}?subject=Stimmprofil%20-%20Anfrage`}
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
