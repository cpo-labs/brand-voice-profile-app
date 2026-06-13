import { SiteHeader } from "@/app/_components/site-header";
import { SiteFooter } from "@/app/_components/site-footer";
import { ForwardGenerateForm } from "@/app/_components/forward-generate-form";
import {
  cleanupExpiredBatches,
  getBatchByToken,
  MIN_SAMPLES_TO_GENERATE,
} from "@/lib/forward-batches";
import { decodeLinkEmail, verifyForwardLink } from "@/lib/forward-links";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

// Ergebnis-Seite des signierten Erstellen-Links aus der Status-Mail. Verifiziert
// Signatur + Hash-Bindung, zeigt die Probenzahl und den Erstellen-Button.
// Index-frei (privater Link) und nie statisch prerendern.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Stimmprofil erstellen · AppSales Labs",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ e?: string; s?: string }>;
}

function Shell({
  locale,
  children,
}: {
  locale: Awaited<ReturnType<typeof getLocale>>;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader theme="ink" locale={locale} />
      <section className="pagehero accent--petrol">
        <div className="pagehero__blob" aria-hidden />
        <div className="pagehero__in">
          <div style={{ maxWidth: "40rem" }}>{children}</div>
        </div>
      </section>
      <SiteFooter locale={locale} />
    </>
  );
}

export default async function ForwardPage({ params, searchParams }: Props) {
  const locale = await getLocale();
  const d = t(locale).forwardPage;
  const { token } = await params;
  const { e, s } = await searchParams;

  // Opportunistischer Retention-Cleanup beim Aufruf.
  await cleanupExpiredBatches();

  const email = decodeLinkEmail(e ?? null);
  const batch = token ? await getBatchByToken(token) : null;

  const valid =
    !!batch &&
    !!email &&
    !!s &&
    verifyForwardLink({ token, email, signature: s, batchEmailHash: batch.emailHash });

  if (!valid || !batch) {
    return (
      <Shell locale={locale}>
        <p className="pagehero__tag">{d.tag}</p>
        <h1 className="pagehero__title">{d.invalidTitle}</h1>
        <p className="pagehero__sub">{d.invalidBody}</p>
        <a href="/" className="pill pill--ghost mt-6">
          {d.back}
        </a>
      </Shell>
    );
  }

  if (batch.sampleCount < MIN_SAMPLES_TO_GENERATE) {
    return (
      <Shell locale={locale}>
        <p className="pagehero__tag">{d.tag}</p>
        <h1 className="pagehero__title">{d.notEnoughTitle}</h1>
        <p className="pagehero__sub">
          {d.notEnough(batch.sampleCount, MIN_SAMPLES_TO_GENERATE)}
        </p>
        <a href="/" className="pill pill--ghost mt-6">
          {d.back}
        </a>
      </Shell>
    );
  }

  return (
    <Shell locale={locale}>
      <p className="pagehero__tag">{d.tag}</p>
      <h1 className="pagehero__title">{d.title}</h1>
      <p className="pagehero__sub">{d.ready(batch.sampleCount)}</p>
      <p className="text-sm mt-2" style={{ color: "var(--soft)" }}>{d.more}</p>
      <div className="mt-8">
        <ForwardGenerateForm locale={locale} token={token} e={e ?? ""} s={s ?? ""} />
      </div>
      <p className="text-xs mt-6" style={{ color: "var(--soft)" }}>{d.note}</p>
    </Shell>
  );
}
