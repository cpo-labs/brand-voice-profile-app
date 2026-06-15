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
4. Optional: gibst du im Upload eine E-Mail an, kommt das fertige `VOICE.md`
   zusätzlich als Datei-Anhang plus Permalink per Mail. Ohne E-Mail bleibt der
   Flow komplett eingabefrei.

Ein Profil pro E-Mail. Global gedeckelt auf 100/Monat. Beide Limits führen zum
Kontakt-CTA — das ist die Lead-Mechanik.

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack)
- **TypeScript 5**, **React 19**, **Tailwind 4**
- **Drizzle ORM** + **Turso (libsql)** für Persistenz
- **Anthropic Claude Sonnet 4.5** für Voice-Extraction (90 s Server-Timeout)
- **Resend** für die optionale Profil-Mail mit VOICE.md-Anhang (optional in dev)
- **mammoth** + **pdf-parse** für File-Extraction
- **zod** für Validation

## Weg rein

**Drop & Generate** — Texte direkt hochladen (TXT, MD, PDF, DOCX), eingabefrei,
kein Account. Wer keine Datei zur Hand hat, findet auf der Landing eine kurze
Anleitung, wie man gesendete Mails aus Outlook, Gmail oder Apple Mail als Datei
exportiert. TXT/MD-Dateien werden encoding-robust gelesen (UTF-8 mit BOM und
Windows-1252-Fallback), damit Umlaute auch aus Windows-Exporten korrekt
ankommen.

## Datenschutz

E-Mails werden **nie im Klartext** persistiert — in der DB steht nur ein
HMAC-SHA256-Hash (`EMAIL_HASH_SECRET`), genutzt für Rate-Limit und Dedup. Der
Klartext lebt transient für den optionalen Mail-Versand. Keine Weitergabe, kein
Newsletter. Die hochgeladenen Texte selbst werden nicht persistiert — nur das
daraus generierte Voice-Profil.

## Tests & Eval

- **vitest** (`npm test`): rate-limit, text-extraction (inkl.
  Umlaut-/Encoding-Regression), voice-extraction, voice-md (Pflicht-Sektionen),
  email-Anhang.
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
| `RESEND_API_KEY`               | nein    | Wenn gesetzt + E-Mail angegeben: Profil-Mail mit Anhang. Sonst Console-Log. |
| `RESEND_FROM`                  | nein    | Absender-Adresse (Default: `info@appsales-consulting.de`)    |
| `PUBLIC_BASE_URL`              | nein    | URL für Permalinks in E-Mails (Default: `http://localhost:3000`)   |
| `PROFILE_LIMIT_PER_EMAIL`      | nein    | Default `1`                                                        |
| `PROFILE_LIMIT_GLOBAL_MONTHLY` | nein    | Default `100`                                                      |
| `EMAIL_HASH_SECRET`            | ja      | HMAC-Key für den E-Mail-Hash (Rate-Limit/Dedup)                    |
| `CONTACT_EMAIL`                | nein    | Kontakt-/Fallback-Adresse                                          |
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
    ├── email.ts               Profil-Mail mit VOICE.md-Anhang via Resend (oder Console)
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
