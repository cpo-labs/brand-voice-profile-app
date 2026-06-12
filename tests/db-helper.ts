import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// Legt das Schema in der In-Memory-DB an. Spiegelt src/lib/db/schema.ts —
// bewusst als raw SQL, damit Tests ohne drizzle-kit laufen.
export async function createTables(): Promise<void> {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS profile (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      email_hash TEXT,
      voice_md TEXT NOT NULL,
      profile_json TEXT,
      drop_in_chatgpt TEXT NOT NULL,
      drop_in_claude TEXT NOT NULL,
      drop_in_gemini TEXT NOT NULL,
      proof_prompt TEXT NOT NULL,
      proof_before TEXT NOT NULL,
      proof_after TEXT NOT NULL,
      source_file_count INTEGER NOT NULL,
      source_word_count INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS profile_run (
      id TEXT PRIMARY KEY,
      email_hash TEXT,
      profile_id TEXT REFERENCES profile(id) ON DELETE SET NULL,
      month_key TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS forward_batch (
      id TEXT PRIMARY KEY,
      email_hash TEXT NOT NULL UNIQUE,
      token TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS forward_sample (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL REFERENCES forward_batch(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS gmail_token (
      id TEXT PRIMARY KEY,
      email_hash TEXT NOT NULL UNIQUE,
      refresh_token_enc TEXT NOT NULL,
      scope TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
}

export async function clearTables(): Promise<void> {
  await db.run(sql`DELETE FROM forward_sample`);
  await db.run(sql`DELETE FROM forward_batch`);
  await db.run(sql`DELETE FROM gmail_token`);
  await db.run(sql`DELETE FROM profile_run`);
  await db.run(sql`DELETE FROM profile`);
}
