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
    demoCta: string;
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
    identityEyebrow: string;
    scalesEyebrow: string; scalesTitle: string; scalesIntro: string;
    quotesEyebrow: string; quotesTitle: string; quotesIntro: string; quoteFrom: string;
    usesTitle: string; neverTitle: string;
    proofEyebrow: string; proofTitle: string; promptLabel: string;
    proofBefore: string; proofAfter: string;
    confidenceTitle: string;
    fullEyebrow: string; fullTitle: string; download: string; downloadFile: string;
    howEyebrow: string; howTitle: string; howIntro: string;
    chatgptWhere: string; claudeWhere: string; geminiWhere: string;
    ctaEyebrow: string; ctaTitle: string; ctaText: string; ctaButton: string;
    demoTag: string; demoTitle: (author: string) => string; demoIntro: string;
    demoBackEyebrow: string; demoBackTitle: string; demoBackText: string; demoBackButton: string;
  };
  footer: { tagline: string };
  errors: {
    invalidEmail: string; noFiles: string; generic: string; limitFallback: string;
    pageTitle: string; pageBody: string; pageRetry: string;
  };
};

const de: Dict = {
  nav: { tagline: "Werkzeug", back: "Zurück zu Labs" },
  hero: {
    tag: "Brand Voice Profile",
    title: "Klingen deine Texte noch nach ",
    titleEm: "dir",
    titleAfter: "?",
    sub: "Gib uns ein paar echte Texte von dir, und du bekommst ein Stimmprofil, das jeder KI beibringt, in deiner Stimme zu schreiben statt wie ein LinkedIn-Influencer.",
    demoCta: "Beispiel ansehen",
  },
  sources: {
    eyebrow: "Drei Wege rein",
    title: "Such dir deinen ",
    titleEm: "Weg",
    intro: "Drei Eingänge, ein Ergebnis. Klick dich in eine Karte: der erste funktioniert sofort, ganz ohne Verbindung.",
    recommended: "Empfohlen",
    drop: {
      num: "01 · Dateien",
      title: "Texte direkt droppen",
      sub: "Ein paar PDFs, DOCX, MD oder TXT, was du eh schon geschrieben hast. Schnellster Weg, ohne Account-Verbindung.",
      zoneLead: "Deine Texte",
      zoneTitle: "Drop · Klick · Auswählen",
      zoneHint: "TXT · MD · PDF · DOCX",
      cta: "Stimmprofil erstellen",
      ctaPending: "Erstelle…",
      note: "Max 20 Dateien · 15 MB pro Datei. Wir speichern nur das Profil, nicht die Quelltexte.",
    },
    forward: {
      num: "02 · Weiterleiten",
      title: "Mails weiterleiten",
      sub: "Du hast einen Stapel Mails, die nach dir klingen? Leite sie an unsere Sammeladresse weiter, wir extrahieren den Text. Kein Account, keine Verbindung.",
      addrLabel: "Weiterleiten an",
      subjLabel: "Betreff",
      copy: "Kopieren",
      copied: "Kopiert!",
      copyFail: "Manuell markieren",
      emailToken: "deine@email.de",
      subjectMaterial: "Mein Voice-Material",
      subjectHint: "Setz deine eigene E-Mail in die eckigen Klammern, daran erkennen wir dich.",
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
        "Nur gesendete Mails, keine eingehenden",
        "Der Zugang wird nach der Auswertung gelöscht",
        "Nur Lesezugriff, kein Posten in deinem Namen",
      ],
      note: "Gmail-Lesezugriff läuft in einer geschlossenen Test-Phase. Trag deine Gmail-Adresse ein, wir schalten dich frei und schicken dir den Link.",
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
    title: "Standard-KI erzeugt ",
    titleEm: "generische",
    intro: "Wir analysieren nicht, was du gern wärst, sondern wie du wirklich schreibst: Satzbau, Wortwahl, was du vermeidest. Alles aus deinen echten Quellen, alles nachprüfbar.",
    cards: [
      { num: "01", title: "Echte Quellen, keine Adjektive", body: "„Professionell und sympathisch“ sagt nichts. Die echten Marker stecken in Satzbau, Wortwahl und dem, was du NIE schreiben würdest." },
      { num: "02", title: "Passt in jede KI", body: "Du bekommst dein lesbares Stimmprofil plus fertige Kurzversionen zum Einsetzen in ChatGPT, Claude und Gemini." },
      { num: "03", title: "Sichtbarer Vorher/Nachher", body: "Gleiche Aufgabe, einmal mit Standard-KI, einmal mit deinem Profil. Du siehst sofort, ob es funktioniert." },
    ],
  },
  result: {
    tag: "Dein Stimmprofil",
    title: "Fertig. Jede KI kann jetzt wie du schreiben.",
    metaFrom: (files, words, date) =>
      `Aus ${files} Datei${files === 1 ? "" : "en"} mit ${words} Wörtern · erstellt am ${date}`,
    identityEyebrow: "So klingst du",
    scalesEyebrow: "Deine Stimme in Zahlen",
    scalesTitle: "Wo du auf jeder Skala stehst.",
    scalesIntro: "Vier Achsen, jede aus deinen echten Texten abgelesen. Der Punkt zeigt deine Position.",
    quotesEyebrow: "Aus deinen echten Texten",
    quotesTitle: "Das sagst du wirklich.",
    quotesIntro: "Kein Wort erfunden. Jede Erkenntnis hängt an einem echten Satz aus deinen Quellen.",
    quoteFrom: "aus",
    usesTitle: "Das nutzt du",
    neverTitle: "Das schreibst du nie",
    proofEyebrow: "Beweis",
    proofTitle: "Gleiche Aufgabe, anderes Ergebnis.",
    promptLabel: "Aufgabe",
    proofBefore: "Generische KI",
    proofAfter: "Mit deinem Profil",
    confidenceTitle: "Sicherheit & offene Punkte",
    fullEyebrow: "Für Profis",
    fullTitle: "Vollständiges Profil ansehen und sichern",
    download: "Profil sichern",
    downloadFile: "stimmprofil",
    howEyebrow: "So benutzt du es",
    howTitle: "In 30 Sekunden eingebaut.",
    howIntro: "Kopier die passende Kurzversion in dein KI-Tool. Ab dann schreibt es in deiner Stimme.",
    chatgptWhere: "Einstellungen → Personalisierung → Eigene Hinweise",
    claudeWhere: "Projekt → Projektwissen → Eigene Hinweise",
    geminiWhere: "Gem-Verwaltung → Systemhinweise",
    ctaEyebrow: "Du willst mehr?",
    ctaTitle: "Sowas für dein Team oder mehrere Profile?",
    ctaText: "Ein Profil pro E-Mail ist die Demo. Für Team-Varianten oder Einbindung in deinen Ablauf: schreib uns kurz.",
    ctaButton: "Schreib uns",
    demoTag: "Beispiel-Profil",
    demoTitle: (author) => `So sieht ein Stimmprofil aus, am Beispiel von ${author}.`,
    demoIntro: "Ein fertiges Profil einer erfundenen Texterin. Genau das bekommst du aus deinen eigenen Texten, ganz ohne Eingabe hier.",
    demoBackEyebrow: "Dein Profil",
    demoBackTitle: "Jetzt mit deinen eigenen Texten.",
    demoBackText: "Drei Wege rein, der erste funktioniert sofort. Leg dein eigenes Profil an.",
    demoBackButton: "Eigenes Profil erstellen",
  },
  footer: { tagline: "Ein Lab-Tool von AppSales" },
  errors: {
    invalidEmail: "Bitte gib eine gültige E-Mail-Adresse ein.",
    noFiles: "Bitte lade mindestens eine Datei hoch.",
    generic: "Etwas ist schiefgelaufen. Probier es nochmal.",
    limitFallback: "Limit erreicht. Schreib uns, wenn du mehr willst.",
    pageTitle: "Dieses Profil können wir gerade nicht laden",
    pageBody: "Da ist etwas schiefgelaufen. Versuch es in einem Moment nochmal oder erstell dir ein neues Profil.",
    pageRetry: "Nochmal versuchen",
  },
};

const en: Dict = {
  nav: { tagline: "Tool", back: "Back to Labs" },
  hero: {
    tag: "Brand Voice Profile",
    title: "Does your writing still sound like ",
    titleEm: "you",
    titleAfter: "?",
    sub: "Give us a few real texts of yours, and get a voice profile that teaches any AI to write in your voice instead of like a LinkedIn influencer.",
    demoCta: "See an example",
  },
  sources: {
    eyebrow: "Three ways in",
    title: "Pick your ",
    titleEm: "way in",
    intro: "Three entry points, one result. Click into a card: the first works right away, no connection needed.",
    recommended: "Recommended",
    drop: {
      num: "01 · Files",
      title: "Drop texts directly",
      sub: "A few PDFs, DOCX, MD or TXT, whatever you've already written. Fastest way, no account connection.",
      zoneLead: "Your texts",
      zoneTitle: "Drop · Click · Pick",
      zoneHint: "TXT · MD · PDF · DOCX",
      cta: "Create voice profile",
      ctaPending: "Creating…",
      note: "Max 20 files · 15 MB each. We only store the profile, never your source texts.",
    },
    forward: {
      num: "02 · Forward",
      title: "Forward emails",
      sub: "Got a pile of emails that sound like you? Forward them to our collection address, we extract the text. No account, no connection.",
      addrLabel: "Forward to",
      subjLabel: "Subject",
      copy: "Copy",
      copied: "Copied!",
      copyFail: "Select manually",
      emailToken: "you@example.com",
      subjectMaterial: "My voice material",
      subjectHint: "Put your own email in the square brackets, that is how we recognize you.",
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
        "Sent mail only, no incoming mail",
        "Access is deleted after the analysis",
        "Read-only, no posting on your behalf",
      ],
      note: "Gmail read access runs in a closed test phase. Enter your Gmail address, we will grant access and send you the link.",
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
    title: "Default AI produces ",
    titleEm: "generic",
    intro: "We don't analyze who you'd like to be, but how you actually write: sentence structure, word choice, what you avoid. All from your real sources, all verifiable.",
    cards: [
      { num: "01", title: "Real sources, not adjectives", body: "\"Professional and likeable\" says nothing. The real markers live in sentence structure, word choice, and what you'd NEVER write." },
      { num: "02", title: "Fits into any AI", body: "You get your readable voice profile plus ready-to-paste short versions for ChatGPT, Claude and Gemini." },
      { num: "03", title: "Visible before/after", body: "Same task, once with default AI, once with your profile. You see immediately whether it works." },
    ],
  },
  result: {
    tag: "Your voice profile",
    title: "Done. Any AI can now write like you.",
    metaFrom: (files, words, date) =>
      `From ${files} file${files === 1 ? "" : "s"} with ${words} words · created on ${date}`,
    identityEyebrow: "How you sound",
    scalesEyebrow: "Your voice in numbers",
    scalesTitle: "Where you land on each scale.",
    scalesIntro: "Four axes, each read from your real texts. The dot marks your position.",
    quotesEyebrow: "From your real texts",
    quotesTitle: "This is what you actually say.",
    quotesIntro: "Nothing made up. Every finding hangs on a real sentence from your sources.",
    quoteFrom: "from",
    usesTitle: "You use",
    neverTitle: "You never write",
    proofEyebrow: "Proof",
    proofTitle: "Same task, different result.",
    promptLabel: "Task",
    proofBefore: "Generic AI",
    proofAfter: "With your profile",
    confidenceTitle: "Confidence & open points",
    fullEyebrow: "For pros",
    fullTitle: "View and save the full profile",
    download: "Save profile",
    downloadFile: "voice-profile",
    howEyebrow: "How to use it",
    howTitle: "Wired in within 30 seconds.",
    howIntro: "Copy the matching short version into your AI tool. From then on it writes in your voice.",
    chatgptWhere: "Settings → Personalization → Custom instructions",
    claudeWhere: "Project → Project knowledge → Custom instructions",
    geminiWhere: "Gem manager → System instructions",
    ctaEyebrow: "Want more?",
    ctaTitle: "Need this for your team or multiple profiles?",
    ctaText: "One profile per email is the demo. For team variants or workflow integration: drop us a line.",
    ctaButton: "Get in touch",
    demoTag: "Example profile",
    demoTitle: (author) => `This is what a voice profile looks like, using ${author} as an example.`,
    demoIntro: "A finished profile of a fictional copywriter. This is exactly what you get from your own texts, with no input needed here.",
    demoBackEyebrow: "Your profile",
    demoBackTitle: "Now with your own texts.",
    demoBackText: "Three ways in, the first works right away. Create your own profile.",
    demoBackButton: "Create your own profile",
  },
  footer: { tagline: "A lab tool by AppSales" },
  errors: {
    invalidEmail: "Please enter a valid email address.",
    noFiles: "Please upload at least one file.",
    generic: "Something went wrong. Please try again.",
    limitFallback: "Limit reached. Drop us a line if you want more.",
    pageTitle: "We can't load this profile right now",
    pageBody: "Something went wrong. Try again in a moment, or create a new profile.",
    pageRetry: "Try again",
  },
};

const dictionaries: Record<Locale, Dict> = { de, en };

export function t(locale: Locale): Dict {
  return dictionaries[locale];
}
