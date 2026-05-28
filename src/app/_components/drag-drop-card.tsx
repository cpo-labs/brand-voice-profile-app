"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { generateProfile, type GenerateState } from "@/app/actions/generate";

const ACCEPT = ".txt,.md,.markdown,.pdf,.docx";
const MAX_FILES = 20;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface Props {
  email: string;
  emailConfirmed: boolean;
}

export function DragDropCard({ email, emailConfirmed }: Props) {
  const [state, formAction] = useActionState<GenerateState, FormData>(
    generateProfile,
    {}
  );
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);

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

  const disabled = !emailConfirmed;
  const canSubmit = emailConfirmed && files.length > 0;

  return (
    <article className={`icard ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <p className="icard__num">01 · Drop &amp; Generate</p>
      <h3 className="icard__title">Texte direkt hochladen</h3>
      <p className="icard__sub">
        Ein paar PDFs, DOCX, MD oder TXT — was du eh schon geschrieben hast.
        Schnellster Weg, kein Account-Verbindungs-Wahnsinn.
      </p>

      <form action={formAction} className="flex flex-col gap-4 icard__body">
        <input type="hidden" name="email" value={email} />
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="absolute left-[-9999px] w-1 h-1 opacity-0"
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (!disabled && e.dataTransfer.files.length)
              addFiles(e.dataTransfer.files);
          }}
          onClick={() => !disabled && inputRef.current?.click()}
          role="button"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={`cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${
            dragOver
              ? "border-[var(--color-coral)] bg-[var(--color-cream-2)]"
              : "border-[var(--color-ink)] hover:border-[var(--color-coral)]"
          }`}
        >
          <p className="label-mono mb-1">Deine Texte</p>
          <p className="font-semibold">Drop · Click · Pick</p>
          <p className="text-xs mt-1" style={{ color: "var(--color-soft)" }}>
            TXT · MD · PDF · DOCX
          </p>
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

        <input
          ref={filesRef}
          type="file"
          name="files"
          multiple
          className="hidden"
          tabIndex={-1}
          aria-hidden
        />

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
                  className="text-xs ml-3"
                  style={{ color: "var(--color-coral)" }}
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
            style={{
              background: "rgba(230,80,66,0.12)",
              color: "var(--color-coral-deep)",
            }}
          >
            {state.error}
          </p>
        )}

        <SubmitButton disabled={!canSubmit} />

        <p className="text-xs" style={{ color: "var(--color-soft)" }}>
          Max 20 Files · 5 MB pro File. Wir speichern nur das generierte Profil,
          nicht die Quelltexte.
        </p>
      </form>
    </article>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="pill pill--ink pill--arrow disabled:opacity-50 disabled:cursor-not-allowed self-start"
    >
      {pending ? "Generiere…" : "Profil generieren"}
    </button>
  );
}
