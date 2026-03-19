"use client";

import React, { useState, useCallback, useMemo } from "react";
import type { DualityCheckResult } from "../engine/dualityCheck";
import clsx from "clsx";
import { useCopy } from "../copy";

export type ProcessingStageId =
  | "accept"
  | "duality-check"
  | "dehydration"
  | "injection"
  | "rehydration";

export type LogLevel = "info" | "success" | "warning" | "error";

export interface LogEntry {
  id: string;
  stage: ProcessingStageId;
  level: LogLevel;
  message: string;
}

export type ProcessingState = "idle" | "processing" | "completed" | "error";

export interface DualityMonitorProps {
  processingState: ProcessingState;
  activeStage?: ProcessingStageId;
  log: LogEntry[];
  dualityResult?: DualityCheckResult | null;
}

const STAGE_IDS: ProcessingStageId[] = [
  "accept",
  "duality-check",
  "dehydration",
  "injection",
  "rehydration",
];

function stageStatus(
  stage: ProcessingStageId,
  activeStage: ProcessingStageId | undefined,
  processingState: ProcessingState
): "pending" | "running" | "done" | "error" {
  if (processingState === "idle") return "pending";
  if (processingState === "error") {
    if (stage === activeStage) return "error";
    return "done";
  }
  if (processingState === "completed") return "done";
  if (!activeStage) return "pending";

  const activeIndex = STAGE_IDS.indexOf(activeStage);
  const stageIndex = STAGE_IDS.indexOf(stage);

  if (stageIndex < activeIndex) return "done";
  if (stageIndex === activeIndex) return "running";
  return "pending";
}

export const DualityMonitor: React.FC<DualityMonitorProps> = ({
  processingState,
  activeStage,
  log,
  dualityResult,
}) => {
  const copy = useCopy();
  const stages = useMemo(
    () => [
      { id: "accept" as const, label: copy.stageAccept },
      { id: "duality-check" as const, label: copy.stageDualityCheck },
      { id: "dehydration" as const, label: copy.stageDehydration },
      { id: "injection" as const, label: copy.stageInjection },
      { id: "rehydration" as const, label: copy.stageRehydration },
    ],
    [copy]
  );
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );

  const handleCopyLog = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setCopyStatus("error");
      return;
    }
    const body =
      log.length === 0
        ? copy.auditLogEmpty
        : log.map((entry) => entry.message).join("\n") + "\n";
    try {
      await navigator.clipboard.writeText(`${copy.auditLogHeader}${body}`);
      setCopyStatus("success");
      setTimeout(() => setCopyStatus("idle"), 2500);
    } catch {
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 2500);
    }
  }, [log, copy.auditLogHeader, copy.auditLogEmpty]);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-panel/60 p-4 text-sm text-foreground/80">
      <header className="flex min-h-10 flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <h2 className="whitespace-nowrap text-caption font-medium uppercase tracking-[0.2em] text-accent sm:text-xs">
          {copy.dualityMonitorTitle}
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLog}
              className="inline-flex shrink-0 items-center justify-center rounded border border-border/60 bg-bg/60 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.2em] text-foreground/60 hover:border-accent/60 hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              aria-label="Copy log to clipboard"
            >
              {copy.copyLogButton}
            </button>
            {copyStatus === "success" && (
              <span className="text-xs text-success">{copy.copiedStatus}</span>
            )}
            {copyStatus === "error" && (
              <span className="text-xs text-error">{copy.copyFailedStatus}</span>
            )}
          </div>
          <span
            aria-hidden="true"
            className="h-4 w-px shrink-0 bg-border/60"
          />
          <div
            className={clsx(
              "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wider",
              processingState === "completed" && "border-success/60 text-success",
              processingState === "processing" && "border-accent/60 text-accent",
              processingState === "idle" && "border-border text-foreground/70",
              processingState === "error" && "border-error/70 text-error"
            )}
          >
            {processingState === "idle" && copy.statusIdle}
            {processingState === "processing" && copy.statusProcessing}
            {processingState === "completed" && copy.statusCompleted}
            {processingState === "error" && copy.statusError}
          </div>
        </div>
      </header>

      <div className="space-y-3">
        <div className="space-y-2">
          <p className="text-caption sm:text-xs uppercase tracking-[0.2em] text-foreground/60">
            {copy.pipelineStagesTitle}
          </p>
          <ol className="space-y-1">
            {stages.map((stage) => {
              const status = stageStatus(stage.id, activeStage, processingState);
              return (
                <li
                  key={stage.id}
                  className="flex items-center justify-between rounded-lg bg-bg/60 px-2 py-1"
                >
                  <span className="font-mono text-caption sm:text-xs">
                    {stage.label}
                  </span>
                  <span
                    className={clsx(
                      "text-caption uppercase tracking-[0.18em]",
                      status === "pending" && "text-foreground/50",
                      status === "running" && "text-accent",
                      status === "done" && "text-success",
                      status === "error" && "text-error"
                    )}
                  >
                    {status}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="space-y-2">
          <p
            className="text-caption sm:text-xs uppercase tracking-[0.2em] text-foreground/60"
            title={copy.preHardeningScanTooltip}
          >
            {copy.preHardeningScanTitle}
            <span
              aria-hidden="true"
              className="ml-1 inline-flex items-center justify-center rounded border border-border/60 px-1 text-xs font-mono text-foreground/60 align-middle"
            >
              ?
            </span>
          </p>
          <p className="text-caption sm:text-xs text-foreground/50">
            {copy.piiStatelessVolatile}
          </p>
          <div className="mt-1 rounded-lg border border-border bg-bg/80 p-2">
            {!dualityResult && (
              <p className="text-caption text-foreground/60">
                {copy.awaitingFirstScan}
              </p>
            )}
            {dualityResult && !dualityResult.hasSuspiciousPatterns && (
              <p className="text-caption text-success">
                {copy.noSuspiciousPatterns}
              </p>
            )}
            {dualityResult && dualityResult.hasSuspiciousPatterns && (
              <div className="space-y-2">
                <p className="text-caption text-error">
                  {copy.suspiciousPatternsDetected}
                </p>
                <ul className="ml-4 list-disc space-y-1 text-caption text-error">
                  {dualityResult.matchedPatterns.map((name) => (
                    <li key={name}>
                      <span className="font-mono">{name}</span>
                    </li>
                  ))}
                </ul>
                {dualityResult.details && (
                  <ul className="mt-1 space-y-0.5 text-caption text-error">
                    {dualityResult.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                )}
                <div
                  className="mt-2 border-l-4 border-error/70 rounded-r-lg bg-bg/90 px-2 py-1.5"
                  role="status"
                  aria-live="polite"
                >
                  <p className="font-mono text-caption uppercase tracking-[0.2em] text-error/90">
                    {copy.dualityRemediationLabel}
                  </p>
                  <p className="mt-0.5 text-caption text-foreground/90">
                    {copy.dualityRemediationMessage}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-caption sm:text-xs uppercase tracking-[0.2em] text-foreground/60">
          {copy.terminalLogTitle}
        </p>
        <div className="noir-shell relative max-h-40 overflow-y-auto rounded-lg border border-border bg-bg/80 p-2 font-mono text-caption leading-relaxed"
          role="log"
          aria-live="polite"
          aria-label={copy.terminalLogAriaLabel}
        >
          <div className="scanlines pointer-events-none absolute inset-0 rounded-lg" />
          <div className="relative space-y-0.5">
            {log.length === 0 && (
              <p className="text-foreground/50">
                {copy.awaitingInputLog}
              </p>
            )}
            {log.map((entry) => (
              <p
                key={entry.id}
                className={clsx(
                  "whitespace-pre-wrap",
                  entry.level === "info" && "text-foreground/80",
                  entry.level === "success" && "text-success",
                  entry.level === "warning" && "text-accent",
                  entry.level === "error" && "text-error"
                )}
              >
                {entry.message}
              </p>
            ))}
            {processingState === "processing" && (
              <span className="terminal-cursor text-success inline-block" aria-hidden="true" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

