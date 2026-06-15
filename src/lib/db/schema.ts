import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Brand Voice Profile is a one-shot lead-magnet — no user accounts.
// Die E-Mail ist die fachliche Identitaet, wird aber NIE im Klartext
// persistiert: in der DB steht dauerhaft nur ein HMAC-SHA256-Hash
// (siehe src/lib/email-hash.ts). Der Klartext wird nur transient zum
// Mail-Versand verwendet.

export const profile = sqliteTable("profile", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  // Optional: der Drop-Flow ist eingabefrei. Nur wenn der Nutzer im Upload eine
  // E-Mail fuer den Versand angibt, liegt eine vor — gespeichert wird
  // ausschliesslich ihr Hash.
  emailHash: text("email_hash"),
  // The generated artefacts
  voiceMd: text("voice_md").notNull(),
  // Strukturiertes Profil (Skalen, Beleg-Zitate, Lexikon) als JSON. Nullable
  // fuer Abwaertskompatibilitaet mit aelteren Zeilen ohne Struktur.
  profileJson: text("profile_json"),
  dropInChatgpt: text("drop_in_chatgpt").notNull(),
  dropInClaude: text("drop_in_claude").notNull(),
  dropInGemini: text("drop_in_gemini").notNull(),
  // Side-by-side proof
  proofPrompt: text("proof_prompt").notNull(),
  proofBefore: text("proof_before").notNull(),
  proofAfter: text("proof_after").notNull(),
  // Source meta
  sourceFileCount: integer("source_file_count").notNull(),
  sourceWordCount: integer("source_word_count").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Rate-limit log — one row per generation attempt
export const profileRun = sqliteTable("profile_run", {
  id: text("id").primaryKey(),
  // HMAC-SHA256 der E-Mail (oder null im eingabefreien Drop-Flow). Kein
  // Klartext — Rate-Limit/Dedup laeuft ueber diesen Hash.
  emailHash: text("email_hash"),
  profileId: text("profile_id").references(() => profile.id, {
    onDelete: "set null",
  }),
  monthKey: text("month_key").notNull(), // YYYY-MM
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
