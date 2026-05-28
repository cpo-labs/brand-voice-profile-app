"use client";

import { useState } from "react";
import { t, type Locale } from "@/lib/i18n";

const FORWARD_ADDRESS = "briefing@appsales-consulting.com";

export function ForwardCard({ locale }: { locale: Locale }) {
  const d = t(locale).sources.forward;
  const [copyState, setCopyState] = useState<"idle" | "ok" | "fail">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(FORWARD_ADDRESS);
      setCopyState("ok");
      setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      setCopyState("fail");
      setTimeout(() => setCopyState("idle"), 2500);
    }
  }

  const copyLabel = copyState === "ok" ? d.copied : copyState === "fail" ? d.copyFail : d.copy;

  return (
    <article className="icard">
      <p className="icard__num">{d.num}</p>
      <h3 className="icard__title">{d.title}</h3>
      <p className="icard__sub">{d.sub}</p>

      <div className="icard__body flex flex-col gap-3">
        {/* Adresse */}
        <div
          className="rounded-xl p-3.5 bg-white flex items-center justify-between gap-3"
          style={{ border: "1.5px solid rgba(24,20,16,0.14)" }}
        >
          <div className="min-w-0 flex-1">
            <p className="field__label" style={{ marginBottom: ".3rem" }}>{d.addrLabel}</p>
            <p className="font-mono text-sm font-medium" style={{ wordBreak: "break-all" }}>
              {FORWARD_ADDRESS}
            </p>
          </div>
          <button
            type="button"
            onClick={copy}
            className="text-xs flex-none underline underline-offset-4"
            style={{ color: "var(--accent)" }}
          >
            {copyLabel}
          </button>
        </div>

        {/* Betreff — die eigene E-Mail klar hervorgehoben, nichts abgeschnitten */}
        <div className="rounded-xl p-3.5 bg-white" style={{ border: "1.5px solid rgba(24,20,16,0.14)" }}>
          <p className="field__label" style={{ marginBottom: ".45rem" }}>{d.subjLabel}</p>
          <p className="font-mono text-sm" style={{ lineHeight: 1.6, wordBreak: "break-word" }}>
            <span
              style={{
                background: "color-mix(in oklab, var(--accent) 16%, transparent)",
                color: "var(--accent)",
                fontWeight: 600,
                padding: ".12rem .4rem",
                borderRadius: 6,
              }}
            >
              [{d.emailToken}]
            </span>{" "}
            {d.subjectMaterial}
          </p>
          <p className="text-xs mt-2" style={{ color: "var(--soft)" }}>{d.subjectHint}</p>
        </div>

        <ol className="text-sm flex flex-col gap-2 mt-1" style={{ color: "var(--soft)" }}>
          {d.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="font-mono" style={{ color: "var(--accent)" }}>{i + 1}.</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>

        <p className="text-xs mt-1" style={{ color: "var(--soft)" }}>{d.note}</p>
      </div>
    </article>
  );
}
