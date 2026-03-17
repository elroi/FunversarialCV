# Research: Alternative client-side PDF libraries to reduce PII sent to server

**Goal:** Find JavaScript PDF libraries that can extract text in the browser for PDFs our current stack cannot handle, so we can avoid sending PII to the server when client-side dehydration would otherwise fail.

**Current stack (summary):**
- **Client:** `pdfjs-dist` 5.3.93 in `frontend/src/lib/clientDocumentExtract.ts` — `getDocument({ data })` → `getPage()` → `getTextContent()`. Pinned to 5.3.93 due to `Object.defineProperty called on non-object` in 5.4.x with Next.js/webpack.
- **Server:** `pdf-parse` (PDF.js wrapper) in `documentExtract.ts` for Node.
- **Failures that trigger server fallback:** Errors matching `/defineProperty|non-object|Invalid PDF/i` (see `app/page.tsx`), and in practice also “Unknown compression method in flate stream” and similar PDF.js parsing errors.

---

## 1. Options that use a **different engine** (can handle different PDFs)

### 1.1 PDFium via WebAssembly — **@embedpdf/pdfium**

- **Engine:** Google’s PDFium (C++ compiled to WASM), not PDF.js.
- **Use case:** Rendering and **text extraction** in browser and Node.
- **API (conceptually):** `init()` → `FPDF_LoadMemDocument(buffer)` → `FPDF_LoadPage()` → `FPDFText_LoadPage()` → `FPDFText_GetText()` (UTF-16LE) → convert to JS string.
- **Pros:**
  - Different parser; may succeed on PDFs that PDF.js rejects (e.g. some compression or malformed streams).
  - Native-quality implementation; good for edge cases.
- **Cons:**
  - WASM binary (CDN or self-host), different API, integration effort.
  - Bundle size and init cost; best as a **fallback** after PDF.js fails rather than primary.
- **NPM:** `@embedpdf/pdfium` (e.g. ~72.8K weekly downloads), MIT/Apache.
- **Docs:** [embedpdf.com/docs/pdfium](https://www.embedpdf.com/docs/pdfium/introduction), [Extracting Text from PDF Pages](https://www.embedpdf.com/docs/pdfium/examples/extract-text-from-pdf).

**Recommendation:** Add as **second-step fallback** in the client: try `pdfjs-dist` → on throw, try `@embedpdf/pdfium` → if both fail, show “Server-side processing required” and send to server. This directly reduces how often PII is sent for “problem” PDFs that PDFium can parse.

---

## 2. Options that **wrap or rebundle PDF.js** (same engine, different packaging)

### 2.1 unpdf — **unjs/unpdf**

- **What it is:** Wrapper around a **custom serverless build of PDF.js** (e.g. 5.4.296 / 5.4.394). Worker inlined, WASM stripped, string replacements and global mocks for edge/Node/browser.
- **API:** `getDocumentProxy(buffer)` → `extractText(pdf, { mergePages: true })` → `{ totalPages, text }`.
- **Pros:**
  - Single dependency, no separate worker file to host; could simplify our worker setup.
  - One API for browser + Node + serverless; might avoid the `defineProperty` issue if their build patches it.
  - Actively maintained (UnJS), ~280K+ weekly downloads.
- **Cons:**
  - Still PDF.js under the hood; **same parsing limits** (e.g. “Invalid PDF”, “Unknown compression method”). Won’t fix PDFs that PDF.js fundamentally can’t parse.
- **NPM:** `unpdf`.

**Recommendation:** Consider as a **replacement for raw `pdfjs-dist`** in the client to simplify worker handling and possibly use a patched 5.4 build. Not a solution by itself for “PDFs pdfjs can’t handle”; pair with a different engine (e.g. PDFium) for that.

### 2.2 mehmet-kozan/pdf-parse

- **What it is:** Cross-platform (Node + browser) PDF parser; extracts text, images, tables; can render pages as PNG.
- **Engine:** Still uses **pdfjs-dist**.
- **Conclusion:** Same engine, same class of failures; no gain for “problem” PDFs. Can be skipped for this goal.

### 2.3 pdf.js-extract

- **What it is:** Thin wrapper around pdf.js adding text + (x,y) coordinates.
- **Conclusion:** Same engine; no additional robustness for parsing failures.

---

## 3. PDF.js upstream behavior (for context)

- **defineProperty / Next.js:** Known regression in pdfjs-dist **5.4.394+** with webpack (e.g. Next.js): `Object.defineProperty called on non-object` during module init. Workaround in the wild is to stay on **5.3.93** (or 5.4.54 and below). Issues: mozilla/pdf.js#20435, #20478.
- **Compression / flate:** PDF.js has had fixes for “Unknown compression method in flate stream” and ill-formed streams (e.g. not throwing in some cases, fallbacks in XRef). Newer 5.4.x would theoretically handle more edge cases, but we can’t safely upgrade until the defineProperty/Next.js issue is fixed.
- **Practical takeaway:** Relying only on upgrading pdfjs-dist is blocked; adding a **different engine** (e.g. PDFium) is the way to cover PDFs that current PDF.js cannot parse.

---

## 4. Summary and suggested direction

| Approach | Reduces PII to server? | Effort | Notes |
|----------|------------------------|--------|--------|
| **Add PDFium (@embedpdf/pdfium) as fallback** | Yes, for PDFs only PDFium can parse | Medium | Different engine; try after pdfjs fails. |
| **Replace pdfjs with unpdf** | No (same engine) | Low | Simplifies worker; may allow newer PDF.js build. |
| **Upgrade pdfjs-dist** | Maybe (more PDFs parsed) | Blocked | Blocked by defineProperty in 5.4.x. |
| **Other wrappers (pdf-parse, pdf.js-extract)** | No | — | Same engine. |

**Client implementation (done):** Client uses pdfjs-dist first; on throw, tries `extractPdfTextWithPdfium` from `clientPdfium.ts` (PDFium WASM). If both fail, user sees “Server-side processing required” and may send the PDF to the server. PDFium WASM is loaded from `cdn.jsdelivr.net` (WASM binary only; no PDF content sent).

**Concrete next steps:**

1. **Implement PDFium fallback (client):**  
   In `clientDocumentExtract.ts`, keep current pdfjs-based `extractPdfText()`. On throw, call a new `extractPdfTextWithPdfium(buffer)` using `@embedpdf/pdfium`; if that also fails, rethrow so the app can show the server-PDF confirmation dialog. This preserves current behavior and adds a second engine only where needed.

2. **Optional — try unpdf:**  
   Spike replacing `pdfjs-dist` with `unpdf` in the client (single entry point, no worker path). Run existing E2E and manual tests; if defineProperty is gone and extraction still works, consider switching. Still keep PDFium as fallback for PDFs that PDF.js (whether raw or via unpdf) cannot parse.

3. **Track PDF.js:**  
   Watch mozilla/pdf.js#20435 / #20478 (and any “fix” in 5.4.x). When a version is safe with Next.js/webpack, re-evaluate upgrading to get latest flate/stream handling; PDFium fallback remains valuable for PDFs that only PDFium handles.

---

## 5. References

- [@embedpdf/pdfium – npm](https://www.npmjs.com/package/@embedpdf/pdfium)  
- [EmbedPDF PDFium – Text extraction example](https://www.embedpdf.com/docs/pdfium/examples/extract-text-from-pdf)  
- [unpdf – GitHub](https://github.com/unjs/unpdf)  
- [PDF.js defineProperty regression (5.4.394) – Issue #20435](https://github.com/mozilla/pdf.js/issues/20435)  
- [PDF.js “Unknown compression method in flate stream” – Issue #6316](https://github.com/mozilla/pdf.js/issues/6316)  
- [mehmet-kozan/pdf-parse](https://github.com/mehmet-kozan/pdf-parse)  
- [pdf.js-extract (npm)](https://www.npmjs.com/package/pdf.js-extract)

**Tech debt / tracking:** We remain on pdfjs-dist 5.3.93 due to [mozilla/pdf.js#20435](https://github.com/mozilla/pdf.js/issues/20435) / [#20478](https://github.com/mozilla/pdf.js/issues/20478). When a pdfjs-dist version is confirmed to work with Next.js/webpack (no defineProperty error), re-evaluate upgrading to get latest flate/stream handling; PDFium fallback remains for PDFs only it can parse.
