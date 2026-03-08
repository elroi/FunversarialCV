"use client";

import React, { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { CollapsibleCard } from "./ui/CollapsibleCard";

export interface CanaryWingConfig {
  url?: string;
  baseUrl?: string;
  token?: string;
  docxLinkStyle?: "hidden" | "clickable" | "clickable-with-text";
  docxDisplayText?: string;
  pdfLinkStyle?: "hidden" | "clickable";
}

export interface CanaryWingConfigCardProps {
  /** Current JSON payload; controlled from parent. */
  payload?: string;
  /** Called when user changes config; parent should set payloads["canary-wing"]. */
  onPayloadChange: (payload: string) => void;
  disabled?: boolean;
  className?: string;
  /** Instructions for manual check and validation (from GET /api/eggs). */
  manualCheckAndValidation?: string;
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
  manualCheckAndValidation,
}) => {
  const config = parsePayloadSafe(payload);

  const [url, setUrl] = useState(config.url ?? "");
  const [baseUrl, setBaseUrl] = useState(config.baseUrl ?? "");
  const [token, setToken] = useState(config.token ?? "");
  const [docxLinkStyle, setDocxLinkStyle] = useState<CanaryWingConfig["docxLinkStyle"]>(
    config.docxLinkStyle ?? "hidden"
  );
  const [docxDisplayText, setDocxDisplayText] = useState(config.docxDisplayText ?? "");
  const [pdfLinkStyle, setPdfLinkStyle] = useState<CanaryWingConfig["pdfLinkStyle"]>(
    config.pdfLinkStyle ?? "hidden"
  );

  // Default base when url and baseUrl are both empty. Same value on server and first client render to avoid hydration mismatch; then set to window.location.origin in useEffect (client-only).
  const [defaultCanaryBase, setDefaultCanaryBase] = useState(
    "https://this-app/api/canary"
  );

  // Sync from parent when payload changes externally (e.g. reset or load).
  useEffect(() => {
    setUrl(config.url ?? "");
    setBaseUrl(config.baseUrl ?? "");
    setToken(config.token ?? "");
    setDocxLinkStyle(config.docxLinkStyle ?? "hidden");
    setDocxDisplayText(config.docxDisplayText ?? "");
    setPdfLinkStyle(config.pdfLinkStyle ?? "hidden");
  }, [payload]);

  // After mount, use current origin for default canary base so the preview matches what the server would use in dev.
  useEffect(() => {
    if (typeof window !== "undefined") {
      setDefaultCanaryBase(`${window.location.origin}/api/canary`);
    }
  }, []);

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
    next.docxLinkStyle = docxLinkStyle ?? "hidden";
    if (docxDisplayText.trim()) next.docxDisplayText = docxDisplayText.trim();
    next.pdfLinkStyle = pdfLinkStyle ?? "hidden";
    emit(next);
  }, [url, baseUrl, token, docxLinkStyle, docxDisplayText, pdfLinkStyle, emit]);

  const resultingUrl =
    url.trim() !== ""
      ? url.trim()
      : (() => {
          const base =
            baseUrl.trim() !== ""
              ? baseUrl.trim().replace(/\/+$/, "")
              : defaultCanaryBase;
          const t = token.trim() || "[uuid-generated-on-harden]";
          return `${base}/${t}`;
        })();
  const copyCanaryLink = useCallback(() => {
    void navigator.clipboard.writeText(resultingUrl);
  }, [resultingUrl]);

  return (
    <CollapsibleCard
      title="The Canary Wing (LLM10)"
      titleId="canary-wing-card-title"
      contentId="canary-wing-card-content"
      ariaLabel="Expand Canary Wing config"
      defaultExpanded={false}
      disabled={disabled}
      className={className}
    >
      <p
        className="text-[10px] sm:text-xs text-noir-foreground/70 mb-4"
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

      <fieldset className="mt-4 pt-4 border-t border-noir-border" aria-labelledby="canary-embedding-legend">
        <legend id="canary-embedding-legend" className="text-[10px] uppercase tracking-wider text-noir-foreground/80 mb-2">
          Embedding options
        </legend>
        <p className="text-[10px] text-noir-foreground/50 mb-3">
          Only options for the format of the file you upload are applied.
        </p>
        <div className="space-y-3">
          <div>
            <span className="block text-[10px] text-noir-foreground/70 mb-1">DOCX link style</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="DOCX link style">
              {(["hidden", "clickable", "clickable-with-text"] as const).map((value) => (
                <label key={value} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="docxLinkStyle"
                    checked={docxLinkStyle === value}
                    onChange={() => setDocxLinkStyle(value)}
                    disabled={disabled}
                    className="rounded border-noir-border text-neon-cyan focus:ring-neon-cyan"
                  />
                  <span className="text-[10px] text-noir-foreground/80">
                    {value === "hidden" && "Hidden text only (current)"}
                    {value === "clickable" && "Clickable link (same hidden look)"}
                    {value === "clickable-with-text" && "Clickable link with custom text"}
                  </span>
                </label>
              ))}
            </div>
            {docxLinkStyle === "clickable-with-text" && (
              <div className="mt-2">
                <input
                  type="text"
                  value={docxDisplayText}
                  onChange={(e) => setDocxDisplayText(e.target.value)}
                  placeholder="Verify document integrity"
                  disabled={disabled}
                  maxLength={100}
                  className="w-full rounded border border-noir-border bg-noir-bg px-2 py-1.5 text-xs text-noir-foreground placeholder:text-noir-foreground/40 focus:border-neon-cyan focus:outline-none"
                  aria-describedby="docx-display-hint"
                />
                <p id="docx-display-hint" className="text-[10px] text-noir-foreground/50 mt-1">
                  This text can increase click-through; use wording you&apos;re comfortable with. FunversarialCV does not provide official verification—this is for detection only.
                </p>
              </div>
            )}
          </div>
          <div>
            <span className="block text-[10px] text-noir-foreground/70 mb-1">PDF link style</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="PDF link style">
              {(["hidden", "clickable"] as const).map((value) => (
                <label key={value} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="pdfLinkStyle"
                    checked={pdfLinkStyle === value}
                    onChange={() => setPdfLinkStyle(value)}
                    disabled={disabled}
                    className="rounded border-noir-border text-neon-cyan focus:ring-neon-cyan"
                  />
                  <span className="text-[10px] text-noir-foreground/80">
                    {value === "hidden" && "Hidden text only"}
                    {value === "clickable" && "Clickable link (invisible region)"}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <span className="block text-[10px] text-noir-foreground/70 mb-1">Presets</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setDocxLinkStyle("hidden"); setPdfLinkStyle("hidden"); setDocxDisplayText(""); }}
                disabled={disabled}
                className="rounded border border-noir-border bg-noir-panel px-2 py-1 text-[10px] text-noir-foreground hover:bg-noir-border/50 focus:border-neon-cyan focus:outline-none disabled:opacity-50"
              >
                Stealth
              </button>
              <button
                type="button"
                onClick={() => { setDocxLinkStyle("clickable"); setPdfLinkStyle("clickable"); setDocxDisplayText(""); }}
                disabled={disabled}
                className="rounded border border-noir-border bg-noir-panel px-2 py-1 text-[10px] text-noir-foreground hover:bg-noir-border/50 focus:border-neon-cyan focus:outline-none disabled:opacity-50"
              >
                Balanced
              </button>
              <button
                type="button"
                onClick={() => { setDocxLinkStyle("clickable-with-text"); setPdfLinkStyle("clickable"); setDocxDisplayText("Verify document integrity"); }}
                disabled={disabled}
                className="rounded border border-noir-border bg-noir-panel px-2 py-1 text-[10px] text-noir-foreground hover:bg-noir-border/50 focus:border-neon-cyan focus:outline-none disabled:opacity-50"
              >
                Maximum
              </button>
            </div>
            <p className="text-[10px] text-noir-foreground/50 mt-1">
              Stealth: hidden only. Balanced: clickable link, no custom text. Maximum: clickable with display text.
            </p>
          </div>
        </div>
      </fieldset>

      <fieldset className="mt-4 pt-4 border-t border-noir-border">
        <legend
          className="text-[10px] uppercase tracking-wider text-noir-foreground/80 mb-2"
          title="Copy this URL to add the canary link to your CV manually (e.g. in your editor). When the link is followed, your canary will record the hit."
        >
          Resulting link — copy to enrich your CV manually
        </legend>
        <p
          id="canary-resulting-hint"
          className="text-[10px] text-noir-foreground/50 mb-2"
          title="Copy this URL to add the canary link to your CV manually. When the link is followed, your canary will record the hit."
        >
          Copy this URL to add it manually to your CV (e.g. in your editor). When the link is followed, your canary will record the hit.
        </p>
        <div className="flex gap-2 items-center">
          <code
            className="flex-1 min-w-0 rounded border border-noir-border bg-noir-bg px-2 py-1.5 text-[10px] text-noir-foreground break-all"
            title={resultingUrl}
          >
            {resultingUrl}
          </code>
          <button
            type="button"
            onClick={copyCanaryLink}
            disabled={disabled}
            className="shrink-0 rounded border border-noir-border bg-noir-panel px-2 py-1.5 text-[10px] text-neon-cyan hover:bg-noir-border/50 focus:border-neon-cyan focus:outline-none disabled:opacity-50"
            title="Copy this URL to add the canary link to your CV manually."
            aria-label="Copy resulting canary URL"
          >
            Copy
          </button>
        </div>
      </fieldset>

      <div
        className="mt-4 pt-4 border-t border-noir-border"
        role="region"
        aria-labelledby="canary-wing-check-validate-title"
      >
        <h4
          id="canary-wing-check-validate-title"
          className="text-[10px] sm:text-xs uppercase tracking-wider text-noir-foreground/80 mb-2"
        >
          How to check &amp; validate
        </h4>
        {manualCheckAndValidation ? (
          <p className="text-[10px] sm:text-xs text-noir-foreground/70">
            {manualCheckAndValidation}
          </p>
        ) : (
          <p className="text-[10px] sm:text-xs text-noir-foreground/50 italic">
            Instructions not available. Ensure the app can reach /api/eggs.
          </p>
        )}
      </div>
    </CollapsibleCard>
  );
};
