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
    drop: {
      num: string; title: string; sub: string;
      zoneLead: string; zoneTitle: string; zoneHint: string;
      cta: string; ctaPending: string; note: string;
      emailLabel: string; emailPlaceholder: string; emailHint: string;
      progress: string; longHint: string;
      rejectFormat: (name: string) => string;
      rejectLarge: (name: string) => string;
      rejectMany: (max: number) => string;
    };
  };
  howto: {
    eyebrow: string;
    title: string;
    titleEm: string;
    intro: string;
    mailboxes: { name: string; steps: string[]; linkLabel: string; linkHref: string }[];
    note: string;
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
    copy: string; copied: string;
    howEyebrow: string; howTitle: string; howIntro: string;
    chatgptWhere: string; claudeWhere: string; geminiWhere: string;
    ctaEyebrow: string; ctaTitle: string; ctaText: string; ctaButton: string;
    demoTag: string; demoTitle: (author: string) => string; demoIntro: string;
    demoBackEyebrow: string; demoBackTitle: string; demoBackText: string; demoBackButton: string;
    pendingTag: string; pendingTitle: string; pendingBody: string; pendingNote: string; pendingTimeout: string;
    failedTag: string; failedTitle: string; failedBody: string; failedButton: string;
  };
  footer: { tagline: string };
  errors: {
    invalidEmail: string; emailRequired: string; noFiles: string; generic: string; limitFallback: string;
    tooLittleText: string;
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
    eyebrow: "So geht's",
    title: "Gib uns deine ",
    titleEm: "Texte",
    intro: "Lad ein paar echte Texte von dir hoch, die nach dir klingen. Den Rest macht die Analyse. Kein Account, keine Verbindung.",
    drop: {
      num: "01 · Dateien",
      title: "Texte direkt droppen",
      sub: "Ein paar PDFs, DOCX, MD oder TXT, was du eh schon geschrieben hast. Je mehr echtes Material, desto schärfer das Profil.",
      zoneLead: "Deine Texte",
      zoneTitle: "Drop · Klick · Auswählen",
      zoneHint: "Text · Markdown · PDF · Word",
      cta: "Stimmprofil erstellen",
      ctaPending: "Lade hoch…",
      note: "Max 20 Dateien · 15 MB pro Datei. Quelltexte liegen nur bis zur Erstellung und werden danach gelöscht — gespeichert wird nur dein fertiges Profil.",
      emailLabel: "E-Mail",
      emailPlaceholder: "du@beispiel.de",
      emailHint: "Pflicht: Wir bauen dein Profil im Hintergrund und mailen dir den Link, sobald es fertig ist (wenige Minuten).",
      progress: "Wir nehmen deine Texte an und starten die Analyse…",
      longHint: "Sehr viel Material? Nutz lieber ein paar repräsentative, kürzere Proben statt alles auf einmal, sonst dauert die Analyse zu lange.",
      rejectFormat: (name) => `„${name}“ hat ein nicht unterstütztes Format. Erlaubt: TXT, MD, PDF, Word.`,
      rejectLarge: (name) => `„${name}“ ist zu groß. Maximal 15 MB pro Datei.`,
      rejectMany: (max) => `Maximal ${max} Dateien auf einmal. Die überzähligen haben wir weggelassen.`,
    },
  },
  howto: {
    eyebrow: "Kein Text zur Hand?",
    title: "Wie exportiere ich meine ",
    titleEm: "gesendeten Mails",
    intro: "Deine gesendeten Mails sind das ehrlichste Material. So holst du sie als Datei raus und lädst sie oben hoch.",
    mailboxes: [
      {
        name: "Outlook",
        steps: [
          "Eine gesendete Mail öffnen",
          "Datei → Speichern unter wählen",
          "Als Dateityp „Nur Text (*.txt)“ wählen und speichern",
          "Ein paar davon hochladen",
        ],
        linkLabel: "Outlook-Hilfe",
        linkHref: "https://support.microsoft.com/de-de/outlook",
      },
      {
        name: "Gmail",
        steps: [
          "Eine gesendete Mail öffnen",
          "Oben rechts auf das Drucken-Symbol klicken",
          "Als Ziel „Als PDF speichern“ wählen",
          "Die PDFs hochladen",
        ],
        linkLabel: "Gmail-Hilfe",
        linkHref: "https://support.google.com/mail/",
      },
      {
        name: "Apple Mail",
        steps: [
          "Eine oder mehrere gesendete Mails markieren",
          "Ablage → Sichern unter wählen",
          "Format „Nur Text“ wählen und sichern",
          "Die Dateien hochladen",
        ],
        linkLabel: "Apple-Mail-Hilfe",
        linkHref: "https://support.apple.com/de-de/mail",
      },
    ],
    note: "Drei, vier echte Mails reichen schon. Persönliche Daten kannst du vorher rausnehmen, das Profil braucht den Stil, nicht den Inhalt.",
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
    copy: "Kopieren",
    copied: "Kopiert!",
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
    pendingTag: "In Arbeit",
    pendingTitle: "Dein Stimmprofil wird gebaut.",
    pendingBody: "Wir analysieren deine Texte über mehrere Stufen und prüfen das Ergebnis mehrfach gegen, damit es wirklich nach dir klingt. Das dauert ein paar Minuten.",
    pendingNote: "Du kannst diese Seite offen lassen — sie aktualisiert sich selbst. Sobald es fertig ist, schicken wir dir den Link auch per Mail.",
    pendingTimeout: "Das dauert gerade länger als üblich. Wir bauen dein Profil weiter im Hintergrund und mailen dir den Link, sobald es fertig ist — du musst nicht auf dieser Seite warten.",
    failedTag: "Fehlgeschlagen",
    failedTitle: "Das hat leider nicht geklappt.",
    failedBody: "Bei der Analyse ist etwas schiefgelaufen. Versuch es mit ein paar repräsentativen Texten noch einmal.",
    failedButton: "Neues Profil erstellen",
  },
  footer: { tagline: "Ein Lab-Tool von AppSales" },
  errors: {
    invalidEmail: "Bitte gib eine gültige E-Mail-Adresse ein.",
    emailRequired: "Bitte gib deine E-Mail-Adresse an — wir schicken dir das fertige Profil per Mail.",
    noFiles: "Bitte lade mindestens eine Datei hoch.",
    generic: "Etwas ist schiefgelaufen. Probier es nochmal.",
    limitFallback: "Limit erreicht. Schreib uns, wenn du mehr willst.",
    tooLittleText: "Zu wenig Textmaterial. Gib uns mindestens einen ordentlichen Absatz (~500 Zeichen).",
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
    eyebrow: "How it works",
    title: "Give us your ",
    titleEm: "texts",
    intro: "Upload a few real texts of yours that sound like you. The analysis does the rest. No account, no connection.",
    drop: {
      num: "01 · Files",
      title: "Drop texts directly",
      sub: "A few PDFs, DOCX, MD or TXT, whatever you've already written. The more real material, the sharper the profile.",
      zoneLead: "Your texts",
      zoneTitle: "Drop · Click · Pick",
      zoneHint: "Text · Markdown · PDF · Word",
      cta: "Create voice profile",
      ctaPending: "Uploading…",
      note: "Max 20 files · 15 MB each. Source texts are kept only until creation, then deleted — we store only your finished profile.",
      emailLabel: "Email",
      emailPlaceholder: "you@example.com",
      emailHint: "Required: we build your profile in the background and email you the link once it's ready (a few minutes).",
      progress: "We're taking your texts and starting the analysis…",
      longHint: "Lots of material? Use a few representative, shorter samples instead of everything at once, otherwise the analysis takes too long.",
      rejectFormat: (name) => `"${name}" has an unsupported format. Allowed: TXT, MD, PDF, Word.`,
      rejectLarge: (name) => `"${name}" is too large. Max 15 MB per file.`,
      rejectMany: (max) => `Max ${max} files at once. We left out the extra ones.`,
    },
  },
  howto: {
    eyebrow: "No text at hand?",
    title: "How do I export my ",
    titleEm: "sent emails",
    intro: "Your sent emails are the most honest material. Here's how to save them as a file and upload them above.",
    mailboxes: [
      {
        name: "Outlook",
        steps: [
          "Open a sent email",
          "Choose File → Save As",
          "Pick \"Text only (*.txt)\" as the file type and save",
          "Upload a few of them",
        ],
        linkLabel: "Outlook help",
        linkHref: "https://support.microsoft.com/en-us/outlook",
      },
      {
        name: "Gmail",
        steps: [
          "Open a sent email",
          "Click the print icon at the top right",
          "Choose \"Save as PDF\" as the destination",
          "Upload the PDFs",
        ],
        linkLabel: "Gmail help",
        linkHref: "https://support.google.com/mail/",
      },
      {
        name: "Apple Mail",
        steps: [
          "Select one or more sent emails",
          "Choose File → Save As",
          "Pick \"Plain Text\" as the format and save",
          "Upload the files",
        ],
        linkLabel: "Apple Mail help",
        linkHref: "https://support.apple.com/en-us/mail",
      },
    ],
    note: "Three or four real emails are plenty. You can remove personal details first — the profile needs the style, not the content.",
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
    copy: "Copy",
    copied: "Copied!",
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
    pendingTag: "In progress",
    pendingTitle: "Your voice profile is being built.",
    pendingBody: "We analyze your texts across several stages and verify the result multiple times so it truly sounds like you. This takes a few minutes.",
    pendingNote: "You can leave this page open — it refreshes itself. Once it's ready, we'll also email you the link.",
    pendingTimeout: "This is taking longer than usual. We're still building your profile in the background and will email you the link once it's ready — you don't have to wait on this page.",
    failedTag: "Failed",
    failedTitle: "That didn't work, unfortunately.",
    failedBody: "Something went wrong during the analysis. Try again with a few representative texts.",
    failedButton: "Create a new profile",
  },
  footer: { tagline: "A lab tool by AppSales" },
  errors: {
    invalidEmail: "Please enter a valid email address.",
    emailRequired: "Please enter your email address — we'll send you the finished profile by email.",
    noFiles: "Please upload at least one file.",
    generic: "Something went wrong. Please try again.",
    limitFallback: "Limit reached. Drop us a line if you want more.",
    tooLittleText: "Not enough text. Give us at least one solid paragraph (~500 characters).",
    pageTitle: "We can't load this profile right now",
    pageBody: "Something went wrong. Try again in a moment, or create a new profile.",
    pageRetry: "Try again",
  },
};

const dictionaries: Record<Locale, Dict> = { de, en };

export function t(locale: Locale): Dict {
  return dictionaries[locale];
}
