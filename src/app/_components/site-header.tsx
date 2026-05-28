import { LangToggle } from "./lang-toggle";
import { t, type Locale } from "@/lib/i18n";

interface Props {
  theme?: "ink" | "cream";
  locale: Locale;
}

const LABS = "https://labs.appsales-consulting.de";

export function SiteHeader({ theme = "ink", locale }: Props) {
  const dark = theme === "cream";
  const d = t(locale);
  const base = locale === "en" ? `${LABS}/en` : LABS;

  return (
    <header className={`nav ${dark ? "nav--dark" : ""}`}>
      <a className="nav__brand" href={base}>
        AppSales <span className="nav__sep">/</span>{" "}
        <span className="nav__labs">Labs</span>
      </a>
      <nav className="nav__links">
        <a href={`${base}/#tools`}>{d.nav.back}</a>
        <LangToggle locale={locale} />
      </nav>
    </header>
  );
}
