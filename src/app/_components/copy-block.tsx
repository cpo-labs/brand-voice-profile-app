"use client";

import { useState } from "react";

interface Props {
  tool: string;
  where: string;
  value: string;
}

export function CopyBlock({ tool, where, value }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore — clipboard may be denied
    }
  }

  return (
    <div
      className="rounded-2xl p-5 flex flex-col h-full"
      style={{ background: "var(--color-cream-2)" }}
    >
      <p className="text-xl font-bold mb-2">{tool}</p>
      <p
        className="text-xs mb-4"
        style={{ color: "var(--color-soft)" }}
      >
        {where}
      </p>
      <pre
        className="text-xs leading-relaxed whitespace-pre-wrap font-mono p-4 rounded-xl flex-1 mb-4 overflow-hidden max-h-[260px]"
        style={{
          background: "#fff",
          color: "var(--color-ink)",
        }}
      >
        {value}
      </pre>
      <button
        type="button"
        onClick={copy}
        className="pill pill--ink pill--arrow self-start text-sm"
      >
        {copied ? "Kopiert!" : "Kopieren"}
      </button>
    </div>
  );
}
