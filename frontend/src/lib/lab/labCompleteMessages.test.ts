import {
  buildLabCompletionUserMessage,
  type LabPromptTemplateId,
} from "./labCompleteMessages";

describe("buildLabCompletionUserMessage", () => {
  it("assembles lab_fit_summary_v1 with both slots and refusal framing", () => {
    const msg = buildLabCompletionUserMessage("lab_fit_summary_v1", {
      extractText: "{{PII_EMAIL_0}} works in security.",
      jobDescriptionText: "Need a lead.",
    });
    expect(msg).toContain("--- CV extract ---");
    expect(msg).toContain("{{PII_EMAIL_0}} works in security.");
    expect(msg).toContain("--- Job description ---");
    expect(msg).toContain("Need a lead.");
    expect(msg).toMatch(/3 bullet points/i);
    expect(msg).toMatch(/untrusted/i);
  });

  it("is stable for a given template id (shape lock)", () => {
    const id: LabPromptTemplateId = "lab_fit_summary_v1";
    const a = buildLabCompletionUserMessage(id, { extractText: "A", jobDescriptionText: "B" });
    const b = buildLabCompletionUserMessage(id, { extractText: "A", jobDescriptionText: "B" });
    expect(a).toBe(b);
  });
});
