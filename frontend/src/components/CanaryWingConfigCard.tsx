"use client";

import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import clsx from "clsx";
import { CollapsibleCard } from "./ui/CollapsibleCard";
import { CheckAndValidateBlock } from "./CheckAndValidateBlock";
import { useCopy } from "../copy";

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
  const copy = useCopy();
  const initial = parsePayloadSafe(payload);

  const [url, setUrl] = useState(initial.url ?? "");
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl ?? "");
  const [token, setToken] = useState(initial.token ?? "");
  const [docxHiddenText, setDocxHiddenText] = useState(
    initial.docxHiddenText ?? (initial.docxLinkStyle === "hidden" || !initial.docxLinkStyle)
  );
  const [docxClickableLink, setDocxClickableLink] = useState(
    initial.docxClickableLink ??
      (initial.docxLinkStyle === "clickable" || initial.docxLinkStyle === "clickable-with-text")
  );
  const [docxClickableVisible, setDocxClickableVisible] = useState(initial.docxClickableVisible ?? false);
  const [docxPlacement, setDocxPlacement] = useState<"end" | "footer">(initial.docxPlacement ?? "end");
  const [docxDisplayText, setDocxDisplayText] = useState(initial.docxDisplayText ?? "");
  const [pdfHiddenText, setPdfHiddenText] = useState(
    initial.pdfHiddenText ?? (initial.pdfLinkStyle !== "clickable")
  );
  const [pdfClickableLink, setPdfClickableLink] = useState(
    initial.pdfClickableLink ?? (initial.pdfLinkStyle === "clickable")
  );

  // Default base when url and baseUrl are both empty. Same value on server and first client render to avoid hydration mismatch; then set to window.location.origin in useEffect (client-only).
  const [defaultCanaryBase, setDefaultCanaryBase] = useState(
    "https://this-app/api/canary"
  );

  // "Did my canary sing?" — candidate-facing status (best-effort, process-local).
  const [statusHits, setStatusHits] = useState<Array<{ variant: string; ts: string; userAgent?: string; referer?: string }> | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Sync from parent when the payload *string* changes. Parsed `config` must not be a
  // dependency: parsePayloadSafe returns a new object every render, which would re-run
  // this on every frame, fight the emit effect, and can loop (e.g. Maximum preset +
  // docxDisplayText). Layout effect runs before the emit useEffect so local state matches
  // payload before we stringify and call onPayloadChange.
  useLayoutEffect(() => {
    const cfg = parsePayloadSafe(payload);
    setUrl(cfg.url ?? "");
    setBaseUrl(cfg.baseUrl ?? "");
    setToken(cfg.token ?? "");
    setDocxHiddenText(cfg.docxHiddenText ?? (cfg.docxLinkStyle === "hidden" || !cfg.docxLinkStyle));
    setDocxClickableLink(
      cfg.docxClickableLink ??
        (cfg.docxLinkStyle === "clickable" || cfg.docxLinkStyle === "clickable-with-text")
    );
    setDocxClickableVisible(cfg.docxClickableVisible ?? false);
    setDocxPlacement(cfg.docxPlacement ?? "end");
    setDocxDisplayText(cfg.docxDisplayText ?? "");
    setPdfHiddenText(cfg.pdfHiddenText ?? (cfg.pdfLinkStyle !== "clickable"));
    setPdfClickableLink(cfg.pdfClickableLink ?? (cfg.pdfLinkStyle === "clickable"));
  }, [payload]);

  // After mount, use current origin for default canary base so the preview matches what the server would use in dev.
  useEffect(() => {
    if (typeof window !== "undefined") {
      setDefaultCanaryBase(`${window.location.origin}/api/canary`);
    }
  }, []);

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
    const str = JSON.stringify(next);
    const prev = payload ?? "";
    if (str !== prev) {
      onPayloadChange(str);
    }
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
    payload,
    onPayloadChange,
  ]);

  const resultingUrl =
    url.trim() !== ""
      ? url.trim()
      : (() => {
          const base =
            baseUrl.trim() !== ""
              ? baseUrl.trim().replace(/\/+$/, "")
              : defaultCanaryBase;
          const t = token.trim() || "[uuid-generated-on-inject]";
          return `${base}/${t}`;
        })();
  const copyCanaryLink = useCallback(() => {
    void navigator.clipboard.writeText(resultingUrl);
  }, [resultingUrl]);

  const checkCanaryStatus = useCallback(async () => {
    const t = token.trim();
    if (!t) return;
    setStatusError(null);
    setStatusLoading(true);
    try {
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const res = await fetch(`${base}/api/canary/status?token=${encodeURIComponent(t)}`);
      const data = await res.json();
      if (!res.ok) {
        setStatusHits(null);
        setStatusError(data?.error ?? "Failed to load status.");
        return;
      }
      setStatusHits(Array.isArray(data?.hits) ? data.hits : []);
    } catch {
      setStatusHits(null);
      setStatusError("Network error. Try again.");
    } finally {
      setStatusLoading(false);
    }
  }, [token]);

  return (
    <CollapsibleCard
      title={
        <span className="flex flex-col gap-0.5">
          <span>{copy.eggCanaryWingTitle}</span>
          <span className="text-xs font-mono text-foreground/60">
            {copy.styleAffecting}
          </span>
        </span>
      }
      titleId="canary-wing-card-title"
      contentId="canary-wing-card-content"
      ariaLabel={`Expand ${copy.eggCanaryWingTitle} config`}
      defaultExpanded={false}
      disabled={disabled}
      className={className}
    >
      <p
        className="text-caption sm:text-sm text-foreground/70 mb-4"
        title="The canary URL is built only from this config; no document content (and no PII) is ever included."
      >
        Embeds an almost invisible, trackable URL to detect when your CV is exfiltrated or used for model training. No PII ever goes into this URL.
      </p>

      <fieldset className="space-y-3">
        <div>
          <label
            className="block text-caption text-foreground/70 mb-1"
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
            className="w-full rounded border border-border bg-bg px-2 py-1.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-accent focus:outline-none"
            title="Full URL to embed as-is (e.g. CanaryTokens.com). If set, base URL and token are ignored."
            aria-describedby="url-hint"
          />
          <p id="url-hint" className="text-caption text-foreground/50 mt-1">
            Use when you already have a full canary URL. We embed it exactly; nothing is appended.
          </p>
        </div>

        <div>
          <label
            className="block text-caption text-foreground/70 mb-1"
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
            className="w-full rounded border border-border bg-bg px-2 py-1.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-accent focus:outline-none"
            title="Base URL for your canary endpoint. If url is empty, we build baseUrl/token. Defaults to this app's /api/canary when left blank."
            aria-describedby="baseurl-hint"
          />
          <p id="baseurl-hint" className="text-caption text-foreground/50 mt-1">
            If &quot;Full canary URL&quot; is empty, we build <code className="text-sm">baseUrl/token</code>. Leave blank to use this app&apos;s default /api/canary.
          </p>
        </div>

        <div>
          <label
            className="block text-caption text-foreground/70 mb-1"
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
            className="w-full rounded border border-border bg-bg px-2 py-1.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-accent focus:outline-none"
            title="Optional token for the URL path. If empty, a UUID is generated. Never put PII here."
            aria-describedby="token-hint"
          />
          <p id="token-hint" className="text-caption text-foreground/50 mt-1">
            Never put PII here; it becomes part of the URL path.
          </p>
        </div>
      </fieldset>

      <p
        className="text-caption text-accent/80 italic mt-4 pt-3 border-t border-border"
        title="Canary Wing never reads document content to build the URL. PII stays in vault tokens only."
      >
        Canary Wing never uses document content in URLs. Everything here is outside the Stateless Vault; PII stays in tokens only.
      </p>

      <fieldset className="mt-4 pt-4 border-t border-border" aria-labelledby="canary-embedding-legend">
        <legend id="canary-embedding-legend" className="text-caption uppercase tracking-wider text-foreground/80 mb-2">
          Embedding options
        </legend>
        <p className="text-caption text-foreground/50 mb-3">
          Only options for the format of the file you upload are applied. You can enable more than one option per format.
        </p>
        <div className="space-y-3">
          <div>
            <span className="block text-caption text-foreground/70 mb-1">DOCX</span>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={docxHiddenText}
                  onChange={(e) => setDocxHiddenText(e.target.checked)}
                  disabled={disabled}
                  className="rounded border-border text-accent focus:ring-accent"
                  aria-describedby="docx-hidden-desc"
                />
                <span className="text-caption text-foreground/80">Include hidden canary text</span>
              </label>
              <p id="docx-hidden-desc" className="text-caption text-foreground/50 ml-5">
                Invisible paragraph with the canary URL (extractable by parsers).
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={docxClickableLink}
                  onChange={(e) => setDocxClickableLink(e.target.checked)}
                  disabled={disabled}
                  className="rounded border-border text-accent focus:ring-accent"
                  aria-describedby="docx-clickable-desc"
                />
                <span className="text-caption text-foreground/80">Include clickable link</span>
              </label>
              <p id="docx-clickable-desc" className="text-caption text-foreground/50 ml-5">
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
                      className="rounded border-border text-accent focus:ring-accent"
                      aria-describedby="docx-visible-desc"
                    />
                    <span className="text-caption text-foreground/80">Make link visible (9pt, blue — recommended for tricking users)</span>
                  </label>
                  <p id="docx-visible-desc" className="text-caption text-foreground/50 ml-10">
                    When unchecked, the link is tiny white (hidden). When checked, it appears as a normal link so readers may click it.
                  </p>
                  <div className="ml-5 mt-2">
                    <span className="block text-caption text-foreground/70 mb-1">Place link</span>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="docx-placement"
                          checked={docxPlacement === "end"}
                          onChange={() => setDocxPlacement("end")}
                          disabled={disabled}
                          className="border-border text-accent focus:ring-accent"
                        />
                        <span className="text-caption text-foreground/80">End of document</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="docx-placement"
                          checked={docxPlacement === "footer"}
                          onChange={() => setDocxPlacement("footer")}
                          disabled={disabled}
                          className="border-border text-accent focus:ring-accent"
                        />
                        <span className="text-caption text-foreground/80">Document footer</span>
                      </label>
                    </div>
                    <p className="text-caption text-foreground/50 mt-1">
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
                    className="w-full rounded border border-border bg-bg px-2 py-1.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-accent focus:outline-none"
                    aria-describedby="docx-display-hint"
                  />
                  <p id="docx-display-hint" className="text-caption text-foreground/50 mt-1">
                    This text can increase click-through; use wording you&apos;re comfortable with. FunversarialCV does not provide official verification—this is for detection only.
                  </p>
                </div>
              )}
            </div>
          </div>
          <div>
            <span className="block text-caption text-foreground/70 mb-1">PDF</span>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pdfHiddenText}
                  onChange={(e) => setPdfHiddenText(e.target.checked)}
                  disabled={disabled}
                  className="rounded border-border text-accent focus:ring-accent"
                />
                <span className="text-caption text-foreground/80">Include invisible canary text</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pdfClickableLink}
                  onChange={(e) => setPdfClickableLink(e.target.checked)}
                  disabled={disabled}
                  className="rounded border-border text-accent focus:ring-accent"
                />
                <span className="text-caption text-foreground/80">Add clickable link region</span>
              </label>
              <p className="text-caption text-foreground/50 ml-5">
                Invisible region over the canary text that opens the URL when clicked. Can be used together with invisible text.
              </p>
            </div>
          </div>
          <div>
            <span className="block text-caption text-foreground/70 mb-1">Presets</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setDocxHiddenText(true); setDocxClickableLink(false); setPdfHiddenText(true); setPdfClickableLink(false); setDocxDisplayText(""); }}
                disabled={disabled}
                className="rounded border border-border bg-panel px-2 py-1 text-caption text-foreground hover:bg-border/50 focus:border-accent focus:outline-none disabled:opacity-50"
              >
                Stealth
              </button>
              <button
                type="button"
                onClick={() => { setDocxHiddenText(true); setDocxClickableLink(true); setPdfHiddenText(true); setPdfClickableLink(true); setDocxDisplayText(""); }}
                disabled={disabled}
                className="rounded border border-border bg-panel px-2 py-1 text-caption text-foreground hover:bg-border/50 focus:border-accent focus:outline-none disabled:opacity-50"
              >
                Balanced
              </button>
              <button
                type="button"
                onClick={() => { setDocxHiddenText(true); setDocxClickableLink(true); setPdfHiddenText(true); setPdfClickableLink(true); setDocxDisplayText("Verify document integrity"); }}
                disabled={disabled}
                className="rounded border border-border bg-panel px-2 py-1 text-caption text-foreground hover:bg-border/50 focus:border-accent focus:outline-none disabled:opacity-50"
              >
                Maximum
              </button>
            </div>
            <p className="text-caption text-foreground/50 mt-1">
              Stealth: hidden text only. Balanced: hidden + clickable link (both formats). Maximum: same + custom link text.
            </p>
          </div>
        </div>
      </fieldset>

      <fieldset className="mt-4 pt-4 border-t border-border">
        <legend
          className="text-caption uppercase tracking-wider text-foreground/80 mb-2"
          title="Copy this URL to add the canary link to your CV manually (e.g. in your editor). When the link is followed, your canary will record the hit."
        >
          {copy.canaryWingResultingLink}
        </legend>
        <p
          id="canary-resulting-hint"
          className="text-caption text-foreground/50 mb-2"
          title="Copy this URL to add the canary link to your CV manually. When the link is followed, your canary will record the hit."
        >
          Copy this URL to add it manually to your CV (e.g. in your editor). When the link is followed, your canary will record the hit.
        </p>
        <p className="text-caption text-foreground/50 mb-2">
          Each embedding type uses a different URL (e.g. <code className="text-sm">…/docx-hidden</code>, <code className="text-sm">…/pdf-clickable</code>), so when a canary fires you can see which vector was triggered.
        </p>
        <div className="flex gap-2 items-center">
          <code
            className="flex-1 min-w-0 rounded border border-border bg-bg px-2 py-1.5 text-caption text-foreground break-all"
            title={resultingUrl}
          >
            {resultingUrl}
          </code>
          <button
            type="button"
            onClick={copyCanaryLink}
            disabled={disabled}
            className="shrink-0 rounded border border-border bg-panel px-2 py-1.5 text-caption text-accent hover:bg-border/50 focus:border-accent focus:outline-none disabled:opacity-50"
            title="Copy this URL to add the canary link to your CV manually."
            aria-label="Copy resulting canary URL"
          >
            {copy.canaryWingCopyButton}
          </button>
        </div>
      </fieldset>

      <div
        className="mt-4 pt-4 border-t border-border"
        role="region"
        aria-labelledby="canary-status-title"
      >
        <h4
          id="canary-status-title"
          className="text-caption sm:text-sm uppercase tracking-wider text-foreground/80 mb-2"
        >
          Did my canary sing?
        </h4>
        <p className="text-caption text-foreground/70 mb-2">
          When the canary link in your CV (after Inject Eggs) is opened or clicked, the server records the hit (variant, time, and optional client info). To see your results:
        </p>
        <ol className="text-caption text-foreground/70 list-decimal list-inside space-y-1 mb-2 ml-0.5">
          <li><strong>Find the egg</strong> — Open your output document (DOCX). Use Select All (Ctrl/Cmd+A) or search for a URL; the canary is embedded as nearly invisible text and/or a clickable region.</li>
          <li><strong>Trigger it</strong> — Click the canary link (or have someone/something else open it). The server logs the hit and associates it with your token.</li>
          <li><strong>Watch the result</strong> — Click <strong>Check for triggers</strong> below. You&apos;ll see each trigger with variant (e.g. <code className="text-sm">pdf-clickable</code>) and timestamp; repeated triggers appear in the list.</li>
        </ol>
        <p className="text-caption text-foreground/50 mb-2">
          Hits are stored per server process. If you just triggered the link and see no results, click Check for triggers again once the request was handled by this app.
        </p>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <button
            type="button"
            onClick={checkCanaryStatus}
            disabled={disabled || !token.trim() || statusLoading}
            className="rounded border border-border bg-panel px-2 py-1.5 text-caption text-accent hover:bg-border/50 focus:border-accent focus:outline-none disabled:opacity-50"
            aria-label="Check if canary was triggered"
          >
            {statusLoading ? "Checking…" : "Check for triggers"}
          </button>
        </div>
        {statusError && (
          <p className="text-caption text-red-400/90 mb-2" role="alert">
            {statusError}
          </p>
        )}
        {statusHits !== null && !statusError && (
          <div className="text-caption text-foreground/80">
            {statusHits.length === 0 ? (
              <p className="text-foreground/60 italic">
                No triggers yet. Find the canary link in your CV after Inject Eggs, click it, then click <strong>Check for triggers</strong> above to see it here.
              </p>
            ) : (
              <>
                <p className="mb-1.5 font-medium text-accent/90">
                  Your canary sang {statusHits.length} time{statusHits.length !== 1 ? "s" : ""} — each row below is a recorded hit (variant and time).
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-foreground/70">
                  {statusHits.slice(0, 10).map((h, i) => (
                    <li key={`${h.ts}-${i}`}>
                      <span className="font-mono text-xs">{h.variant}</span> — {h.ts}
                      {h.userAgent && (
                        <span className="block ml-4 truncate text-xs text-foreground/50" title={h.userAgent}>
                          {h.userAgent.slice(0, 60)}{h.userAgent.length > 60 ? "…" : ""}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {statusHits.length > 10 && (
                  <p className="mt-1 text-caption text-foreground/50">Showing latest 10 of {statusHits.length}.</p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div
        className="mt-4 pt-4 border-t border-border"
        role="region"
        aria-labelledby="canary-wing-check-validate-title"
      >
        <h4
          id="canary-wing-check-validate-title"
          className="text-caption sm:text-sm uppercase tracking-wider text-foreground/80 mb-2"
        >
          How to check &amp; validate
        </h4>
        {manualCheckAndValidation ? (
          <CheckAndValidateBlock
            content={manualCheckAndValidation}
            fallback={
              <p className="text-caption sm:text-sm text-foreground/50 italic">
                Instructions not available. Ensure the app can reach /api/eggs.
              </p>
            }
          />
        ) : (
          <p className="text-caption sm:text-sm text-foreground/50 italic">
            Instructions not available. Ensure the app can reach /api/eggs.
          </p>
        )}
      </div>
    </CollapsibleCard>
  );
};
