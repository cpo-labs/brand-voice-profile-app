import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brand Voice Profile · AppSales Labs",
  description:
    "Lade deine Texte hoch, bekomme ein VOICE.md, das jedem LLM hilft, in deiner Stimme zu schreiben. Kostenloses Tool von AppSales Labs.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Brand Voice Profile · AppSales Labs",
    description:
      "Ein Profil aus deinen Texten, damit KI dich nicht mehr verwässert.",
    siteName: "AppSales Labs",
    locale: "de_DE",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Montserrat:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
