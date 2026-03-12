"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
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
import { Button } from "../src/components/ui/Button";
import { Card } from "../src/components/ui/Card";

/** Must match API route MAX_BODY_BYTES so client rejects before sending. */
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;

/** localStorage key for persisting checkbox state (Preserve styles + Eggs to run). */
const CHECKBOX_STORAGE_KEY = "funversarialcv-checkboxes";

function buildFinalFileName(originalName: string): string {
  const dot = originalName.lastIndexOf(".");
  if (dot <= 0 || dot === originalName.length - 1) {
    return `${originalName}_final`;
  }
  const base = originalName.slice(0, dot);
  const ext = originalName.slice(dot);
  return `${base}_final${ext}`;
}

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
  const [preserveStyles, setPreserveStyles] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const successMessageRef = useRef<HTMLParagraphElement>(null);
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const armedSectionRef = useRef<HTMLDivElement | null>(null);
  const lastHardenedBlobRef = useRef<Blob | null>(null);
  const lastHardenedConfigRef = useRef<{
    payloads: Record<string, string>;
    eggIds: string[];
    preserveStyles: boolean;
  } | null>(null);
  const [dualityMonitorOpen, setDualityMonitorOpen] = useState(false);
  const openFilePickerRef = useRef<(() => void) | null>(null);
  /** Skip first persistence run so we don't overwrite localStorage with defaults before hydration. */
  const skipNextPersistRef = useRef(true);
  const [demoVariant, setDemoVariant] = useState<"clean" | "dirty">("clean");
  const [demoFormat, setDemoFormat] = useState<"pdf" | "docx">("pdf");
  const [hasDemoLoaded, setHasDemoLoaded] = useState(false);

  /** Egg metadata from GET /api/eggs (id -> { name, manualCheckAndValidation }). */
  const [eggMetadataById, setEggMetadataById] = useState<Record<string, { name: string; manualCheckAndValidation: string }>>({});

  useEffect(() => {
    if (typeof fetch !== "function") return;
    fetch("/api/eggs")
      .then((res) => res.ok ? res.json() : null)
      .then((data: { eggs?: Array<{ id: string; name: string; manualCheckAndValidation: string }> } | null) => {
        if (data?.eggs && Array.isArray(data.eggs)) {
          const byId: Record<string, { name: string; manualCheckAndValidation: string }> = {};
          for (const e of data.eggs) {
            byId[e.id] = { name: e.name, manualCheckAndValidation: e.manualCheckAndValidation };
          }
          setEggMetadataById(byId);
        }
      })
      .catch(() => { /* ignore; cards will hide section */ });
  }, []);

  // Scroll focused success/error targets into view after render (refs are set post-commit).
  useEffect(() => {
    if (successMessage && successMessageRef.current && typeof successMessageRef.current.scrollIntoView === "function") {
      successMessageRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [successMessage]);
  useEffect(() => {
    if (error && retryButtonRef.current && typeof retryButtonRef.current.scrollIntoView === "function") {
      retryButtonRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [error]);

  // When a CV (user or demo) is armed, bring the Armed CV + Harden controls into view.
  useEffect(() => {
    if (
      selectedFileName &&
      armedSectionRef.current &&
      typeof armedSectionRef.current.scrollIntoView === "function"
    ) {
      armedSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedFileName]);

  // Hydrate checkbox state from localStorage on mount (client-only).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CHECKBOX_STORAGE_KEY);
      if (raw == null) return;
      const parsed = JSON.parse(raw) as { enabledEggIds?: unknown; preserveStyles?: unknown };
      const validEggIds = new Set<string>(EGG_OPTIONS.map((o) => o.id));
      if (Array.isArray(parsed.enabledEggIds)) {
        const filtered = parsed.enabledEggIds.filter((id): id is string => typeof id === "string" && validEggIds.has(id));
        setEnabledEggIds(filtered.length > 0 ? new Set(filtered) : new Set(DEFAULT_ENABLED_EGG_IDS));
      }
      if (typeof parsed.preserveStyles === "boolean") {
        setPreserveStyles(parsed.preserveStyles);
      }
    } catch {
      // Corrupt or invalid JSON; keep defaults.
    }
  }, []);

  // Persist checkbox state to localStorage whenever it changes (skip first run to avoid overwriting saved state with defaults).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    try {
      window.localStorage.setItem(
        CHECKBOX_STORAGE_KEY,
        JSON.stringify({ enabledEggIds: [...enabledEggIds], preserveStyles })
      );
    } catch {
      // Quota or disabled localStorage; ignore.
    }
  }, [enabledEggIds, preserveStyles]);

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
    setSuccessMessage(null);
    lastHardenedBlobRef.current = null;
    lastHardenedConfigRef.current = null;
    setDualityResult(null);
    setLog([]);
    setProcessingState("idle");
    setActiveStage(undefined);
  };

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setSelectedFileName(null);
    setError(null);
    setSuccessMessage(null);
    lastHardenedBlobRef.current = null;
    lastHardenedConfigRef.current = null;
    setDualityResult(null);
    setLog([]);
    setProcessingState("idle");
    setActiveStage(undefined);
  }, []);

  const triggerDownload = useCallback(() => {
    const blob = lastHardenedBlobRef.current;
    if (!blob || !successMessage) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = successMessage;
    a.click();
    URL.revokeObjectURL(url);
  }, [successMessage]);

  /** True if egg config (payloads or enabled set) has changed since last successful harden. */
  const haveEggsChanged = useCallback(() => {
    const snap = lastHardenedConfigRef.current;
    if (!snap) return false;
    const currentIds = [...enabledEggIds].sort();
    const snapIds = [...snap.eggIds].sort();
    if (
      currentIds.length !== snapIds.length ||
      currentIds.some((id, i) => id !== snapIds[i])
    ) {
      return true;
    }
    const payloads: Record<string, string> = {
      "invisible-hand": invisibleHandPayload,
      "incident-mailto": incidentMailtoPayload,
      "canary-wing": canaryWingPayload,
      "metadata-shadow": metadataShadowPayload,
    };
    const currentPayloads: Record<string, string> = {};
    for (const id of enabledEggIds) {
      if (payloads[id] !== undefined) currentPayloads[id] = payloads[id];
    }
    const snapKeys = Object.keys(snap.payloads).sort();
    const currentKeys = Object.keys(currentPayloads).sort();
    if (
      snapKeys.length !== currentKeys.length ||
      snapKeys.some((k, i) => k !== currentKeys[i])
    )
      return true;
    for (const id of snapKeys) {
      if (currentPayloads[id] !== snap.payloads[id]) return true;
    }
    if (preserveStyles !== snap.preserveStyles) return true;
    return false;
  }, [
    enabledEggIds,
    preserveStyles,
    invisibleHandPayload,
    incidentMailtoPayload,
    canaryWingPayload,
    metadataShadowPayload,
  ]);

  const runHarden = () => {
    if (!selectedFile) return;
    void startPipelineForFile(selectedFile);
  };

  const startPipelineForFile = async (file: File) => {
    const name = file.name;
    if (file.size === 0) {
      setError("Document is empty. Please choose a valid PDF or DOCX file.");
      setProcessingState("error");
      setActiveStage("accept");
      setLog([
        {
          id: "accept-empty",
          stage: "accept",
          level: "error",
          message: `[ACCEPT] Refusing empty file "${name}".`,
        },
      ]);
      return;
    }
    setError(null);
    setSuccessMessage(null);
    lastHardenedBlobRef.current = null;
    lastHardenedConfigRef.current = null;
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
    if (preserveStyles) {
      formData.append("preserveStyles", "true");
    }

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
        retryButtonRef.current?.focus();
        return;
      }

      const bufferBase64 = data.bufferBase64;
      if (typeof bufferBase64 !== "string") {
        setError("Invalid response from server: missing document data.");
        setProcessingState("error");
        setActiveStage("duality-check");
        setLog((prev) => [
          ...prev,
          {
            id: "invalid-resp",
            stage: "duality-check",
            level: "error",
            message: "[ERROR] Invalid response from server.",
          },
        ]);
        retryButtonRef.current?.focus();
        return;
      }

      const mimeType = data.mimeType as string;
      const originalName = (data.originalName as string) || name;
      const scannerScan = data.scannerReport?.scan;

      let blob: Blob;
      try {
        const binaryString = atob(bufferBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: mimeType });
      } catch {
        setError("Invalid response from server: invalid document data.");
        setProcessingState("error");
        setActiveStage("duality-check");
        setLog((prev) => [
          ...prev,
          {
            id: "invalid-resp",
            stage: "duality-check",
            level: "error",
            message: "[ERROR] Invalid response from server.",
          },
        ]);
        retryButtonRef.current?.focus();
        return;
      }

      lastHardenedBlobRef.current = blob;
      lastHardenedConfigRef.current = {
        payloads: { ...payloadsForEnabled },
        eggIds: [...enabledEggIds],
        preserveStyles,
      };

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
      const noEggsApplied = enabledEggIds.size === 0;
      setSuccessMessage(noEggsApplied ? originalName : buildFinalFileName(originalName));
      successMessageRef.current?.focus();
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
      retryButtonRef.current?.focus();
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

  const loadDemoCv = async (variant: "clean" | "dirty", format: "pdf" | "docx") => {
    try {
      setError(null);
      setSuccessMessage(null);
      const url = `/api/demo-cv?variant=${variant}&format=${format}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || typeof data.bufferBase64 !== "string" || typeof data.mimeType !== "string" || typeof data.originalName !== "string") {
        setError("Failed to fetch demo CV. Please try again.");
        return;
      }
      const binaryString = atob(data.bufferBase64.trim());
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      if (bytes.length === 0) {
        setError("Demo CV document was empty. Please try again.");
        return;
      }
      const demoFile = new File([bytes], data.originalName, { type: data.mimeType });
      onFileSelect(demoFile);
    } catch {
      setError("Failed to fetch demo CV. Please try again.");
    }
  };

  const downloadCurrentDemo = useCallback(async () => {
    try {
      const url = `/api/demo-cv?variant=${demoVariant}&format=${demoFormat}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || typeof data.bufferBase64 !== "string" || typeof data.mimeType !== "string" || typeof data.originalName !== "string") {
        setError("Failed to download demo CV. Please try again.");
        return;
      }
      const binaryString = atob(data.bufferBase64.trim());
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      if (bytes.length === 0) {
        setError("Demo CV document was empty. Please try again.");
        return;
      }
      const blob = new Blob([bytes], { type: data.mimeType });
      const urlObj = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = urlObj;
      a.download = data.originalName;
      a.click();
      URL.revokeObjectURL(urlObj);
    } catch {
      setError("Failed to download demo CV. Please try again.");
    }
  }, [demoFormat, demoVariant]);

  const loadPreset = async (variant: "clean" | "dirty", format: "pdf" | "docx") => {
    await loadDemoCv(variant, format);
    setDemoVariant(variant);
    setDemoFormat(format);
    setHasDemoLoaded(true);
  };

  return (
    <main id="main-content" className="min-h-screen bg-noir-bg text-noir-foreground">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-8 md:py-10">
        <header className="mb-10 flex flex-wrap items-start justify-between gap-2 border-b border-noir-border pb-4">
          <div>
            <h1 className="text-2xl font-semibold">
              <span className="bg-gradient-to-r from-neon-green via-neon-cyan to-neon-green bg-clip-text text-transparent">
                FunversarialCV
              </span>
            </h1>
            <p className="text-xs text-noir-foreground/70">
              Adversarial CV hardening console for hungry LLMs.
            </p>
            <p className="mt-1 text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em] text-neon-cyan/80">
              PII Mode: Stateless &amp; Volatile
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-neon-green/60 bg-noir-panel px-3 py-1 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-neon-green engine-online-pulse">
            Engine Online
          </span>
        </header>

        <section className="flex flex-1 flex-col gap-8 md:flex-row">
          <div className="flex-1">
            <div className="mb-4 text-xs uppercase tracking-[0.2em] text-neon-cyan">
              Input Channel
            </div>
            <DropZone onFileSelect={onFileSelect} maxSizeBytes={MAX_FILE_SIZE_BYTES} openFilePickerRef={openFilePickerRef} />
            <p className="mt-1 text-[10px] text-noir-foreground/50">
              Max 4 MB. PDF or DOCX only.
            </p>
            <div className="mt-3 space-y-2 text-[10px] text-noir-foreground/60">
              <p className="uppercase tracking-[0.2em] text-neon-cyan">
                Sample CV Preset
              </p>
              <p className="text-[10px] text-noir-foreground/60">
                Load a synthetic demo CV instead of your own — use <span className="text-neon-cyan font-mono">Clean</span> for a safe baseline, or <span className="text-neon-green font-mono">Dirty</span> to explore adversarial content.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-[36px] px-3 py-2 text-[10px] sm:text-xs border border-noir-border/80 bg-noir-panel text-noir-foreground hover:border-neon-cyan/60 hover:shadow-neon-cyan/40 flex flex-col items-start"
                  onClick={() => loadPreset("clean", "pdf")}
                >
                  <span className="font-mono text-neon-cyan">Clean · PDF</span>
                  <span className="text-[9px] text-noir-foreground/60">
                    Baseline sample
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-[36px] px-3 py-2 text-[10px] sm:text-xs border border-noir-border/80 bg-noir-panel text-noir-foreground hover:border-neon-cyan/60 hover:shadow-neon-cyan/40 flex flex-col items-start"
                  onClick={() => loadPreset("clean", "docx")}
                >
                  <span className="font-mono text-neon-cyan">Clean · DOCX</span>
                  <span className="text-[9px] text-noir-foreground/60">
                    Baseline sample (Word)
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-[36px] px-3 py-2 text-[10px] sm:text-xs border border-noir-border/80 bg-noir-panel text-noir-foreground hover:border-neon-cyan/60 hover:shadow-neon-cyan/40 flex flex-col items-start"
                  onClick={() => loadPreset("dirty", "pdf")}
                >
                  <span className="font-mono text-neon-green">Dirty · PDF</span>
                  <span className="text-[9px] text-noir-foreground/60">
                    Adversarial sample
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-[36px] px-3 py-2 text-[10px] sm:text-xs border border-noir-border/80 bg-noir-panel text-noir-foreground hover:border-neon-cyan/60 hover:shadow-neon-cyan/40 flex flex-col items-start"
                  onClick={() => loadPreset("dirty", "docx")}
                >
                  <span className="font-mono text-neon-green">Dirty · DOCX</span>
                  <span className="text-[9px] text-noir-foreground/60">
                    Adversarial sample (Word)
                  </span>
                </Button>
              </div>
              <p className="text-[10px] text-noir-foreground/60">
                &gt; Last preset:{" "}
                <span className="font-mono text-neon-green">
                  {demoVariant === "clean" ? "clean" : "dirty"} ·{" "}
                  {demoFormat.toUpperCase()}
                </span>
              </p>
            </div>
            {selectedFileName && (
              <div ref={armedSectionRef}>
                <p className="mt-3 text-xs text-neon-green">
                  &gt; Armed CV: <span className="font-semibold">{selectedFileName}</span>
                </p>
                <div className="mt-1 flex flex-col items-start gap-1">
                  <button
                    type="button"
                    className={`px-0 text-[10px] underline underline-offset-2 ${
                      hasDemoLoaded
                        ? "text-neon-cyan hover:text-neon-green"
                        : "text-noir-foreground/40 cursor-not-allowed"
                    }`}
                    onClick={hasDemoLoaded ? downloadCurrentDemo : undefined}
                    disabled={!hasDemoLoaded}
                  >
                    {hasDemoLoaded
                      ? "View current demo as-is"
                      : "Select demo document and click here to view as-is"}
                  </button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      clearFile();
                      openFilePickerRef.current?.();
                    }}
                    className="min-h-[44px] py-2 px-3 text-[10px] sm:text-xs"
                    aria-label="Change file"
                  >
                    Change file
                  </Button>
                </div>
                <p className="mt-1 text-[10px] text-noir-foreground/60">
                  Configure eggs below, then click Harden.
                </p>
                <p className="mt-0.5 text-[10px] text-noir-foreground/50">
                  Output uses plain-text layout unless &quot;Preserve styles&quot; is on (add-only eggs only).
                </p>
                <div className="mt-2">
                  <label className="flex min-h-[44px] cursor-pointer items-center gap-2 py-2 text-xs text-noir-foreground/80">
                    <input
                      type="checkbox"
                      checked={preserveStyles}
                      onChange={() => setPreserveStyles((p) => !p)}
                      className="rounded border-noir-border text-neon-cyan focus:ring-neon-cyan/50"
                      aria-describedby="preserve-styles-desc"
                    />
                    <span>Preserve styles</span>
                  </label>
                  <p id="preserve-styles-desc" className="text-[10px] text-noir-foreground/50 ml-6 -mt-1">
                    Keeps original formatting when only Invisible Hand, Canary Wing, and/or Metadata Shadow are used.
                  </p>
                </div>
                <div className="mt-3">
                  <Card className="px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-noir-foreground/60 mb-2">
                      Eggs to run
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0">
                    {EGG_OPTIONS.map((egg) => (
                      <label
                        key={egg.id}
                        className="flex min-h-[44px] cursor-pointer items-center gap-2 py-2 pr-2 text-xs text-noir-foreground/80"
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
                  </Card>
                </div>
                <Button
                  onClick={runHarden}
                  disabled={processingState === "processing"}
                  aria-label={processingState === "processing" ? "Harden (processing…)" : "Harden"}
                  className="mt-4 w-full flex items-center justify-center gap-2"
                >
                  {processingState === "processing" && (
                    <span className="flex items-end gap-0.5 h-4" aria-hidden="true">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span
                          key={i}
                          className="music-loading-bar w-0.5 h-3 bg-neon-cyan rounded-full origin-bottom"
                        />
                      ))}
                    </span>
                  )}
                  {processingState === "processing" ? "Processing…" : "Harden"}
                </Button>
              </div>
            )}
            {successMessage && (
              <div className="mt-2" role="status" aria-live="polite">
                <p
                  ref={successMessageRef}
                  tabIndex={-1}
                  className="text-xs text-neon-green"
                >
                  &gt;{" "}
                  {lastHardenedConfigRef.current?.eggIds?.length === 0
                    ? "Scan complete (no eggs applied — document unchanged):"
                    : "Hardened CV ready:"}{" "}
                  <span className="font-mono">{successMessage}</span>
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    onClick={triggerDownload}
                    className="min-h-[44px] py-2"
                    aria-label={`Download ${successMessage}`}
                  >
                    Download
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={runHarden}
                    disabled={processingState === "processing" || !haveEggsChanged()}
                    className="min-h-[44px] py-2"
                    aria-label="Re-process with current egg config"
                  >
                    Re-process
                  </Button>
                </div>
              </div>
            )}
            {error && (
              <div ref={errorRef} className="mt-2" role="alert">
                <p className="text-xs text-neon-red">
                  &gt; Alert: {error}
                </p>
                <Button
                  ref={retryButtonRef}
                  variant="secondary"
                  onClick={runHarden}
                  className="mt-1 text-xs px-2 py-1 min-h-[44px]"
                  aria-label="Retry"
                >
                  Retry
                </Button>
              </div>
            )}
            <div className="mt-6">
              <InvisibleHandConfigCard
                payload={invisibleHandPayload}
                onPayloadChange={setInvisibleHandPayload}
                disabled={!enabledEggIds.has("invisible-hand")}
                manualCheckAndValidation={eggMetadataById["invisible-hand"]?.manualCheckAndValidation}
              />
            </div>
            <div className="mt-4">
              <IncidentMailtoConfigCard
                payload={incidentMailtoPayload}
                onPayloadChange={setIncidentMailtoPayload}
                disabled={!enabledEggIds.has("incident-mailto")}
                manualCheckAndValidation={eggMetadataById["incident-mailto"]?.manualCheckAndValidation}
              />
            </div>
            <div className="mt-4">
              <CanaryWingConfigCard
                payload={canaryWingPayload}
                onPayloadChange={setCanaryWingPayload}
                disabled={!enabledEggIds.has("canary-wing")}
                manualCheckAndValidation={eggMetadataById["canary-wing"]?.manualCheckAndValidation}
              />
            </div>
            <div className="mt-4">
              <MetadataShadowConfigCard
                payload={metadataShadowPayload}
                onPayloadChange={setMetadataShadowPayload}
                disabled={!enabledEggIds.has("metadata-shadow")}
                manualCheckAndValidation={eggMetadataById["metadata-shadow"]?.manualCheckAndValidation}
              />
            </div>
          </div>

          <aside className="mt-8 w-full text-xs text-noir-foreground/80 md:mt-0 md:w-80 md:shrink-0 md:sticky md:top-6 md:self-start md:max-h-[calc(100vh-3rem)] md:overflow-y-auto">
            <div className="mb-4 text-xs uppercase tracking-[0.2em] text-neon-cyan">
              Pipeline Status
            </div>
            <div className="block md:hidden mb-2">
              <button
                type="button"
                onClick={() => setDualityMonitorOpen((o) => !o)}
                className="flex w-full min-h-[44px] items-center justify-between rounded px-3 py-3 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-neon-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/50"
                aria-expanded={dualityMonitorOpen ? "true" : "false"}
                aria-controls="duality-monitor-content"
                id="duality-monitor-toggle"
              >
                <span>Pipeline status</span>
                <span aria-hidden="true">{dualityMonitorOpen ? "▼" : "▶"}</span>
              </button>
            </div>
            <div
              id="duality-monitor-content"
              className={`${dualityMonitorOpen ? "block" : "hidden md:block"} max-h-[60vh] overflow-y-auto md:max-h-none`}
              aria-labelledby="duality-monitor-toggle"
            >
            <DualityMonitor
              processingState={processingState}
              activeStage={activeStage}
              log={log}
              dualityResult={dualityResult ?? undefined}
            />
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
