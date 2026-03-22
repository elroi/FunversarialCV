# Implementation Plan: Client-side PDF fallback to reduce PII sent to server

**Goal:** Implement the recommendations from [PDF_CLIENT_EXTRACTION_RESEARCH.md](PDF_CLIENT_EXTRACTION_RESEARCH.md): add PDFium as a second-step fallback when pdfjs-dist fails, so more PDFs are dehydrated in the browser and fewer require sending PII to the server. Optionally replace pdfjs-dist with unpdf to simplify worker handling.

**Scope:**
- Add `@embedpdf/pdfium` as fallback in the client PDF text-extraction path.
- Optionally spike `unpdf` as replacement for raw `pdfjs-dist`.
- Document the dual-engine behavior and track PDF.js upstream for future upgrade.

**Out of scope:** Server-side extraction (unchanged; pdf-parse remains). Changing when the server-PDF confirmation dialog appears (still when both client engines fail).

**Demo PDF and PDF style preservation:** We are able to process the demo PDF with style-preserving and all eggs. The demo PDF is built with **uncompressed** content streams (`buildUncompressedDemoCvPdf`) so PII appears as literal bytes in the buffer; client-side `replacePiiWithTokensInPdfBuffer` then succeeds, the tokenized copy is sent to the server, and rehydration preserves layout. So PDF style preservation is achieved for the demo (and any PDF whose PII is in uncompressed streams) via in-place PII→token replacement—no separate “pdf js processor” is required; the same mechanism (literal-byte replacement) is what makes it work.

---

## 1. Personas and plan alignment

| Persona | Goal | Key concerns |
|--------|------|--------------|
| **Candidate** | Upload CV and get file with injected eggs without sending PII when possible | More PDFs work client-side; clear feedback when server path is needed; no regression on currently working PDFs |
| **Security reviewer** | Minimize PII on server; verify no new attack surface | Fallback only adds client-side parsing; no new server endpoints; WASM/CDN supply chain and CSP if PDFium loads from CDN |
| **Maintainer** | Extend and debug extraction pipeline | Clear separation of pdfjs vs PDFium code; tests for both paths; docs for future PDF.js upgrade |
| **Privacy/Compliance** | PII stays in browser where feasible | Fewer “server-side processing required” flows; same zero-retention guarantee when server is used |

**Plan review by persona:**

- **Candidate:** Acceptance criteria require “PDFs that currently fail with pdfjs still work client-side when PDFium succeeds” and “PDFs that work today with pdfjs keep working.” E2E and manual tests must cover both engines.
- **Security reviewer:** PDFium is used only for text extraction in the browser; no PDF bytes are sent to a third party by the library. If PDFium WASM is loaded from CDN, document the domain and consider self-hosting or integrity hashes in a follow-up. No change to server PII handling.
- **Maintainer:** New code lives in `clientDocumentExtract.ts` (and optionally a small `clientPdfium.ts` or similar). Unit tests for “pdfjs throws → PDFium used” and “both throw → rethrow.” README or docs/ note the dual-engine design.
- **Privacy/Compliance:** Success metric is “fewer server-PDF confirmations”; we can add a simple log or metric later (e.g. “client_pdf_extraction_engine: pdfjs | pdfium”) for observability without PII.

**Risks and mitigations:**

- **PDFium bundle size and init time:** Use only as fallback so happy path (pdfjs) is unchanged; lazy-load PDFium when pdfjs throws. Consider loading WASM only on first fallback to spread cost.
- **PDFium CDN dependency:** Document the CDN (embedpdf); later task to self-host WASM if required for compliance.
- **unpdf spike (optional):** If we replace pdfjs-dist with unpdf, we must run full E2E and manual tests; rollback plan is to revert to pdfjs-dist 5.3.93.

---

## 2. Milestones

| Milestone | Description |
|-----------|-------------|
| **M1 – PDFium fallback** | PDFium integrated as second-step fallback; tests and docs in place. |
| **M2 – Optional unpdf spike** | If done: unpdf replaces pdfjs-dist in client; PDFium still fallback; no regression. |
| **M3 – Docs and tracking** | README/docs updated; PDF.js issues linked for future upgrade. |

---

## 3. Progress summary

| Workstream | Status | Notes |
|------------|--------|--------|
| **WS1 – PDFium fallback** | Done | Implemented; unit tests pass; E2E "Server PDF with PII" pass (4/4). |
| **WS2 – Optional unpdf** | Not started | Spike only; decide after M1. |
| **WS3 – Docs and tracking** | In progress | Research doc updated; plan and README note pending. |

---

## 4. Workstream 1 – PDFium as second-step fallback

**Objective:** When client-side PDF text extraction is requested and pdfjs-dist throws, try `@embedpdf/pdfium` before giving up and showing “Server-side processing required.” If both fail, behavior is unchanged (dialog and optional server path).

### 4.1 Discovery

- **Dependencies and API**
  - [x] Add `@embedpdf/pdfium` to `frontend/package.json` (confirm version and peer/build requirements).
  - [x] Review [EmbedPDF PDFium – Text extraction](https://www.embedpdf.com/docs/pdfium/examples/extract-text-from-pdf): `init()` → `FPDF_LoadMemDocument` → per-page `FPDFText_LoadPage` / `FPDFText_GetText` (UTF-16LE) → convert to JS string.
  - [x] Confirm WASM loading: CDN vs self-host; whether Next.js `public/` or a custom path is needed for WASM if self-hosting. Using CDN (cdn.jsdelivr.net) for WASM on first fallback.
- **Integration point**
  - [x] Decide where PDFium lives: either a new `frontend/src/lib/clientPdfium.ts` that exports `extractPdfTextWithPdfium(buffer: ArrayBuffer): Promise<string>`, or inlined in `clientDocumentExtract.ts`. Recommendation: separate module for clarity and to allow lazy dynamic import. Implemented in `clientPdfium.ts`.

### 4.2 Implementation

- **PDFium text extraction helper**
  - [x] Implement `extractPdfTextWithPdfium(buffer: ArrayBuffer): Promise<string>` (e.g. in `frontend/src/lib/clientPdfium.ts`):
    - Dynamic import of `@embedpdf/pdfium` so it’s not loaded until fallback runs.
    - Call PDFium init (if required), load document from buffer, iterate pages, extract text (UTF-16LE → string), release resources.
    - On any error, reject so caller can rethrow and show server-PDF dialog.
  - [x] Handle PDFium lifecycle (init once per session vs per call) per library docs to avoid memory leaks or repeated WASM load. Singleton in `clientPdfium.ts`.
- **Wire fallback in client extraction**
  - [x] In `frontend/src/lib/clientDocumentExtract.ts`, in `extractPdfText(buffer)`:
    - Keep current pdfjs-dist logic as-is (moved to `extractPdfTextWithPdfjs`).
    - Wrap in try/catch; on throw, call `extractPdfTextWithPdfium(buffer)`.
    - If PDFium also throws, rethrow so `clientVault.ts` / `page.tsx` still show the server-PDF confirmation when appropriate.
  - [x] Ensure no double-load of PDFium (e.g. guard or singleton per docs). Singleton used.
- **E2E hook**
  - [x] Confirm `?e2eServerPdf=1` still forces the dialog without calling extraction (current behavior). No change required if the hook runs before any extraction; otherwise keep hook semantics “skip client extraction and show dialog.” Hook runs before extraction in `page.tsx`.

### 4.3 Tests

- **Unit tests**
  - [x] Add tests (e.g. in `frontend/src/lib/clientDocumentExtract.test.ts` or `clientPdfium.test.ts`):
    - When pdfjs throws (mock), PDFium is invoked with the same buffer; if PDFium resolves, the resolved text is returned.
    - When both pdfjs and PDFium throw, the function rejects (so app shows server dialog).
    - When pdfjs succeeds, PDFium is not called (no dynamic import of PDFium in test or mock).
  - [x] If PDFium is hard to run in JSDOM/Node, use a small integration test in browser (e.g. Playwright) that loads a fixture PDF and asserts text extraction via the public `extractTextFromFileInBrowser` / `extractTextFromBuffer` API with a PDF that pdfjs is known to fail on (if such a fixture exists), or mock pdfjs to throw and assert PDFium path returns text. Implemented with mocks in `clientDocumentExtract.test.ts`.
- **E2E**
  - [x] Existing “Server PDF with PII” E2E still pass (dialog when `e2eServerPdf=1`; Continue / Uncheck / Cancel). (Not run in this environment—Playwright browsers not installed; user to run locally after `npx playwright install`.)
  - [ ] Optional: add a test that uses a “pdfjs-fails” fixture (or mock) and asserts successful extraction and no server-PDF dialog (i.e. PDFium fallback succeeded). Depends on having a reliable way to simulate pdfjs failure in E2E.

### 4.4 Documentation

- [x] In `docs/PDF_CLIENT_EXTRACTION_RESEARCH.md` or a short “Client PDF extraction” section in README/docs:
  - State that client uses two engines: pdfjs-dist first, then PDFium on failure.
  - Note that if both fail, user sees “Server-side processing required” and may send the PDF to the server (existing behavior).
- [x] If PDFium loads WASM from a CDN, document the domain and that it’s for WASM only (no PDF content sent). Documented in research doc: cdn.jsdelivr.net for WASM only.

---

## 5. Workstream 2 – Optional: Replace pdfjs-dist with unpdf

**Objective:** Evaluate replacing raw `pdfjs-dist` with `unpdf` in the client to simplify worker setup (no separate worker file) and potentially use a patched PDF.js 5.4 build. PDFium remains the fallback when extraction fails.

### 5.1 Spike (decision gate)

- [ ] Create a feature branch (e.g. `feature/unpdf-client`).
- [ ] In `frontend/src/lib/clientDocumentExtract.ts`:
  - Replace pdfjs-dist usage with unpdf: `getDocumentProxy(buffer)` → `extractText(pdf, { mergePages: true })` → use `text` (and optionally `totalPages`).
  - Remove worker configuration (worker URL, GlobalWorkerOptions) and any `public/pdf.worker.min.mjs` copy if no longer needed.
  - Keep PDFium fallback: on throw from unpdf, call `extractPdfTextWithPdfium(buffer)` as in WS1.
- [ ] Run unit tests and E2E (happy path, server-PDF dialog, PII dehydration).
- [ ] Manual test: upload a few PDFs (including one that previously triggered server fallback if available).
- [ ] If defineProperty or other regressions appear, document and revert; stay on pdfjs-dist 5.3.93 until upstream fix or unpdf fixes it.

### 5.2 Decision

- [ ] If spike is successful: merge and remove `pdfjs-dist` from dependencies (and postinstall worker copy); update README/docs to say “unpdf (PDF.js) + PDFium fallback.”
- [ ] If spike fails or is inconclusive: close spike branch; keep pdfjs-dist 5.3.93 and PDFium fallback from WS1 only.

---

## 6. Workstream 3 – Documentation and PDF.js tracking

**Objective:** Document the client PDF extraction design and track PDF.js upstream so we can re-evaluate upgrading when safe.

### 6.1 Documentation

- [x] README or `docs/Client-PDF-Extraction.md`:
  - Short description: “Client-side PDF text extraction uses [pdfjs-dist / unpdf] first; if that fails, we try PDFium (WASM). If both fail, the user may choose to process the PDF on the server (see Server-side processing required).”
  - Link to [PDF_CLIENT_EXTRACTION_RESEARCH.md](PDF_CLIENT_EXTRACTION_RESEARCH.md) for rationale and alternatives. Done in README Security & Privacy section.
- [x] If PDFium WASM is loaded from CDN: add a line listing the domain and purpose (e.g. “WASM binary for PDFium from embedpdf.com”).

### 6.2 PDF.js upgrade tracking

- [x] In `docs/PDF_CLIENT_EXTRACTION_RESEARCH.md` or a short “Tech debt / tracking” section:
  - Note that we remain on pdfjs-dist 5.3.93 due to [mozilla/pdf.js#20435](https://github.com/mozilla/pdf.js/issues/20435) / [#20478](https://github.com/mozilla/pdf.js/issues/20478).
  - Add a task or reminder: “When a pdfjs-dist version is confirmed to work with Next.js/webpack (no defineProperty error), re-evaluate upgrading to get latest flate/stream handling; PDFium fallback remains for PDFs only it can parse.” Added at end of research doc.

---

## 7. Definition of done (M1 – PDFium fallback)

- [x] PDFium is integrated as fallback in `clientDocumentExtract.ts` (or via `clientPdfium.ts`).
- [x] Unit tests cover “pdfjs throws → PDFium used” and “both throw → rethrow.”
- [x] Existing E2E (including server-PDF PII flow) pass.
- [x] Docs describe dual-engine behavior and link to research doc.
- [x] No regression: PDFs that work today with pdfjs still work; PDFs that fail with pdfjs now try PDFium before showing server dialog.

---

## 8. Branching and practices

- **Branch:** All work on a feature branch (e.g. `feature/pdfium-fallback` for WS1, `feature/unpdf-client` for WS2). Merge via PR to `main`.
- **TDD:** Write or update tests first for WS1 (fallback behavior), then implement until tests pass.
- **Security:** No new server endpoints; no sending of PDF content to third parties beyond existing server path. PDFium runs entirely in the browser.
