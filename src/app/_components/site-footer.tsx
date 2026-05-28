import { t, type Locale } from "@/lib/i18n";

const LABS = "https://labs.appsales-consulting.de";

export function SiteFooter({ locale }: { locale: Locale }) {
  const d = t(locale);
  return (
    <footer className="footer">
      <div className="footer__row">
        <p className="footer__brand">
          AppSales <span>Labs</span>
        </p>
        <p className="footer__meta">{d.footer.tagline}</p>
        <p className="footer__meta">
          <a href={`${LABS}/impressum.html`}>Impressum</a>
          {" · "}
          <a href={`${LABS}/datenschutz.html`}>Datenschutz</a>
          {" · "}
          <span>labs.appsales-consulting.de</span>
        </p>
      </div>
    </footer>
  );
}
