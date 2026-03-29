import {
  getMetadataShadowUiIssues,
  serializeMetadataShadowPayload,
  MAX_VALUE_LENGTH,
  type CustomRow,
  type StandardFieldState,
} from "./metadataShadowPayload";

function row(key: string, value: string, id = "r"): CustomRow {
  return { id, key, value };
}

const emptyStandard = (): StandardFieldState => ({
  title: "",
  subject: "",
  author: "",
  keywords: "",
});

describe("getMetadataShadowUiIssues", () => {
  it("returns no issues for empty state", () => {
    expect(getMetadataShadowUiIssues([row("", "")], emptyStandard())).toEqual(
      []
    );
  });

  it("flags PII in custom value", () => {
    const issues = getMetadataShadowUiIssues(
      [row("Company", "reach me at user@example.com")],
      emptyStandard()
    );
    expect(issues.some((i) => i.code === "custom_pii" && i.rowIndex === 0)).toBe(
      true
    );
  });

  it("flags PII in standard title", () => {
    const issues = getMetadataShadowUiIssues([row("", "")], {
      ...emptyStandard(),
      title: "Contact: user@example.com",
    });
    expect(
      issues.some((i) => i.code === "standard_pii" && i.field === "title")
    ).toBe(true);
  });

  it("flags duplicate trimmed keys across rows", () => {
    const issues = getMetadataShadowUiIssues(
      [row("Rank", "1"), row("Rank", "2")],
      emptyStandard()
    );
    expect(
      issues.some(
        (i) =>
          i.code === "custom_duplicate_key" && i.rowIndex === 1 && i.key === "Rank"
      )
    ).toBe(true);
  });

  it("does not flag clean values", () => {
    expect(
      getMetadataShadowUiIssues(
        [row("Company", "Funversarial Research")],
        emptyStandard()
      )
    ).toEqual([]);
  });
});

describe("serializeMetadataShadowPayload + PII / duplicates", () => {
  it("returns null when custom value contains email", () => {
    expect(
      serializeMetadataShadowPayload(
        [row("K", "x@y.co", "1")],
        emptyStandard()
      )
    ).toBeNull();
  });

  it("returns null when duplicate keys", () => {
    expect(
      serializeMetadataShadowPayload(
        [row("A", "1", "1"), row("A", "2", "2")],
        emptyStandard()
      )
    ).toBeNull();
  });

  it("still serializes valid multi-row payload", () => {
    const s = serializeMetadataShadowPayload(
      [row("A", "1", "1"), row("B", "2", "2")],
      emptyStandard()
    );
    expect(s).not.toBeNull();
    const p = JSON.parse(s!) as { custom: Record<string, string> };
    expect(p.custom.A).toBe("1");
    expect(p.custom.B).toBe("2");
  });

  it("returns null when standard field has PII", () => {
    expect(
      serializeMetadataShadowPayload([row("", "")], {
        ...emptyStandard(),
        author: "555-123-4567",
      })
    ).toBeNull();
  });

  it("respects max value length via existing rule", () => {
    const long = "a".repeat(MAX_VALUE_LENGTH + 1);
    expect(
      serializeMetadataShadowPayload([row("K", long, "1")], emptyStandard())
    ).toBeNull();
  });
});
