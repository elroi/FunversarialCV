/**
 * PDFium (WASM) fallback for PDF text extraction when pdfjs-dist fails.
 * Loaded only on fallback path; WASM is fetched from CDN on first use.
 * @see docs/PDF_CLIENT_EXTRACTION_RESEARCH.md
 */

// Instance type: loose type to avoid circular reference (Awaited<ReturnType<typeof loadPdfium>>).
type PdfiumInstance = any; // PDFium init return type not exported

let pdfiumInstance: PdfiumInstance | null = null;

async function loadPdfium(): Promise<PdfiumInstance> {
  if (pdfiumInstance) return pdfiumInstance;
  const { init } = await import(
    /* webpackChunkName: "embedpdf-pdfium" */ "@embedpdf/pdfium"
  );
  const wasmUrl =
    "https://cdn.jsdelivr.net/npm/@embedpdf/pdfium@2.8.0/dist/pdfium.wasm";
  const response = await fetch(wasmUrl);
  const wasmBinary = await response.arrayBuffer();
  pdfiumInstance = (await init({ wasmBinary })) as PdfiumInstance;
  pdfiumInstance.PDFiumExt_Init();
  return pdfiumInstance;
}

/**
 * Extract text from a PDF buffer using PDFium (Google's engine, WASM).
 * Used only when pdfjs-dist fails so we can avoid sending PII to the server.
 */
export async function extractPdfTextWithPdfium(buffer: ArrayBuffer): Promise<string> {
  const pdfium = await loadPdfium();
  const data = new Uint8Array(buffer);
  const filePtr = pdfium.pdfium.wasmExports.malloc(data.length);
  if (filePtr === 0) {
    throw new Error("PDFium: failed to allocate memory for PDF");
  }
  try {
    pdfium.pdfium.HEAPU8.set(data, filePtr);
    const docPtr = pdfium.FPDF_LoadMemDocument(filePtr, data.length, "");
    if (docPtr === 0) {
      const err = pdfium.FPDF_GetLastError();
      throw new Error(`PDFium: failed to load PDF (error ${err})`);
    }
    try {
      const pageCount = pdfium.FPDF_GetPageCount(docPtr);
      const parts: string[] = [];
      for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        const pagePtr = pdfium.FPDF_LoadPage(docPtr, pageIndex);
        if (pagePtr === 0) continue;
        try {
          const textPagePtr = pdfium.FPDFText_LoadPage(pagePtr);
          if (textPagePtr === 0) continue;
          try {
            const charCount = pdfium.FPDFText_CountChars(textPagePtr);
            if (charCount <= 0) continue;
            const bufferSize = (charCount + 1) * 2;
            const textBufferPtr = pdfium.pdfium.wasmExports.malloc(bufferSize);
            if (textBufferPtr === 0) continue;
            try {
              pdfium.FPDFText_GetText(
                textPagePtr,
                0,
                charCount,
                textBufferPtr
              );
              const pageText = pdfium.pdfium.UTF16ToString(textBufferPtr);
              if (pageText) parts.push(pageText);
            } finally {
              pdfium.pdfium.wasmExports.free(textBufferPtr);
            }
          } finally {
            pdfium.FPDFText_ClosePage(textPagePtr);
          }
        } finally {
          pdfium.FPDF_ClosePage(pagePtr);
        }
      }
      return parts.join("\n");
    } finally {
      pdfium.FPDF_CloseDocument(docPtr);
    }
  } finally {
    pdfium.pdfium.wasmExports.free(filePtr);
  }
}
