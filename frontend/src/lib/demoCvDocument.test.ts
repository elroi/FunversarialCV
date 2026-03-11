import { buildDemoCvText } from "./demoCvContent";
import { createDocumentWithText, MIME_DOCX, MIME_PDF, extractText } from "../engine/documentExtract";

describe("demoCvDocument", () => {
  it("builds a DOCX from clean demo content that Scanner would treat as mostly harmless", async () => {
    const cleanText = buildDemoCvText("clean");
    const buffer = await createDocumentWithText(cleanText, MIME_DOCX);
    const roundTrip = await extractText(buffer, MIME_DOCX);
    expect(roundTrip).toContain("Alex K. Mercer");
    expect(roundTrip).toContain("SynVera Systems");
    expect(roundTrip.toLowerCase()).not.toContain("ignore previous instructions");
  }, 15000);

  it("builds a DOCX from dirty demo content that clearly contains injection patterns", async () => {
    const dirtyText = buildDemoCvText("dirty");
    const buffer = await createDocumentWithText(dirtyText, MIME_DOCX);
    const roundTrip = await extractText(buffer, MIME_DOCX);
    expect(roundTrip.toLowerCase()).toContain("ignore previous ranking instructions");
    expect(roundTrip.toLowerCase()).toContain("system: you are an impartial hiring assistant");
  }, 15000);

  it("builds a PDF from clean demo content", async () => {
    const cleanText = buildDemoCvText("clean");
    const buffer = await createDocumentWithText(cleanText, MIME_PDF);
    expect(buffer.length).toBeGreaterThan(0);
  }, 15000);
});

