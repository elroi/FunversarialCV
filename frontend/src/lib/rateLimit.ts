type RateLimitKind = "harden" | "canary" | "canaryStatus" | "labExtract" | "labComplete";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

interface Counter {
  count: number;
  windowStart: number;
}

const counters = new Map<string, Counter>();

function getConfig(kind: RateLimitKind) {
  const now = Date.now();
  if (kind === "harden") {
    const maxEnv = process.env.RATE_LIMIT_HARDEN_MAX;
    const windowEnv = process.env.RATE_LIMIT_HARDEN_WINDOW_MS;
    // In Jest tests, skip limiting unless an explicit config is set.
    if (process.env.NODE_ENV === "test" && !maxEnv && !windowEnv) {
      return { max: Infinity, windowMs: 60_000, now, disabled: true as const };
    }
    const max = Number.parseInt(maxEnv ?? "", 10) || 30;
    const windowMs = Number.parseInt(windowEnv ?? "", 10) || 60_000;
    return { max, windowMs, now, disabled: false as const };
  }
  if (kind === "canaryStatus") {
    const maxEnv = process.env.RATE_LIMIT_CANARY_STATUS_MAX;
    const windowEnv = process.env.RATE_LIMIT_CANARY_STATUS_WINDOW_MS;
    if (process.env.NODE_ENV === "test" && !maxEnv && !windowEnv) {
      return { max: Infinity, windowMs: 60_000, now, disabled: true as const };
    }
    const max = Number.parseInt(maxEnv ?? "", 10) || 60;
    const windowMs = Number.parseInt(windowEnv ?? "", 10) || 60_000;
    return { max, windowMs, now, disabled: false as const };
  }
  if (kind === "labExtract") {
    const maxEnv = process.env.RATE_LIMIT_LAB_EXTRACT_MAX;
    const windowEnv = process.env.RATE_LIMIT_LAB_EXTRACT_WINDOW_MS;
    if (process.env.NODE_ENV === "test" && !maxEnv && !windowEnv) {
      return { max: Infinity, windowMs: 60_000, now, disabled: true as const };
    }
    const max = Number.parseInt(maxEnv ?? "", 10) || 60;
    const windowMs = Number.parseInt(windowEnv ?? "", 10) || 60_000;
    return { max, windowMs, now, disabled: false as const };
  }
  if (kind === "labComplete") {
    const maxEnv = process.env.RATE_LIMIT_LAB_COMPLETE_MAX;
    const windowEnv = process.env.RATE_LIMIT_LAB_COMPLETE_WINDOW_MS;
    if (process.env.NODE_ENV === "test" && !maxEnv && !windowEnv) {
      return { max: Infinity, windowMs: 60_000, now, disabled: true as const };
    }
    const max = Number.parseInt(maxEnv ?? "", 10) || 10;
    const windowMs = Number.parseInt(windowEnv ?? "", 10) || 60_000;
    return { max, windowMs, now, disabled: false as const };
  }
  const maxEnv = process.env.RATE_LIMIT_CANARY_MAX;
  const windowEnv = process.env.RATE_LIMIT_CANARY_WINDOW_MS;
  if (process.env.NODE_ENV === "test" && !maxEnv && !windowEnv) {
    return { max: Infinity, windowMs: 60_000, now, disabled: true as const };
  }
  const max = Number.parseInt(maxEnv ?? "", 10) || 120;
  const windowMs = Number.parseInt(windowEnv ?? "", 10) || 60_000;
  return { max, windowMs, now, disabled: false as const };
}

export function checkRateLimit(
  kind: RateLimitKind,
  key: string
): RateLimitResult {
  const { max, windowMs, now, disabled } = getConfig(kind) as {
    max: number;
    windowMs: number;
    now: number;
    disabled: boolean;
  };
  if (disabled) {
    return { allowed: true };
  }
  const mapKey = `${kind}:${key}`;
  const entry = counters.get(mapKey);

  if (!entry || now - entry.windowStart >= windowMs) {
    counters.set(mapKey, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count < max) {
    entry.count += 1;
    return { allowed: true };
  }

  const retryMs = entry.windowStart + windowMs - now;
  const retryAfterSeconds = retryMs > 0 ? Math.ceil(retryMs / 1000) : 1;
  return { allowed: false, retryAfterSeconds };
}

/** Test helper to reset in-memory counters between Jest suites. */
export function __resetRateLimitCountersForTests() {
  counters.clear();
}

