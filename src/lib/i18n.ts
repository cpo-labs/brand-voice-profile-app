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
    recommended: string;
    drop: {
      num: string; title: string; sub: string;
      zoneLead: string; zoneTitle: string; zoneHint: string;
      cta: string; ctaPending: string; note: string;
    };
    forward: {
      num: string; title: string; sub: string;
      addrLabel: string; subjLabel: string; copy: string; copied: string; copyFail: string;
      emailToken: string; subjectMaterial: string; subjectHint: string;
      steps: string[]; note: string;
    };
    google: {
      num: string; title: string; sub: string; soon: string;
      bullets: string[]; note: string;
      emailLabel: string; emailPlaceholder: string; cta: string; ctaPending: string;
      requested: string; errEmail: string;
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
    title: "Such dir deinen ",
    titleEm: "Weg",
    intro: "Drei Eingänge, ein Ergebnis. Klick dich in eine Karte — der erste funktioniert sofort, ganz ohne Verbindung.",
    recommended: "Empfohlen",
    drop: {
      num: "01 · Dateien",
      title: "Texte direkt droppen",
      sub: "Ein paar PDFs, DOCX, MD oder TXT — was du eh schon geschrieben hast. Schnellster Weg, ohne Account-Verbindung.",
      zoneLead: "Deine Texte",
      zoneTitle: "Drop · Klick · Auswählen",
      zoneHint: "TXT · MD · PDF · DOCX",
      cta: "VOICE.md generieren",
      ctaPending: "Generiere…",
      note: "Max 20 Dateien · 5 MB pro Datei. Wir speichern nur das Profil, nicht die Quelltexte.",
    },
    forward: {
      num: "02 · Weiterleiten",
      title: "Mails weiterleiten",
      sub: "Du hast einen Stapel Mails, die nach dir klingen? Leite sie an unsere Sammeladresse weiter — wir extrahieren den Text. Kein Account, keine Verbindung.",
      addrLabel: "Weiterleiten an",
      subjLabel: "Betreff",
      copy: "Kopieren",
      copied: "Kopiert!",
      copyFail: "Manuell markieren",
      emailToken: "deine@email.de",
      subjectMaterial: "Mein Voice-Material",
      subjectHint: "Setz deine eigene E-Mail in die eckigen Klammern — daran erkennen wir dich.",
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
        "Read-only, kein Posting in deinem Namen",
      ],
      note: "Gmail-Lesezugriff läuft in einer geschlossenen Test-Phase. Trag deine Gmail-Adresse ein — wir schalten dich frei und schicken dir den Link.",
      emailLabel: "Deine Gmail-Adresse",
      emailPlaceholder: "du@gmail.com",
      cta: "Zugang anfragen",
      ctaPending: "Sende…",
      requested: "Eingetragen. Wir schalten dich frei und schicken dir den Link per Mail.",
      errEmail: "Bitte gib eine gültige Gmail-Adresse ein.",
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
    title: "Pick your ",
    titleEm: "way in",
    intro: "Three entry points, one result. Click into a card — the first works right away, no connection needed.",
    recommended: "Recommended",
    drop: {
      num: "01 · Files",
      title: "Drop texts directly",
      sub: "A few PDFs, DOCX, MD or TXT — whatever you've already written. Fastest way, no account connection.",
      zoneLead: "Your texts",
      zoneTitle: "Drop · Click · Pick",
      zoneHint: "TXT · MD · PDF · DOCX",
      cta: "Generate VOICE.md",
      ctaPending: "Generating…",
      note: "Max 20 files · 5 MB each. We only store the profile, never your source texts.",
    },
    forward: {
      num: "02 · Forward",
      title: "Forward emails",
      sub: "Got a pile of emails that sound like you? Forward them to our collection address — we extract the text. No account, no connection.",
      addrLabel: "Forward to",
      subjLabel: "Subject",
      copy: "Copy",
      copied: "Copied!",
      copyFail: "Select manually",
      emailToken: "you@example.com",
      subjectMaterial: "My voice material",
      subjectHint: "Put your own email in the square brackets — that's how we recognize you.",
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
        "Read-only, no posting on your behalf",
      ],
      note: "Gmail read access runs in a closed test phase. Enter your Gmail address — we'll grant access and send you the link.",
      emailLabel: "Your Gmail address",
      emailPlaceholder: "you@gmail.com",
      cta: "Request access",
      ctaPending: "Sending…",
      requested: "You're on the list. We'll grant access and email you the link.",
      errEmail: "Please enter a valid Gmail address.",
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
