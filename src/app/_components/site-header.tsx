interface Props {
  theme?: "ink" | "cream";
}

export function SiteHeader({ theme = "ink" }: Props) {
  const isInk = theme === "ink";
  return (
    <header className="nav">
      <a
        className={`nav__brand ${isInk ? "nav__brand--ink" : ""}`}
        href="https://labs.appsales-consulting.de"
      >
        AppSales
        <span className={isInk ? "nav__sep" : "nav__sep nav__sep--dark"}>/</span>
        <span className="nav__labs">Labs</span>
      </a>
      <nav className="flex items-center gap-5 sm:gap-7">
        <a
          className={`nav__link ${isInk ? "" : "nav__link--dark"}`}
          href="https://labs.appsales-consulting.de/#tools"
        >
          Alle Werkzeuge
        </a>
      </nav>
    </header>
  );
}
