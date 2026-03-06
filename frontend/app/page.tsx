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
import { CanaryWingConfigCard } from "../src/components/CanaryWingConfigCard";
import { InvisibleHandConfigCard } from "../src/components/InvisibleHandConfigCard";
import { MetadataShadowConfigCard } from "../src/components/MetadataShadowConfigCard";
import type { DualityCheckResult } from "../src/engine/dualityCheck";
import { EGG_OPTIONS, DEFAULT_ENABLED_EGG_IDS } from "../src/eggs/eggMetadata";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
  const [invisibleHandPayload, setInvisibleHandPayload] = useState<string>("");
  const [incidentMailtoPayload, setIncidentMailtoPayload] = useState<string>("");
  const [canaryWingPayload, setCanaryWingPayload] = useState<string>("");
  const [metadataShadowPayload, setMetadataShadowPayload] = useState<string>("");
  const [enabledEggIds, setEnabledEggIds] = useState<Set<string>>(() => new Set(DEFAULT_ENABLED_EGG_IDS));

  const toggleEgg = (id: string) => {
    setEnabledEggIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onFileSelect = (file: File) => {
    setSelectedFile(file);
    setSelectedFileName(file.name);
    setError(null);
    setDualityResult(null);
    setLog([]);
    setProcessingState("idle");
    setActiveStage(undefined);
  };

  const runHarden = () => {
    if (!selectedFile) return;
    void startPipelineForFile(selectedFile);
  };

  const startPipelineForFile = async (file: File) => {
    const name = file.name;
    setError(null);
    setProcessingState("processing");
    setActiveStage("accept");
    setLog([
      {
        id: "accept",
        stage: "accept",
        level: "info",
        message: `[ACCEPT] Buffer received for "${name}".`,
      },
    ]);

    const payloads = {
      "invisible-hand": invisibleHandPayload,
      "incident-mailto": incidentMailtoPayload,
      "canary-wing": canaryWingPayload,
      "metadata-shadow": metadataShadowPayload,
    };
    const payloadsForEnabled: Record<string, string> = {};
    for (const id of enabledEggIds) {
      if (payloads[id as keyof typeof payloads] !== undefined) {
        payloadsForEnabled[id] = payloads[id as keyof typeof payloads];
      }
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("payloads", JSON.stringify(payloadsForEnabled));
    formData.append("eggIds", JSON.stringify([...enabledEggIds]));

    try {
      const res = await fetch("/api/harden", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errMsg =
          typeof data?.error === "string" ? data.error : "Processing failed.";
        setError(errMsg);
        setProcessingState("error");
        setActiveStage("duality-check");
        setLog((prev) => [
          ...prev,
          {
            id: "duality-err",
            stage: "duality-check",
            level: "error",
            message: `[ERROR] ${errMsg}`,
          },
        ]);
        return;
      }

      const bufferBase64 = data.bufferBase64 as string;
      const mimeType = data.mimeType as string;
      const originalName = (data.originalName as string) || name;
      const scannerScan = data.scannerReport?.scan;

      const binaryString = atob(bufferBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hardened-${originalName}`;
      a.click();
      URL.revokeObjectURL(url);

      if (scannerScan && typeof scannerScan === "object") {
        setDualityResult({
          hasSuspiciousPatterns: !!scannerScan.hasSuspiciousPatterns,
          matchedPatterns: Array.isArray(scannerScan.matchedPatterns)
            ? scannerScan.matchedPatterns
            : [],
          details: Array.isArray(scannerScan.details) ? scannerScan.details : undefined,
        });
      } else {
        setDualityResult({ hasSuspiciousPatterns: false, matchedPatterns: [] });
      }

      setProcessingState("completed");
      setActiveStage("rehydration");
      setLog((prev) => [
        ...prev,
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
      ]);
    } catch (_err) {
      setError("Network error. Please try again.");
      setProcessingState("error");
      setActiveStage("accept");
      setLog((prev) => [
        ...prev,
        {
          id: "network-err",
          stage: "accept",
          level: "error",
          message: "[ERROR] Network error.",
        },
      ]);
    }
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
            <DropZone onFileSelect={onFileSelect} />
            {selectedFileName && (
              <>
                <p className="mt-3 text-xs text-neon-green">
                  &gt; Armed CV: <span className="font-semibold">{selectedFileName}</span>
                </p>
                <p className="mt-1 text-[10px] text-noir-foreground/60">
                  Configure eggs below, then click Harden.
                </p>
                <p className="mt-0.5 text-[10px] text-noir-foreground/50">
                  Output uses plain-text layout; original formatting is not preserved.
                </p>
                <div className="mt-3 rounded-lg border border-noir-border bg-noir-panel/50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-noir-foreground/60 mb-2">
                    Eggs to run
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {EGG_OPTIONS.map((egg) => (
                      <label
                        key={egg.id}
                        className="flex items-center gap-1.5 text-xs text-noir-foreground/80 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={enabledEggIds.has(egg.id)}
                          onChange={() => toggleEgg(egg.id)}
                          className="rounded border-noir-border text-neon-cyan focus:ring-neon-cyan/50"
                        />
                        <span>{egg.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={runHarden}
                  disabled={processingState === "processing"}
                  className="mt-4 w-full rounded-lg border border-neon-green bg-noir-panel px-4 py-3 text-sm font-medium text-neon-green transition hover:bg-neon-green/10 disabled:pointer-events-none disabled:opacity-50"
                >
                  {processingState === "processing" ? "Processing…" : "Harden"}
                </button>
              </>
            )}
            {error && (
              <p className="mt-2 text-xs text-neon-red">
                &gt; Alert: {error}
              </p>
            )}
            <div className="mt-6">
              <InvisibleHandConfigCard
                payload={invisibleHandPayload}
                onPayloadChange={setInvisibleHandPayload}
              />
            </div>
            <div className="mt-4">
              <IncidentMailtoConfigCard
                payload={incidentMailtoPayload}
                onPayloadChange={setIncidentMailtoPayload}
              />
            </div>
            <div className="mt-4">
              <CanaryWingConfigCard
                payload={canaryWingPayload}
                onPayloadChange={setCanaryWingPayload}
              />
            </div>
            <div className="mt-4">
              <MetadataShadowConfigCard
                payload={metadataShadowPayload}
                onPayloadChange={setMetadataShadowPayload}
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
