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

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  // pdfjs-dist is browser-capable; we use a dynamic import so it never runs on the server.
  const pdfjsLib = await import("pdfjs-dist/build/pdf.js");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjs: any = pdfjsLib;

  const loadingTask = pdfjs.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;

  let text = "";
  const numPages: number = pdf.numPages;
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => ("str" in item ? (item as { str: string }).str : ""))
      .join(" ");
    text += pageText + "\n";
  }

  return text;
}

async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  // result.value contains the extracted text.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return (result && (result as { value?: string }).value) || "";
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

