import { SiteHeader } from "@/app/_components/site-header";
import { SiteFooter } from "@/app/_components/site-footer";
import { ProfileView } from "@/app/_components/profile-view";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { getDemoProfile } from "@/lib/demo-profile";

// "So sieht ein Profil aus" — Demo VOR jedem Upload, ohne Eingabe, ohne DB.
export async function generateMetadata() {
  return {
    title: "Beispiel-Stimmprofil · AppSales Labs",
    robots: { index: false, follow: false },
  };
}

export default async function DemoProfilePage() {
  const locale = await getLocale();
  const d = t(locale).result;
  const demo = getDemoProfile();

  return (
    <>
      <SiteHeader theme="cream" locale={locale} />

      <header className="wrap pt-32 pb-8">
        <p className="eyebrow">{d.demoTag}</p>
        <h1 className="display-l mb-3 max-w-[22ch]">{d.demoTitle(demo.author)}</h1>
        <p className="text-base max-w-[52ch]" style={{ color: "var(--soft)" }}>
          {d.demoIntro}
        </p>
      </header>

      <ProfileView profile={demo.profile} voiceMd={demo.voiceMd} slug={demo.slug} locale={locale} />

      {/* Zurueck zum eigenen Profil */}
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
            <p className="label-mono mb-3" style={{ color: "var(--accent)" }}>{d.demoBackEyebrow}</p>
            <h2 className="display-l mb-4 max-w-[24ch]">{d.demoBackTitle}</h2>
            <p className="text-lg mb-6 max-w-[44ch]" style={{ color: "rgba(250,247,242,0.78)" }}>{d.demoBackText}</p>
            <a href="/#sources" className="pill pill--accent pill--arrow">
              {d.demoBackButton}
            </a>
          </div>
        </div>
      </section>

      <SiteFooter locale={locale} />
    </>
  );
}
