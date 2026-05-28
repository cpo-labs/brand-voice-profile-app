import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

type DB = ReturnType<typeof drizzle<typeof schema>>;

// Lazy singleton: der Client (und der DATABASE_URL-Guard) wird erst bei der
// ersten echten Nutzung erzeugt, NICHT beim Modul-Import. Sonst wirft
// `next build` schon beim "collect page data" für dynamische Routen.
let cached: DB | undefined;

function getDb(): DB {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  cached = drizzle(client, { schema });
  return cached;
}

export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
  set(_target, prop, value) {
    (getDb() as unknown as Record<string | symbol, unknown>)[prop] = value;
    return true;
  },
  has(_target, prop) {
    return prop in (getDb() as unknown as object);
  },
});

export { schema };
