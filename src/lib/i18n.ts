// Client-safe Modul: KEINE next/headers-Imports (sonst landet `cookies` im
// Client-Bundle). Der Server-Reader lebt in i18n-server.ts.
export const LOCALES = ["de", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = "site_lang";

type Dict = {
  nav: { tagline: string; back: string };
  hero: {
    tag: string;
    title: string;
    titleEm: string;
    titleAfter: string;
    sub: string;
  };
  sources: {
    eyebrow: string;
    title: string;
    titleEm: string;
    intro: string;
    drop: {
      num: string; title: string; sub: string;
      zoneLead: string; zoneTitle: string; zoneHint: string;
      emailLabel: string; emailHint: string; emailPlaceholder: string;
      cta: string; ctaPending: string; note: string;
    };
    forward: {
      num: string; title: string; sub: string;
      addrLabel: string; subjLabel: string; copy: string; copied: string; copyFail: string;
      steps: string[]; note: string;
    };
    google: {
      num: string; title: string; sub: string; soon: string;
      bullets: string[]; note: string;
    };
  };
  why: {
    eyebrow: string; title: string; titleEm: string; intro: string;
    cards: { num: string; title: string; body: string }[];
  };
  result: {
    tag: string; title: string;
    metaFrom: (files: number, words: string, date: string) => string;
    proofEyebrow: string; proofTitle: string; promptLabel: string;
    proofBefore: string; proofAfter: string;
    voiceLabel: string; download: string;
    howEyebrow: string; howTitle: string; howIntro: string;
    chatgptWhere: string; claudeWhere: string; geminiWhere: string;
    ctaEyebrow: string; ctaTitle: string; ctaText: string; ctaButton: string;
  };
  footer: { tagline: string };
  errors: { invalidEmail: string; noFiles: string; generic: string; limitFallback: string };
};

const de: Dict = {
  nav: { tagline: "Werkzeug", back: "Zurück zu Labs" },
  hero: {
    tag: "Brand Voice · AppSales Labs",
    title: "Woher kommen ",
    titleEm: "deine Texte",
    titleAfter: "?",
    sub: "Gib uns ein paar echte Texte von dir — und du bekommst ein VOICE.md, das jedem LLM beibringt, in deiner Stimme zu schreiben statt wie ein LinkedIn-Influencer. Wähl unten, woher die Texte kommen.",
  },
  sources: {
    eyebrow: "Drei Wege rein",
    title: "Wähl deine ",
    titleEm: "Quelle",
    intro: "Gleiches Ziel, ein VOICE.md, das überall funktioniert. Nimm den Weg mit dem wenigsten Aufwand für dich.",
    drop: {
      num: "01 · Dateien",
      title: "Texte direkt droppen",
      sub: "Ein paar PDFs, DOCX, MD oder TXT — was du eh schon geschrieben hast. Schnellster Weg, ohne Account-Verbindung.",
      zoneLead: "Deine Texte",
      zoneTitle: "Drop · Klick · Auswählen",
      zoneHint: "TXT · MD · PDF · DOCX",
      emailLabel: "E-Mail (für deinen Link)",
      emailHint: "Wir schicken dir den Permalink — und melden uns nur, wenn du mehr willst.",
      emailPlaceholder: "du@beispiel.de",
      cta: "VOICE.md generieren",
      ctaPending: "Generiere…",
      note: "Max 20 Dateien · 5 MB pro Datei. Wir speichern nur das Profil, nicht die Quelltexte.",
    },
    forward: {
      num: "02 · Weiterleiten",
      title: "Mails weiterleiten",
      sub: "Du hast einen Stapel Mails, die nach dir klingen? Leite sie an unsere Sammeladresse weiter — wir extrahieren den Text. Kein Account, keine Verbindung.",
      addrLabel: "Weiterleiten an",
      subjLabel: "Betreff (deine E-Mail in Klammern)",
      copy: "Kopieren",
      copied: "Kopiert!",
      copyFail: "Manuell markieren",
      steps: [
        "Mails weiterleiten (oder als Anhang) an die Adresse oben",
        "Deine E-Mail im Betreff in eckigen Klammern",
        "Sobald genug Material da ist, generieren wir und mailen dir den Link",
      ],
      note: "Wir verarbeiten den Sammel-Posteingang regelmäßig. Wenn es eilig ist, schreib uns kurz.",
    },
    google: {
      num: "03 · Google",
      title: "Gmail verbinden",
      sub: "Aus deinen gesendeten Mails wird das ehrlichste Profil. Read-only, kein Posting in deinem Namen.",
      soon: "Auf Anfrage",
      bullets: [
        "Nur Sent-Folder — keine eingehenden Mails",
        "Token wird nach der Generierung gelöscht",
        "Aktuell für Demos & bekannte Prospects",
      ],
      note: "Gmail-Lesezugriff braucht eine Google-Verifizierung, die wir gezielt freischalten. Schreib uns, wenn du diesen Weg willst — Datei-Drop und Weiterleitung laufen sofort.",
    },
  },
  why: {
    eyebrow: "Warum das funktioniert",
    title: "Generische Prompts erzeugen ",
    titleEm: "generische",
    intro: "Wir analysieren nicht, was du gern wärst, sondern wie du wirklich schreibst — Satzbau, Wortwahl, was du vermeidest. Alles aus deinen echten Quellen, alles nachprüfbar.",
    cards: [
      { num: "01", title: "Echte Quellen, keine Adjektive", body: "„Professionell und sympathisch“ sagt nichts. Die echten Marker stecken in Satzbau, Wortwahl und dem, was du NIE schreiben würdest." },
      { num: "02", title: "Drop-in für jedes LLM", body: "Du bekommst dein VOICE.md plus kompakte Versionen für ChatGPT Custom Instructions, Claude Projects und Gemini Gems." },
      { num: "03", title: "Sichtbarer Vorher/Nachher", body: "Gleicher Prompt, einmal mit Default-LLM, einmal mit deinem Profil. Du siehst sofort, ob es funktioniert." },
    ],
  },
  result: {
    tag: "Dein Voice Profile",
    title: "Fertig. Jedes LLM kann jetzt wie du schreiben.",
    metaFrom: (files, words, date) =>
      `Aus ${files} Datei${files === 1 ? "" : "en"} mit ${words} Wörtern · generiert am ${date}`,
    proofEyebrow: "Beweis",
    proofTitle: "Gleicher Prompt, anderes Ergebnis.",
    promptLabel: "Prompt",
    proofBefore: "Generischer LLM-Output",
    proofAfter: "Mit deinem Voice Profile",
    voiceLabel: "Vollständiges Profil",
    download: "VOICE.md herunterladen",
    howEyebrow: "So benutzt du es",
    howTitle: "In 30 Sekunden eingebaut.",
    howIntro: "Lade das VOICE.md herunter oder kopier die passende Kurzversion in dein LLM. Ab dann schreibt es in deiner Stimme.",
    chatgptWhere: "Custom Instructions → How would you like ChatGPT to respond?",
    claudeWhere: "Project → Project Knowledge → Set custom instructions",
    geminiWhere: "Gem manager → System instructions",
    ctaEyebrow: "Du willst mehr?",
    ctaTitle: "Sowas für dein Team oder mehrere Profile?",
    ctaText: "Ein Profil pro E-Mail ist die Demo. Für Team-Varianten oder Integration in deinen Workflow — schreib uns kurz.",
    ctaButton: "Schreib uns",
  },
  footer: { tagline: "Ein Lab-Tool von AppSales" },
  errors: {
    invalidEmail: "Bitte gib eine gültige E-Mail-Adresse ein.",
    noFiles: "Bitte lade mindestens eine Datei hoch.",
    generic: "Etwas ist schiefgelaufen. Probier es nochmal.",
    limitFallback: "Limit erreicht. Schreib uns, wenn du mehr willst.",
  },
};

const en: Dict = {
  nav: { tagline: "Tool", back: "Back to Labs" },
  hero: {
    tag: "Brand Voice · AppSales Labs",
    title: "Where does ",
    titleEm: "your writing",
    titleAfter: " come from?",
    sub: "Give us a few real texts of yours — and get a VOICE.md that teaches any LLM to write in your voice instead of like a LinkedIn influencer. Pick where your texts come from below.",
  },
  sources: {
    eyebrow: "Three ways in",
    title: "Choose your ",
    titleEm: "source",
    intro: "Same goal: one VOICE.md that works everywhere. Take the path with the least effort for you.",
    drop: {
      num: "01 · Files",
      title: "Drop texts directly",
      sub: "A few PDFs, DOCX, MD or TXT — whatever you've already written. Fastest way, no account connection.",
      zoneLead: "Your texts",
      zoneTitle: "Drop · Click · Pick",
      zoneHint: "TXT · MD · PDF · DOCX",
      emailLabel: "Email (for your link)",
      emailHint: "We'll send you the permalink — and only reach out if you want more.",
      emailPlaceholder: "you@example.com",
      cta: "Generate VOICE.md",
      ctaPending: "Generating…",
      note: "Max 20 files · 5 MB each. We only store the profile, never your source texts.",
    },
    forward: {
      num: "02 · Forward",
      title: "Forward emails",
      sub: "Got a pile of emails that sound like you? Forward them to our collection address — we extract the text. No account, no connection.",
      addrLabel: "Forward to",
      subjLabel: "Subject (your email in brackets)",
      copy: "Copy",
      copied: "Copied!",
      copyFail: "Select manually",
      steps: [
        "Forward emails (or as attachments) to the address above",
        "Put your email in square brackets in the subject",
        "Once there's enough material, we generate and email you the link",
      ],
      note: "We process the shared inbox regularly. If it's urgent, drop us a line.",
    },
    google: {
      num: "03 · Google",
      title: "Connect Gmail",
      sub: "Your sent mail makes the most honest profile. Read-only, no posting on your behalf.",
      soon: "On request",
      bullets: [
        "Sent folder only — no incoming mail",
        "Token deleted after generation",
        "Currently for demos & known prospects",
      ],
      note: "Gmail read access needs a Google verification we enable deliberately. Tell us if you want this path — file drop and forwarding work right away.",
    },
  },
  why: {
    eyebrow: "Why this works",
    title: "Generic prompts produce ",
    titleEm: "generic",
    intro: "We don't analyze who you'd like to be, but how you actually write — sentence structure, word choice, what you avoid. All from your real sources, all verifiable.",
    cards: [
      { num: "01", title: "Real sources, not adjectives", body: "\"Professional and likeable\" says nothing. The real markers live in sentence structure, word choice, and what you'd NEVER write." },
      { num: "02", title: "Drop-in for any LLM", body: "You get your VOICE.md plus compact versions for ChatGPT Custom Instructions, Claude Projects and Gemini Gems." },
      { num: "03", title: "Visible before/after", body: "Same prompt, once with a default LLM, once with your profile. You see immediately whether it works." },
    ],
  },
  result: {
    tag: "Your Voice Profile",
    title: "Done. Any LLM can now write like you.",
    metaFrom: (files, words, date) =>
      `From ${files} file${files === 1 ? "" : "s"} with ${words} words · generated on ${date}`,
    proofEyebrow: "Proof",
    proofTitle: "Same prompt, different result.",
    promptLabel: "Prompt",
    proofBefore: "Generic LLM output",
    proofAfter: "With your Voice Profile",
    voiceLabel: "Full profile",
    download: "Download VOICE.md",
    howEyebrow: "How to use it",
    howTitle: "Wired in within 30 seconds.",
    howIntro: "Download the VOICE.md or copy the matching short version into your LLM. From then on it writes in your voice.",
    chatgptWhere: "Custom Instructions → How would you like ChatGPT to respond?",
    claudeWhere: "Project → Project Knowledge → Set custom instructions",
    geminiWhere: "Gem manager → System instructions",
    ctaEyebrow: "Want more?",
    ctaTitle: "Need this for your team or multiple profiles?",
    ctaText: "One profile per email is the demo. For team variants or workflow integration — drop us a line.",
    ctaButton: "Get in touch",
  },
  footer: { tagline: "A lab tool by AppSales" },
  errors: {
    invalidEmail: "Please enter a valid email address.",
    noFiles: "Please upload at least one file.",
    generic: "Something went wrong. Please try again.",
    limitFallback: "Limit reached. Drop us a line if you want more.",
  },
};

const dictionaries: Record<Locale, Dict> = { de, en };

export function t(locale: Locale): Dict {
  return dictionaries[locale];
}
