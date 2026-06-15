// Client-safe Upload-Grenzen + Datei-Helfer. Bewusst OHNE schwere Imports
// (mammoth/pdf-parse leben in text-extraction.ts), damit dieses Modul auch in
// Client-Komponenten importiert werden kann, ohne den Server-Code zu bundlen.
// Single source of truth fuer Server-Extraktion UND Upload-Karte.

export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB pro Datei
export const MAX_TOTAL_FILES = 20;
export const ALLOWED_EXTENSIONS = ["txt", "md", "markdown", "pdf", "docx"] as const;

export function extOf(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}
