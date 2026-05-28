export function SiteFooter() {
  return (
    <footer
      className="gut py-12 mt-12 border-t"
      style={{ borderColor: "rgba(24,20,16,0.1)" }}
    >
      <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-4">
        <p className="font-bold tracking-tight">
          AppSales{" "}
          <span style={{ color: "var(--color-coral)" }}>Labs</span>
        </p>
        <p
          className="label-mono"
          style={{ color: "var(--color-soft)" }}
        >
          <a
            href="https://labs.appsales-consulting.de/impressum.html"
            className="hover:text-[var(--color-coral)]"
          >
            Impressum
          </a>
          {" · "}
          <a
            href="https://labs.appsales-consulting.de/datenschutz.html"
            className="hover:text-[var(--color-coral)]"
          >
            Datenschutz
          </a>
          {" · "}
          <span>labs.appsales-consulting.de</span>
        </p>
      </div>
    </footer>
  );
}
