/**
 * TDD tests for injectHiddenParagraphIntoDocx.
 */

import { injectHiddenParagraphIntoDocx } from "../engine/docxInject";
import { createDocumentWithText, extractText, MIME_DOCX } from "../engine/documentExtract";
import JSZip from "jszip";

async function countParagraphs(buffer: Buffer): Promise<number> {
  const zip = await JSZip.loadAsync(buffer);
  const f = zip.file("word/document.xml");
  if (!f) return 0;
  const xml = await f.async("string");
  const matches = xml.match(/<w:p\b/g);
  return matches ? matches.length : 0;
}

describe("injectHiddenParagraphIntoDocx", () => {
  it("adds one paragraph to DOCX and text is extractable", async () => {
    const buffer = await createDocumentWithText("Line one\nLine two", MIME_DOCX);
    const before = await countParagraphs(buffer);
    const result = await injectHiddenParagraphIntoDocx(buffer, "hidden-trap-text");
    const after = await countParagraphs(result);
    expect(after).toBe(before + 1);
    const extracted = await extractText(result, MIME_DOCX);
    expect(extracted).toContain("hidden-trap-text");
    expect(extracted).toContain("Line one");
    expect(extracted).toContain("Line two");
  });

  it("injected paragraph uses minimal size and white color (invisible)", async () => {
    const buffer = await createDocumentWithText("Body", MIME_DOCX);
    const result = await injectHiddenParagraphIntoDocx(buffer, "invisible");
    const zip = await JSZip.loadAsync(result);
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain("FFFFFF");
    expect(xml).toContain("invisible");
  });

  it("returns valid DOCX (can be loaded and extracted again)", async () => {
    const buffer = await createDocumentWithText("Only line", MIME_DOCX);
    const result = await injectHiddenParagraphIntoDocx(buffer, "x");
    const extracted = await extractText(result, MIME_DOCX);
    expect(extracted).toContain("Only line");
    expect(extracted).toContain("x");
  });
});
