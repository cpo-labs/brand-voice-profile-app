"use client";

interface Props {
  voiceMd: string;
  slug: string;
}

export function DownloadVoiceButton({ voiceMd, slug }: Props) {
  function download() {
    const blob = new Blob([voiceMd], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `VOICE-${slug}.md`;
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
      VOICE.md herunterladen
    </button>
  );
}
