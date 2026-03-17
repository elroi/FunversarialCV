"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
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
import { dehydrateInBrowser, rehydrateInBrowser } from "../src/lib/clientVault";
import { createDocumentWithTextInBrowser } from "../src/lib/clientDocumentCreate";
import { replacePiiWithTokensInCopy } from "../src/lib/clientTokenReplaceInCopy";
import { detectDocumentTypeFromBuffer } from "../src/lib/clientDocumentExtract";
import type { PiiMap } from "../src/lib/clientVaultTypes";
import type { DualityCheckResult } from "../src/engine/dualityCheck";
import { EGG_OPTIONS, DEFAULT_ENABLED_EGG_IDS } from "../src/eggs/eggMetadata";
import { Button } from "../src/components/ui/Button";
import { Card } from "../src/components/ui/Card";
import { CollapsibleCard } from "../src/components/ui/CollapsibleCard";

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
  /** True once the user has toggled an egg or preserve-styles; we only persist after that so we never overwrite saved state on load. */
  const userHasChangedCheckboxesRef = useRef(false);
  const [demoVariant, setDemoVariant] = useState<"clean" | "dirty">("clean");
  const [demoFormat, setDemoFormat] = useState<"pdf" | "docx">("docx");
  const [hasDemoLoaded, setHasDemoLoaded] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [clientPiiMap, setClientPiiMap] = useState<PiiMap | null>(null);

  /** Egg metadata from GET /api/eggs (id -> { name, manualCheckAndValidation }). */
  const [eggMetadataById, setEggMetadataById] = useState<Record<string, { name: string; manualCheckAndValidation: string }>>({});

  /** When set, show confirmation dialog: PDF and eggs can only be processed by the server. */
  const [serverPdfConfirm, setServerPdfConfirm] = useState<{
    fileToSend: File;
    name: string;
    payloadsForEnabled: Record<string, string>;
    enabledEggIds: string[];
    preserveStyles: boolean;
  } | null>(null);

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
      if (raw != null) {
        const parsed = JSON.parse(raw) as { enabledEggIds?: unknown; preserveStyles?: unknown };
        const validEggIds = new Set<string>(EGG_OPTIONS.map((o) => o.id));
        if (Array.isArray(parsed.enabledEggIds)) {
          const filtered = parsed.enabledEggIds.filter((id): id is string => typeof id === "string" && validEggIds.has(id));
          setEnabledEggIds(filtered.length > 0 ? new Set(filtered) : new Set(DEFAULT_ENABLED_EGG_IDS));
        }
        if (typeof parsed.preserveStyles === "boolean") {
          setPreserveStyles(parsed.preserveStyles);
        }
      }
    } catch {
      // Corrupt or invalid JSON; keep defaults.
    }
  }, []);

  // Persist checkbox state to localStorage only after the user has changed it (avoids overwriting saved state on reload / Strict Mode).
  useEffect(() => {
    if (typeof window === "undefined" || !userHasChangedCheckboxesRef.current) return;
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
    userHasChangedCheckboxesRef.current = true;
    setEnabledEggIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onFileSelect = async (file: File) => {
    const buf = await file.slice(0, 4).arrayBuffer();
    const detected = detectDocumentTypeFromBuffer(buf);
    if (detected === "pdf") {
      setError(
        "This file looks like a PDF. We currently support Word documents (.docx) only."
      );
      return;
    }
    if (detected !== "docx") {
      setError(
        "File content is not a valid Word document. Please upload a real .docx file."
      );
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setSelectedFile(file);
    setSelectedFileName(file.name);
    lastHardenedBlobRef.current = null;
    lastHardenedConfigRef.current = null;
    setDualityResult(null);
    setLog([]);
    setProcessingState("idle");
    setActiveStage(undefined);
    setClientPiiMap(null);
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

  /** Builds formData, POSTs to /api/harden, and handles response. Used by main flow and server-PDF confirm dialog. */
  const runSubmitToServer = useCallback(
    async (params: {
      fileToSend: File;
      name: string;
      eggIdsToUse: string[];
      payloadsForEnabled: Record<string, string>;
      preserveStyles: boolean;
      piiMapForRehydrate: PiiMap | null;
      rehydrateMimeType: string | null;
    }) => {
      const {
        fileToSend,
        name,
        eggIdsToUse,
        payloadsForEnabled,
        preserveStyles,
        piiMapForRehydrate,
        rehydrateMimeType,
      } = params;
      const formData = new FormData();
      formData.append("file", fileToSend);
      formData.append("payloads", JSON.stringify(payloadsForEnabled));
      formData.append("eggIds", JSON.stringify(eggIdsToUse));
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

        const mimeTypeFromServer = data.mimeType as string;
        const originalName = (data.originalName as string) || name;
        const scannerScan = data.scannerReport?.scan;

        let blob: Blob;
        try {
          const binaryString = atob(bufferBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          if (piiMapForRehydrate && rehydrateMimeType) {
            const tokenizedBuffer = bytes.buffer.slice(
              bytes.byteOffset,
              bytes.byteOffset + bytes.byteLength
            );
            const rehydratedBuffer = await rehydrateInBrowser(
              tokenizedBuffer,
              rehydrateMimeType,
              piiMapForRehydrate
            );
            const rehydratedBytes = new Uint8Array(rehydratedBuffer);
            blob = new Blob([rehydratedBytes], { type: rehydrateMimeType });
            setLog((prev) => [
              ...prev,
              {
                id: "client-rehydrate",
                stage: "rehydration",
                level: "success",
                message:
                  "[CLIENT] Rehydrated tokens back into original PII in-browser; server only saw tokenized content.",
              },
            ]);
          } else {
            blob = new Blob([bytes], { type: mimeTypeFromServer });
          }
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
          eggIds: [...eggIdsToUse],
          preserveStyles,
        };

        const canaryTokenUsed = data.canaryTokenUsed;
        if (typeof canaryTokenUsed === "string" && canaryTokenUsed.trim() !== "") {
          try {
            const current = canaryWingPayload.trim() ? JSON.parse(canaryWingPayload) as Record<string, unknown> : {};
            setCanaryWingPayload(JSON.stringify({ ...current, token: canaryTokenUsed }));
          } catch {
            // leave as-is
          }
        }

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
        const noEggsApplied = eggIdsToUse.length === 0;
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
    },
    [canaryWingPayload]
  );

  const startPipelineForFile = async (file: File) => {
    const name = file.name;
    if (file.size === 0) {
      setError("Document is empty. Please choose a valid Word document (.docx).");
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
    setClientPiiMap(null);
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

    let rehydrateMimeType: string | null = null;
    let piiMapForRehydrate: PiiMap | null = null;
    let fileToSend: File = file;

    // E2E hook: force server-PDF confirmation dialog without calling dehydrateInBrowser (for Playwright).
    if (
      typeof window !== "undefined" &&
      window.location.search.includes("e2eServerPdf=1") &&
      file.type === "application/pdf" &&
      enabledEggIds.size > 0
    ) {
      setLog((prev) => [
        ...prev,
        {
          id: "client-server-only-confirm",
          stage: "dehydration",
          level: "info",
          message:
            "[CLIENT] This PDF and the selected eggs can only be processed by the server. Confirm to continue or uncheck eggs.",
        },
      ]);
      setServerPdfConfirm({
        fileToSend: file,
        name,
        payloadsForEnabled: { ...payloadsForEnabled },
        enabledEggIds: [...enabledEggIds],
        preserveStyles,
      });
      return;
    }

    try {
      const result = await dehydrateInBrowser(file);
      rehydrateMimeType = result.mimeType;
      piiMapForRehydrate = result.piiMap;
      setClientPiiMap(result.piiMap);
      const tokenizedCopy = await replacePiiWithTokensInCopy(file, result.piiMap);
      if (tokenizedCopy) {
        fileToSend = tokenizedCopy.file;
        setLog((prev) => [
          ...prev,
          {
            id: "client-dehydrate",
            stage: "dehydration",
            level: "info",
            message:
              "[CLIENT] Dehydrated PII in-browser, tokenized copy (layout preserved), sending to server.",
          },
        ]);
      } else {
        const tokenizedDocBuffer = await createDocumentWithTextInBrowser(
          result.tokenizedText,
          result.mimeType
        );
        fileToSend = new File([tokenizedDocBuffer], name, {
          type: result.mimeType,
        });
        setLog((prev) => [
          ...prev,
          {
            id: "client-dehydrate",
            stage: "dehydration",
            level: "info",
            message:
              "[CLIENT] Dehydrated PII in-browser, rebuilt tokenized file, sending to server.",
          },
        ]);
      }
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "Client-side dehydration failed. Falling back to server path.";
      const isPdfParseIssue = /defineProperty|non-object|Invalid PDF/i.test(msg);
      const friendly = isPdfParseIssue
        ? "This PDF could not be read in the browser (parser limitation); using server path. Many other PDFs work client-side."
        : msg;
      // Use "info" level for expected fallback (PDF parse issues), "warn" for unexpected errors
      const level = isPdfParseIssue ? "info" : "warn";
      setLog((prev) => [
        ...prev,
        {
          id: "client-dehydrate-fallback",
          stage: "dehydration",
          level,
          message: `[CLIENT] ${friendly}`,
        },
      ]);
      // When PDF and eggs are enabled, require confirmation before sending to server
      if (
        isPdfParseIssue &&
        file.type === "application/pdf" &&
        enabledEggIds.size > 0
      ) {
        setLog((prev) => [
          ...prev,
          {
            id: "client-server-only-confirm",
            stage: "dehydration",
            level: "info",
            message:
              "[CLIENT] This PDF and the selected eggs can only be processed by the server. Confirm to continue or uncheck eggs.",
          },
        ]);
        setServerPdfConfirm({
          fileToSend: file,
          name,
          payloadsForEnabled: { ...payloadsForEnabled },
          enabledEggIds: [...enabledEggIds],
          preserveStyles,
        });
        return;
      }
    }

    await runSubmitToServer({
      fileToSend,
      name,
      eggIdsToUse: [...enabledEggIds],
      payloadsForEnabled,
      preserveStyles,
      piiMapForRehydrate,
      rehydrateMimeType,
    });
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
    setIsDemoLoading(true);
    try {
      await loadDemoCv(variant, format);
      setDemoVariant(variant);
      setDemoFormat(format);
      setHasDemoLoaded(true);
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <>
      {serverPdfConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-noir-bg/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="server-pdf-confirm-title"
          aria-describedby="server-pdf-confirm-desc"
        >
          <Card className="w-full max-w-md border-neon-cyan/50 bg-noir-panel p-5 shadow-lg">
            <h2 id="server-pdf-confirm-title" className="mb-2 text-base font-semibold text-neon-cyan">
              Server-side processing required
            </h2>
            <p id="server-pdf-confirm-desc" className="mb-4 text-sm text-noir-foreground/80">
              This PDF could not be processed in the browser. The file and the selected eggs can only be processed by the server.
            </p>
            <p className="mb-3 text-caption text-noir-foreground/60">
              Selected eggs that will run on the server:{" "}
              <span className="font-mono text-neon-cyan/90">
                {serverPdfConfirm.enabledEggIds
                  .map((id) => EGG_OPTIONS.find((o) => o.id === id)?.name ?? id)
                  .join(", ")}
              </span>
            </p>
            <p className="mb-4 text-caption text-noir-foreground/50">
              You can continue with the server processing these eggs, or uncheck them and continue without eggs.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  const conf = serverPdfConfirm;
                  setServerPdfConfirm(null);
                  void runSubmitToServer({
                    fileToSend: conf.fileToSend,
                    name: conf.name,
                    eggIdsToUse: conf.enabledEggIds,
                    payloadsForEnabled: conf.payloadsForEnabled,
                    preserveStyles: conf.preserveStyles,
                    piiMapForRehydrate: null,
                    rehydrateMimeType: null,
                  });
                }}
              >
                Continue (use server)
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const conf = serverPdfConfirm;
                  userHasChangedCheckboxesRef.current = true;
                  setEnabledEggIds(new Set());
                  setServerPdfConfirm(null);
                  void runSubmitToServer({
                    fileToSend: conf.fileToSend,
                    name: conf.name,
                    eggIdsToUse: [],
                    payloadsForEnabled: {},
                    preserveStyles: conf.preserveStyles,
                    piiMapForRehydrate: null,
                    rehydrateMimeType: null,
                  });
                }}
              >
                Uncheck eggs and continue
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setServerPdfConfirm(null);
                  setProcessingState("idle");
                }}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      <main id="main-content" className="min-h-screen bg-noir-bg text-noir-foreground">
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-8 md:py-10">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-noir-border pb-4">
          <div>
            <h1 className="text-2xl font-semibold">
              <span className="bg-gradient-to-r from-neon-green via-neon-cyan to-neon-green bg-clip-text text-transparent">
                FunversarialCV
              </span>
            </h1>
            <p className="text-sm text-noir-foreground/70">
              Adversarial CV hardening console for hungry LLMs.
            </p>
          </div>
        </header>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-caption sm:text-xs font-mono uppercase tracking-[0.2em] text-neon-cyan/80">
            PII Mode: Stateless &amp; Volatile
          </p>
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-full border border-neon-green/60 bg-noir-panel px-3 py-1 text-caption sm:text-xs uppercase tracking-[0.2em] text-neon-green engine-online-pulse">
              Engine Online
            </span>
            <Link
              href="/resources"
              className="rounded-full border border-neon-cyan/70 px-3 py-1 text-caption sm:text-xs uppercase tracking-[0.2em] text-neon-cyan hover:border-neon-green hover:text-neon-green focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/60"
            >
              Resources
            </Link>
          </div>
        </div>
        <p className="mb-6 text-sm text-noir-foreground/80">
          FunversarialCV is an educational tool for exploring how CVs behave in
          AI-heavy hiring flows. It hardens documents with OWASP-aligned,
          LLM-targeted easter eggs while keeping your data inside a Stateless
          &amp; Volatile vault model: documents are processed in-memory only –
          with PII dehydration, adversarial layers, and rehydration into a final
          stream – so nothing is retained after your hardened CV is generated.
          When <strong>Preserve styles</strong> is on, we keep your layout where
          possible; when that isn’t possible we fall back to a rebuild path and
          explain it in the UI.
        </p>
        <p className="mb-4 text-caption text-neon-cyan/90 border-l-2 border-neon-cyan/50 pl-3 py-1">
          Your CV is processed in your browser first. Before anything leaves your device,
          we replace email, phone, and other identifiers with short-lived tokens. Our
          server only sees tokens, never your raw contact details.
        </p>

        <section className="flex flex-1 flex-col gap-8 md:flex-row">
          <div className="flex-1">
            <div className="mb-4 text-caption uppercase tracking-[0.2em] text-neon-cyan">
              Input Channel
            </div>
            <DropZone onFileSelect={onFileSelect} maxSizeBytes={MAX_FILE_SIZE_BYTES} openFilePickerRef={openFilePickerRef} />
            <p className="mt-1 text-caption text-noir-foreground/50">
              Max 4 MB. DOCX (Word) only.
            </p>
            <p className="mt-1.5 text-caption text-noir-foreground/50 font-mono" title="Open DevTools → Network, trigger Harden, inspect the POST to /api/harden; payload should contain tokens like {{PII_EMAIL_0}}, not raw email or phone.">
              Verify: DevTools → Network → inspect <code className="text-xs">POST /api/harden</code> — payload has tokens only, no raw PII.
            </p>
            <CollapsibleCard
              className="mt-3"
              title="Use Sample CV to Test"
              titleId="sample-cv-preset-title"
              contentId="sample-cv-preset-content"
              ariaLabel="Expand Use Sample CV to Test"
              defaultExpanded={false}
            >
              <div className="space-y-3 text-caption text-noir-foreground/60">
                <p className="text-caption text-noir-foreground/60">
                  Load a synthetic demo CV instead of your own — use <span className="text-neon-cyan font-mono">Clean</span> for a safe baseline, or <span className="text-neon-green font-mono">Dirty</span> to explore adversarial content.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-[36px] px-3 py-2 text-caption sm:text-xs border border-neon-cyan/30 bg-noir-panel text-noir-foreground hover:border-neon-cyan/60 hover:shadow-neon-cyan/40 flex flex-col items-start"
                    disabled={isDemoLoading}
                    onClick={() => loadPreset("clean", "docx")}
                  >
                    <span className="font-mono text-neon-cyan">Clean · DOCX</span>
                    <span className="text-xs text-noir-foreground/60">
                      Baseline sample
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-[36px] px-3 py-2 text-caption sm:text-xs border border-amber-300/70 border-dashed bg-noir-panel text-noir-foreground hover:border-amber-400/80 flex flex-col items-start"
                    disabled={isDemoLoading}
                    onClick={() => loadPreset("dirty", "docx")}
                  >
                    <span className="font-mono text-neon-green">Dirty · DOCX</span>
                    <span className="text-xs text-noir-foreground/60">
                      Adversarial sample
                    </span>
                  </Button>
                </div>
                {isDemoLoading && (
                  <p
                    className="text-caption text-neon-cyan/80 font-mono"
                    aria-live="polite"
                  >
                    &gt; Generating demo CV… this may take a few seconds.
                  </p>
                )}
                <p className="text-caption text-noir-foreground/60">
                  &gt; Last preset:{" "}
                  <span className="font-mono text-neon-green">
                    {demoVariant === "clean" ? "clean" : "dirty"} ·{" "}
                    {demoFormat.toUpperCase()}
                  </span>
                </p>
              </div>
            </CollapsibleCard>
            {selectedFileName && (
              <div ref={armedSectionRef}>
                <p className="mt-3 text-sm text-neon-green">
                  &gt; Armed CV: <span className="font-semibold">{selectedFileName}</span>
                </p>
                <div className="mt-1 flex flex-col items-start gap-1">
                  <button
                    type="button"
                    className={`px-0 text-caption underline underline-offset-2 ${
                      hasDemoLoaded
                        ? "text-neon-cyan hover:text-neon-green"
                        : "text-noir-foreground/40 cursor-not-allowed"
                    }`}
                    onClick={hasDemoLoaded ? downloadCurrentDemo : undefined}
                    disabled={!hasDemoLoaded}
                  >
                    {hasDemoLoaded
                      ? "Download to view current demo as-is"
                      : "Select demo document and click here to view as-is"}
                  </button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      clearFile();
                      openFilePickerRef.current?.();
                    }}
                    className="min-h-[44px] py-2 px-3 text-caption sm:text-xs"
                    aria-label="Change file"
                  >
                    Change file
                  </Button>
                </div>
                <p className="mt-1 text-caption text-noir-foreground/60">
                  Configure eggs below, then click Harden.
                </p>
                <p className="mt-0.5 text-caption text-noir-foreground/50">
                  Output uses plain-text layout unless &quot;Preserve styles&quot; is on (add-only eggs only).
                </p>
                <div className="mt-2">
                  <label className="flex min-h-[44px] cursor-pointer items-center gap-2 py-2 text-sm text-noir-foreground/80">
                    <input
                      type="checkbox"
                      checked={preserveStyles}
                      onChange={() => {
                        userHasChangedCheckboxesRef.current = true;
                        setPreserveStyles((p) => !p);
                      }}
                      className="rounded border-noir-border text-neon-cyan focus:ring-neon-cyan/50"
                      aria-describedby="preserve-styles-desc"
                    />
                    <span>Preserve styles</span>
                  </label>
                  <p id="preserve-styles-desc" className="text-caption text-noir-foreground/50 ml-6 -mt-1">
                    We keep layout via in-place structure edits when possible. If an egg changes body text we rebuild and styles may not be preserved; the log will indicate which path was used.
                  </p>
                </div>
                <div className="mt-3">
                  <Card className="px-4 py-3">
                    <p className="border-b border-noir-border/60 pb-2 text-caption font-medium uppercase tracking-[0.2em] text-noir-foreground/70 mb-3">
                      Eggs to run
                    </p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {EGG_OPTIONS.map((egg) => (
                      <label
                        key={egg.id}
                        className="flex min-h-[44px] cursor-pointer items-center gap-3 py-2 pr-2 text-sm text-noir-foreground/80"
                      >
                        <input
                          type="checkbox"
                          checked={enabledEggIds.has(egg.id)}
                          onChange={() => toggleEgg(egg.id)}
                          className="mt-0.5 shrink-0 rounded border-noir-border text-neon-cyan focus:ring-neon-cyan/50"
                        />
                        <span className="flex flex-col gap-0.5 leading-snug">
                          <span>{egg.name}</span>
                          <span className="text-xs font-mono text-noir-foreground/50">
                            {egg.id === "invisible-hand" || egg.id === "canary-wing"
                              ? "STYLE-AFFECTING"
                              : "STYLE-SAFE"}
                          </span>
                        </span>
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
                  className="text-sm text-neon-green"
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
                <p className="text-sm text-neon-red">
                  &gt; Alert: {error}
                </p>
                <Button
                  ref={retryButtonRef}
                  variant="secondary"
                  onClick={runHarden}
                  className="mt-1 text-sm px-2 py-1 min-h-[44px]"
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

          <aside className="mt-8 w-full text-sm text-noir-foreground/80 md:mt-0 md:w-80 md:shrink-0 md:sticky md:top-6 md:self-start md:max-h-[calc(100vh-3rem)] md:overflow-y-auto">
            <div className="mb-4 text-caption uppercase tracking-[0.2em] text-neon-cyan">
              Pipeline Status
            </div>
            <div className="block md:hidden mb-2">
              <button
                type="button"
                onClick={() => setDualityMonitorOpen((o) => !o)}
                className="flex w-full min-h-[44px] items-center justify-between rounded px-3 py-3 text-caption sm:text-xs uppercase tracking-[0.2em] text-neon-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/50"
                aria-expanded={dualityMonitorOpen}
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
    </>
  );
}
