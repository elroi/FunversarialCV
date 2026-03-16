/**
 * Browser-side text extraction helpers for PDF and DOCX.
 * Used only in the client to support PII dehydration before upload.
 */

const MIME_PDF = "application/pdf";
const MIME_DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export { MIME_PDF, MIME_DOCX };

export async function extractTextFromFileInBrowser(
  file: File | Blob
): Promise<{ text: string; mimeType: string }> {
  const type = file.type;
  const buf = await file.arrayBuffer();

  if (type === "text/plain") {
    const text = new TextDecoder().decode(buf);
    return { text, mimeType: "text/plain" };
  }

  if (type === MIME_PDF) {
    const text = await extractPdfText(buf);
    return { text, mimeType: MIME_PDF };
  }

  if (type === MIME_DOCX) {
    const text = await extractDocxText(buf);
    return { text, mimeType: MIME_DOCX };
  }

  throw new Error(
    `extractTextFromFileInBrowser: unsupported file type ${type || "(unknown)"}`
  );
}

/** Minimal type for pdfjs-dist getDocument result (avoids pulling in full typings). */
interface PdfPageTextItem {
  str?: string;
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  try {
    return await extractPdfTextWithPdfjs(buffer);
  } catch {
    const { extractPdfTextWithPdfium } = await import(
      /* webpackChunkName: "clientPdfium" */ "./clientPdfium"
    );
    return extractPdfTextWithPdfium(buffer);
  }
}

async function extractPdfTextWithPdfjs(buffer: ArrayBuffer): Promise<string> {
  // pdfjs-dist is browser-capable; we use a dynamic import so it never runs on the server.
  // Pinned to 5.3.93: 5.4.394+ has "Object.defineProperty called on non-object" with Next.js/webpack.
  // webpackChunkName ensures a stable chunk path so Next.js serves it correctly.
  // Some PDFs (e.g. certain compression) may still throw; then we try PDFium fallback.
  const pdfjsLib = await import(
    /* webpackChunkName: "pdfjs-dist" */ "pdfjs-dist"
  );
  const pdfjs = pdfjsLib as {
    version?: string;
    GlobalWorkerOptions?: { workerSrc: string };
    getDocument(opts: { data: ArrayBuffer }): {
      promise: Promise<{
        numPages: number;
        getPage(n: number): Promise<{
          getTextContent(): Promise<{ items: PdfPageTextItem[] }>;
        }>;
      }>;
    };
  };
  // Worker must match the library version (API vs Worker version check). Use version in URL so we don't load a cached worker from a different install.
  const version = pdfjs.version ?? "";
  if (typeof window !== "undefined" && pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs?v=${version}`;
  }

  const loadingTask = pdfjs.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;

  let text = "";
  const numPages: number = pdf.numPages;
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: PdfPageTextItem) => (item.str ?? ""))
      .join(" ");
    text += pageText + "\n";
  }

  return text;
}

async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return (result as { value?: string }).value ?? "";
}

/**
 * Extract plain text from a buffer (e.g. server response). Used for rehydration.
 */
export async function extractTextFromBuffer(
  buffer: ArrayBuffer,
  mimeType: string
): Promise<string> {
  if (mimeType === "text/plain") {
    return new TextDecoder().decode(buffer);
  }
  if (mimeType === MIME_PDF) {
    return extractPdfText(buffer);
  }
  if (mimeType === MIME_DOCX) {
    return extractDocxText(buffer);
  }
  throw new Error(
    `extractTextFromBuffer: unsupported mimeType ${mimeType}`
  );
}

