// Globales Test-Setup: In-Memory-DB + Test-Secrets, BEVOR irgendein Modul
// die Env liest. Die Lazy-Singletons (db, anthropic) lesen erst bei Nutzung.
process.env.DATABASE_URL = ":memory:";
delete process.env.DATABASE_AUTH_TOKEN;
process.env.EMAIL_HASH_SECRET = "test-secret-not-for-production";
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "test-key";
