"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { generateProfile, type GenerateState } from "@/app/actions/generate";

const ACCEPT = ".txt,.md,.markdown,.pdf,.docx";
const MAX_FILES = 20;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function GenerateForm() {
  const [state, formAction] = useActionState<GenerateState, FormData>(
    generateProfile,
    {}
  );
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function onPickClick() {
    inputRef.current?.click();
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <label
          htmlFor="email"
          className="label-mono block mb-2"
          style={{ color: "var(--color-soft)" }}
        >
          Deine E-Mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="du@beispiel.de"
          className="w-full bg-white border-2 border-[var(--color-ink)] rounded-2xl px-5 py-4 text-base outline-none focus:border-[var(--color-coral)] transition-colors"
        />
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="absolute left-[-9999px] w-1 h-1 opacity-0"
        />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        onClick={onPickClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPickClick();
          }
        }}
        className={[
          "cursor-pointer border-2 border-dashed rounded-2xl p-8 text-center transition-colors",
          dragOver
            ? "border-[var(--color-coral)] bg-[var(--color-cream)]"
            : "border-[var(--color-ink)] bg-white hover:border-[var(--color-coral)]",
        ].join(" ")}
      >
        <p className="label-mono mb-2">Deine Texte</p>
        <p className="text-lg font-medium mb-1">
          Drop &middot; Click &middot; Pick
        </p>
        <p
          className="text-sm"
          style={{ color: "var(--color-soft)" }}
        >
          TXT, MD, PDF, DOCX &middot; max 20 Files / je 5 MB
        </p>
        <input
          ref={inputRef}
          name="files"
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

      {/* Sync state-files into form via hidden input — Server Action uses
          formData.getAll("files"), so we re-emit them through a fresh DataTransfer.
          NB: in the actual submit, browsers serialize <input type=file> values.
          We mirror state into a controlled input below. */}
      <ControlledFileList files={files} onRemove={removeFile} />

      {state?.error && (
        <p
          className="text-sm rounded-xl px-4 py-3"
          style={{
            background: "rgba(230,80,66,0.12)",
            color: "var(--color-coral-deep)",
          }}
        >
          {state.error}
        </p>
      )}

      <SubmitButton disabled={files.length === 0} />

      <p className="text-xs" style={{ color: "var(--color-soft)" }}>
        Du gibst uns deine E-Mail. Wir schicken dir den Permalink zu deinem
        Profil. Wir verkaufen sie nicht weiter. Wenn du nichts mehr von uns
        willst, sag Bescheid &mdash; gelöscht.
      </p>
    </form>
  );
}

function ControlledFileList({
  files,
  onRemove,
}: {
  files: File[];
  onRemove: (i: number) => void;
}) {
  // Hidden DataTransfer-backed input that holds the actual File objects
  // so Server Action receives them via formData.getAll("files").
  const ref = useRef<HTMLInputElement>(null);

  // Sync files into the hidden input each render
  if (typeof window !== "undefined" && ref.current) {
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    ref.current.files = dt.files;
  }

  if (files.length === 0) {
    return (
      <input
        ref={ref}
        type="file"
        name="files"
        multiple
        className="hidden"
        tabIndex={-1}
        aria-hidden
      />
    );
  }

  return (
    <>
      <input
        ref={ref}
        type="file"
        name="files"
        multiple
        className="hidden"
        tabIndex={-1}
        aria-hidden
      />
      <ul className="flex flex-col gap-2">
        {files.map((f, i) => (
          <li
            key={`${f.name}-${i}`}
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: "rgba(24,20,16,0.06)" }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{f.name}</p>
              <p
                className="text-xs"
                style={{ color: "var(--color-soft)" }}
              >
                {formatBytes(f.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="text-xs ml-3 underline decoration-[var(--color-coral)] underline-offset-4"
              style={{ color: "var(--color-coral)" }}
            >
              Entfernen
            </button>
          </li>
        ))}
      </ul>
    </>
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

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
