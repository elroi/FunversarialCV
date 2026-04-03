import { SAMPLE_JD_BODY, SAMPLE_JD_CLIPBOARD_TEXT } from "./sampleJobDescription";

describe("sampleJobDescription", () => {
  it("exports synthetic NexusFlow lab content without real employer PII", () => {
    expect(SAMPLE_JD_BODY).toMatch(/NexusFlow/i);
    expect(SAMPLE_JD_BODY).toMatch(/RAG|LangChain|LlamaIndex/i);
    expect(SAMPLE_JD_BODY).toMatch(/Must-haves|supply chain|logistics/i);
    expect(SAMPLE_JD_BODY).toMatch(/production environments/i);
    expect(SAMPLE_JD_BODY).not.toMatch(/@\w+\.(com|net|org)\b/i);
  });

  it("uses trimmed body for clipboard export", () => {
    expect(SAMPLE_JD_CLIPBOARD_TEXT).toBe(SAMPLE_JD_BODY.trim());
  });
});
