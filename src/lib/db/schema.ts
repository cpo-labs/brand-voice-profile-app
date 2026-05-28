import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Brand Voice Profile is a one-shot lead-magnet — no user accounts.
// The email is the primary identity, captured per generated profile.

export const profile = sqliteTable("profile", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  email: text("email").notNull(),
  // The generated artefacts
  voiceMd: text("voice_md").notNull(),
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
  email: text("email").notNull(),
  profileId: text("profile_id").references(() => profile.id, {
    onDelete: "set null",
  }),
  monthKey: text("month_key").notNull(), // YYYY-MM
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
