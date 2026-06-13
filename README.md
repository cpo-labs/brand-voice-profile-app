# Brand Voice Profile

Lade deine eigenen Texte hoch, bekomme ein `VOICE.md`, das jedem LLM hilft, in
deiner Stimme zu schreiben. Drop-in für ChatGPT, Claude und Gemini. Kostenloses
Lead-Magnet-Tool von [AppSales Labs](https://labs.appsales-consulting.de).

**Hosted Version:** [voice.labs.appsales-consulting.de](https://voice.labs.appsales-consulting.de)

## Was es macht

1. Du wirfst 3–20 deiner Texte rein (TXT, MD, PDF, DOCX)
2. Claude analysiert sie und destilliert deine echten Voice-Marker
3. Du bekommst:
   - **VOICE.md** zum Download
   - **3 Drop-in-Versionen** für ChatGPT Custom Instructions, Claude Projects, Gemini Gems
   - **Side-by-side-Proof**: gleicher Prompt, einmal mit Default-LLM, einmal mit deinem Profil
4. Permalink zum späteren Wiederaufrufen kommt per E-Mail

Ein Profil pro E-Mail. Global gedeckelt auf 100/Monat. Beide Limits führen zum
Kontakt-CTA — das ist die Lead-Mechanik.

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack)
- **TypeScript 5**, **React 19**, **Tailwind 4**
- **Drizzle ORM** + **Turso (libsql)** für Persistenz
- **Anthropic Claude Sonnet 4.5** für Voice-Extraction (90 s Server-Timeout)
- **Resend** für Permalink-Versand (optional in dev)
- **mammoth** + **pdf-parse** für File-Extraction
- **zod** für Validation

## Drei Wege rein

1. **Drop & Generate** — Dateien direkt hochladen (eingabefrei, kein Account).
2. **Forward** — eigene Mails an eine Sammeladresse weiterleiten. Pro Absender
   werden die Proben gesammelt; ab 3 Proben kommt per Status-Mail ein signierter
   Erstellen-Link (`/forward/[token]`). Forwarded-Header, Zitate und Signaturen
   werden gestrippt. Proben sind transient: Löschung nach Erstellung, spätestens
   nach 14 Tagen.
3. **Gmail** — Read-only-Skeleton hinter `GMAIL_OAUTH_ENABLED` (Default aus,
   kein OAuth-Flow erreichbar). Refresh-Token wird AES-256-GCM verschlüsselt.

## Datenschutz

E-Mails werden **nie im Klartext** persistiert — in der DB steht nur ein
HMAC-SHA256-Hash (`EMAIL_HASH_SECRET`), genutzt für Rate-Limit und Dedup. Der
Klartext lebt transient für den Mail-Versand. Der Forward-Erstellen-Link trägt
die Adresse signiert in der URL statt sie zu speichern. Keine Weitergabe, kein
Newsletter. Die hochgeladenen Texte selbst werden nicht persistiert — nur das
daraus generierte Voice-Profil.

## Tests & Eval

- **vitest** (`npm test`): rate-limit, text-extraction, voice-extraction,
  voice-md (Pflicht-Sektionen), forward-stripping, forward-batches,
  forward-links, gmail-crypto.
- **Blind-Eval** (`node scripts/eval/run-eval.mjs`): Hold-out-Verfahren, ein
  LLM-Judge vergleicht profil-gestützten Text vs. generisch gegen das Original.
  Schwelle 4/5. Fixtures liegen **außerhalb des Repos**
  (`BVP_EVAL_FIXTURES_DIR`, Default `~/.bvp-eval-fixtures`,
  Struktur `<dir>/<persona>/NN.txt`) — nie committen.

## Bekannte Limits

- **Rate-Limit-Race:** zwischen `checkLimit` und `recordRun` liegt ein
  Single-Roundtrip-Window. Bei strikt parallelen Requests mit gleicher E-Mail
  können beide den Limit-Check passieren. Für Lead-Magnet-Volumen unkritisch.
- **Failed-Run zählt gegen Limit:** wenn Anthropic während der Generation
  scheitert (Timeout, Parse-Error), bleibt der `profile_run`-Eintrag bestehen
  und der User hat seinen Slot verbraucht, ohne ein Profil zu bekommen. Der
  Support-Pfad ist manuell — User schreibt an `CONTACT_EMAIL`, Slot wird per
  DB-Eintrag-Löschung freigeschaltet.
- **File-Validation per Extension** (kein MIME-Check, kein ZIP-Bomb-Schutz).
  Akzeptabel für vertrauensbasierten Lead-Magnet-Flow, nicht für Public-Open-Upload.
- **bodySizeLimit** der Server Action steht auf 10 MB (siehe `next.config.ts`).
  Bei Überschreitung sieht der User einen unstrukturierten 413-Fehler, kein
  deutsches Feedback.

## Local Setup

```bash
git clone https://github.com/cpo-labs/brand-voice-profile-app.git
cd brand-voice-profile-app
npm install
cp .env.example .env.local
# Fülle .env.local aus:
#   ANTHROPIC_API_KEY (Pflicht)
#   RESEND_API_KEY    (optional, sonst nur Console-Log)
# Andere bleiben default.

mkdir -p data
npm run db:push    # initialisiert SQLite
npm run dev        # http://localhost:3000
```

### Wichtige ENV-Variablen

| Variable                       | Pflicht | Was                                                                |
| ------------------------------ | ------- | ------------------------------------------------------------------ |
| `ANTHROPIC_API_KEY`            | ja      | Anthropic Server-Key, für Voice-Extraction                         |
| `DATABASE_URL`                 | ja      | `file:./data/dev.db` lokal, `libsql://...` für Turso in Production |
| `DATABASE_AUTH_TOKEN`          | nur Turso | Auth-Token für Hosted-Turso                                      |
| `RESEND_API_KEY`               | nein    | Wenn gesetzt, schickt Permalink per Mail. Sonst Console-Log.       |
| `RESEND_FROM`                  | nein    | Absender-Adresse (Default: `info@appsales-consulting.de`)    |
| `PUBLIC_BASE_URL`              | nein    | URL für Permalinks in E-Mails (Default: `http://localhost:3000`)   |
| `PROFILE_LIMIT_PER_EMAIL`      | nein    | Default `1`                                                        |
| `PROFILE_LIMIT_GLOBAL_MONTHLY` | nein    | Default `100`                                                      |
| `EMAIL_HASH_SECRET`            | ja      | HMAC-Key für E-Mail-Hash + signierte Forward-Links                 |
| `POLLER_SHARED_SECRET`         | nur Forward | Shared Secret, das der IMAP-Poller in `x-poller-secret` sendet  |
| `CONTACT_EMAIL`                | nein    | Kontakt-/Fallback-Adresse                                          |
| `GMAIL_OAUTH_ENABLED`          | nein    | Default aus. Nur `true` + Google-Credentials schaltet OAuth scharf |
| `GOOGLE_CLIENT_ID` / `_SECRET` | nur Gmail | Google-OAuth-Credentials (Phase 2)                               |
| `GMAIL_TOKEN_KEY`              | nur Gmail | 32-Byte-Key (base64) für AES-256-GCM der Refresh-Tokens          |
| `BVP_EVAL_FIXTURES_DIR`        | nur Eval | Pfad zu den Eval-Fixtures außerhalb des Repos                    |

## Projekt-Struktur

```
src/
├── app/
│   ├── _components/           Header, Footer, GenerateForm, CopyBlock, …
│   ├── actions/generate.ts    Server Action: Files → Anthropic → DB → Permalink
│   ├── voice/[slug]/page.tsx  Permalink-Ergebnis-Seite
│   ├── page.tsx               Landing
│   ├── layout.tsx
│   └── globals.css            Tailwind 4 + Brand-Tokens
└── lib/
    ├── anthropic.ts           Anthropic-Client
    ├── voice-extraction.ts    Prompt + JSON-Parsing
    ├── text-extraction.ts     TXT/MD/PDF/DOCX → string
    ├── rate-limit.ts          per-email + global monthly cap
    ├── email.ts               Permalink-Mail via Resend (oder Console)
    ├── slug.ts                URL-safe Short-Slug
    └── db/
        ├── schema.ts          Drizzle: profile + profile_run
        ├── drizzle.config.ts
        └── index.ts
```

## Limits & Kosten

- Pro Profil-Generation: ca. 30–80 Cent API-Kosten (Sonnet 4.5)
- Global gedeckelt auf 100/Monat → max. ~€80 Burn/Monat
- Bei Hit gegen Limit: User wird auf Kontakt-CTA (`c.poral@elunic.com`) geleitet

## Deploy

```bash
# Vercel
vercel link
vercel env add ANTHROPIC_API_KEY production
vercel env add DATABASE_URL production       # libsql://... von Turso
vercel env add DATABASE_AUTH_TOKEN production
vercel env add RESEND_API_KEY production
vercel env add PUBLIC_BASE_URL production    # https://voice.labs.appsales-consulting.de
vercel deploy --prod

# Custom Domain via DNS → CNAME auf Vercel
```

## License

MIT — siehe [LICENSE](./LICENSE).

## Author

Christian Poral — AppSales Consulting / [Labs](https://labs.appsales-consulting.de).
