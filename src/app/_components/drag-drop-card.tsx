"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { generateProfile, type GenerateState } from "@/app/actions/generate";
import { t, type Locale } from "@/lib/i18n";

const ACCEPT = ".txt,.md,.markdown,.pdf,.docx";
const MAX_FILES = 20;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function DropCard({ locale }: { locale: Locale }) {
  const d = t(locale).sources.drop;
  const [state, formAction] = useActionState<GenerateState, FormData>(generateProfile, {});
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);

  // Keep the hidden multi-file input in sync so the Server Action receives them.
  useEffect(() => {
    if (!filesRef.current) return;
    const dt = new DataTransfer();
    for (const f of files) dt.items.add(f);
    filesRef.current.files = dt.files;
  }, [files]);

  function addFiles(incoming: FileList | File[]) {
    const arr = Array.from(incoming);
    setFiles((prev) => {
      const merged = [...prev];
      for (const f of arr) {
        if (merged.length >= MAX_FILES) break;
        if (f.size > MAX_FILE_SIZE) continue;
        if (merged.some((x) => x.name === f.name && x.size === f.size)) continue;
        merged.push(f);
      }
      return merged;
    });
  }

  return (
    <article className="icard icard--primary">
      <span className="icard__badge">{t(locale).sources.recommended}</span>
      <p className="icard__num">{d.num}</p>
      <h3 className="icard__title">{d.title}</h3>
      <p className="icard__sub">{d.sub}</p>

      <form action={formAction} className="flex flex-col gap-4 icard__body">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hp" />
        <input type="hidden" name="locale" value={locale} />

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); }
          }}
          className="cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center transition-colors"
          style={{
            borderColor: dragOver ? "var(--accent)" : "rgba(24,20,16,0.22)",
            background: dragOver ? "var(--cream-2)" : "transparent",
          }}
        >
          <p className="label-mono mb-1">{d.zoneLead}</p>
          <p className="font-semibold">{d.zoneTitle}</p>
          <p className="text-xs mt-1" style={{ color: "var(--soft)" }}>{d.zoneHint}</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        <input ref={filesRef} type="file" name="files" multiple className="hidden" tabIndex={-1} aria-hidden />

        {files.length > 0 && (
          <ul className="flex flex-col gap-2 max-h-[180px] overflow-y-auto">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-sm"
                style={{ background: "rgba(24,20,16,0.06)" }}
              >
                <span className="truncate flex-1">{f.name}</span>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  className="text-base ml-3 leading-none"
                  style={{ color: "var(--accent)" }}
                  aria-label="remove"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {state?.error && (
          <p
            className="text-sm rounded-xl px-3 py-2"
            style={{ background: "rgba(230,80,66,0.12)", color: "var(--coral-deep)" }}
          >
            {state.error}
          </p>
        )}

        <SubmitButton label={d.cta} pendingLabel={d.ctaPending} disabled={files.length === 0} />

        <p className="text-xs" style={{ color: "var(--soft)" }}>{d.note}</p>
      </form>
    </article>
  );
}

function SubmitButton({ label, pendingLabel, disabled }: { label: string; pendingLabel: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="pill pill--ink pill--arrow self-start"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
