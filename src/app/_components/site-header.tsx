interface Props {
  theme?: "ink" | "cream";
}

export function SiteHeader({ theme = "cream" }: Props) {
  const isInk = theme === "ink";
  return (
    <header
      className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between gut py-6"
      style={{
        color: isInk ? "var(--color-cream)" : "var(--color-ink)",
      }}
    >
      <a
        href="https://labs.appsales-consulting.de"
        className="flex items-center gap-2 font-bold text-lg tracking-tight"
      >
        <span>AppSales</span>
        <span
          style={{
            color: isInk
              ? "rgba(250,247,242,0.38)"
              : "rgba(24,20,16,0.38)",
            fontWeight: 300,
            fontSize: "1.4rem",
          }}
        >
          /
        </span>
        <span style={{ color: "var(--color-coral)" }}>Labs</span>
      </a>
      <nav className="flex items-center gap-6">
        <a
          href="https://labs.appsales-consulting.de"
          className="label-mono hover:text-[var(--color-coral)]"
          style={{
            color: isInk ? "rgba(250,247,242,0.72)" : "var(--color-soft)",
          }}
        >
          ← Alle Werkzeuge
        </a>
      </nav>
    </header>
  );
}
