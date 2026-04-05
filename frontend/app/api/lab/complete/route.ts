/**
 * POST /api/lab/complete — bounded, pinned-template completion (optional; requires provider config).
 * Stateless: no CV storage; egress to configured LLM only with dehydrated client text.
 */

import { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { logInfo, logWarn } from "@/lib/log";
import { containsPii } from "@/lib/vault";
import {
  computeLabCompleteEnabled,
  parseAllowedModels,
} from "@/lib/lab/labConfig";
import { isLabFreeformModelInputAllowed } from "@/lib/lab/labFreeformGate";
import {
  LAB_PROMPT_TEMPLATE_IDS,
  buildLabCompletionUserMessage,
  type LabPromptTemplateId,
} from "@/lib/lab/labCompleteMessages";
import { labChatCompletion, pickLabLlmProvider } from "@/lib/lab/llmProviders";

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.ip ?? "unknown";
}

function maxInputChars(): number {
  const n = Number.parseInt(process.env.LAB_COMPLETE_MAX_INPUT_CHARS ?? "", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 96_000) : 48_000;
}

const FREEFORM_MODEL_ID_PATTERN = /^[a-zA-Z0-9._/-]{1,256}$/;

function isAllowedTemplateId(id: string): id is LabPromptTemplateId {
  return (LAB_PROMPT_TEMPLATE_IDS as readonly string[]).includes(id);
}

function validateModelId(modelId: string): { ok: true } | { ok: false; error: string } {
  const allowed = parseAllowedModels();
  const freeform = isLabFreeformModelInputAllowed();
  if (allowed.includes(modelId)) return { ok: true };
  if (freeform) {
    if (!FREEFORM_MODEL_ID_PATTERN.test(modelId)) {
      return { ok: false, error: "Invalid model id format." };
    }
    logWarn("/api/lab/complete", "freeform_model_path_active", {
      reason: "allowlist_miss_freeform_on",
    });
    return { ok: true };
  }
  return { ok: false, error: "Model is not in the allowed list for this deployment." };
}

export async function POST(request: NextRequest) {
  if (!computeLabCompleteEnabled()) {
    return Response.json(
      { error: "Lab completion is not enabled on this deployment." },
      { status: 403 }
    );
  }

  const ip = getClientIp(request);
  const rate = checkRateLimit("labComplete", ip);
  if (!rate.allowed) {
    logInfo("/api/lab/complete", "rate_limit_denied", {
      ip,
      retryAfterSeconds: rate.retryAfterSeconds,
    });
    return Response.json(
      { error: "Too many completion requests. Please wait and try again." },
      {
        status: 429,
        headers: rate.retryAfterSeconds
          ? { "Retry-After": String(rate.retryAfterSeconds) }
          : undefined,
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const promptTemplateId = o.promptTemplateId;
  const extractText = o.extractText;
  const jobDescriptionText = o.jobDescriptionText;
  const modelId = o.modelId;

  if (typeof promptTemplateId !== "string" || !isAllowedTemplateId(promptTemplateId)) {
    return Response.json({ error: "Unknown or missing promptTemplateId." }, { status: 400 });
  }
  if (typeof extractText !== "string" || typeof jobDescriptionText !== "string") {
    return Response.json(
      { error: "extractText and jobDescriptionText must be strings." },
      { status: 400 }
    );
  }
  if (typeof modelId !== "string" || !modelId.trim()) {
    return Response.json({ error: "modelId is required." }, { status: 400 });
  }

  const maxIn = maxInputChars();
  if (extractText.length > maxIn || jobDescriptionText.length > maxIn) {
    return Response.json(
      { error: `Input too long. Max ${maxIn} characters per field.` },
      { status: 400 }
    );
  }

  if (containsPii(extractText) || containsPii(jobDescriptionText)) {
    return Response.json(
      {
        error:
          "Possible raw PII detected. Use the same browser-side tokenization as the main flow before sending.",
      },
      { status: 400 }
    );
  }

  const modelCheck = validateModelId(modelId.trim());
  if (!modelCheck.ok) {
    return Response.json({ error: modelCheck.error }, { status: 400 });
  }

  const providerPick = pickLabLlmProvider();
  if ("error" in providerPick) {
    return Response.json(
      { error: "LLM provider is not available. Check server configuration." },
      { status: 503 }
    );
  }

  const userMessage = buildLabCompletionUserMessage(promptTemplateId, {
    extractText,
    jobDescriptionText,
  });

  try {
    const { text } = await labChatCompletion(
      providerPick.kind,
      modelId.trim(),
      userMessage
    );
    return Response.json({
      text,
      providerKind: providerPick.kind,
      promptTemplateId,
    });
  } catch (e) {
    logInfo("/api/lab/complete", "provider_error", {
      kind: providerPick.kind,
      message: e instanceof Error ? e.message : "unknown",
    });
    return Response.json(
      { error: "The model request failed. Try again or pick another model." },
      { status: 502 }
    );
  }
}
