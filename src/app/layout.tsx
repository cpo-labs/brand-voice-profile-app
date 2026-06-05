import type { Metadata } from "next";
import "../styles/labs-kit.css";
import "../styles/labs-viz.css";
import "./globals.css";
import { getLocale } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const de = locale === "de";
  return {
    title: "Brand Voice Profile",
    description: de
      ? "Gib uns ein paar echte Texte und bekomme ein Stimmprofil, das jeder KI hilft, in deiner Stimme zu schreiben. Kostenloses Werkzeug von AppSales Labs."
      : "Give us a few real texts and get a voice profile that helps any AI write in your voice. Free tool by AppSales Labs.",
    metadataBase: new URL("https://voice.labs.appsales-consulting.de"),
    robots: { index: true, follow: true },
    openGraph: {
      title: "Brand Voice Profile",
      description: de
        ? "Ein Profil aus deinen Texten, damit KI dich nicht mehr verwässert."
        : "A profile from your texts, so AI stops watering you down.",
      siteName: "AppSales Labs",
      locale: de ? "de_DE" : "en_US",
      type: "website",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Montserrat:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
