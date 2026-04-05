/**
 * @jest-environment node
 */

import { GET } from "./route";

describe("GET /api/lab/config", () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  it("returns harness metadata, extractionModeIds, labCompleteEnabled false by default", async () => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.LAB_ALLOWED_MODELS;
    delete process.env.LAB_COMPLETE_DISABLED;

    const res = GET();
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.harnessVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(j.labCompleteEnabled).toBe(false);
    expect(Array.isArray(j.extractionModeIds)).toBe(true);
    expect(j.extractionModeIds.length).toBeGreaterThan(0);
    expect(j).not.toHaveProperty("ollamaBaseUrl");
    expect(JSON.stringify(j)).not.toMatch(/localhost:\d+/);
  });

  it("LAB_CONFIG_MINIMAL=1 reduces surface", async () => {
    process.env.LAB_CONFIG_MINIMAL = "1";
    const res = GET();
    const j = await res.json();
    expect(j.labCompleteEnabled).toBe(false);
    expect(j.extractionModeIds).toBeDefined();
    expect(j.openRouterConfigured).toBeUndefined();
    expect(j.ollamaConfigured).toBeUndefined();
  });

  it("labCompleteEnabled true when provider + allowlist and not disabled", async () => {
    process.env.LAB_ALLOWED_MODELS = "meta/llama";
    process.env.OPENROUTER_API_KEY = "sk-test";
    delete process.env.LAB_COMPLETE_DISABLED;

    const res = GET();
    const j = await res.json();
    expect(j.labCompleteEnabled).toBe(true);
    expect(j.allowedModelIds).toEqual(["meta/llama"]);
    expect(j.openRouterConfigured).toBe(true);
  });

  it("LAB_COMPLETE_DISABLED forces labCompleteEnabled false", async () => {
    process.env.LAB_ALLOWED_MODELS = "x";
    process.env.OPENROUTER_API_KEY = "sk-test";
    process.env.LAB_COMPLETE_DISABLED = "1";

    const res = GET();
    const j = await res.json();
    expect(j.labCompleteEnabled).toBe(false);
    expect(j.allowedModelIds).toBeUndefined();
  });
});
