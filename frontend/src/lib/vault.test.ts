import { containsPii, dehydrate, rehydrate } from "./vault";

describe("vault PII handling", () => {
  it("detects email, phone, and address as PII", () => {
    const text =
      "Email: user@example.com, Phone: (555) 123-4567, Address: 123 Main St, Springfield, NY 12345";
    expect(containsPii(text)).toBe(true);
  });

  it("dehydrates and rehydrates email, phone, and address tokens", () => {
    const original =
      "Contact me at user@example.com or (555) 123-4567, or visit 123 Main St, Springfield, NY 12345.";
    const { dehydrated, store } = dehydrate(original);

    // Should replace PII segments with PII tokens.
    expect(dehydrated).not.toContain("user@example.com");
    expect(dehydrated).not.toContain("(555) 123-4567");
    // Address pattern may capture a slightly shorter segment (e.g. without trailing punctuation),
    // so assert based on presence of the token rather than full substring removal.
    expect(dehydrated).toMatch(/\{\{PII_EMAIL_\d+\}\}/);
    expect(dehydrated).toMatch(/\{\{PII_PHONE_\d+\}\}/);
    expect(dehydrated).toMatch(/\{\{PII_ADDR_\d+\}\}/);

    const roundTrip = rehydrate(dehydrated, store);
    expect(roundTrip).toBe(original);
  });

  it("does not over-match non-address text", () => {
    const text = "Meet at Main Ideas workshop or read about Main concepts.";
    const { dehydrated } = dehydrate(text);
    // There should be no address tokens since there is no clear street+suffix pattern.
    expect(dehydrated).toBe(text);
  });
});

