/**
 * @jest-environment node
 *
 * Dynamic imports + resetModules: pdf-parse bundles pdf.js with fragile global state that can
 * break after other test files run in the same Jest process (e.g. --runInBand full suite).
 */

import { getInvisibleHandTrapText } from "../eggs";
import { invisibleHand } from "../eggs/InvisibleHand";
import { AVAILABLE_EGGS } from "../eggs/registry";
import { sanitizeExtractedDocxPlainTextForPdfSeed } from "./docxToPdfExport";

describe("sanitizeExtractedDocxPlainTextForPdfSeed", () => {
  it("strips trap text when invisible-hand runs so PDF egg does not duplicate it as body text", () => {
    const trap = getInvisibleHandTrapText("unique seed xyz");
    const extracted = `Hello\n${trap}\nWorld`;
    const cleaned = sanitizeExtractedDocxPlainTextForPdfSeed(extracted, [invisibleHand], {
      "invisible-hand": "unique seed xyz",
    });
    expect(cleaned).not.toContain("unique seed xyz");
    expect(cleaned).toContain("Hello");
    expect(cleaned).toContain("World");
  });
});

describe("exportHardenedDocxToPdf", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("produces a PDF whose text layer includes the Invisible Hand trap after egg transform", async () => {
    const { createDocumentWithText, MIME_DOCX } = await import("./documentExtract");
    const { exportHardenedDocxToPdf } = await import("./docxToPdfExport");
    const pdfParse = (await import("pdf-parse")).default;
    const baseDocx = await createDocumentWithText("Jane Doe\nEngineer", MIME_DOCX);
    const pdfBuf = await exportHardenedDocxToPdf(baseDocx, [invisibleHand], {
      "invisible-hand": "Custom PDF export trap line.",
    });
    expect(pdfBuf[0]).toBe(0x25);
    expect(pdfBuf[1]).toBe(0x50);
    const parsed = await pdfParse(Buffer.from(pdfBuf));
    expect(parsed.text).toContain("Jane Doe");
    expect(parsed.text).toContain("Custom PDF export trap line.");
  });

  it("runs multiple eggs in registry order on the generated PDF", async () => {
    const { createDocumentWithText, MIME_DOCX } = await import("./documentExtract");
    const { exportHardenedDocxToPdf } = await import("./docxToPdfExport");
    const pdfParse = (await import("pdf-parse")).default;
    const docx = await createDocumentWithText("Body only.\ncontact@example.com", MIME_DOCX);
    const eggs = AVAILABLE_EGGS.filter((e) => e.id === "metadata-shadow" || e.id === "invisible-hand");
    const payloads = {
      "invisible-hand": "",
      "metadata-shadow": JSON.stringify({ Ranking: "pdf_export_test" }),
    };
    const pdfBuf = await exportHardenedDocxToPdf(docx, eggs, payloads);
    const parsed = await pdfParse(Buffer.from(pdfBuf));
    expect(parsed.text).toContain("Body only");
    expect(parsed.text).toMatch(/Note to AI recruiter|exceptionally qualified/i);
  });
});
