/**
 * OpenAI-compatible chat completions for lab harness (Ollama + OpenRouter).
 * SSRF: Ollama base URL is taken only from env and validated in parseOllamaBaseUrl.
 */

import { parseOllamaBaseUrl } from "./labConfig";

export type LabLlmProviderKind = "openrouter" | "ollama";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function maxOutputTokens(): number {
  const n = Number.parseInt(process.env.LAB_COMPLETE_MAX_OUTPUT_TOKENS ?? "", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 8192) : 900;
}

export function getLabCompletionMaxOutputTokens(): number {
  return maxOutputTokens();
}

export interface LabChatCompletionResult {
  text: string;
}

/**
 * POST chat/completions; returns assistant message content string (best effort).
 */
export async function labChatCompletion(
  provider: LabLlmProviderKind,
  modelId: string,
  userMessage: string
): Promise<LabChatCompletionResult> {
  const maxTokens = maxOutputTokens();
  const body = {
    model: modelId,
    messages: [{ role: "user" as const, content: userMessage }],
    max_tokens: maxTokens,
  };

  if (provider === "openrouter") {
    const key = process.env.OPENROUTER_API_KEY?.trim();
    if (!key) throw new Error("OpenRouter is not configured.");
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER?.trim() || "https://funversarialcv.local",
        "X-Title": "FunversarialCV Lab",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`OpenRouter error (${res.status})`);
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content ?? "";
    return { text: typeof text === "string" ? text : String(text) };
  }

  const base = parseOllamaBaseUrl();
  if (!base) throw new Error("Ollama is not configured.");
  const url = new URL("/v1/chat/completions", base);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Ollama error (${res.status})`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  return { text: typeof text === "string" ? text : String(text) };
}

export function pickLabLlmProvider():
  | { kind: LabLlmProviderKind }
  | { error: string } {
  const prefer = process.env.LAB_PROVIDER?.trim().toLowerCase();
  const hasOr = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const ollama = parseOllamaBaseUrl();

  if (prefer === "ollama") {
    if (!ollama) return { error: "Ollama URL is not configured." };
    return { kind: "ollama" };
  }
  if (prefer === "openrouter") {
    if (!hasOr) return { error: "OpenRouter is not configured." };
    return { kind: "openrouter" };
  }
  if (hasOr) return { kind: "openrouter" };
  if (ollama) return { kind: "ollama" };
  return { error: "No LLM provider is configured." };
}
