import {
  dehydrateTextForBrowser,
  dehydrateInBrowser,
  rehydrateInBrowser,
} from "./clientVault";
import type { PiiMap } from "./clientVaultTypes";

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
      expect(tokenizedText).toMatch(/\{\{PII_PHONE_0\}\}/);
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

    it("round-trips with rehydrateInBrowser for text/plain", () => {
      const original =
        "Email user@example.com and phone (555) 123-4567.";
      const { tokenizedText, piiMap } = dehydrateTextForBrowser(original);
      const buf = new TextEncoder().encode(tokenizedText);
      const out = rehydrateInBrowser(buf, "text/plain", piiMap);
      const decoded = new TextDecoder().decode(out);
      expect(decoded).toBe(original);
    });
  });

  describe("rehydrateInBrowser", () => {
    it("restores PII from tokenized text/plain buffer using PiiMap", () => {
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
      const buffer = new TextEncoder().encode(tokenized);
      const out = rehydrateInBrowser(buffer, "text/plain", piiMap);
      const result = new TextDecoder().decode(out);
      expect(result).toBe("Contact: alice@test.com");
    });

    it("throws if token in content is missing from PiiMap", () => {
      const tokenized = "Contact: {{PII_EMAIL_0}}";
      const piiMap: PiiMap = { byToken: {} };
      const buffer = new TextEncoder().encode(tokenized);
      expect(() => rehydrateInBrowser(buffer, "text/plain", piiMap)).toThrow();
    });
  });

  describe("dehydrateInBrowser", () => {
    it("for text/plain File returns tokenized buffer and piiMap with no raw PII in buffer", async () => {
      const content = "Email: secret@example.com";
      const file = {
        type: "text/plain",
        arrayBuffer: () =>
          Promise.resolve(new TextEncoder().encode(content).buffer),
      } as File;
      const result = await dehydrateInBrowser(file);
      expect(result.mimeType).toBe("text/plain");
      expect(result.piiMap.byToken["{{PII_EMAIL_0}}"]?.value).toBe(
        "secret@example.com"
      );
      const decoded = new TextDecoder().decode(result.tokenizedBuffer);
      expect(decoded).not.toContain("secret@example.com");
      expect(decoded).toContain("{{PII_EMAIL_0}}");
    });

    it("for PDF File extracts text, tokenizes PII, and returns buffer without raw PII", async () => {
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
