import React, { useState, useCallback } from "react";
import type { DualityCheckResult } from "../engine/dualityCheck";
import clsx from "clsx";

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

const STAGES: Array<{ id: ProcessingStageId; label: string }> = [
  { id: "accept", label: "Accept Buffer" },
  { id: "duality-check", label: "Duality Check" },
  { id: "dehydration", label: "Dehydration" },
  { id: "injection", label: "Injection" },
  { id: "rehydration", label: "Rehydration" },
];

/** Remediation copy for duality feedback loop (single source; generic for LLM01, LLM10, metadata). */
const DUALITY_REMEDIATION_LABEL = "Remediation";
const DUALITY_REMEDIATION_MESSAGE =
  "Warning: Existing adversarial layers (prompt injection, canary URLs, or metadata) may decrease document readability for modern LLM parsers.";

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

  const order = STAGES.map((s) => s.id);
  const activeIndex = order.indexOf(activeStage);
  const stageIndex = order.indexOf(stage);

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
  const showScan =
    !!dualityResult && dualityResult.matchedPatterns.length > 0;
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );

  const handleCopyLog = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setCopyStatus("error");
      return;
    }
    const header =
      "FunversarialCV local audit log (client-side only; nothing stored server-side)\n";
    const body =
      log.length === 0
        ? "> No entries yet. Drop a CV to start the pipeline.\n"
        : log.map((entry) => entry.message).join("\n") + "\n";
    try {
      await navigator.clipboard.writeText(`${header}${body}`);
      setCopyStatus("success");
      setTimeout(() => setCopyStatus("idle"), 2500);
    } catch {
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 2500);
    }
  }, [log]);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-noir-border bg-noir-panel/60 p-4 text-sm text-noir-foreground/80">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-caption sm:text-xs uppercase tracking-[0.2em] text-neon-cyan">
            Duality Monitor
          </div>
          <button
            type="button"
            onClick={handleCopyLog}
            className="inline-flex items-center justify-center rounded border border-noir-border/60 bg-noir-bg/60 px-1.5 py-0.5 text-xs uppercase tracking-[0.2em] text-noir-foreground/60 hover:text-neon-cyan hover:border-neon-cyan/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/60"
            aria-label="Copy log to clipboard"
          >
            &gt; Copy Log
          </button>
          {copyStatus === "success" && (
            <span className="text-xs text-neon-green">
              Copied local audit log.
            </span>
          )}
          {copyStatus === "error" && (
            <span className="text-xs text-neon-red">
              Unable to copy log.
            </span>
          )}
        </div>
        <div
          className={clsx(
            "rounded-full px-2 py-0.5 text-caption sm:text-xs font-medium",
            processingState === "completed" && "border border-neon-green/60",
            processingState === "processing" && "border border-neon-cyan/60",
            processingState === "idle" && "border border-noir-border",
            processingState === "error" && "border border-neon-red/70"
          )}
        >
          {processingState === "idle" && (
            <span className="text-noir-foreground/70">Idle</span>
          )}
          {processingState === "processing" && (
            <span className="text-neon-cyan">Processing</span>
          )}
          {processingState === "completed" && (
            <span className="text-neon-green">Completed</span>
          )}
          {processingState === "error" && (
            <span className="text-neon-red">Error</span>
          )}
        </div>
      </header>

      <div className="space-y-3">
        <div className="space-y-2">
          <p className="text-caption sm:text-xs uppercase tracking-[0.2em] text-noir-foreground/60">
            Pipeline Stages
          </p>
          <ol className="space-y-1">
            {STAGES.map((stage) => {
              const status = stageStatus(stage.id, activeStage, processingState);
              return (
                <li
                  key={stage.id}
                  className="flex items-center justify-between rounded-lg bg-noir-bg/60 px-2 py-1"
                >
                  <span className="font-mono text-caption sm:text-xs">
                    {stage.label}
                  </span>
                  <span
                    className={clsx(
                      "text-caption uppercase tracking-[0.18em]",
                      status === "pending" &&
                        "text-noir-foreground/50",
                      status === "running" &&
                        "text-neon-cyan",
                      status === "done" &&
                        "text-neon-green",
                      status === "error" &&
                        "text-neon-red"
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
            className="text-caption sm:text-xs uppercase tracking-[0.2em] text-noir-foreground/60"
            title="Duality compares the CV's original adversarial surface with the Funversarial layer we add: first scanning for existing prompt-injection or canary-style patterns, then tracking the additional patterns introduced by eggs."
          >
            Pre-hardening scan (Duality – original vs. Funversarial layer)
            <span
              aria-hidden="true"
              className="ml-1 inline-flex items-center justify-center rounded border border-noir-border/60 px-1 text-xs font-mono text-noir-foreground/60 align-middle"
            >
              ?
            </span>
          </p>
          <p className="text-caption sm:text-xs text-noir-foreground/50">
            PII handling is{" "}
            <span className="font-semibold text-neon-cyan">
              Stateless &amp; Volatile
            </span>{" "}
            — in-memory only, never stored.
          </p>
          <div className="mt-1 rounded-lg border border-noir-border bg-noir-bg/80 p-2">
            {!dualityResult && (
              <p className="text-caption text-noir-foreground/60">
                Awaiting first scan. Drop a CV to begin analysis.
              </p>
            )}
            {dualityResult && !dualityResult.hasSuspiciousPatterns && (
              <p className="text-caption text-neon-green">
                No suspicious prompt-injection patterns detected in the
                original CV.
              </p>
            )}
            {dualityResult && dualityResult.hasSuspiciousPatterns && (
              <div className="space-y-2">
                <p className="text-caption text-neon-red">
                  Suspicious patterns detected (prompt-injection, canary URLs, or metadata):
                </p>
                <ul className="ml-4 list-disc space-y-1 text-caption text-neon-red">
                  {dualityResult.matchedPatterns.map((name) => (
                    <li key={name}>
                      <span className="font-mono">{name}</span>
                    </li>
                  ))}
                </ul>
                {dualityResult.details && (
                  <ul className="mt-1 space-y-0.5 text-caption text-neon-red">
                    {dualityResult.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                )}
                <div
                  className="mt-2 border-l-4 border-neon-red/70 rounded-r-lg bg-noir-bg/90 px-2 py-1.5"
                  role="status"
                  aria-live="polite"
                >
                  <p className="font-mono text-caption uppercase tracking-[0.2em] text-neon-red/90">
                    {DUALITY_REMEDIATION_LABEL}
                  </p>
                  <p className="mt-0.5 text-caption text-noir-foreground/90">
                    {DUALITY_REMEDIATION_MESSAGE}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-caption sm:text-xs uppercase tracking-[0.2em] text-noir-foreground/60">
          Terminal Log
        </p>
        <div className="noir-shell relative max-h-40 overflow-y-auto rounded-lg border border-noir-border bg-noir-bg/80 p-2 font-mono text-caption leading-relaxed"
          role="log"
          aria-live="polite"
          aria-label="Terminal log"
        >
          <div className="scanlines pointer-events-none absolute inset-0 rounded-lg" />
          <div className="relative space-y-0.5">
            {log.length === 0 && (
              <p className="text-noir-foreground/50">
                &gt; Awaiting input… drop a CV to start the pipeline.
              </p>
            )}
            {log.map((entry) => (
              <p
                key={entry.id}
                className={clsx(
                  "whitespace-pre-wrap",
                  entry.level === "info" && "text-noir-foreground/80",
                  entry.level === "success" && "text-neon-green",
                  entry.level === "warning" && "text-neon-cyan",
                  entry.level === "error" && "text-neon-red"
                )}
              >
                {entry.message}
              </p>
            ))}
            {processingState === "processing" && (
              <span className="terminal-cursor text-neon-green inline-block" aria-hidden="true" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

