import {
  dehydrateTextForBrowser,
  dehydrateInBrowser,
  rehydrateInBrowser,
  MIN_PII_VALUE_LENGTH,
} from "./clientVault";
import type { PiiMap } from "./clientVaultTypes";
import * as clientDocumentExtract from "./clientDocumentExtract";

jest.mock("./clientDocumentExtract", () => {
  const actual =
    jest.requireActual<typeof import("./clientDocumentExtract")>(
      "./clientDocumentExtract"
    );
  return {
    ...actual,
    extractTextFromFileInBrowser: jest.fn(
      (file: File | Blob) => actual.extractTextFromFileInBrowser(file)
    ),
  };
});

describe("clientVault", () => {
  describe("dehydrateTextForBrowser", () => {
    it("replaces email with token and adds EMAIL entry to PiiMap", () => {
      const text = "Contact: user@example.com";
      const { tokenizedText, piiMap } = dehydrateTextForBrowser(text);
      expect(tokenizedText).not.toContain("user@example.com");
      expect(tokenizedText).toMatch(/\{\{PII_EMAIL_0\}\}/);
      expect(piiMap.byToken["{{PII_EMAIL_0}}"]).toEqual({
        token: "{{PII_EMAIL_0}}",
        type: "EMAIL",
        value: "user@example.com",
      });
    });

    it("replaces phone and address and builds PiiMap with correct types", () => {
      const text =
        "Phone (555) 123-4567. Address: 123 Main St, Springfield.";
      const { tokenizedText, piiMap } = dehydrateTextForBrowser(text);
      expect(tokenizedText).not.toContain("(555) 123-4567");
      expect(tokenizedText).toMatch(/\{\{PII_PHONE_0\}\}|\{\{P\d+\}\}\s*/);
      expect(tokenizedText).toMatch(/\{\{PII_ADDR_\d+\}\}/);
      const tokens = Object.values(piiMap.byToken);
      expect(tokens.some((t) => t.type === "PHONE")).toBe(true);
      expect(tokens.some((t) => t.type === "ADDRESS")).toBe(true);
    });

    it("returns unchanged text and empty PiiMap when no PII", () => {
      const text = "No PII here.";
      const { tokenizedText, piiMap } = dehydrateTextForBrowser(text);
      expect(tokenizedText).toBe(text);
      expect(Object.keys(piiMap.byToken)).toHaveLength(0);
    });

    it("does not tokenize PII shorter than MIN_PII_VALUE_LENGTH", () => {
      const text = "Short: a@b.c or x@y.z";
      const { tokenizedText, piiMap } = dehydrateTextForBrowser(text);
      expect(tokenizedText).toContain("a@b.c");
      expect(tokenizedText).toContain("x@y.z");
      expect(Object.keys(piiMap.byToken)).toHaveLength(0);
    });

    it("uses short token (e.g. {{E0}}) padded to value length when value shorter than full token", () => {
      const text = "Contact: a@b.co.uk";
      const { tokenizedText, piiMap } = dehydrateTextForBrowser(text);
      expect(tokenizedText).not.toContain("a@b.co.uk");
      const token = Object.keys(piiMap.byToken)[0];
      expect(token.length).toBeLessThanOrEqual("a@b.co.uk".length);
      expect(piiMap.byToken[token].value).toBe("a@b.co.uk");
      expect(piiMap.byToken[token].type).toBe("EMAIL");
    });

    it("round-trips with rehydrateInBrowser for text/plain", async () => {
      const original =
        "Email user@example.com and phone (555) 123-4567.";
      const { tokenizedText, piiMap } = dehydrateTextForBrowser(original);
      const buf = new TextEncoder().encode(tokenizedText).buffer;
      const out = await rehydrateInBrowser(buf, "text/plain", piiMap);
      const decoded = new TextDecoder().decode(out);
      expect(decoded).toBe(original);
    });
  });

  describe("rehydrateInBrowser", () => {
    it("restores PII from tokenized text/plain buffer using PiiMap", async () => {
      const tokenized = "Contact: {{PII_EMAIL_0}}";
      const piiMap: PiiMap = {
        byToken: {
          "{{PII_EMAIL_0}}": {
            token: "{{PII_EMAIL_0}}",
            type: "EMAIL",
            value: "alice@test.com",
          },
        },
      };
      const buffer = new TextEncoder().encode(tokenized).buffer;
      const out = await rehydrateInBrowser(buffer, "text/plain", piiMap);
      const result = new TextDecoder().decode(out);
      expect(result).toBe("Contact: alice@test.com");
    });

    it("throws if token in content is missing from PiiMap", async () => {
      const tokenized = "Contact: {{PII_EMAIL_0}}";
      const piiMap: PiiMap = { byToken: {} };
      const buffer = new TextEncoder().encode(tokenized).buffer;
      await expect(
        rehydrateInBrowser(buffer, "text/plain", piiMap)
      ).rejects.toThrow();
    });
  });

  describe("dehydrateInBrowser", () => {
    it("for text/plain File returns tokenized buffer, text, and piiMap with no raw PII in buffer", async () => {
      const content = "Email: secret@example.com";
      const file = {
        type: "text/plain",
        arrayBuffer: () =>
          Promise.resolve(new TextEncoder().encode(content).buffer),
      } as File;
      const result = await dehydrateInBrowser(file);
      expect(result.mimeType).toBe("text/plain");
      expect(result.tokenizedText).toContain("{{PII_EMAIL_0}}");
      expect(result.piiMap.byToken["{{PII_EMAIL_0}}"]?.value).toBe(
        "secret@example.com"
      );
      const decoded = new TextDecoder().decode(result.tokenizedBuffer);
      expect(decoded).not.toContain("secret@example.com");
      expect(decoded).toContain("{{PII_EMAIL_0}}");
    });

    it("for PDF File extracts text, tokenizes PII, and returns buffer without raw PII", async () => {
      (clientDocumentExtract.extractTextFromFileInBrowser as jest.Mock)
        .mockResolvedValueOnce({
          text: "Email: secret@example.com",
          mimeType: "application/pdf",
        });
      const content = "Email: secret@example.com";
      const file = {
        type: "application/pdf",
        arrayBuffer: () =>
          Promise.resolve(new TextEncoder().encode(content).buffer),
      } as File;
      const result = await dehydrateInBrowser(file);
      expect(result.mimeType).toBe("application/pdf");
      const decoded = new TextDecoder().decode(result.tokenizedBuffer);
      expect(decoded).not.toContain("secret@example.com");
      expect(decoded).toMatch(/\{\{PII_EMAIL_0\}\}/);
    });
  });
});
