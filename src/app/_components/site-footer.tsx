export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer__row">
        <p className="footer__brand">
          AppSales <span>Labs</span>
        </p>
        <p className="footer__meta">
          <a href="https://labs.appsales-consulting.de/impressum.html">
            Impressum
          </a>
          {" · "}
          <a href="https://labs.appsales-consulting.de/datenschutz.html">
            Datenschutz
          </a>
          {" · "}
          <span>labs.appsales-consulting.de</span>
        </p>
      </div>
    </footer>
  );
}
