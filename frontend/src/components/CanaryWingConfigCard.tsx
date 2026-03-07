"use client";

import React, { useCallback, useEffect, useState } from "react";
import clsx from "clsx";

export interface CanaryWingConfig {
  url?: string;
  baseUrl?: string;
  token?: string;
}

export interface CanaryWingConfigCardProps {
  /** Current JSON payload; controlled from parent. */
  payload?: string;
  /** Called when user changes config; parent should set payloads["canary-wing"]. */
  onPayloadChange: (payload: string) => void;
  disabled?: boolean;
  className?: string;
}

function parsePayloadSafe(payload: string | undefined): CanaryWingConfig {
  if (!payload?.trim()) return {};
  try {
    const parsed = JSON.parse(payload) as CanaryWingConfig;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export const CanaryWingConfigCard: React.FC<CanaryWingConfigCardProps> = ({
  payload,
  onPayloadChange,
  disabled = false,
  className,
}) => {
  const config = parsePayloadSafe(payload);

  const [url, setUrl] = useState(config.url ?? "");
  const [baseUrl, setBaseUrl] = useState(config.baseUrl ?? "");
  const [token, setToken] = useState(config.token ?? "");

  // Sync from parent when payload changes externally (e.g. reset or load).
  useEffect(() => {
    setUrl(config.url ?? "");
    setBaseUrl(config.baseUrl ?? "");
    setToken(config.token ?? "");
  }, [payload]);

  const emit = useCallback(
    (next: CanaryWingConfig) => {
      const str = JSON.stringify(next);
      onPayloadChange(str);
    },
    [onPayloadChange]
  );

  useEffect(() => {
    const next: CanaryWingConfig = {};
    if (url.trim()) next.url = url.trim();
    if (baseUrl.trim()) next.baseUrl = baseUrl.trim();
    if (token.trim()) next.token = token.trim();
    emit(next);
  }, [url, baseUrl, token, emit]);

  return (
    <div
      className={clsx(
        "rounded-xl border border-noir-border bg-noir-panel/70 p-4 noir-shell",
        disabled && "opacity-60 pointer-events-none",
        className
      )}
      aria-labelledby="canary-wing-card-title"
    >
      <h3
        id="canary-wing-card-title"
        className="text-xs font-semibold uppercase tracking-[0.2em] text-neon-cyan mb-3"
        title="OWASP LLM10: Embeds a unique, trackable canary-style URL to detect when CV content is exfiltrated or used (e.g. link followed by crawler/model pipeline)."
      >
        The Canary Wing (LLM10)
      </h3>
      <p
        className="text-[10px] text-noir-foreground/70 mb-4"
        title="The canary URL is built only from this config; no document content (and no PII) is ever included."
      >
        Embeds an almost invisible, trackable URL to detect when your CV is exfiltrated or used for model training. No PII ever goes into this URL.
      </p>

      <fieldset className="space-y-3">
        <div>
          <label
            className="block text-[10px] text-noir-foreground/70 mb-1"
            title="Full URL to embed as-is (e.g. a CanaryTokens.com link). If set, it takes precedence over base URL and token."
          >
            Full canary URL (optional)
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://canarytokens.com/feedback/abc/xyz123"
            disabled={disabled}
            className="w-full rounded border border-noir-border bg-noir-bg px-2 py-1.5 text-xs text-noir-foreground placeholder:text-noir-foreground/40 focus:border-neon-cyan focus:outline-none"
            title="Full URL to embed as-is (e.g. CanaryTokens.com). If set, base URL and token are ignored."
            aria-describedby="url-hint"
          />
          <p id="url-hint" className="text-[10px] text-noir-foreground/50 mt-1">
            Use when you already have a full canary URL. We embed it exactly; nothing is appended.
          </p>
        </div>

        <div>
          <label
            className="block text-[10px] text-noir-foreground/70 mb-1"
            title="Base URL for your own canary endpoint (e.g. your FunversarialCV /api/canary). Used when no full URL is provided."
          >
            Base URL (optional)
          </label>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://your-app.example.com/api/canary"
            disabled={disabled}
            className="w-full rounded border border-noir-border bg-noir-bg px-2 py-1.5 text-xs text-noir-foreground placeholder:text-noir-foreground/40 focus:border-neon-cyan focus:outline-none"
            title="Base URL for your canary endpoint. If url is empty, we build baseUrl/token. Defaults to this app's /api/canary when left blank."
            aria-describedby="baseurl-hint"
          />
          <p id="baseurl-hint" className="text-[10px] text-noir-foreground/50 mt-1">
            If &quot;Full canary URL&quot; is empty, we build <code className="text-[9px]">baseUrl/token</code>. Leave blank to use this app&apos;s default /api/canary.
          </p>
        </div>

        <div>
          <label
            className="block text-[10px] text-noir-foreground/70 mb-1"
            title="Optional token suffix. If empty, a UUID is generated. Must be safe (letters, digits, dashes)."
          >
            Token (optional)
          </label>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="safe-token-or-leave-blank"
            disabled={disabled}
            className="w-full rounded border border-noir-border bg-noir-bg px-2 py-1.5 text-xs text-noir-foreground placeholder:text-noir-foreground/40 focus:border-neon-cyan focus:outline-none"
            title="Optional token for the URL path. If empty, a UUID is generated. Never put PII here."
            aria-describedby="token-hint"
          />
          <p id="token-hint" className="text-[10px] text-noir-foreground/50 mt-1">
            Never put PII here; it becomes part of the URL path.
          </p>
        </div>
      </fieldset>

      <p
        className="text-[10px] text-neon-cyan/80 italic mt-4 pt-3 border-t border-noir-border"
        title="Canary Wing never reads document content to build the URL. PII stays in vault tokens only."
      >
        Canary Wing never uses document content in URLs. Everything here is outside the Stateless Vault; PII stays in tokens only.
      </p>
    </div>
  );
};
