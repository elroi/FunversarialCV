"use client";

import React, { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { CollapsibleCard } from "./ui/CollapsibleCard";

export interface CanaryWingConfig {
  url?: string;
  baseUrl?: string;
  token?: string;
  /** DOCX: include hidden canary text (default true). Can combine with clickable link. */
  docxHiddenText?: boolean;
  /** DOCX: include clickable hyperlink (default false). Can combine with hidden text. */
  docxClickableLink?: boolean;
  /** DOCX: make clickable link visible (recommended for social engineering). Default false. */
  docxClickableVisible?: boolean;
  /** DOCX: place clickable link at end of document or in footer. Default "end". */
  docxPlacement?: "end" | "footer";
  docxDisplayText?: string;
  /** PDF: include invisible canary text (default true). Can combine with clickable link. */
  pdfHiddenText?: boolean;
  /** PDF: add clickable link region (default false). Can combine with hidden text. */
  pdfClickableLink?: boolean;
  /** @deprecated Use docxHiddenText + docxClickableLink instead. Still supported for backward compat. */
  docxLinkStyle?: "hidden" | "clickable" | "clickable-with-text";
  /** @deprecated Use pdfHiddenText + pdfClickableLink instead. Still supported for backward compat. */
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
  const [docxHiddenText, setDocxHiddenText] = useState(
    config.docxHiddenText ?? (config.docxLinkStyle === "hidden" || !config.docxLinkStyle)
  );
  const [docxClickableLink, setDocxClickableLink] = useState(
    config.docxClickableLink ?? (config.docxLinkStyle === "clickable" || config.docxLinkStyle === "clickable-with-text")
  );
  const [docxClickableVisible, setDocxClickableVisible] = useState(config.docxClickableVisible ?? false);
  const [docxPlacement, setDocxPlacement] = useState<"end" | "footer">(config.docxPlacement ?? "end");
  const [docxDisplayText, setDocxDisplayText] = useState(config.docxDisplayText ?? "");
  const [pdfHiddenText, setPdfHiddenText] = useState(
    config.pdfHiddenText ?? (config.pdfLinkStyle !== "clickable")
  );
  const [pdfClickableLink, setPdfClickableLink] = useState(
    config.pdfClickableLink ?? (config.pdfLinkStyle === "clickable")
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
    setDocxHiddenText(
      config.docxHiddenText ?? (config.docxLinkStyle === "hidden" || !config.docxLinkStyle)
    );
    setDocxClickableLink(
      config.docxClickableLink ?? (config.docxLinkStyle === "clickable" || config.docxLinkStyle === "clickable-with-text")
    );
    setDocxClickableVisible(config.docxClickableVisible ?? false);
    setDocxPlacement(config.docxPlacement ?? "end");
    setDocxDisplayText(config.docxDisplayText ?? "");
    setPdfHiddenText(config.pdfHiddenText ?? (config.pdfLinkStyle !== "clickable"));
    setPdfClickableLink(config.pdfClickableLink ?? (config.pdfLinkStyle === "clickable"));
    // We intentionally depend on the parsed config derived from payload rather than
    // individual fields to keep the effect stable and avoid noisy dependency lists.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

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
    next.docxHiddenText = docxHiddenText;
    next.docxClickableLink = docxClickableLink;
    next.docxClickableVisible = docxClickableVisible;
    next.docxPlacement = docxPlacement;
    if (docxDisplayText.trim()) next.docxDisplayText = docxDisplayText.trim();
    next.pdfHiddenText = pdfHiddenText;
    next.pdfClickableLink = pdfClickableLink;
    emit(next);
  }, [
    url,
    baseUrl,
    token,
    docxHiddenText,
    docxClickableLink,
    docxClickableVisible,
    docxPlacement,
    docxDisplayText,
    pdfHiddenText,
    pdfClickableLink,
    emit,
  ]);

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
      title={
        <span className="flex flex-col gap-0.5">
          <span>The Canary Wing (LLM10)</span>
          <span className="text-[9px] font-mono text-noir-foreground/60">
            STYLE-AFFECTING
          </span>
        </span>
      }
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
          Only options for the format of the file you upload are applied. You can enable more than one option per format.
        </p>
        <div className="space-y-3">
          <div>
            <span className="block text-[10px] text-noir-foreground/70 mb-1">DOCX</span>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={docxHiddenText}
                  onChange={(e) => setDocxHiddenText(e.target.checked)}
                  disabled={disabled}
                  className="rounded border-noir-border text-neon-cyan focus:ring-neon-cyan"
                  aria-describedby="docx-hidden-desc"
                />
                <span className="text-[10px] text-noir-foreground/80">Include hidden canary text</span>
              </label>
              <p id="docx-hidden-desc" className="text-[10px] text-noir-foreground/50 ml-5">
                Invisible paragraph with the canary URL (extractable by parsers).
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={docxClickableLink}
                  onChange={(e) => setDocxClickableLink(e.target.checked)}
                  disabled={disabled}
                  className="rounded border-noir-border text-neon-cyan focus:ring-neon-cyan"
                  aria-describedby="docx-clickable-desc"
                />
                <span className="text-[10px] text-noir-foreground/80">Include clickable link</span>
              </label>
              <p id="docx-clickable-desc" className="text-[10px] text-noir-foreground/50 ml-5">
                Real hyperlink. Can be hidden (tiny white) or visible (recommended for social engineering). Can be used together with hidden text.
              </p>
              {docxClickableLink && (
                <>
                  <label className="flex items-center gap-2 cursor-pointer ml-5">
                    <input
                      type="checkbox"
                      checked={docxClickableVisible}
                      onChange={(e) => setDocxClickableVisible(e.target.checked)}
                      disabled={disabled}
                      className="rounded border-noir-border text-neon-cyan focus:ring-neon-cyan"
                      aria-describedby="docx-visible-desc"
                    />
                    <span className="text-[10px] text-noir-foreground/80">Make link visible (9pt, blue — recommended for tricking users)</span>
                  </label>
                  <p id="docx-visible-desc" className="text-[10px] text-noir-foreground/50 ml-10">
                    When unchecked, the link is tiny white (hidden). When checked, it appears as a normal link so readers may click it.
                  </p>
                  <div className="ml-5 mt-2">
                    <span className="block text-[10px] text-noir-foreground/70 mb-1">Place link</span>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="docx-placement"
                          checked={docxPlacement === "end"}
                          onChange={() => setDocxPlacement("end")}
                          disabled={disabled}
                          className="border-noir-border text-neon-cyan focus:ring-neon-cyan"
                        />
                        <span className="text-[10px] text-noir-foreground/80">End of document</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="docx-placement"
                          checked={docxPlacement === "footer"}
                          onChange={() => setDocxPlacement("footer")}
                          disabled={disabled}
                          className="border-noir-border text-neon-cyan focus:ring-neon-cyan"
                        />
                        <span className="text-[10px] text-noir-foreground/80">Document footer</span>
                      </label>
                    </div>
                    <p className="text-[10px] text-noir-foreground/50 mt-1">
                      Both options place the canary link at the end of the document so Word can open the file. A true OOXML footer is not used for compatibility.
                    </p>
                  </div>
                </>
              )}
              {docxClickableLink && (
                <div className="ml-5 mt-2">
                  <input
                    type="text"
                    value={docxDisplayText}
                    onChange={(e) => setDocxDisplayText(e.target.value)}
                    placeholder="Optional custom link text (e.g. Verify document integrity)"
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
          </div>
          <div>
            <span className="block text-[10px] text-noir-foreground/70 mb-1">PDF</span>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pdfHiddenText}
                  onChange={(e) => setPdfHiddenText(e.target.checked)}
                  disabled={disabled}
                  className="rounded border-noir-border text-neon-cyan focus:ring-neon-cyan"
                />
                <span className="text-[10px] text-noir-foreground/80">Include invisible canary text</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pdfClickableLink}
                  onChange={(e) => setPdfClickableLink(e.target.checked)}
                  disabled={disabled}
                  className="rounded border-noir-border text-neon-cyan focus:ring-neon-cyan"
                />
                <span className="text-[10px] text-noir-foreground/80">Add clickable link region</span>
              </label>
              <p className="text-[10px] text-noir-foreground/50 ml-5">
                Invisible region over the canary text that opens the URL when clicked. Can be used together with invisible text.
              </p>
            </div>
          </div>
          <div>
            <span className="block text-[10px] text-noir-foreground/70 mb-1">Presets</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setDocxHiddenText(true); setDocxClickableLink(false); setPdfHiddenText(true); setPdfClickableLink(false); setDocxDisplayText(""); }}
                disabled={disabled}
                className="rounded border border-noir-border bg-noir-panel px-2 py-1 text-[10px] text-noir-foreground hover:bg-noir-border/50 focus:border-neon-cyan focus:outline-none disabled:opacity-50"
              >
                Stealth
              </button>
              <button
                type="button"
                onClick={() => { setDocxHiddenText(true); setDocxClickableLink(true); setPdfHiddenText(true); setPdfClickableLink(true); setDocxDisplayText(""); }}
                disabled={disabled}
                className="rounded border border-noir-border bg-noir-panel px-2 py-1 text-[10px] text-noir-foreground hover:bg-noir-border/50 focus:border-neon-cyan focus:outline-none disabled:opacity-50"
              >
                Balanced
              </button>
              <button
                type="button"
                onClick={() => { setDocxHiddenText(true); setDocxClickableLink(true); setPdfHiddenText(true); setPdfClickableLink(true); setDocxDisplayText("Verify document integrity"); }}
                disabled={disabled}
                className="rounded border border-noir-border bg-noir-panel px-2 py-1 text-[10px] text-noir-foreground hover:bg-noir-border/50 focus:border-neon-cyan focus:outline-none disabled:opacity-50"
              >
                Maximum
              </button>
            </div>
            <p className="text-[10px] text-noir-foreground/50 mt-1">
              Stealth: hidden text only. Balanced: hidden + clickable link (both formats). Maximum: same + custom link text.
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
        <p className="text-[10px] text-noir-foreground/50 mb-2">
          Each embedding type uses a different URL (e.g. <code className="text-[9px]">…/docx-hidden</code>, <code className="text-[9px]">…/pdf-clickable</code>), so when a canary fires you can see which vector was triggered.
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
