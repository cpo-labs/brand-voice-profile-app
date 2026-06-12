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
  // Optional: der Drop-Flow ist eingabefrei. Nur beim Forward-/Gmail-Pfad
  // liegt eine E-Mail vor — gespeichert wird ausschliesslich ihr Hash.
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

// ── Forward-Sammel-Logik ────────────────────────────────────────────────────
// Weitergeleitete Mails werden pro Absender (Hash) gesammelt, bis genug
// Material fuer ein Profil da ist. Inhalte sind transient: Loeschung nach
// Profil-Erstellung, spaetestens nach 14 Tagen (Cleanup-Lauf im Inbound).
// Der Klartext der E-Mail wird auch hier NICHT persistiert — der
// Erstellen-Link traegt die Adresse signiert in der URL (forward-links.ts).
export const forwardBatch = sqliteTable("forward_batch", {
  id: text("id").primaryKey(),
  emailHash: text("email_hash").notNull().unique(),
  // Capability-Token fuer den Erstellen-Link aus der Status-Mail.
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const forwardSample = sqliteTable("forward_sample", {
  id: text("id").primaryKey(),
  batchId: text("batch_id")
    .notNull()
    .references(() => forwardBatch.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  // Gestrippter Mail-Text (forward-stripping.ts) — transient, s.o.
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ── Gmail-OAuth (Skeleton, hinter GMAIL_OAUTH_ENABLED) ─────────────────────
// Refresh-Token verschluesselt (AES-256-GCM, gmail-crypto.ts) — nie Klartext.
export const gmailToken = sqliteTable("gmail_token", {
  id: text("id").primaryKey(),
  emailHash: text("email_hash").notNull().unique(),
  refreshTokenEnc: text("refresh_token_enc").notNull(),
  scope: text("scope").notNull(),
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
