import { cookies } from "next/headers";
import { LOCALE_COOKIE, type Locale } from "./i18n";

/** Server-only: aktuelle Locale aus dem site_lang-Cookie (Default de). */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get(LOCALE_COOKIE)?.value === "en" ? "en" : "de";
}
