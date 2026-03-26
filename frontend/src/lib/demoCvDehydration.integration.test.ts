/**
 * Integration: styled demo DOCX → same dehydration + tokenize path as the browser →
 * server-side extractText (word-extractor) + containsPii must pass (matches /api/harden guard).
 */
import mammoth from "mammoth";
import { buildStyledDemoCvDocx } from "./demoCvBuilders";
import { dehydrateTextForBrowser } from "./clientVault";
import { replacePiiWithTokensInCopy } from "./clientTokenReplaceInCopy";
import { MIME_DOCX as CLIENT_MIME_DOCX } from "./clientDocumentExtract";
import { extractText, MIME_DOCX } from "@/engine/documentExtract";
import { containsPii } from "@/lib/vault";

describe("demo CV dehydration vs server PII guard", () => {
  it("dirty styled demo: tokenized DOCX has no PII in word-extractor body text", async () => {
    const buf = await buildStyledDemoCvDocx("dirty");
    const { value: mammothText } = await mammoth.extractRawText({ buffer: buf });
    const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    const { piiMap } = dehydrateTextForBrowser(mammothText);
    expect(Object.keys(piiMap.byToken).length).toBeGreaterThan(0);

    const docxAb = new ArrayBuffer(u8.byteLength);
    new Uint8Array(docxAb).set(u8);
    const file = {
      name: "demo-dirty.docx",
      type: CLIENT_MIME_DOCX,
      arrayBuffer: () => Promise.resolve(docxAb),
    } as File;
    const result = await replacePiiWithTokensInCopy(file, piiMap);
    expect(result).not.toBeNull();

    const tokenBuf = Buffer.from(new Uint8Array(result!.buffer));
    const serverText = await extractText(tokenBuf, MIME_DOCX);
    expect(containsPii(serverText)).toBe(false);
  });

  it("clean styled demo: tokenized DOCX has no PII in word-extractor body text", async () => {
    const buf = await buildStyledDemoCvDocx("clean");
    const { value: mammothText } = await mammoth.extractRawText({ buffer: buf });
    const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    const { piiMap } = dehydrateTextForBrowser(mammothText);
    expect(Object.keys(piiMap.byToken).length).toBeGreaterThan(0);

    const docxAb = new ArrayBuffer(u8.byteLength);
    new Uint8Array(docxAb).set(u8);
    const file = {
      name: "demo-clean.docx",
      type: CLIENT_MIME_DOCX,
      arrayBuffer: () => Promise.resolve(docxAb),
    } as File;
    const result = await replacePiiWithTokensInCopy(file, piiMap);
    expect(result).not.toBeNull();

    const tokenBuf = Buffer.from(new Uint8Array(result!.buffer));
    const serverText = await extractText(tokenBuf, MIME_DOCX);
    expect(containsPii(serverText)).toBe(false);
  });
});
