import { draftFromFieldpiece, type FieldpieceDraft } from "./fieldpiece";
import type { ChargeReading } from "./types";

/** Read a Fieldpiece PDF or photo on the phone. Nothing is uploaded. */
export async function readFieldpieceFile(file: Blob, base: ChargeReading): Promise<FieldpieceDraft> {
  const text = file.type.includes("pdf") || fileName(file).toLowerCase().endsWith(".pdf")
    ? await textFromPdf(file)
    : await textFromImage(file);
  if (!text.trim()) throw new Error("empty");
  return draftFromFieldpiece(text, base);
}

function fileName(file: Blob): string {
  return "name" in file && typeof file.name === "string" ? file.name : "";
}

async function textFromPdf(file: Blob): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let index = 1; index <= doc.numPages; index += 1) {
    const page = await doc.getPage(index);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  return pages.join("\n");
}

async function textFromImage(file: Blob): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js",
    corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/tesseract-core-simd-lstm.wasm.js",
    langPath: "https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0",
  });
  try {
    const result = await worker.recognize(file);
    return result.data.text;
  } finally {
    await worker.terminate();
  }
}
