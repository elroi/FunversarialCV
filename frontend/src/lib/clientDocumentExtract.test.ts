/**
 * Unit tests for client PDF text extraction (pdfjs-dist + PDFium fallback) and magic-byte detection.
 * TDD: these tests define fallback behavior before implementation.
 */
import {
  extractTextFromBuffer,
  MIME_PDF,
  detectDocumentTypeFromBuffer,
  detectDocumentTypeFromUint8Array,
  decodeBase64ToUint8Array,
} from "./clientDocumentExtract";
import * as clientPdfium from "./clientPdfium";

describe("detectDocumentTypeFromBuffer", () => {
  it("returns docx for PK (ZIP/DOCX) magic bytes", () => {
    const buf = new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer;
    expect(detectDocumentTypeFromBuffer(buf)).toBe("docx");
  });

  it("returns pdf for %PDF magic bytes", () => {
    const buf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]).buffer;
    expect(detectDocumentTypeFromBuffer(buf)).toBe("pdf");
  });

  it("returns null for empty or unknown content", () => {
    expect(detectDocumentTypeFromBuffer(new ArrayBuffer(0))).toBeNull();
    expect(detectDocumentTypeFromBuffer(new Uint8Array([0x00, 0x01]).buffer)).toBeNull();
  });
});

describe("detectDocumentTypeFromUint8Array", () => {
  it("matches buffer helper for PK and %PDF", () => {
    const pk = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(detectDocumentTypeFromUint8Array(pk)).toBe("docx");
    expect(detectDocumentTypeFromUint8Array(pdf)).toBe("pdf");
  });

  it("reads magic from the start of a larger view (pooled-buffer safe)", () => {
    const big = new Uint8Array(1024);
    big[100] = 0x50;
    big[101] = 0x4b;
    big[102] = 0x03;
    big[103] = 0x04;
    expect(detectDocumentTypeFromUint8Array(big.subarray(100, 104))).toBe("docx");
    expect(detectDocumentTypeFromUint8Array(big)).toBeNull();
  });
});

describe("decodeBase64ToUint8Array", () => {
  it("decodes standard base64 and ignores whitespace", () => {
    const raw = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0xff, 0x00]);
    const b64 = Buffer.from(raw).toString("base64");
    const spaced = `${b64.slice(0, 4)} \n ${b64.slice(4)}`;
    const out = decodeBase64ToUint8Array(spaced);
    expect(out.length).toBe(raw.length);
    expect(Array.from(out)).toEqual(Array.from(raw));
  });

  it("throws on invalid base64", () => {
    expect(() => decodeBase64ToUint8Array("not-valid!!!")).toThrow("Invalid base64");
  });
});

jest.mock("pdfjs-dist", () => ({
  __esModule: true,
  version: "5.3.93",
  GlobalWorkerOptions: {},
  getDocument: jest.fn(() => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: () =>
        Promise.resolve({
          getTextContent: () =>
            Promise.resolve({
              items: [{ str: "pdfjs text" }],
            }),
        }),
    }),
  })),
}));

jest.mock("./clientPdfium", () => ({
  extractPdfTextWithPdfium: jest.fn(),
}));

describe("clientDocumentExtract (PDF fallback)", () => {
  const pdfBuffer = new ArrayBuffer(100);

  beforeEach(() => {
    jest.clearAllMocks();
    const pdfjs = jest.requireMock("pdfjs-dist") as {
      getDocument: jest.Mock;
    };
    pdfjs.getDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: () =>
          Promise.resolve({
            getTextContent: () =>
              Promise.resolve({ items: [{ str: "pdfjs text" }] }),
          }),
      }),
    });
  });

  it("when pdfjs succeeds, returns pdfjs text and does not call PDFium", async () => {
    const text = await extractTextFromBuffer(pdfBuffer, MIME_PDF);
    expect(text).toContain("pdfjs text");
    expect(clientPdfium.extractPdfTextWithPdfium).not.toHaveBeenCalled();
  });

  it("when pdfjs throws, calls PDFium and returns PDFium text", async () => {
    const pdfjs = jest.requireMock("pdfjs-dist") as { getDocument: jest.Mock };
    pdfjs.getDocument.mockReturnValue({
      promise: Promise.reject(new Error("Invalid PDF")),
    });
    (clientPdfium.extractPdfTextWithPdfium as jest.Mock).mockResolvedValue(
      "pdfium fallback text"
    );

    const text = await extractTextFromBuffer(pdfBuffer, MIME_PDF);
    expect(text).toBe("pdfium fallback text");
    expect(clientPdfium.extractPdfTextWithPdfium).toHaveBeenCalledTimes(1);
    expect(clientPdfium.extractPdfTextWithPdfium).toHaveBeenCalledWith(
      pdfBuffer
    );
  });

  it("when both pdfjs and PDFium throw, rejects", async () => {
    const pdfjs = jest.requireMock("pdfjs-dist") as { getDocument: jest.Mock };
    pdfjs.getDocument.mockReturnValue({
      promise: Promise.reject(new Error("Invalid PDF")),
    });
    (clientPdfium.extractPdfTextWithPdfium as jest.Mock).mockRejectedValue(
      new Error("PDFium failed")
    );

    await expect(
      extractTextFromBuffer(pdfBuffer, MIME_PDF)
    ).rejects.toThrow();
    expect(clientPdfium.extractPdfTextWithPdfium).toHaveBeenCalledTimes(1);
  });
});
