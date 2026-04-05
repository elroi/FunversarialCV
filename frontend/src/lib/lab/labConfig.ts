/**
 * Lab harness public config (no secrets, no internal URLs).
 * Used by GET /api/lab/config and to decide whether completion UI may mount.
 */
import {
  LAB_EXTRACTION_MODE_IDS,
  LAB_HARNESS_VERSION,
} from "@/engine/labExtract/constants";

function isLabCompleteDisabledEnv(): boolean {
  return (
    process.env.LAB_COMPLETE_DISABLED === "1" ||
    process.env.LAB_COMPLETE_DISABLED === "true"
  );
}

export function parseAllowedModels(): string[] {
  const raw = process.env.LAB_ALLOWED_MODELS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Validate OLLAMA_BASE_URL for server-side use only (never exposed to clients). */
export function parseOllamaBaseUrl(): URL | null {
  const raw = process.env.OLLAMA_BASE_URL?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname) return null;
    return u;
  } catch {
    return null;
  }
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

export function isOllamaConfigured(): boolean {
  return parseOllamaBaseUrl() !== null;
}

/**
 * Completion is enabled only when explicitly configured, not disabled, and an allowlist exists.
 * SECURITY: Never enable without operator-supplied model allowlist or safe default for private workshops.
 */
export function computeLabCompleteEnabled(): boolean {
  if (isLabCompleteDisabledEnv()) return false;
  const models = parseAllowedModels();
  if (models.length === 0) return false;
  if (isOpenRouterConfigured()) return true;
  if (isOllamaConfigured()) return true;
  return false;
}

export interface LabConfigResponse {
  harnessVersion: string;
  labCompleteEnabled: boolean;
  extractionModeIds: readonly string[];
  /** Only when labCompleteEnabled — opaque model ids for UI picker */
  allowedModelIds?: string[];
  openRouterConfigured?: boolean;
  ollamaConfigured?: boolean;
  /** Best-effort; omit when LAB_CONFIG_MINIMAL=1 */
  ollamaReachable?: boolean;
}

export function buildLabConfigResponse(): LabConfigResponse {
  const minimal =
    process.env.LAB_CONFIG_MINIMAL === "1" ||
    process.env.LAB_CONFIG_MINIMAL === "true";

  const labCompleteEnabled = computeLabCompleteEnabled();
  const allowedModelIds = parseAllowedModels();

  const base: LabConfigResponse = {
    harnessVersion: LAB_HARNESS_VERSION,
    labCompleteEnabled,
    extractionModeIds: LAB_EXTRACTION_MODE_IDS,
  };

  if (minimal) {
    return base;
  }

  const extended: LabConfigResponse = {
    ...base,
    openRouterConfigured: isOpenRouterConfigured(),
    ollamaConfigured: isOllamaConfigured(),
  };

  if (labCompleteEnabled && allowedModelIds.length > 0) {
    extended.allowedModelIds = allowedModelIds;
  }

  return extended;
}
