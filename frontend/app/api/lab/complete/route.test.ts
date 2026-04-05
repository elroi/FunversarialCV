/**
 * @jest-environment node
 */

import { POST } from "./route";
import { __resetRateLimitCountersForTests } from "@/lib/rateLimit";

describe("POST /api/lab/complete", () => {
  const env0 = { ...process.env };

  beforeEach(() => {
    __resetRateLimitCountersForTests();
    jest.restoreAllMocks();
    global.fetch = jest.fn() as typeof fetch;
  });

  afterEach(() => {
    process.env = { ...env0 };
    __resetRateLimitCountersForTests();
  });

  function enableOpenRouter(models: string) {
    process.env.LAB_ALLOWED_MODELS = models;
    process.env.OPENROUTER_API_KEY = "sk-test-key";
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.LAB_COMPLETE_DISABLED;
    delete process.env.LAB_PROVIDER;
  }

  it("returns 403 when lab completion is disabled", async () => {
    delete process.env.LAB_ALLOWED_MODELS;
    delete process.env.OPENROUTER_API_KEY;

    const res = await POST(
      new Request("http://localhost/api/lab/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptTemplateId: "lab_fit_summary_v1",
          extractText: "CV tokens only {{PII_EMAIL_0}}",
          jobDescriptionText: "Role",
          modelId: "x",
        }),
      }) as never
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when raw PII is present", async () => {
    enableOpenRouter("meta/llama");

    const res = await POST(
      new Request("http://localhost/api/lab/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptTemplateId: "lab_fit_summary_v1",
          extractText: "Contact me at user@example.com please",
          jobDescriptionText: "JD",
          modelId: "meta/llama",
        }),
      }) as never
    );
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(String(j.error)).toMatch(/PII|token/i);
  });

  it("returns 400 when model is not allowlisted and freeform is off", async () => {
    enableOpenRouter("allowed/only");

    const res = await POST(
      new Request("http://localhost/api/lab/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptTemplateId: "lab_fit_summary_v1",
          extractText: "CV text",
          jobDescriptionText: "JD text",
          modelId: "other/model",
        }),
      }) as never
    );
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limit exceeded", async () => {
    enableOpenRouter("m");
    process.env.RATE_LIMIT_LAB_COMPLETE_MAX = "1";
    process.env.RATE_LIMIT_LAB_COMPLETE_WINDOW_MS = "60000";
    __resetRateLimitCountersForTests();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "ok" } }] }),
    });

    const body = {
      promptTemplateId: "lab_fit_summary_v1",
      extractText: "CV",
      jobDescriptionText: "JD",
      modelId: "m",
    };
    const headers = { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.9" };

    const r1 = await POST(
      new Request("http://localhost/api/lab/complete", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }) as never
    );
    expect(r1.status).toBe(200);

    const r2 = await POST(
      new Request("http://localhost/api/lab/complete", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }) as never
    );
    expect(r2.status).toBe(429);
  });

  it("returns 200 and forwards to OpenRouter when configured", async () => {
    enableOpenRouter("demo/model");

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "• One\n• Two\n• Three" } }],
      }),
    });

    const res = await POST(
      new Request("http://localhost/api/lab/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptTemplateId: "lab_fit_summary_v1",
          extractText: "Senior engineer with tokens {{E0}}",
          jobDescriptionText: "Need platform lead",
          modelId: "demo/model",
        }),
      }) as never
    );

    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.text).toContain("One");
    expect(j.providerKind).toBe("openrouter");
    expect(global.fetch).toHaveBeenCalled();
    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const payload = JSON.parse(init.body as string) as { model: string };
    expect(payload.model).toBe("demo/model");
  });

  it("rejects freeform model id when gate env is incomplete", async () => {
    enableOpenRouter("allowed/only");
    process.env.LAB_MODEL_INPUT = "freeform";
    delete process.env.LAB_FREEFORM_MODEL_ACK;
    delete process.env.LAB_FREEFORM_BUILD;

    const res = await POST(
      new Request("http://localhost/api/lab/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptTemplateId: "lab_fit_summary_v1",
          extractText: "CV",
          jobDescriptionText: "JD",
          modelId: "custom/extra-model",
        }),
      }) as never
    );
    expect(res.status).toBe(400);
  });

  it("allows freeform model id when triple gate is set", async () => {
    enableOpenRouter("allowed/only");
    process.env.LAB_FREEFORM_BUILD = "1";
    process.env.LAB_MODEL_INPUT = "freeform";
    process.env.LAB_FREEFORM_MODEL_ACK = "I_ACCEPT_ABUSE_RISK";

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "ok" } }] }),
    });

    const res = await POST(
      new Request("http://localhost/api/lab/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptTemplateId: "lab_fit_summary_v1",
          extractText: "CV",
          jobDescriptionText: "JD",
          modelId: "custom/extra-model",
        }),
      }) as never
    );
    expect(res.status).toBe(200);
    const init = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    const payload = JSON.parse(init.body as string) as { model: string };
    expect(payload.model).toBe("custom/extra-model");
  });

  it("returns 400 for freeform path with invalid model id characters", async () => {
    enableOpenRouter("allowed/only");
    process.env.LAB_FREEFORM_BUILD = "1";
    process.env.LAB_MODEL_INPUT = "freeform";
    process.env.LAB_FREEFORM_MODEL_ACK = "I_ACCEPT_ABUSE_RISK";

    const res = await POST(
      new Request("http://localhost/api/lab/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptTemplateId: "lab_fit_summary_v1",
          extractText: "CV",
          jobDescriptionText: "JD",
          modelId: "evil model id",
        }),
      }) as never
    );
    expect(res.status).toBe(400);
  });
});
