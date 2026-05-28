import mammoth from "mammoth";

export interface ExtractedFile {
  filename: string;
  content: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB per file
const MAX_TOTAL_FILES = 20;

export async function extractTextFromFiles(files: File[]): Promise<ExtractedFile[]> {
  if (files.length === 0) {
    throw new Error("Keine Dateien hochgeladen.");
  }
  if (files.length > MAX_TOTAL_FILES) {
    throw new Error(`Maximal ${MAX_TOTAL_FILES} Dateien auf einmal.`);
  }

  const result: ExtractedFile[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `Die Datei "${file.name}" ist zu groß (${formatBytes(file.size)}). Max ${formatBytes(MAX_FILE_SIZE)} pro Datei.`
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const buffer = Buffer.from(await file.arrayBuffer());

    let content: string;
    if (ext === "txt" || ext === "md" || ext === "markdown") {
      content = buffer.toString("utf-8");
    } else if (ext === "docx") {
      const r = await mammoth.extractRawText({ buffer });
      content = r.value;
    } else if (ext === "pdf") {
      content = await extractPdf(buffer);
    } else {
      throw new Error(
        `Datei-Format ".${ext}" nicht unterstützt. Erlaubt: TXT, MD, DOCX, PDF.`
      );
    }

    const cleaned = content.replace(/\r\n/g, "\n").replace(/\s+\n/g, "\n").trim();
    if (cleaned.length < 50) {
      // Skip near-empty extracts
      continue;
    }

    result.push({ filename: file.name, content: cleaned });
  }

  if (result.length === 0) {
    throw new Error(
      "Aus den hochgeladenen Dateien konnte kein nutzbarer Text extrahiert werden."
    );
  }

  return result;
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // pdf-parse is CJS; dynamic import to keep ESM build happy
  const mod = await import("pdf-parse");
  const pdfParse: (buf: Buffer) => Promise<{ text: string }> =
    (mod as unknown as { default: typeof pdfParse }).default ??
    (mod as unknown as typeof pdfParse);
  const data = await pdfParse(buffer);
  return data.text;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function countWords(texts: ExtractedFile[]): number {
  return texts.reduce(
    (sum, t) => sum + t.content.split(/\s+/).filter(Boolean).length,
    0
  );
}
