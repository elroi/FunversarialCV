# Outline: Replace PII with Tokens in a Copy of the Original File

**Goal:** Preserve the original document layout. Work on a **copy** of the uploaded file, replace PII → tokens **in that copy**, send the modified copy to the server, then rehydrate the server response before download.

**v1 scope:** DOCX only; PDF support is postponed.

**Flow:**
1. **Client:** Make a copy of the original file (bytes).
2. **Client:** Replace PII with tokens **inside** the copy (same format: DOCX; structure/layout unchanged).
3. **Client:** Send the modified copy to the server as `file`.
4. **Server:** Treats it as a normal upload: extract text, PII-guard (sees only tokens), run eggs, return enriched buffer.
5. **Client:** Rehydrate the response (tokens → PII) and serve the result to the user.

**Benefits:** Server never sees raw PII. Layout is preserved because we only change text content in the existing document, not rebuild from plain text.

---

## DOCX: In-place token replacement

**Format:** DOCX is a ZIP of XML files. Main body text is in `word/document.xml` (and sometimes in headers/footers).

**Approach:**
- Load the DOCX buffer with **JSZip** (already in the project).
- Read `word/document.xml` as string (or as XML).
- Replace each PII value with its token in the XML text. Text lives in `<w:t>` elements; we can either:
  - **A (simple):** String replace over the whole XML: for each `(token, value)` in the PII map, `xml = xml.split(value).join(token)`. Risk: if PII appears in an attribute or in a different encoding (e.g. entity), we might miss or break XML. Use a regex that matches text content only if needed.
  - **B (robust):** Parse XML (e.g. `DOMParser` / browser or a small XML parser), walk text nodes, replace PII → token, serialize back. Then replace `word/document.xml` in the ZIP.
- Optionally do the same for `word/header*.xml`, `word/footer*.xml` if we want to redact PII there too.
- Save the ZIP to an `ArrayBuffer` and build a `File` for upload.

**Libraries:** JSZip (already), no new deps. Optional: a lightweight XML parser if we want to restrict replaces to text nodes only.

**Edge cases:** XML entities (e.g. `&` in email); multi-run text (one email split across `<w:t>` nodes). For a first version, whole-document string replace per token is acceptable; we can refine to XML-aware replace later.

---

## PDF: In-place token replacement

**Format:** PDF stores text in content streams (often compressed). Text can be in raw form or via character mappings (CMap). Layout is preserved by not changing the stream structure, only the text we can safely find and replace.

**Approaches (pick one or combine):**

### Option A: Content-stream find/replace (fragile but layout-perfect)

- Load the PDF with **pdf-lib** (`PDFDocument.load(bytes)`).
- Enumerate indirect objects; find **PDFRawStream** (content streams).
- For each stream: decode (e.g. flate), get string, run string replace (PII → token), re-encode and set back.
- **Caveats:** Many PDFs use ToUnicode CMaps or store glyphs by ID, not by character. So the “string” we see might be `(user@example.com)` in the stream or might be a sequence of hex/glyph refs. Works best on PDFs produced by “simple” writers (e.g. our own pdf-lib output, some generators). For arbitrary PDFs, decoding and re-encoding can break layout or cause missing text.
- **Libraries:** pdf-lib (we have it). Decoding raw streams may require a small helper (e.g. inflate); browser has no Node `zlib`, so use something like `fflate` or a wasm inflate if we need to decompress streams in the client.

### Option B: Overlay (white-out + draw token)

- Extract text **with positions** using **pdfjs-dist** (`getTextContent()` returns items with `str` and transform matrix).
- Build a list of runs that contain PII (e.g. match each `item.str` or concatenate adjacent items and match).
- Load the PDF with **pdf-lib**. For each PII run:
  - Compute bounding box from the transform (or approximate).
  - Draw a **white rectangle** over that region (or the line height).
  - Draw the **token string** at the same (or nearby) position using an embedded font.
- Save the modified PDF. Layout is preserved; only the visual content of PII regions is replaced. Downside: font/size might not match exactly (we use a single font), and overlapping or complex runs need care.

### Option C: Hybrid / fallback

- Try Option A (content-stream replace). If the PDF uses simple encoding, it works and layout is untouched.
- If we detect “no replacement happened” (e.g. no token found in the saved PDF) or we know the PDF is complex (e.g. from pdfjs we see it uses CMaps), fall back to Option B (overlay) or to the current “rebuild from text” path so the user still gets a result.

**Recommendation:** Start with **DOCX** (string replace in `word/document.xml` via JSZip); it’s straightforward and preserves layout. For **PDF**, start with **Option B (overlay)** so we don’t risk breaking arbitrary PDFs with stream editing; we can add Option A later for PDFs we control (e.g. our own exports).

---

## Implementation plan (high level)

1. **New module:** `clientTokenReplaceInCopy.ts` (or under `clientVault`).
   - `replacePiiWithTokensInCopy(file: File, piiMap: PiiMap): Promise<File>`
   - Dispatches by MIME: DOCX → JSZip path; PDF → overlay path (or content-stream if we add it).
   - Returns a new `File` (same name/type) whose bytes are the modified document.

2. **DOCX path:**
   - `arrayBuffer()` of the file → JSZip.loadAsync().
   - Get `word/document.xml` → string.
   - For each entry in `piiMap.byToken`, replace `entry.value` with `entry.token` in the XML string.
   - Put the modified XML back into the ZIP, save to blob/buffer, return as `File`.

3. **PDF path (overlay):**
   - Extract text with positions (pdfjs `getDocument`, `getPage`, `getTextContent`).
   - Build “runs” that contain PII (align with `piiMap`).
   - Load PDF with pdf-lib; for each run, draw white rect + token text; save.
   - Return as `File`.

4. **Page wiring:**
   - After `dehydrateInBrowser(file)` we have `tokenizedText`, `piiMap`, `mimeType`.
   - Call `replacePiiWithTokensInCopy(file, piiMap)` to get a **new** File (copy with tokens). We need the original file bytes for DOCX/PDF; we already have the file. For PDF we need both the file (for pdf-lib) and the piiMap (for which runs to replace). So: `replacePiiWithTokensInCopy(file, piiMap)` — we pass the original file and the map; inside we read the file, do replace, return new File.
   - Send that returned file to the server. Response rehydration stays the same.

5. **Tests:**
   - Unit tests: DOCX with a known body XML, assert PII → token in output ZIP. PDF: mock getTextContent, assert overlay or stream replace.
   - E2E: upload DOCX with PII, Inject Eggs, assert downloaded file has original layout (e.g. same paragraph structure) and PII restored.

---

## Security / constraints

- Replacements happen only in the **browser**; the server never sees the original file with PII.
- PII map is derived from the same run that produces the tokenized text; token ↔ value consistency is guaranteed for that run.
- We do not execute macros or scripts; we only modify text (DOCX XML) or draw operations (PDF). Same “no execution” policy as the rest of the app.

---

## Open questions

- **PDF font/size:** For overlay, use a single embedded font (e.g. Helvetica); size can be inferred from the transform in getTextContent. If we don’t match the original font exactly, the token might look slightly different from the surrounding text.
- **DOCX headers/footers:** First version can limit to `word/document.xml`; add header/footer later if needed.
- **Large files:** In-place replace keeps memory usage proportional to file size; no extra “full rebuild” of the document.
