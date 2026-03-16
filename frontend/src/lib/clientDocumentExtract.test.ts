/**
 * Unit tests for client PDF text extraction (pdfjs-dist + PDFium fallback).
 * TDD: these tests define fallback behavior before implementation.
 */
import { extractTextFromBuffer, MIME_PDF } from "./clientDocumentExtract";
import * as clientPdfium from "./clientPdfium";

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
