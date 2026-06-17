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
    CREATE TABLE IF NOT EXISTS job (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      email_hash TEXT,
      email TEXT,
      source_text TEXT,
      source_file_count INTEGER NOT NULL,
      source_word_count INTEGER NOT NULL,
      locale TEXT NOT NULL DEFAULT 'de',
      run_id TEXT,
      profile_id TEXT REFERENCES profile(id) ON DELETE SET NULL,
      error TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      locked_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
}

export async function clearTables(): Promise<void> {
  await db.run(sql`DELETE FROM job`);
  await db.run(sql`DELETE FROM profile_run`);
  await db.run(sql`DELETE FROM profile`);
}
