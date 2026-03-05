"use client";

import React, { useState } from "react";
import { DropZone } from "../src/components/DropZone";
import {
  DualityMonitor,
  type LogEntry,
  type ProcessingStageId,
  type ProcessingState,
} from "../src/components/DualityMonitor";
import { IncidentMailtoConfigCard } from "../src/components/IncidentMailtoConfigCard";
import type { DualityCheckResult } from "../src/engine/dualityCheck";

export default function Home() {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingState, setProcessingState] =
    useState<ProcessingState>("idle");
  const [activeStage, setActiveStage] = useState<ProcessingStageId | undefined>(
    undefined
  );
  const [log, setLog] = useState<LogEntry[]>([]);
  const [dualityResult, setDualityResult] =
    useState<DualityCheckResult | null>(null);
  const [incidentMailtoPayload, setIncidentMailtoPayload] = useState<string>("");

  const startPipelineForFile = (file: File) => {
    const name = file.name;

    setSelectedFileName(name);
    setError(null);

    const baseLog: LogEntry[] = [
      {
        id: "accept",
        stage: "accept",
        level: "info",
        message: `[ACCEPT] Buffer received for "${name}".`,
      },
      {
        id: "duality",
        stage: "duality-check",
        level: "info",
        message:
          "[DUALITY] Scanning original CV for existing prompt-injection patterns…",
      },
      {
        id: "dehydrate",
        stage: "dehydration",
        level: "info",
        message:
          "[DEHYDRATE] PII dehydrated into Stateless & Volatile vault tokens (in-memory only; never stored).",
      },
      {
        id: "inject",
        stage: "injection",
        level: "success",
        message: "[INJECT] Funversarial eggs applied to dehydrated document.",
      },
      {
        id: "rehydrate",
        stage: "rehydration",
        level: "success",
        message:
          "[REHYDRATE] PII rehydrated into final hardened CV stream. Stateless & Volatile handling complete; nothing persisted.",
      },
    ];

    setProcessingState("completed");
    setActiveStage("rehydration");
    setLog(baseLog);

    // UI-only placeholder: in a future step this will be populated
    // from the backend Processor's DualityCheckResult.
    setDualityResult({
      hasSuspiciousPatterns: false,
      matchedPatterns: [],
    });
  };

  return (
    <main className="min-h-screen bg-noir-bg text-noir-foreground">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-10">
        <header className="mb-10 flex items-center justify-between border-b border-noir-border pb-4">
          <div>
            <h1 className="text-2xl font-semibold">
              <span className="bg-gradient-to-r from-neon-green via-neon-cyan to-neon-green bg-clip-text text-transparent">
                FunversarialCV
              </span>
            </h1>
            <p className="text-xs text-noir-foreground/70">
              Adversarial CV hardening console for hungry LLMs.
            </p>
            <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.2em] text-neon-cyan/80">
              PII Mode: Stateless &amp; Volatile
            </p>
          </div>
          <span className="rounded-full border border-neon-green/60 bg-noir-panel px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-neon-green">
            Engine Online
          </span>
        </header>

        <section className="flex flex-1 flex-col gap-8 md:flex-row">
          <div className="flex-1">
            <div className="mb-4 text-xs uppercase tracking-[0.2em] text-neon-cyan">
              Input Channel
            </div>
            <DropZone onFileSelect={startPipelineForFile} />
            {selectedFileName && (
              <p className="mt-3 text-xs text-neon-green">
                &gt; Armed CV: <span className="font-semibold">{selectedFileName}</span>
              </p>
            )}
            {error && (
              <p className="mt-2 text-xs text-neon-red">
                &gt; Alert: {error}
              </p>
            )}
            <div className="mt-6">
              <IncidentMailtoConfigCard
                payload={incidentMailtoPayload}
                onPayloadChange={setIncidentMailtoPayload}
              />
            </div>
          </div>

          <aside className="mt-8 w-full text-xs text-noir-foreground/80 md:mt-0 md:w-80 md:shrink-0">
            <DualityMonitor
              processingState={processingState}
              activeStage={activeStage}
              log={log}
              dualityResult={dualityResult ?? undefined}
            />
          </aside>
        </section>
      </div>
    </main>
  );
}
