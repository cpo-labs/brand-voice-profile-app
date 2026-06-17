"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { generateProfile, type GenerateState } from "@/app/actions/generate";
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE, MAX_TOTAL_FILES, extOf } from "@/lib/upload-limits";
import { t, type Locale } from "@/lib/i18n";

const ACCEPT = ".txt,.md,.markdown,.pdf,.docx";
// Ab hier weisen wir auf langsamere Analyse hin (Soft-Hinweis, kein Block).
const LONG_INPUT_BYTES = 2 * 1024 * 1024;
const LONG_INPUT_FILES = 12;

export function DropCard({ locale }: { locale: Locale }) {
  const d = t(locale).sources.drop;
  const [state, formAction, isPending] = useActionState<GenerateState, FormData>(generateProfile, {});
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  // Client-seitige Ablehnungen (Format/Groesse/Anzahl) — getrennt vom
  // serverseitigen state.error (z.B. "kein nutzbarer Text").
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);

  // Keep the hidden multi-file input in sync so the Server Action receives them.
  useEffect(() => {
    if (!filesRef.current) return;
    const dt = new DataTransfer();
    for (const f of files) dt.items.add(f);
    filesRef.current.files = dt.files;
  }, [files]);

  const totalBytes = useMemo(() => files.reduce((sum, f) => sum + f.size, 0), [files]);
  const showLongHint = files.length >= LONG_INPUT_FILES || totalBytes >= LONG_INPUT_BYTES;

  function addFiles(incoming: FileList | File[]) {
    const arr = Array.from(incoming);
    const rejects: string[] = [];
    setFiles((prev) => {
      const merged = [...prev];
      for (const f of arr) {
        if (merged.length >= MAX_TOTAL_FILES) {
          rejects.push(d.rejectMany(MAX_TOTAL_FILES));
          break;
        }
        if (!ALLOWED_EXTENSIONS.includes(extOf(f.name) as (typeof ALLOWED_EXTENSIONS)[number])) {
          rejects.push(d.rejectFormat(f.name));
          continue;
        }
        if (f.size > MAX_FILE_SIZE) {
          rejects.push(d.rejectLarge(f.name));
          continue;
        }
        if (merged.some((x) => x.name === f.name && x.size === f.size)) continue;
        merged.push(f);
      }
      return merged;
    });
    setNotice(rejects.length ? rejects[0] : null);
  }

  return (
    <article className="icard icard--primary">
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

        {showLongHint && !isPending && (
          <p className="text-xs rounded-xl px-3 py-2" style={{ background: "rgba(24,20,16,0.06)", color: "var(--soft)" }}>
            {d.longHint}
          </p>
        )}

        {/* Client-Ablehnung (notice) hat Vorrang; sonst der Server-Fehler. */}
        {(notice ?? (!isPending ? state?.error : null)) && (
          <p
            className="text-sm rounded-xl px-3 py-2"
            style={{ background: "rgba(230,80,66,0.12)", color: "var(--coral-deep)" }}
          >
            {notice ?? state?.error}
          </p>
        )}

        <label className="flex flex-col gap-1 text-sm">
          <span className="label-mono">{d.emailLabel}</span>
          <input
            type="email"
            name="email"
            placeholder={d.emailPlaceholder}
            autoComplete="email"
            required
            disabled={isPending}
            className="rounded-xl px-3 py-2 border"
            style={{ borderColor: "rgba(24,20,16,0.22)", background: "var(--cream-2)" }}
          />
          <span className="text-xs" style={{ color: "var(--soft)" }}>{d.emailHint}</span>
        </label>

        {isPending ? (
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
            style={{ background: "var(--cream-2)", color: "var(--ink)" }}
            role="status"
            aria-live="polite"
          >
            <span
              aria-hidden
              className="inline-block w-4 h-4 rounded-full animate-spin shrink-0"
              style={{ border: "2px solid rgba(24,20,16,0.22)", borderTopColor: "var(--accent)" }}
            />
            <span>{d.progress}</span>
          </div>
        ) : (
          <button
            type="submit"
            disabled={files.length === 0}
            className="pill pill--ink pill--arrow self-start"
          >
            {d.cta}
          </button>
        )}

        <p className="text-xs" style={{ color: "var(--soft)" }}>{d.note}</p>
      </form>
    </article>
  );
}
