"use client";

import React, { useState, useCallback, useRef, useMemo } from "react";
import clsx from "clsx";
import { ExternalLink } from "lucide-react";
import { useCopy } from "../copy";
import { useAudience } from "../contexts/AudienceContext";
import { parseValidationLabProtocol } from "../lib/validationLabProtocol";
import { ProtocolStepRichText } from "../lib/protocolStepRichText";
import { SAMPLE_JD_BODY, SAMPLE_JD_CLIPBOARD_TEXT } from "../lib/sampleJobDescription";
import { CollapsibleCard } from "./ui/CollapsibleCard";
import { LabHarnessPanel } from "./LabHarnessPanel";
import type { ValidationLabPromptEntry } from "../copy/types";

const JD_COPY_SENTINEL = "__jd__";

const COPY_RESET_MS = 2500;

function promptCollapsibleAriaLabel(template: string, promptId: string): string {
  return template.replace(/\{id\}/g, promptId);
}

/** Same disclosure for ENABLED-badge hint in parsed and parse-fallback protocol paths (a11y consistency). */
function ValidationLabMatchBadgeHintDetails({
  title,
  hint,
}: {
  title: string;
  hint: string;
}): React.ReactElement {
  return (
    <details className="group rounded-md border border-border/50 bg-panel/30 text-foreground/80">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 font-sans text-caption uppercase tracking-[0.12em] text-foreground/55 transition-colors hover:bg-panel/50 hover:text-foreground/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden
          className="inline-block text-accent transition-transform duration-200 group-open:rotate-90"
        >
          ▸
        </span>
        {title}
      </summary>
      <p className="border-t border-border/40 px-3 py-2.5 font-sans text-caption leading-relaxed text-foreground/65">
        {hint}
      </p>
    </details>
  );
}

export interface ValidationLabProps {
  /** Egg ids included in the last successful arm/harden on this page (latest downloaded CV). */
  armedEggIds: Set<string>;
  /** Armed .docx from the main console for the ingestion lab, when available. */
  armedDocxFile?: File | null;
  onPromptCopy?: (promptId: string) => void;
  onSampleJdCopy?: () => void;
  /**
   * When set, replaces locale `validationLabManualMirrorProtocol` for parsing and fallback body (tests only).
   * Use an unparsable string to exercise the fallback renderer.
   */
  manualMirrorProtocolOverride?: string;
}

export const ValidationLab: React.FC<ValidationLabProps> = ({
  armedEggIds,
  armedDocxFile = null,
  onPromptCopy,
  onSampleJdCopy,
  manualMirrorProtocolOverride,
}) => {
  const copy = useCopy();
  const { contentAudience } = useAudience();
  const isHr = contentAudience === "hr";
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const protocolSource =
    manualMirrorProtocolOverride ?? copy.validationLabManualMirrorProtocol;

  const protocolParsed = useMemo(
    () => parseValidationLabProtocol(protocolSource),
    [protocolSource]
  );

  const resetCopyTimeout = useCallback(() => {
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
  }, []);

  const handleCopySampleJd = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    resetCopyTimeout();
    try {
      await navigator.clipboard.writeText(SAMPLE_JD_CLIPBOARD_TEXT);
      onSampleJdCopy?.();
      setCopiedId(JD_COPY_SENTINEL);
      copyTimeoutRef.current = setTimeout(() => {
        setCopiedId(null);
        copyTimeoutRef.current = null;
      }, COPY_RESET_MS);
    } catch {
      // no-op
    }
  }, [onSampleJdCopy, resetCopyTimeout]);

  const handleCopy = useCallback(
    async (prompt: ValidationLabPromptEntry) => {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        return;
      }
      resetCopyTimeout();
      try {
        await navigator.clipboard.writeText(prompt.prompt);
        onPromptCopy?.(prompt.id);
        setCopiedId(prompt.id);
        copyTimeoutRef.current = setTimeout(() => {
          setCopiedId(null);
          copyTimeoutRef.current = null;
        }, COPY_RESET_MS);
      } catch {
        // no-op
      }
    },
    [onPromptCopy, resetCopyTimeout]
  );

  const protocolIntro = protocolParsed ? (
    <div className="mb-5 space-y-3">
      <div className="rounded-lg border border-border/70 border-l-[3px] border-l-accent/50 bg-bg/40 p-3 shadow-sm sm:p-4">
        <header className="mb-4 space-y-2 border-b border-border/40 pb-4">
          <h3
            className={clsx(
              isHr
                ? "font-sans text-base font-semibold tracking-tight text-foreground/90"
                : "font-mono text-caption uppercase tracking-[0.18em] text-accent"
            )}
          >
            {protocolParsed.title}
          </h3>
          {protocolParsed.subtitle ? (
            <p
              className={clsx(
                "text-sm font-medium leading-snug text-foreground/80",
                isHr ? "font-sans" : "font-mono text-caption"
              )}
            >
              {protocolParsed.subtitle}
            </p>
          ) : null}
          {protocolParsed.description ? (
            <p className="font-sans text-sm leading-relaxed text-foreground/70">{protocolParsed.description}</p>
          ) : null}
        </header>
        <ol className="list-none space-y-3 font-sans text-sm leading-relaxed text-foreground/85">
          {protocolParsed.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-accent/35 bg-accent/[0.07] text-caption font-mono font-semibold text-accent"
                aria-hidden
              >
                {i + 1}
              </span>
              <ProtocolStepRichText text={step} />
            </li>
          ))}
        </ol>
      </div>
      <ValidationLabMatchBadgeHintDetails
        title={copy.validationLabMatchBadgeHintTitle}
        hint={copy.validationLabMatchBadgeHint}
      />
    </div>
  ) : (
    <div className="mb-5 space-y-2 text-sm text-foreground/80 font-sans leading-relaxed">
      {protocolSource.split(/\n\n+/).map((paragraph, i) => (
        <p key={i} className={paragraph.includes("\n") ? "whitespace-pre-line" : undefined}>
          {paragraph}
        </p>
      ))}
      <ValidationLabMatchBadgeHintDetails
        title={copy.validationLabMatchBadgeHintTitle}
        hint={copy.validationLabMatchBadgeHint}
      />
    </div>
  );

  const jdCopied = copiedId === JD_COPY_SENTINEL;

  const sampleJdBlock = (
    <div className="mb-5" data-testid="validation-sample-jd">
      <CollapsibleCard
        title={
          <span className="font-sans text-sm font-medium leading-snug text-foreground/90">
            {copy.sampleJobDescriptionTitle}
          </span>
        }
        titleId="validation-sample-jd-title"
        contentId="validation-sample-jd-content"
        ariaLabel={copy.sampleJobDescriptionAriaLabel}
        defaultExpanded={false}
        titleClassName="block w-full min-w-0"
        className="rounded-lg border border-border/80 bg-panel/50 transition-colors hover:border-accent/25"
      >
        <p className="mb-3 text-caption text-foreground/70">{copy.sampleJobDescriptionIntro}</p>
        <div className="rounded border border-border bg-bg/80 p-2 font-mono text-caption leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {SAMPLE_JD_BODY}
        </div>
        <div className="mt-3 flex items-center justify-end">
          <button
            type="button"
            onClick={() => void handleCopySampleJd()}
            className={clsx(
              "inline-flex min-h-10 min-w-[5.5rem] items-center justify-center rounded-md border px-4 py-2 text-caption font-semibold uppercase tracking-[0.12em]",
              "border-accent/45 bg-accent/10 text-accent hover:border-accent/70 hover:bg-accent/15",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              jdCopied && "border-success/60 bg-success/10 text-success hover:border-success/60 hover:bg-success/15"
            )}
            aria-label={copy.sampleJobDescriptionCopyAriaLabel}
          >
            {jdCopied ? copy.sampleJobDescriptionCopyButtonSuccess : copy.sampleJobDescriptionCopyButton}
          </button>
        </div>
      </CollapsibleCard>
    </div>
  );

  return (
    <>
      {sampleJdBlock}
      <LabHarnessPanel copy={copy} armedDocxFile={armedDocxFile} />
      {protocolIntro}
      <div className="space-y-2.5">
        <p className="mb-1 font-sans text-caption uppercase tracking-[0.14em] text-foreground/50">
          {copy.validationLabPromptListCaption}
        </p>
        {copy.validationPrompts.map((prompt) => {
            const isMatch =
              prompt.eggIds.length > 0 &&
              prompt.eggIds.some((id) => armedEggIds.has(id));
            const isCopied = copiedId === prompt.id;
            const titleId = `validation-prompt-${prompt.id}-title`;
            const contentId = `validation-prompt-${prompt.id}-content`;

            return (
              <div key={prompt.id} data-testid={`validation-prompt-${prompt.id}`}>
                <CollapsibleCard
                  title={
                    <span className="grid w-full min-w-0 grid-cols-1 items-center gap-x-3 gap-y-2 sm:min-h-[3.25rem] sm:grid-cols-[minmax(5rem,auto)_1fr] sm:gap-y-1">
                      <span className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold tabular-nums text-accent/95">
                          {prompt.id}
                        </span>
                        {isMatch && (
                          <span
                            className="rounded border border-success/60 bg-success/10 px-2 py-0.5 text-caption uppercase tracking-wider text-success"
                            aria-label={copy.validationMatchBadgeAriaLabel}
                          >
                            {copy.validationMatchLabel}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 font-sans text-sm font-medium leading-snug text-foreground/90 sm:py-0.5">
                        {prompt.title}
                      </span>
                    </span>
                  }
                  titleId={titleId}
                  contentId={contentId}
                  ariaLabel={promptCollapsibleAriaLabel(
                    copy.validationLabPromptCollapsibleAriaLabel,
                    prompt.id
                  )}
                  defaultExpanded={false}
                  titleClassName="block w-full min-w-0 [&>span]:max-w-full"
                  className="rounded-lg border border-border/80 bg-panel/50 transition-colors hover:border-accent/25"
                >
                  {prompt.owaspLink ? (
                    <p className="mb-3">
                      <a
                        href={prompt.owaspLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-accent hover:text-success focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded"
                      >
                        <span className="font-semibold">{prompt.id}</span>
                        <span className="sr-only"> OWASP reference</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      </a>
                    </p>
                  ) : null}
                  <p className="mb-3 text-caption text-foreground/70">{prompt.description}</p>
                  <div className="rounded border border-border bg-bg/80 p-2 font-mono text-caption leading-relaxed text-foreground/90 whitespace-pre-wrap">
                    {prompt.prompt}
                  </div>
                  <div className="mt-3 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleCopy(prompt)}
                      className={clsx(
                        "inline-flex min-h-10 min-w-[5.5rem] items-center justify-center rounded-md border px-4 py-2 text-caption font-semibold uppercase tracking-[0.12em]",
                        "border-accent/45 bg-accent/10 text-accent hover:border-accent/70 hover:bg-accent/15",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                        isCopied && "border-success/60 bg-success/10 text-success hover:border-success/60 hover:bg-success/15"
                      )}
                      aria-label={`Copy ${prompt.id} prompt`}
                    >
                      {isCopied
                        ? copy.validationCopyButtonSuccess
                        : copy.validationCopyButton}
                    </button>
                  </div>
                </CollapsibleCard>
              </div>
            );
          })}
      </div>
    </>
  );
};
