"use client";

interface Props {
  voiceMd: string;
  slug: string;
  label?: string;
  /** Sichtbarer Dateiname-Stamm, z.B. "stimmprofil". */
  fileLabel?: string;
}

export function DownloadVoiceButton({ voiceMd, slug, label = "Profil sichern", fileLabel = "stimmprofil" }: Props) {
  function download() {
    // .txt statt .md: der Dateiname ist im OS-Dialog sichtbar, und "md" ist im
    // Nutzerflow kein erklaerter Begriff. Der Inhalt liest sich auch als
    // Klartext gut.
    const blob = new Blob([voiceMd], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileLabel}-${slug}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      className="pill pill--ink pill--arrow"
    >
      {label}
    </button>
  );
}
